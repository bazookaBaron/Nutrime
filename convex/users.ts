import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ---------------------------------------------------------------------------
// Idempotently creates a profile row for a newly authenticated user.
// Safe to call on every login/signup — it's a no-op if the row already exists.
// ---------------------------------------------------------------------------
export const ensureProfile = mutation({
    args: {
        userId: v.string(),
        email: v.optional(v.string()),
        full_name: v.optional(v.string()),
        username: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("profiles")
            .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
            .unique();

        if (!existing) {
            await ctx.db.insert("profiles", {
                user_id: args.userId,
                full_name: args.full_name,
                username: args.username,
                updated_at: new Date().toISOString(),
            });
        }
        return existing?._id ?? null;
    },
});

export const getProfile = query({
    args: { userId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (!args.userId) return null;
        return await ctx.db
            .query("profiles")
            .withIndex("by_user_id", (q) => q.eq("user_id", args.userId!))
            .unique();
    },
});

export const updateProfile = mutation({
    args: {
        userId: v.string(),
        updates: v.any(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("profiles")
            .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                ...args.updates,
                updated_at: new Date().toISOString(),
            });
            return existing._id;
        } else {
            return await ctx.db.insert("profiles", {
                user_id: args.userId,
                ...args.updates,
                updated_at: new Date().toISOString(),
            });
        }
    },
});

// ---------------------------------------------------------------------------
// Saves the device's Expo push token and timezone to the user profile.
// Called from _layout.tsx after every sign-in so the cron job can reach them.
// ---------------------------------------------------------------------------
export const updatePushToken = mutation({
    args: {
        userId: v.string(),
        pushToken: v.string(),
        timezone: v.string(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("profiles")
            .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                push_token: args.pushToken,
                timezone: args.timezone,
                updated_at: new Date().toISOString(),
            });
        }
        // If no profile yet (race condition on first sign-in), ensureProfile will
        // create it, and the next app relaunch will sync the token.
    },
});

export const getDailyStats = query({
    args: { userId: v.optional(v.string()), date: v.string() },
    handler: async (ctx, args) => {
        if (!args.userId) return null;
        return await ctx.db
            .query("daily_stats")
            .withIndex("by_user_id_and_date", (q) =>
                q.eq("user_id", args.userId!).eq("date", args.date)
            )
            .unique();
    },
});

export const updateDailyStats = mutation({
    args: {
        userId: v.string(),
        date: v.string(),
        updates: v.any(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("daily_stats")
            .withIndex("by_user_id_and_date", (q) =>
                q.eq("user_id", args.userId).eq("date", args.date)
            )
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                ...args.updates,
                updated_at: new Date().toISOString(),
            });
            return existing._id;
        } else {
            return await ctx.db.insert("daily_stats", {
                user_id: args.userId,
                date: args.date,
                ...args.updates,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
        }
    },
});

export const incrementXP = mutation({
    args: { userId: v.string(), amount: v.number() },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("profiles")
            .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
            .unique();

        if (existing) {
            const newXp = (existing.workout_xp || 0) + args.amount;
            let newLevel = 1;
            if (newXp >= 5001) newLevel = 5;
            else if (newXp >= 5000) newLevel = 4;
            else if (newXp >= 3500) newLevel = 3;
            else if (newXp >= 2000) newLevel = 2;

            await ctx.db.patch(existing._id, {
                workout_xp: newXp,
                workout_level: newLevel,
                updated_at: new Date().toISOString(),
            });
        }
    },
});

export const getLeaderboard = query({
    args: {},
    handler: async (ctx) => {
        const profiles = await ctx.db.query("profiles").collect();
        const sorted = profiles
            .filter((p) => p.workout_xp && p.workout_xp > 0)
            .sort((a, b) => (b.workout_xp || 0) - (a.workout_xp || 0))
            .slice(0, 10);

        return sorted.map((p, index) => ({
            rank: index + 1,
            user_id: p.user_id,
            username: p.username || p.full_name || "Anonymous",
            workout_xp: p.workout_xp || 0,
            workout_level: p.workout_level || 1,
        }));
    },
});
