import { internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

export const sendDailyReminders = internalAction({
    args: {},
    handler: async (ctx) => {
        // 1. Get all users who have a push token
        const users = await ctx.runQuery(internal.notifications.getUsersWithTokens);

        if (users.length === 0) {
            console.log("No users with push tokens found.");
            return;
        }

        const messages = [];

        // 2. Filter for users where it's currently 9 AM local time
        for (const user of users) {
            if (!user.push_token) continue;

            let userHour = 9; // Default if timezone parse fails
            try {
                const userTime = new Date().toLocaleString("en-US", {
                    timeZone: user.timezone || "UTC",
                    hour: "numeric",
                    hour12: false
                });
                userHour = parseInt(userTime, 10);
            } catch (e) {
                console.warn(`Invalid timezone ${user.timezone} for user ${user._id}`);
                // Fallback to UTC hour if timezone is totally invalid
                userHour = new Date().getUTCHours();
            }

            // Only send if it is exactly 9 AM in the user's local timezone
            if (userHour === 9) {
                messages.push({
                    to: user.push_token,
                    sound: 'default',
                    title: "Time for your workout! 🏋️‍♀️",
                    body: `Hey ${user.full_name?.split(' ')[0] || 'there'}, don't forget to log your meals and crush your daily goals!`,
                    data: { screen: 'workout' },
                });
            }
        }

        if (messages.length === 0) {
            console.log("No users currently at 9 AM local time.");
            return;
        }

        // 3. Send to Expo Push API
        console.log(`Sending ${messages.length} push notifications...`);
        try {
            const response = await fetch("https://exp.host/--/api/v2/push/send", {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Accept-encoding": "gzip, deflate",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(messages),
            });

            const result = await response.json();
            console.log("Expo Push Response:", result);
        } catch (e) {
            console.error("Error sending push notifications via Expo", e);
        }
    },
});

export const getUsersWithTokens = internalQuery({
    handler: async (ctx) => {
        const profiles = await ctx.db.query("profiles").collect();
        // Return only profiles that have a valid string token
        return profiles.filter(p => p.push_token && p.push_token.includes('ExponentPushToken'));
    },
});
