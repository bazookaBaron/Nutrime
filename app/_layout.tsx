import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { View, ActivityIndicator } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { PostHogProvider } from 'posthog-react-native';
import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { ClerkProvider } from '@clerk/clerk-expo';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexReactClient, useMutation } from 'convex/react';
import { Platform } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { UserProvider, useUser } from '../context/UserContext';
import { FoodProvider } from '../context/FoodContext';
import { ChallengesProvider } from '../context/ChallengesContext';
import { posthog } from '../src/config/posthog';
import tokenCache from '../utils/tokenCache';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { api } from '../convex/_generated/api';

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL as string);

// ---------------------------------------------------------------------------
// Inner nav — wrapped by all providers so it can read UserContext
// ---------------------------------------------------------------------------
function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { loading, hasCompletedOnboarding } = useUser() as any;
  const { isSignedIn, isLoaded: isAuthLoaded, userId } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // Push notification bridge: register device token and sync to Convex
  const { expoPushToken, timezone } = usePushNotifications();
  const updatePushToken = useMutation(api.users.updatePushToken);
  const tokenSyncedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isSignedIn || !userId || !expoPushToken?.data || !timezone) return;
    // Only call once per token value — avoids redundant DB writes
    if (tokenSyncedRef.current === expoPushToken.data) return;
    tokenSyncedRef.current = expoPushToken.data;

    updatePushToken({ userId, pushToken: expoPushToken.data, timezone })
      .then(() => console.log('[Notifications] Push token synced to Convex.'))
      .catch((e) => console.warn('[Notifications] Failed to sync push token:', e));
  }, [isSignedIn, userId, expoPushToken, timezone]);

  // Redirect logic — runs whenever auth state or onboarding status changes
  useEffect(() => {
    if (!isAuthLoaded || loading) return; // Wait for Clerk + Convex

    const inAuthGroup = segments[0] === 'auth';
    const inOnboardingGroup = segments[0] === 'onboarding';

    if (!isSignedIn) {
      // Not authenticated → send to login
      if (!inAuthGroup) {
        router.replace('/auth/login');
      }
    } else if (!hasCompletedOnboarding) {
      // Authenticated but not onboarded → send to onboarding
      if (!inOnboardingGroup) {
        router.replace('/onboarding/step1_goal');
      }
    } else {
      // Fully authenticated & onboarded → send to tabs
      if (inAuthGroup || inOnboardingGroup) {
        router.replace('/(tabs)');
      }
    }
  }, [isAuthLoaded, isSignedIn, loading, hasCompletedOnboarding, segments]);

  // Show a full-screen spinner until Clerk + Convex are both ready
  if (!isAuthLoaded || loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' }}>
        <ActivityIndicator size="large" color="#bef264" />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

// ---------------------------------------------------------------------------
// Root — providers only
// ---------------------------------------------------------------------------
export default function RootLayout() {
  const isWeb = Platform.OS === 'web';

  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY as string}
      tokenCache={isWeb ? undefined : tokenCache}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <PostHogProvider
          client={posthog}
          autocapture={{
            captureScreens: false,
            captureTouches: true,
            propsToCapture: ['testID'],
            maxElementsCaptured: 20,
          }}
        >
          <UserProvider>
            <FoodProvider>
              <ChallengesProvider>
                <RootLayoutNav />
              </ChallengesProvider>
            </FoodProvider>
          </UserProvider>
        </PostHogProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
