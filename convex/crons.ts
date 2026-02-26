import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// This cron job runs once every hour at the top of the hour.
// The `sendDailyReminders` action inside will independently filter
// users based on their timezone to ensure they only receive
// a push notification if their local time is 9:00 AM.
crons.hourly(
    "morning-reminder-push",
    { minuteUTC: 0 },
    internal.notifications.sendDailyReminders,
);

export default crons;
