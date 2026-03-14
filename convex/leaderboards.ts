import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ---------------------------------------------------------------------------
// Level helper (mirrors the logic in users.ts incrementXP)
// ---------------------------------------------------------------------------
function calculateLevel(xp: number): number {
    if (xp >= 5001) return 5;
    if (xp >= 5000) return 4;
    if (xp >= 3500) return 3;
    if (xp >= 2000) return 2;
    return 1;
}

// ---------------------------------------------------------------------------
// getLeaderboard — returns top entries sorted by total_xp descending.
//   scope: "all" | "country" | "state"
//   filter: the country or state value to match (ignored for "all")
// ---------------------------------------------------------------------------
export const getLeaderboard = query({
    args: {
        scope: v.string(),            // "all" | "country" | "state"
        filter: v.optional(v.string()), // e.g. "India", "Maharashtra"
    },
    handler: async (ctx, args) => {
        // Fetch all leaderboard entries (table stays small — 1 row per user)
        const entries = await ctx.db.query("leaderboards").collect();

        // Filter by scope
        let filtered = entries;
        if (args.scope === "country" && args.filter) {
            filtered = entries.filter((e) => e.country === args.filter);
        } else if (args.scope === "state" && args.filter) {
            filtered = entries.filter((e) => e.state === args.filter);
        }
        // "all" → no filtering

        // Sort by total_xp descending
        filtered.sort((a, b) => b.total_xp - a.total_xp);

        // Fetch profiles for the top 50 to get icons
        const top50 = filtered.slice(0, 50);
        const result = [];
        for (let i = 0; i < top50.length; i++) {
            const entry = top50[i];
            const profile = await ctx.db
                .query("profiles")
                .withIndex("by_user_id", (q) => q.eq("user_id", entry.user_id))
                .unique();

            result.push({
                rank: i + 1,
                user_id: entry.user_id,
                username: entry.username,
                workout_xp: entry.total_xp,
                workout_level: calculateLevel(entry.total_xp),
                streak: entry.streak || profile?.streak || 0,
                country: entry.country,
                profile_image_url: profile?.profile_image_url,
            });
        }
        return result;
    },
});

// ---------------------------------------------------------------------------
// getUserRank — returns the current user's rank within the given scope.
// ---------------------------------------------------------------------------
export const getUserRank = query({
    args: {
        userId: v.string(),
        scope: v.string(),
        filter: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const entries = await ctx.db.query("leaderboards").collect();

        let filtered = entries;
        if (args.scope === "country" && args.filter) {
            filtered = entries.filter((e) => e.country === args.filter);
        } else if (args.scope === "state" && args.filter) {
            filtered = entries.filter((e) => e.state === args.filter);
        }

        filtered.sort((a, b) => b.total_xp - a.total_xp);

        const userIndex = filtered.findIndex((e) => e.user_id === args.userId);

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
            .unique();

        // User not in leaderboard yet — return synthetic last-place entry
        if (userIndex === -1) {
            return {
                rank: filtered.length + 1,
                user_id: args.userId,
                username: profile?.username || "You",
                workout_xp: 0,
                workout_level: profile?.workout_level || 1,
                streak: profile?.streak || 0,
                country: profile?.country,
                profile_image_url: profile?.profile_image_url,
            };
        }

        const userEntry = filtered[userIndex];

        return {
            rank: userIndex + 1,
            user_id: userEntry.user_id,
            username: userEntry.username,
            workout_xp: userEntry.total_xp,
            workout_level: calculateLevel(userEntry.total_xp),
            streak: userEntry.streak || profile?.streak || 0,
            country: userEntry.country,
            profile_image_url: profile?.profile_image_url,
        };
    },
});
