import 'react-native-url-polyfill/auto';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { PostHogProvider } from 'posthog-react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { UserProvider } from '../context/UserContext';
import { FoodProvider } from '../context/FoodContext';
import { ChallengesProvider } from '../context/ChallengesContext';
import { posthog } from '../src/config/posthog';

export const unstable_settings = {
  anchor: '(tabs)',
};

import { useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { useRouter, useSegments, usePathname, useGlobalSearchParams } from 'expo-router';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { user, loading, hasCompletedOnboarding } = useUser();
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const previousPathname = useRef<string | undefined>(undefined);

  // Manual screen tracking for Expo Router
  // @see https://docs.expo.dev/router/reference/screen-tracking/
  useEffect(() => {
    if (previousPathname.current !== pathname) {
      posthog.screen(pathname, {
        previous_screen: previousPathname.current ?? null,
        ...params,
      });
      previousPathname.current = pathname;
    }
  }, [pathname, params]);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';
    const inOnboardingGroup = segments[0] === 'onboarding';

    if (!user && !inAuthGroup) {
      // Redirect to the login page if not logged in
      router.replace('/auth/login');
    } else if (user) {
      if (!hasCompletedOnboarding && !inOnboardingGroup) {
        // Redirect to onboarding if profile is incomplete
        router.replace('/onboarding/step1_goal');
      } else if (hasCompletedOnboarding && (inAuthGroup || inOnboardingGroup)) {
        // Redirect to main app if onboarding is done
        router.replace('/(tabs)');
      }
    }
  }, [user, loading, hasCompletedOnboarding, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <PostHogProvider
      client={posthog}
      autocapture={{
        captureScreens: false, // Manual tracking with Expo Router
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
  );
}
