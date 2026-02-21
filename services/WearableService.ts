import AppleHealthKit, {
    HealthValue,
    HealthKitPermissions,
} from 'react-native-health';
import {
    initialize,
    requestPermission,
    readRecords,
    getSdkStatus,
    SdkAvailabilityStatus,
    getGrantedPermissions,
} from 'react-native-health-connect';
import { Platform } from 'react-native';

const permissions = {
    permissions: {
        read: [
            AppleHealthKit.Constants.Permissions.Steps,
            AppleHealthKit.Constants.Permissions.HeartRate,
            AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
            AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
            AppleHealthKit.Constants.Permissions.SleepAnalysis,
        ],
        write: [],
    },
} as HealthKitPermissions;

export interface DailyWearableData {
    date: string;
    steps: number;
    heart_rate_avg: number;
    calories_active: number;
    sleep_minutes: number;
    sleep_start_time?: string; // ISO string of earliest sleep start
    distance_km: number;
}

class WearableService {
    private isInitialized = false;

    async init(): Promise<boolean> {
        if (this.isInitialized) return true;

        try {
            if (Platform.OS === 'ios') {
                return new Promise((resolve) => {
                    AppleHealthKit.initHealthKit(permissions, (err) => {
                        if (err) {
                            console.log('Error initializing Healthkit: ', err);
                            resolve(false);
                            return;
                        }
                        this.isInitialized = true;
                        resolve(true);
                    });
                });
            } else if (Platform.OS === 'android') {
                const status = await getSdkStatus();

                if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE) {
                    throw new Error('Health Connect is not installed on this device.');
                }
                if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
                    throw new Error('Health Connect requires an update.');
                }

                const initialized = await initialize();
                if (!initialized) {
                    console.error('Health Connect: initialization failed');
                    return false;
                }

                this.isInitialized = true;
                return true;
            }
        } catch (e) {
            console.error('Failed to init wearable service', e);
            throw e; // Re-throw to be caught by the UI
        }
        return false;
    }

    /**
     * Specifically triggers the UI permission prompt.
     */
    async requestPermissions(): Promise<boolean> {
        // First, check if we already have permissions to avoid the crashing UI prompt
        const alreadyConnected = await this.checkConnection();
        if (alreadyConnected) return true;

        try {
            if (Platform.OS === 'ios') {
                return await this.init();
            } else if (Platform.OS === 'android') {
                const initialized = await initialize();
                if (!initialized) return false;

                await new Promise(resolve => setTimeout(resolve, 1000));

                await requestPermission([
                    { accessType: 'read', recordType: 'Steps' },
                    { accessType: 'read', recordType: 'HeartRate' },
                    { accessType: 'read', recordType: 'Distance' },
                    { accessType: 'read', recordType: 'TotalCaloriesBurned' },
                    { accessType: 'read', recordType: 'SleepSession' },
                ]);

                this.isInitialized = true;
                return true;
            }
        } catch (e) {
            console.error('Permission request failed', e);
            return false;
        }
        return false;
    }

    /**
     * Checks if permissions are already granted without showing a UI prompt.
     */
    async checkConnection(): Promise<boolean> {
        try {
            if (Platform.OS === 'ios') {
                // Approximate for iOS
                return this.isInitialized;
            } else if (Platform.OS === 'android') {
                await initialize();
                const granted = await getGrantedPermissions();
                // If we have at least one permission, we consider ourselves "Connected"
                if (granted && granted.length > 0) {
                    this.isInitialized = true;
                    return true;
                }
            }
        } catch (e) {
            console.error('Check connection failed', e);
        }
        return false;
    }

    /**
     * Fetches history for the last N days directly from the device.
     */
    async getHistory(days: number = 30): Promise<DailyWearableData[]> {
        if (!this.isInitialized) {
            const success = await this.init();
            if (!success) {
                console.log("Failed to initialize wearable service during history fetch.");
                return [];
            }
        }

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        if (Platform.OS === 'ios') {
            return await this.fetchIOSData(startDate.toISOString(), endDate.toISOString());
        } else if (Platform.OS === 'android') {
            return await this.fetchAndroidData(startDate, endDate);
        }
        return [];
    }

    // --- iOS Implementation ---
    private async fetchIOSData(startDate: string, endDate: string): Promise<DailyWearableData[]> {
        const options = { startDate, endDate, includeManuallyAdded: false };
        const dailyData: Record<string, DailyWearableData> = {};

        // Helper to ensure day entry exists
        const getDayKey = (dateStr: string) => dateStr.split('T')[0];
        const initDay = (key: string) => {
            if (!dailyData[key]) {
                dailyData[key] = {
                    date: key,
                    steps: 0,
                    heart_rate_avg: 0,
                    calories_active: 0,
                    sleep_minutes: 0,
                    distance_km: 0
                };
            }
        };

        // 1. Steps
        const stepsConf = new Promise<void>((resolve) => {
            AppleHealthKit.getDailyStepCountSamples(options, (err, results) => {
                if (!err && results) {
                    results.forEach((sample) => {
                        const key = getDayKey(sample.startDate); // Format YYYY-MM-DD
                        initDay(key);
                        dailyData[key].steps = sample.value;
                    });
                }
                resolve();
            });
        });

        // 2. Distance
        const distConf = new Promise<void>((resolve) => {
            AppleHealthKit.getDailyDistanceWalkingRunningSamples(options, (err, results) => {
                if (!err && results) {
                    results.forEach((sample) => {
                        const key = getDayKey(sample.startDate);
                        initDay(key);
                        // Value is usually in meters? Docs say: "value: number" (unit: meter)
                        dailyData[key].distance_km = parseFloat((sample.value / 1000).toFixed(2));
                    });
                }
                resolve();
            });
        });

        // 3. Heart Rate (Avg)
        // We'll use getHeartRateSamples and aggregate manually per day since there isn't a direct "Daily Avg" method in provided types usually.
        // Actually, let's skip high-res heart rate for now to keep it fast, or use a sample query appropriately.
        // We'll leave it as 0 for now or implement a basic aggregation if critical.
        // The user prompt asked for "Apple Watch (via Apple Health)" heart rate.
        // Let's try to get heart rate samples.
        const hrConf = new Promise<void>((resolve) => {
            const hrOptions = { startDate, endDate, ascending: true };
            AppleHealthKit.getHeartRateSamples(hrOptions as any, (err, results) => {
                if (!err && results) {
                    const sums: Record<string, { sum: number, count: number }> = {};
                    results.forEach(sample => {
                        const key = getDayKey(sample.startDate);
                        if (!sums[key]) sums[key] = { sum: 0, count: 0 };
                        sums[key].sum += sample.value;
                        sums[key].count += 1;
                    });

                    Object.keys(sums).forEach(key => {
                        initDay(key);
                        dailyData[key].heart_rate_avg = Math.round(sums[key].sum / sums[key].count);
                    });
                }
                resolve();
            });
        });


        // 4. Sleep
        const sleepConf = new Promise<void>((resolve) => {
            AppleHealthKit.getSleepSamples(options as any, (err, results) => {
                if (!err && results) {
                    results.forEach(sample => {
                        const key = getDayKey(sample.startDate);
                        initDay(key);
                        const start = new Date(sample.startDate).getTime();
                        const end = new Date(sample.endDate).getTime();
                        const minutes = (end - start) / 1000 / 60;
                        if ((sample.value as any) === 'ASLEEP' || (sample.value as any) === 'INBED') {
                            dailyData[key].sleep_minutes += minutes;
                            if (!dailyData[key].sleep_start_time || new Date(sample.startDate) < new Date(dailyData[key].sleep_start_time!)) {
                                dailyData[key].sleep_start_time = sample.startDate;
                            }
                        }
                    });
                }
                resolve();
            })
        });

        await Promise.all([stepsConf, distConf, hrConf, sleepConf]);

        // Sort by date properties
        return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
    }

    // --- Android Implementation ---
    private async fetchAndroidData(startDate: Date, endDate: Date): Promise<DailyWearableData[]> {
        const dailyData: Record<string, DailyWearableData> = {};
        const getDayKey = (date: string) => date;
        const initDay = (key: string) => {
            if (!dailyData[key]) {
                dailyData[key] = {
                    date: key,
                    steps: 0,
                    heart_rate_avg: 0,
                    calories_active: 0,
                    sleep_minutes: 0,
                    sleep_start_time: undefined,
                    distance_km: 0
                };
            }
        };

        try {
            // Get Steps
            const steps = await readRecords('Steps', {
                timeRangeFilter: {
                    operator: 'between',
                    startTime: startDate.toISOString(),
                    endTime: endDate.toISOString()
                }
            });

            steps.records.forEach((record) => {
                const key = record.startTime.split('T')[0];
                initDay(key);
                dailyData[key].steps += record.count;
            });

            // Get Distance
            const distance = await readRecords('Distance', {
                timeRangeFilter: {
                    operator: 'between',
                    startTime: startDate.toISOString(),
                    endTime: endDate.toISOString()
                }
            });

            distance.records.forEach((record) => {
                const key = record.startTime.split('T')[0];
                initDay(key);
                dailyData[key].distance_km += (record.distance.inMeters / 1000);
            });

            // Get Heart Rate
            const heartRate = await readRecords('HeartRate', {
                timeRangeFilter: {
                    operator: 'between',
                    startTime: startDate.toISOString(),
                    endTime: endDate.toISOString()
                }
            });

            // Heart rate records are samples. We need to average them per day.
            const hrSums: Record<string, { sum: number, count: number }> = {};
            heartRate.records.forEach(record => {
                const key = record.startTime.split('T')[0];
                record.samples.forEach(sample => {
                    if (!hrSums[key]) hrSums[key] = { sum: 0, count: 0 };
                    hrSums[key].sum += sample.beatsPerMinute;
                    hrSums[key].count += 1;
                });
            });

            Object.keys(hrSums).forEach(key => {
                initDay(key);
                dailyData[key].heart_rate_avg = Math.round(hrSums[key].sum / hrSums[key].count);
            });


            // Get Sleep
            const sleep = await readRecords('SleepSession', {
                timeRangeFilter: {
                    operator: 'between',
                    startTime: startDate.toISOString(),
                    endTime: endDate.toISOString()
                }
            });

            sleep.records.forEach((record) => {
                const key = record.startTime.split('T')[0];
                initDay(key);
                const durationMinutes = (new Date(record.endTime).getTime() - new Date(record.startTime).getTime()) / 1000 / 60;
                dailyData[key].sleep_minutes += durationMinutes;

                if (!dailyData[key].sleep_start_time || new Date(record.startTime) < new Date(dailyData[key].sleep_start_time!)) {
                    dailyData[key].sleep_start_time = record.startTime;
                }
            });

        } catch (e) {
            console.warn("Error fetching Android health data", e);
        }

        return Object.values(dailyData).map(d => ({
            ...d,
            distance_km: parseFloat(d.distance_km.toFixed(2)),
            sleep_minutes: Math.round(d.sleep_minutes)
        })).sort((a, b) => a.date.localeCompare(b.date));
    }
}

export const wearableService = new WearableService();
