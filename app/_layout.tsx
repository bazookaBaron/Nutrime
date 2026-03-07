import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import * as WebBrowser from 'expo-web-browser';
import * as SplashScreen from 'expo-splash-screen';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

// Prevent native splash screen from auto-hiding to eliminate any flash entirely.
SplashScreen.preventAutoHideAsync();

// Must be called at module level so the OAuth browser session is dismissed
// the moment the app receives the deep-link callback, regardless of which
// route Expo Router resolves to.
WebBrowser.maybeCompleteAuthSession();

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
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

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

  // ---------------------------------------------------------------------------
  // Auth transition guard
  // ---------------------------------------------------------------------------
  // When isSignedIn changes (especially true→false or false→true after OAuth),
  // we lock the overlay for a minimum settling period so Convex queries &
  // UserContext have time to reflect the new state before any redirect fires.
  const prevIsSignedIn = useRef<boolean | undefined>(undefined);
  const [authTransitioning, setAuthTransitioning] = useState(false);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isAuthLoaded) return;
    // Detect a change in signed-in state
    if (prevIsSignedIn.current !== isSignedIn) {
      prevIsSignedIn.current = isSignedIn;
      // Block navigation while the new auth state propagates to Convex
      setAuthTransitioning(true);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = setTimeout(() => {
        setAuthTransitioning(false);
      }, 600); // 600 ms is enough for Convex to return the profile query
    }
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, [isAuthLoaded, isSignedIn]);

  // Lift the transition blocker as soon as BOTH Clerk and Convex agree
  useEffect(() => {
    if (authTransitioning && isAuthLoaded && !loading) {
      // Both layers have settled — we can release immediately
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      setAuthTransitioning(false);
    }
  }, [authTransitioning, isAuthLoaded, loading]);

  // ---------------------------------------------------------------------------
  // Redirect logic — runs whenever auth state or onboarding status changes
  // ---------------------------------------------------------------------------
  const inAuthGroup = segments[0] === 'auth';
  const inOnboardingGroup = segments[0] === 'onboarding';
  const isIndex = !segments[0];

  const isShowingLoader = !isAuthLoaded || loading || authTransitioning;

  const isRedirecting = useMemo(() => {
    if (isShowingLoader) return false;
    if (!isSignedIn && isAuthLoaded && (!inAuthGroup && !isIndex)) return true; // Let timeout handle both
    if (!isSignedIn && isAuthLoaded && isIndex) return true;
    if (isSignedIn && !hasCompletedOnboarding && (!inOnboardingGroup && !isIndex)) return true;
    if (isSignedIn && !hasCompletedOnboarding && isIndex) return true;
    if (isSignedIn && hasCompletedOnboarding && (inAuthGroup || inOnboardingGroup || isIndex)) return true;
    return false;
  }, [isShowingLoader, isSignedIn, isAuthLoaded, hasCompletedOnboarding, inAuthGroup, inOnboardingGroup, isIndex]);

  // Hide the native splash screen ONLY when we are stable and not redirecting.
  useEffect(() => {
    if (!isShowingLoader && !isRedirecting) {
      SplashScreen.hideAsync();
    }
  }, [isShowingLoader, isRedirecting]);

  useEffect(() => {
    // Only fire redirects once everything has settled
    if (isShowingLoader) return;

    const timer = setTimeout(() => {
      if (!isSignedIn && isAuthLoaded) {
        if (!inAuthGroup) router.replace('/auth/login');
      } else if (!hasCompletedOnboarding) {
        if (!inOnboardingGroup) router.replace('/onboarding/step1_goal');
      } else {
        if (inAuthGroup || inOnboardingGroup || isIndex) router.replace('/(tabs)');
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isShowingLoader, isSignedIn, isAuthLoaded, hasCompletedOnboarding, segments, isIndex]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* 
        Always mount the Stack so the router state stays intact.
        During auth transitions we show an absolute-positioned overlay to
        prevent any UI flash (login page flickering before redirect).
      */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>

      {(isShowingLoader || isRedirecting) && (
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

  useEffect(() => {
    if (isWeb) return;

    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
    const iosApiKey = 'test_lwqFgxakImvSjsbAFBdAJGgAxdJ';
    const androidApiKey = 'test_lwqFgxakImvSjsbAFBdAJGgAxdJ';

    if (Platform.OS === 'ios') {
      Purchases.configure({ apiKey: iosApiKey });
    } else if (Platform.OS === 'android') {
      Purchases.configure({ apiKey: androidApiKey });
    }
  }, [isWeb]);

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
