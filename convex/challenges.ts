import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const getActive = query({
    handler: async (ctx) => {
        const now = new Date().toISOString();
        return await ctx.db
            .query("challenges")
            .withIndex("by_status", (q) => q.eq("status", "active"))
            .filter((q) => q.gt(q.field("end_time"), now))
            .collect();
    },
});

export const getUserChallenges = query({
    args: { userId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (!args.userId) return [];
        return await ctx.db
            .query("user_challenges")
            .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
            .collect();
    },
});

export const join = mutation({
    args: { userId: v.string(), challengeId: v.string() },
    handler: async (ctx, args) => {
        // Check if already joined
        const existing = await ctx.db
            .query("user_challenges")
            .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
            .filter((q) => q.eq(q.field("challenge_id"), args.challengeId))
            .unique();

        if (existing) return existing._id;

        // Increment participant count
        let realChallengeId = null;
        try {
            realChallengeId = ctx.db.normalizeId("challenges", args.challengeId);
        } catch (e) { }

        if (realChallengeId) {
            const c = await ctx.db.get(realChallengeId as Id<"challenges">);
            if (c) {
                await ctx.db.patch(realChallengeId as Id<"challenges">, {
                    participants_count: (c.participants_count || 0) + 1
                });
            }
        }

        return await ctx.db.insert("user_challenges", {
            user_id: args.userId,
            challenge_id: args.challengeId,
            status: "joined",
            progress: 0,
            joined_at: new Date().toISOString(),
        });
    },
});

export const updateProgress = mutation({
    args: { id: v.id("user_challenges"), dailyLogs: v.array(v.string()) },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { daily_logs: args.dailyLogs });
    },
});

export const markCompleted = mutation({
    args: { id: v.id("user_challenges") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            status: "completed",
            completed_at: new Date().toISOString(),
        });
    },
});

export const create = mutation({
    args: {
        creator_id: v.string(),
        title: v.string(),
        description: v.string(),
        type: v.string(),
        target_value: v.number(),
        xp_reward: v.number(),
        start_time: v.string(),
        end_time: v.string(),
        participants_count: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { participants_count, ...rest } = args;
        return await ctx.db.insert("challenges", {
            ...rest,
            status: "active",
            participants_count: participants_count ?? 0,
            created_at: new Date().toISOString(),
        });
    },
});
