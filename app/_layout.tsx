import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { UserProvider } from '../context/UserContext';
import { FoodProvider } from '../context/FoodContext';
import { ChallengesProvider } from '../context/ChallengesContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

import { useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { useRouter, useSegments } from 'expo-router';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { user, loading, hasCompletedOnboarding } = useUser();
  const segments = useSegments();
  const router = useRouter();

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
    <UserProvider>
      <FoodProvider>
        <ChallengesProvider>
          <RootLayoutNav />
        </ChallengesProvider>
      </FoodProvider>
    </UserProvider>
  );
}
