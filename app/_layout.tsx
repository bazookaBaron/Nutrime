import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

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
import { useEffect, useRef, useState, useMemo } from 'react';
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
import { AlertProvider } from '../context/AlertContext';
import CustomAlert from '../components/Modals/CustomAlert';

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

  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    if (isAuthLoaded && !loading) {
      setInitialLoad(false);
    }
  }, [isAuthLoaded, loading]);

  // Redirect logic — runs whenever auth state or onboarding status changes
  const inAuthGroup = segments[0] === 'auth';
  const inOnboardingGroup = segments[0] === 'onboarding';

  const isRedirecting = useMemo(() => {
    if (!isAuthLoaded || loading) return false;
    if (!isSignedIn && !inAuthGroup) return true;
    if (isSignedIn && !hasCompletedOnboarding && !inOnboardingGroup) return true;
    if (isSignedIn && hasCompletedOnboarding && (inAuthGroup || inOnboardingGroup)) return true;
    return false;
  }, [isAuthLoaded, loading, isSignedIn, hasCompletedOnboarding, inAuthGroup, inOnboardingGroup]);

  useEffect(() => {
    if (!isAuthLoaded || loading) return; // Wait for Clerk + Convex

    // Use a small timeout to let the router mount properly before redirecting,
    // avoiding navigation being swallowed by Expo Router.
    const timer = setTimeout(() => {
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
    }, 10);

    return () => clearTimeout(timer);
  }, [isAuthLoaded, isSignedIn, loading, hasCompletedOnboarding, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* 
        Always mount the Stack so the router state stays intact.
        During auth transitions (when `loading` is true but we haven't redirected yet)
        we show an absolute-positioned overlay to prevent UI flash.
      */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>

      {(!isAuthLoaded || loading || initialLoad || isRedirecting) && (
        <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a', zIndex: 9999 }]}>
          <ActivityIndicator size="large" color="#bef264" />
        </View>
      )}

      <StatusBar style="auto" />
      <CustomAlert />
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
          <AlertProvider>
            <UserProvider>
              <FoodProvider>
                <ChallengesProvider>
                  <RootLayoutNav />
                </ChallengesProvider>
              </FoodProvider>
            </UserProvider>
          </AlertProvider>
        </PostHogProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
