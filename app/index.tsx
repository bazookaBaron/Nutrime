import { Redirect } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useUser } from '../context/UserContext';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
    const { isLoaded, isSignedIn } = useAuth();
    const { loading, hasCompletedOnboarding } = useUser() as any;

    if (!isLoaded || loading) {
        // Render identical loader to the overlay so transitions are smooth
        return (
            <View style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#bef264" />
            </View>
        );
    }

    if (!isSignedIn) {
        return <Redirect href="/auth/login" />;
    }

    if (!hasCompletedOnboarding) {
        return <Redirect href="/onboarding/step1_goal" />;
    }

    return <Redirect href="/(tabs)" />;
}
