import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// ─── MORNING MOTIVATION ──────────────────────────────────────────────────────
// Runs every hour; internal action filters to users where local time is 9 AM.
crons.hourly(
    "morning-reminder-push",
    { minuteUTC: 0 },
    internal.notifications.sendDailyReminders
);

// ─── WATER REMINDER ───────────────────────────────────────────────────────────
// Runs every hour; internal action fires for users at 9 AM, 1 PM, or 6 PM
// local time, and only if they have fewer than 4 glasses logged.
crons.hourly(
    "water-reminder-push",
    { minuteUTC: 5 },
    internal.notifications.sendWaterReminder
);

// ─── MEAL REMINDERS ───────────────────────────────────────────────────────────
// Each runs every hour; internal action checks local hour + whether that meal
// has already been logged for the day.

crons.hourly(
    "breakfast-reminder-push",
    { minuteUTC: 10 },
    internal.notifications.sendMealReminder,
    { meal: "breakfast", hour: 10 }
);

crons.hourly(
    "lunch-reminder-push",
    { minuteUTC: 10 },
    internal.notifications.sendMealReminder,
    { meal: "lunch", hour: 13 }
);

crons.hourly(
    "dinner-reminder-push",
    { minuteUTC: 10 },
    internal.notifications.sendMealReminder,
    { meal: "dinner", hour: 21 }
);

// ─── EXERCISE REMINDER ────────────────────────────────────────────────────────
// Runs every hour; internal action fires for users at 5 PM local time
// only if today's workout plan is not yet marked as completed.
crons.hourly(
    "exercise-reminder-push",
    { minuteUTC: 15 },
    internal.notifications.sendExerciseReminder
);

// ─── CHALLENGE STATUS & COUNTDOWN ─────────────────────────────────────────────
// Runs every hour; internal action fires at 9 AM local time.
// Sends a daily progress % update + special warnings at 3 days and 1 day left.
crons.hourly(
    "challenge-status-push",
    { minuteUTC: 20 },
    internal.notifications.sendChallengeStatus
);

// ─── INACTIVE USER WIN-BACK ────────────────────────────────────────────────────
// Runs every hour; internal action fires at 10 AM local time.
// Sends a re-engagement notification if the user hasn't opened the app
// in exactly 3 days or 7 days (based on last_active_date in their profile).
crons.hourly(
    "inactive-user-winback-push",
    { minuteUTC: 25 },
    internal.notifications.sendInactiveUserReminder
);

export default crons;
