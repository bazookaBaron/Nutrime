import { internalMutation } from "./_generated/server";

export default internalMutation({
    handler: async (ctx) => {
        console.log("Starting unset XP reset...");
        
        const allProfiles = await ctx.db.query("profiles").collect();
        let updatedCount = 0;
        
        for (const profile of allProfiles) {
            if (profile.workout_xp === undefined) {
                await ctx.db.patch(profile._id, { workout_xp: 0 });
                
                // Also update leaderboard if exists
                const lbEntry = await ctx.db
                    .query("leaderboards")
                    .withIndex("by_user_id", (q) => q.eq("user_id", profile.user_id))
                    .unique();
                    
                if (lbEntry) {
                    await ctx.db.patch(lbEntry._id, { total_xp: 0 });
                }
                
                updatedCount++;
            }
        }
        
        console.log(`Reset ${updatedCount} profiles with unset workout_xp to 0.`);
    }
});
