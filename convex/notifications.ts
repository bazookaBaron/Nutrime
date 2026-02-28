import { internalAction, internalQuery, internalMutation, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// =============================================================================
// HELPERS
// =============================================================================

/** Returns the user's current local hour (0-23) based on their saved timezone. */
function getLocalHour(timezone: string | undefined): number {
    try {
        const str = new Date().toLocaleString("en-US", {
            timeZone: timezone || "UTC",
            hour: "numeric",
            hour12: false,
        });
        return parseInt(str, 10);
    } catch {
        return new Date().getUTCHours();
    }
}

/** Returns today's date string (YYYY-MM-DD) in the user's local timezone. */
function getLocalDateString(timezone: string | undefined): string {
    try {
        const d = new Date();
        const [month, day, year] = d
            .toLocaleString("en-US", {
                timeZone: timezone || "UTC",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            })
            .split(/[\/, ]/);
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    } catch {
        return new Date().toISOString().slice(0, 10);
    }
}

/** Posts messages to the Expo Push API and cleans up "dead" tokens. */
async function sendPushMessages(ctx: any, messages: any[]) {
    if (messages.length === 0) return;
    try {
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: { "Accept": "application/json", "Content-Type": "application/json" },
            body: JSON.stringify(messages),
        });
        const result = await response.json();

        // Auto-cleanup: remove tokens that Expo says are no longer registered
        if (result.data) {
            for (let i = 0; i < result.data.length; i++) {
                const ticket = result.data[i];
                if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
                    const deadToken = messages[i].to;
                    console.log(`[Push] Token ${deadToken} is dead (DeviceNotRegistered). Cleaning up...`);
                    await ctx.runMutation(internal.notifications.clearPushTokenByToken, { token: deadToken });
                }
            }
        }
        console.log(`[Push] Sent ${messages.length} message(s).`);
    } catch (e) {
        console.error("[Push] Error sending messages:", e);
    }
}

// =============================================================================
// DEAD TOKEN CLEANUP MUTATION
// =============================================================================

export const clearPushTokenByToken = internalMutation({
    args: { token: v.string() },
    handler: async (ctx, { token }) => {
        const profiles = await ctx.db
            .query("profiles")
            .filter((q) => q.eq(q.field("push_token"), token))
            .collect();
        for (const profile of profiles) {
            await ctx.db.patch(profile._id, { push_token: undefined });
            console.log(`[Push] Cleared dead token from profile ${profile._id}`);
        }
    },
});

// =============================================================================
// SHARED INTERNAL QUERY: All users with valid push tokens
// =============================================================================

export const getUsersWithTokens = internalQuery({
    handler: async (ctx) => {
        const profiles = await ctx.db.query("profiles").collect();
        return profiles.filter(
            (p) => p.push_token && p.push_token.includes("ExponentPushToken")
        );
    },
});

// =============================================================================
// 1. MORNING MOTIVATION — 9:00 AM daily
// =============================================================================

export const sendDailyReminders = internalAction({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.runQuery(internal.notifications.getUsersWithTokens);
        const messages: any[] = [];
        for (const u of users) {
            if (getLocalHour(u.timezone) !== 9) continue;
            messages.push({
                to: u.push_token,
                sound: "default",
                title: "Time for your workout! 🏋️",
                body: `Hey ${u.full_name?.split(" ")[0] || "there"}, don't forget to log your meals and crush your daily goals!`,
                data: { screen: "workout" },
            });
        }
        await sendPushMessages(ctx, messages);
    },
});

// =============================================================================
// 2. WATER REMINDER — 9 AM, 1 PM, 6 PM (if < 4 glasses logged)
// =============================================================================

export const sendWaterReminder = internalAction({
    args: {},
    handler: async (ctx) => {
        const WATER_HOURS = [9, 13, 18];
        const MIN_GLASSES = 4;

        const users = await ctx.runQuery(internal.notifications.getUsersWithTokens);
        const messages: any[] = [];

        for (const user of users) {
            const localHour = getLocalHour(user.timezone);
            if (!WATER_HOURS.includes(localHour)) continue;

            const today = getLocalDateString(user.timezone);
            const stats = await ctx.runQuery(internal.notifications.getDailyStats, {
                userId: user.user_id,
                date: today,
            });

            const glasses = stats?.water_glasses ?? 0;
            if (glasses >= MIN_GLASSES) continue;

            messages.push({
                to: user.push_token,
                sound: "default",
                title: "Hydration Check! 💧",
                body: `You've had ${glasses} glasses today. Keep sipping — aim for 8!`,
                data: { screen: "home" },
            });
        }

        await sendPushMessages(ctx, messages);
    },
});

// =============================================================================
// 3. MEAL REMINDERS — Breakfast 10 AM, Lunch 1 PM, Dinner 9 PM
// =============================================================================

export const sendMealReminder = internalAction({
    args: {
        meal: v.string(), // "breakfast" | "lunch" | "dinner"
        hour: v.number(), // Local hour to trigger at
    },
    handler: async (ctx, { meal, hour }) => {
        const mealEmojis: Record<string, string> = {
            breakfast: "🍳",
            lunch: "🥗",
            dinner: "🌙",
        };

        const users = await ctx.runQuery(internal.notifications.getUsersWithTokens);
        const messages: any[] = [];

        for (const user of users) {
            if (getLocalHour(user.timezone) !== hour) continue;

            const today = getLocalDateString(user.timezone);
            const hasLogged = await ctx.runQuery(internal.notifications.hasMealLogged, {
                userId: user.user_id,
                date: today,
                mealType: meal,
            });

            if (hasLogged) continue;

            const emoji = mealEmojis[meal] || "🍽️";
            const name = user.full_name?.split(" ")[0] || "there";

            messages.push({
                to: user.push_token,
                sound: "default",
                title: `${meal.charAt(0).toUpperCase() + meal.slice(1)} time! ${emoji}`,
                body: `Hey ${name}, you haven't logged ${meal} yet. Stay on track with your calorie goal!`,
                data: { screen: "food" },
            });
        }

        await sendPushMessages(ctx, messages);
    },
});

// =============================================================================
// 4. EXERCISE REMINDER — 5:00 PM (if today's workout not completed)
// =============================================================================

export const sendExerciseReminder = internalAction({
    args: {},
    handler: async (ctx) => {
        const EXERCISE_HOUR = 17; // 5 PM local

        const users = await ctx.runQuery(internal.notifications.getUsersWithTokens);
        const messages: any[] = [];

        for (const user of users) {
            if (getLocalHour(user.timezone) !== EXERCISE_HOUR) continue;

            const today = getLocalDateString(user.timezone);
            const isCompleted = await ctx.runQuery(internal.notifications.isWorkoutCompleted, {
                userId: user.user_id,
                date: today,
            });

            if (isCompleted) continue;

            messages.push({
                to: user.push_token,
                sound: "default",
                title: "Workout time! 🏋️",
                body: `Hey ${user.full_name?.split(" ")[0] || "champ"}, your workout is waiting. 5 PM is the perfect time — let's go!`,
                data: { screen: "workout" },
            });
        }

        await sendPushMessages(ctx, messages);
    },
});

// =============================================================================
// 5. CHALLENGE STATUS — 9:00 AM daily (progress % + expiry countdown)
// =============================================================================

export const sendChallengeStatus = internalAction({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.runQuery(internal.notifications.getUsersWithTokens);
        const messages: any[] = [];

        for (const user of users) {
            if (getLocalHour(user.timezone) !== 9) continue;

            const activeChallenges = await ctx.runQuery(
                internal.notifications.getUserActiveChallenges,
                { userId: user.user_id }
            );

            for (const { userChallenge, challenge } of activeChallenges) {
                if (!challenge) continue;

                const endDate = new Date(challenge.end_time);
                const now = new Date();
                const daysLeft = Math.ceil(
                    (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                );

                const progressPct = challenge.target_value > 0
                    ? Math.round(((userChallenge.progress ?? 0) / challenge.target_value) * 100)
                    : 0;

                if (daysLeft === 3) {
                    messages.push({
                        to: user.push_token,
                        sound: "default",
                        title: `⏰ 3 days left in "${challenge.title}"!`,
                        body: `You're ${progressPct}% done. Don't lose your streak — finish strong!`,
                        data: { screen: "challenges" },
                    });
                } else if (daysLeft === 1) {
                    messages.push({
                        to: user.push_token,
                        sound: "default",
                        title: `🚨 Final day of "${challenge.title}"!`,
                        body: `This is your last chance — you're at ${progressPct}%. Give it everything!`,
                        data: { screen: "challenges" },
                    });
                } else if (daysLeft > 1) {
                    messages.push({
                        to: user.push_token,
                        sound: "default",
                        title: `💪 Challenge update: "${challenge.title}"`,
                        body: `You're ${progressPct}% done with ${daysLeft} days remaining. Keep it up!`,
                        data: { screen: "challenges" },
                    });
                }
            }
        }

        await sendPushMessages(ctx, messages);
    },
});

// =============================================================================
// 6. INACTIVE USER WIN-BACK — 10:00 AM daily (3-day & 7-day lapse)
// =============================================================================

export const sendInactiveUserReminder = internalAction({
    args: {},
    handler: async (ctx) => {
        const WINBACK_HOUR = 10; // 10 AM local
        const THRESHOLDS = [3, 7]; // days of inactivity

        const users = await ctx.runQuery(internal.notifications.getUsersWithTokens);
        const messages: any[] = [];
        const now = new Date();

        for (const user of users) {
            if (getLocalHour(user.timezone) !== WINBACK_HOUR) continue;
            if (!user.last_active_date) continue;

            const lastActive = new Date(user.last_active_date);
            lastActive.setHours(0, 0, 0, 0);
            const today = new Date(now);
            today.setHours(0, 0, 0, 0);
            const daysInactive = Math.round(
                (today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (!THRESHOLDS.includes(daysInactive)) continue;

            const name = user.full_name?.split(" ")[0] || "there";

            if (daysInactive === 3) {
                messages.push({
                    to: user.push_token,
                    sound: "default",
                    title: "We miss you! 👀",
                    body: `Hey ${name}, it's been 3 days. Your streak is at risk — come log a meal or workout!`,
                    data: { screen: "home" },
                });
            } else if (daysInactive === 7) {
                messages.push({
                    to: user.push_token,
                    sound: "default",
                    title: "7 days gone 😢",
                    body: `${name}, a week without NutrientTracker? Your goals are still waiting. Jump back in — one small step is all it takes!`,
                    data: { screen: "home" },
                });
            }
        }

        await sendPushMessages(ctx, messages);
    },
});

// =============================================================================
// INTERNAL QUERIES (used by the actions above)
// =============================================================================

export const getDailyStats = internalQuery({
    args: { userId: v.string(), date: v.string() },
    handler: async (ctx, { userId, date }) => {
        return await ctx.db
            .query("daily_stats")
            .withIndex("by_user_id_and_date", (q) =>
                q.eq("user_id", userId).eq("date", date)
            )
            .unique();
    },
});

export const hasMealLogged = internalQuery({
    args: { userId: v.string(), date: v.string(), mealType: v.string() },
    handler: async (ctx, { userId, date, mealType }) => {
        const log = await ctx.db
            .query("food_logs")
            .withIndex("by_user_id_and_date", (q) =>
                q.eq("user_id", userId).eq("date", date)
            )
            .filter((q) => q.eq(q.field("meal_type"), mealType))
            .first();
        return log !== null;
    },
});

export const isWorkoutCompleted = internalQuery({
    args: { userId: v.string(), date: v.string() },
    handler: async (ctx, { userId, date }) => {
        const plan = await ctx.db
            .query("workout_daily_plans")
            .withIndex("by_user_id_and_date", (q) =>
                q.eq("user_id", userId).eq("date", date)
            )
            .first();
        return plan?.is_completed ?? false;
    },
});

export const getUserActiveChallenges = internalQuery({
    args: { userId: v.string() },
    handler: async (ctx, { userId }) => {
        const userChallenges = await ctx.db
            .query("user_challenges")
            .withIndex("by_user_id", (q) => q.eq("user_id", userId))
            .filter((q) => q.eq(q.field("status"), "joined"))
            .collect();

        const results = [];
        for (const uc of userChallenges) {
            const challengeId = ctx.db.normalizeId("challenges", uc.challenge_id);
            if (!challengeId) continue;
            const challenge = await ctx.db.get(challengeId);
            if (!challenge || challenge.status !== "active") continue;
            if (new Date(challenge.end_time) < new Date()) continue;
            results.push({ userChallenge: uc, challenge });
        }
        return results;
    },
});

// =============================================================================
// TEST FUNCTION — runs immediately against all token holders
// npx convex run notifications:testPushNotification
// =============================================================================

export const testPushNotification = action({
    args: {},
    handler: async (ctx): Promise<{ success: boolean; count?: number; message?: string }> => {
        const users: any[] = await ctx.runQuery(internal.notifications.getUsersWithTokens);
        if (users.length === 0) {
            console.log("No users with valid push tokens found.");
            return { success: false, message: "No tokens found." };
        }

        const messages: any[] = users.map((user: any) => ({
            to: user.push_token,
            sound: "default",
            title: "Test Notification! 🚀",
            body: `Hello ${user.full_name?.split(" ")[0] || "User"}, your push system is officially working!`,
            data: { test: true },
        }));

        await sendPushMessages(ctx, messages);
        return { success: true, count: messages.length };
    },
});
