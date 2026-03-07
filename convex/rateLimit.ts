import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { MutationCtx, QueryCtx } from "./_generated/server";

const RATE_LIMIT_CONSTANTS = {
    // 15 seconds window
    WINDOW_MS: 15000,
    // Max requests per window
    MAX_REQUESTS: 5,
};

/**
 * Checks if the given user has exceeded the rate limit for a specific action.
 * If not exceeded, increments the count.
 * Throws an error if the limit is exceeded.
 */
export async function checkRateLimit(
    ctx: MutationCtx,
    userId: string,
    action: string,
    maxRequests: number = RATE_LIMIT_CONSTANTS.MAX_REQUESTS,
    windowMs: number = RATE_LIMIT_CONSTANTS.WINDOW_MS
) {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old rate limits for this user/action to keep the table small
    const oldLimits = await ctx.db
        .query("rate_limits")
        .withIndex("by_user_id_and_action", (q) =>
            q.eq("user_id", userId).eq("action", action)
        )
        .filter((q) => q.lt(q.field("window_start"), windowStart))
        .collect();

    for (const old of oldLimits) {
        await ctx.db.delete(old._id);
    }

    // Find the current active window limit
    const activeLimit = await ctx.db
        .query("rate_limits")
        .withIndex("by_user_id_and_action", (q) =>
            q.eq("user_id", userId).eq("action", action)
        )
        .filter((q) => q.gte(q.field("window_start"), windowStart))
        .first();

    if (activeLimit) {
        if (activeLimit.count >= maxRequests) {
            console.warn(`Rate limit exceeded for user ${userId} on action ${action}`);
            throw new Error(`Rate limit exceeded. Please try again later.`);
        }

        await ctx.db.patch(activeLimit._id, {
            count: activeLimit.count + 1,
            updated_at: new Date().toISOString()
        });
    } else {
        await ctx.db.insert("rate_limits", {
            user_id: userId,
            action: action,
            count: 1,
            window_start: now,
            updated_at: new Date().toISOString()
        });
    }
}
