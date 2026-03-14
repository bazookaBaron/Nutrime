import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// Run this once after deploying the new schema
// Command: npx convex run backfillRankings:default
export default internalMutation({
    handler: async (ctx) => {
        console.log("Starting global ranking backfill...");
        
        // This leverages the new syncGlobalRankings mutation we just added
        await ctx.runMutation(internal.users.syncGlobalRankings, {});
        
        console.log("Global ranking backfill complete!");
    }
});
