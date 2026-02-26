// ─── Analytics Utilities ────────────────────────────────────────────────────
// Pure computation helpers used by analytics.tsx and chart components.
// Keep this file free of React / UI imports so it can be unit-tested easily.

export type DateFilter = 'Today' | '7 Days' | '30 Days' | 'Custom';

export interface DateRange {
    start: string; // YYYY-MM-DD
    end: string;   // YYYY-MM-DD
}

export interface NutrientTotals {
    protein: number;
    carbs: number;
    fat: number;
    cholesterol: number;
    iron: number;
    calcium: number;
    magnesium: number;
}

export interface DailyKcal {
    date: string;   // YYYY-MM-DD
    kcal: number;
    label: string;  // Short display label, e.g. "Mon" or "21"
}

// ─── Recommended Daily Values (WHO / NIH Defaults) ──────────────────────────
export const RECOMMENDED_DAILY: NutrientTotals = {
    protein: 50,       // g
    carbs: 275,        // g
    fat: 78,           // g
    cholesterol: 300,  // mg
    iron: 18,          // mg
    calcium: 1000,     // mg
    magnesium: 420,    // mg
};

export interface NutrientMeta {
    key: keyof NutrientTotals;
    label: string;
    unit: string;
    color: string;
    bgColor: string;
}

export const NUTRIENT_META: NutrientMeta[] = [
    { key: 'protein', label: 'Protein', unit: 'g', color: '#eab308', bgColor: 'rgba(234,179,8,0.12)' },
    { key: 'carbs', label: 'Carbs', unit: 'g', color: '#bef264', bgColor: 'rgba(190,242,100,0.12)' },
    { key: 'fat', label: 'Fat', unit: 'g', color: '#f97316', bgColor: 'rgba(249,115,22,0.12)' },
    { key: 'cholesterol', label: 'Cholesterol', unit: 'mg', color: '#f43f5e', bgColor: 'rgba(244,63,94,0.12)' },
    { key: 'iron', label: 'Iron', unit: 'mg', color: '#a78bfa', bgColor: 'rgba(167,139,250,0.12)' },
    { key: 'calcium', label: 'Calcium', unit: 'mg', color: '#38bdf8', bgColor: 'rgba(56,189,248,0.12)' },
    { key: 'magnesium', label: 'Magnesium', unit: 'mg', color: '#34d399', bgColor: 'rgba(52,211,153,0.12)' },
];

// ─── Date Range Helpers ──────────────────────────────────────────────────────

/** Return ISO date string "YYYY-MM-DD" for today. */
export function today(baseDateStr?: string): string {
    if (baseDateStr) return baseDateStr;
    // Fallback to local device time (not UTC toISOString)
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Compute a start/end DateRange from a named filter. */
export function getDateRangeForFilter(filter: DateFilter, baseDateStr: string, custom?: DateRange): DateRange {
    if (filter === 'Custom' && custom) return custom;

    const end = new Date(baseDateStr);
    const start = new Date(baseDateStr);

    if (filter === '7 Days') {
        start.setDate(end.getDate() - 6);
    } else if (filter === '30 Days') {
        start.setDate(end.getDate() - 29);
    }
    // 'Today' → same day

    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
    };
}

/** Enumerate all YYYY-MM-DD dates in [start, end] inclusive. */
export function datesInRange(start: string, end: string): string[] {
    const dates: string[] = [];
    const cursor = new Date(start);
    const endDate = new Date(end);
    while (cursor <= endDate) {
        dates.push(cursor.toISOString().split('T')[0]);
        cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
}

/** Short display label for a date string: weekday abbrev for ≤7 days, day-of-month otherwise. */
function dateLabel(dateStr: string, numDays: number): string {
    const d = new Date(dateStr);
    if (numDays <= 7) {
        return d.toLocaleDateString('en-US', { weekday: 'short' });
    }
    return String(d.getDate());
}

// ─── Aggregation ─────────────────────────────────────────────────────────────

/** Aggregate dailyLog entries by date, summing calories per day. */
export function aggregateDailyKcal(
    dailyLog: any[],
    start: string,
    end: string,
): DailyKcal[] {
    // Build map: date -> kcal
    const map: Record<string, number> = {};
    for (const item of dailyLog) {
        const d: string = item.date;
        if (d >= start && d <= end) {
            map[d] = (map[d] ?? 0) + (Number(item.calories) || 0);
        }
    }

    const dates = datesInRange(start, end);
    const numDays = dates.length;

    return dates.map(date => ({
        date,
        kcal: Math.round(map[date] ?? 0),
        label: dateLabel(date, numDays),
    }));
}

/** Aggregate all nutrient fields for logs in [start, end]. */
export function aggregateNutrients(
    dailyLog: any[],
    start: string,
    end: string,
): NutrientTotals {
    const totals: NutrientTotals = {
        protein: 0,
        carbs: 0,
        fat: 0,
        cholesterol: 0,
        iron: 0,
        calcium: 0,
        magnesium: 0,
    };

    for (const item of dailyLog) {
        if (item.date < start || item.date > end) continue;
        totals.protein += Number(item.protein) || 0;
        totals.carbs += Number(item.carbs) || 0;
        totals.fat += Number(item.fat) || 0;
        totals.cholesterol += Number(item.cholesterol) || 0;
        totals.iron += Number(item.iron) || 0;
        totals.calcium += Number(item.calcium) || 0;
        totals.magnesium += Number(item.magnesium) || 0;
    }

    // Round all values
    (Object.keys(totals) as (keyof NutrientTotals)[]).forEach(k => {
        totals[k] = Math.round(totals[k] * 10) / 10;
    });

    return totals;
}

/** Clamp a percentage to [0, 1] for display; use the raw value for over-target detection. */
export function clampPercent(actual: number, target: number): number {
    if (target <= 0) return 0;
    return Math.min(actual / target, 1);
}

/** Raw percentage (can exceed 1.0 when over target). */
export function rawPercent(actual: number, target: number): number {
    if (target <= 0) return 0;
    return actual / target;
}
