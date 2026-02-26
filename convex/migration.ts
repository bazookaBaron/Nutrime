import { mutation } from "./_generated/server";
import { v } from "convex/values";

// A secure internal mutation to handle bulk inserts during migration
export const importData = mutation({
    args: {
        table: v.string(),
        records: v.array(v.any()), // Array of records to insert
    },
    handler: async (ctx, args) => {
        // Basic validation
        const validTables = [
            "profiles",
            "daily_stats",
            "workout_daily_plans",
            "workout_history",
            "workout_job_queue",
            "food_logs",
            "challenges",
            "user_challenges",
        ];

        if (!validTables.includes(args.table)) {
            throw new Error(`Invalid table name: ${args.table}`);
        }

        const insertedIds = [];
        for (const record of args.records) {
            const id = await ctx.db.insert(args.table as any, record);
            insertedIds.push({ originalId: record.id || record.user_id, convexId: id });
        }

        return insertedIds;
    },
});
