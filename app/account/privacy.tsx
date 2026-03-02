import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

export default function PrivacyPolicyScreen() {
    const router = useRouter();

    const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionText}>{children}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                    <ChevronLeft size={22} color="#A3E635" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Privacy Policy</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                <Text style={styles.lastUpdated}>Last Updated • January 2026</Text>

                <Section title="Your Data Matters">
                    We are committed to protecting your privacy. This policy explains how we collect, use, and secure your data while you use our fitness app.
                </Section>

                <Section title="Information We Collect">
                    • Height, weight, age, gender{"\n"}
                    • Lifestyle & activity level{"\n"}
                    • Calorie intake & burned calories{"\n"}
                    • Macro tracking (Protein, Carbs, Fat){"\n"}
                    • Workout performance & progress data
                </Section>

                <Section title="How We Use Your Data">
                    Your information helps us personalize your workout schedule, calculate calorie targets, generate macro analytics, and improve your fitness experience.
                </Section>

                <Section title="Analytics Tab">
                    The analytics section processes your fitness data to display progress charts, macro distribution, calorie trends, and performance insights.
                </Section>

                <Section title="Challenges & Competition">
                    When you join challenges, your username, rankings, streaks, or progress stats may be visible to other participants.
                </Section>

                <Section title="Data Protection">
                    Your data is securely stored and encrypted. We do not sell your personal or health information to third parties.
                </Section>

                <Section title="Your Control">
                    You can update or delete your personal data anytime from your profile settings.
                </Section>

                <View style={{ height: 40 }} />

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0B0F14', // darker than other screens for premium feel
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 10,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1A1F26',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2A2F38',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    lastUpdated: {
        color: '#6B7280',
        fontSize: 13,
        marginBottom: 20,
    },
    section: {
        backgroundColor: '#141A21',
        padding: 18,
        borderRadius: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#1F2937',
    },
    sectionTitle: {
        color: '#A3E635', // neon accent like your app
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 8,
    },
    sectionText: {
        color: '#D1D5DB',
        fontSize: 14,
        lineHeight: 22,
    },
});