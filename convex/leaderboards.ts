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

        // Return top 50 with index-based ranking (1, 2, 3...)
        return filtered.slice(0, 50).map((entry, index) => {
            return {
                rank: index + 1,
                user_id: entry.user_id,
                username: entry.username,
                workout_xp: entry.total_xp,
                workout_level: calculateLevel(entry.total_xp),
            };
        });
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

        // Find user's position
        const userIndex = filtered.findIndex((e) => e.user_id === args.userId);
        if (userIndex === -1) return null;

        const userEntry = filtered[userIndex];

        return {
            rank: userIndex + 1,
            user_id: userEntry.user_id,
            username: userEntry.username,
            workout_xp: userEntry.total_xp,
            workout_level: calculateLevel(userEntry.total_xp),
        };
    },
});
