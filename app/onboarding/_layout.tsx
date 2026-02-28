
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="step1_goal" />
            <Stack.Screen name="step2_stats" />
            <Stack.Screen name="step3_activity" />
            <Stack.Screen name="step3b_target" />
            <Stack.Screen name="step4_result" />
        </Stack>
    );
}
