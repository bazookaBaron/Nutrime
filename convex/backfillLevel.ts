import { internalMutation } from "./_generated/server";

export default internalMutation({
    handler: async (ctx) => {
        const profiles = await ctx.db.query("profiles").collect();
        let updated = 0;
        for (const profile of profiles) {
            if (profile.workout_level === undefined || profile.workout_level === 0) {
                await ctx.db.patch(profile._id, { workout_level: 1 });
                updated++;
            }
        }
        console.log(`Updated ${updated} profiles to workout_level 1`);
    }
});
