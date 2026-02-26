/**
 * Utility functions for date handling across the app.
 */

/**
 * Returns the current date in YYYY-MM-DD format, respecting the user's timezone.
 */
export const getTodayISODate = (timeZone = null) => {
    try {
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: timeZone || undefined
        };
        const formatter = new Intl.DateTimeFormat('en-CA', options);
        return formatter.format(new Date());
    } catch (e) {
        console.warn("Timezone error in getTodayISODate, falling back to local:", e);
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
};

/**
 * Returns a date string in YYYY-MM-DD format for a given Date object.
 */
export const formatISODate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Returns the yesterday's date in YYYY-MM-DD format.
 */
export const getYesterdayISODate = (timeZone = null) => {
    const date = new Date();
    date.setDate(date.getDate() - 1);

    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: timeZone || undefined
    };
    const formatter = new Intl.DateTimeFormat('en-CA', options);
    return formatter.format(date);
};
