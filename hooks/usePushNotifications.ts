import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

export interface PushNotificationState {
    expoPushToken?: Notifications.ExpoPushToken;
    notification?: Notifications.Notification;
    timezone?: string;
}

export const usePushNotifications = (): PushNotificationState => {
    const [expoPushToken, setExpoPushToken] = useState<Notifications.ExpoPushToken>();
    const [notification, setNotification] = useState<Notifications.Notification>();
    const [timezone, setTimezone] = useState<string>();

    const notificationListener = useRef<Notifications.EventSubscription | null>(null);
    const responseListener = useRef<Notifications.EventSubscription | null>(null);

    async function registerForPushNotificationsAsync() {
        let token;

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'Daily Reminders',
                description: 'Reminders to log your meals and workouts.',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#bef264',
            });
        }

        const isPhysicalDevice = Platform.OS !== 'web'; // Expo Go Android checks usually fail if device SDK is not fully used, but physical device check is safer.

        if (isPhysicalDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.warn('Failed to get push token for push notification! User denied permission.');
                return;
            }

            try {
                // Determine Project ID dynamically from app.json
                const projectId =
                    Constants?.expoConfig?.extra?.eas?.projectId ??
                    Constants?.easConfig?.projectId;

                if (!projectId) {
                    console.warn('Project ID not found in app.json. Ensure expo.extra.eas.projectId is set.');
                }

                token = await Notifications.getExpoPushTokenAsync({
                    projectId,
                });
            } catch (e) {
                console.warn('Error fetching standard Expo push token (check Firebase setup for Android):', e);
            }
        } else {
            console.log('Must use a physical device to receive Push Notifications');
        }

        return token;
    }

    const getTimezone = () => {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch (e) {
            console.warn("Could not determine local timezone, defaulting to UTC.", e);
            return 'UTC';
        }
    };

    useEffect(() => {
        registerForPushNotificationsAsync().then(token => setExpoPushToken(token));
        setTimezone(getTimezone());

        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            setNotification(notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log(response);
        });

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, []);

    return {
        expoPushToken,
        notification,
        timezone
    };
};
