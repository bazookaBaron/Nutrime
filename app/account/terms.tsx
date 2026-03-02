import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

export default function TermsScreen() {
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
                <Text style={styles.headerTitle}>Terms of Service</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                <Text style={styles.lastUpdated}>Last Updated • January 2026</Text>

                <Section title="Agreement to Terms">
                    By accessing or using this fitness application, you agree to be bound by these Terms of Service. If you do not agree, please discontinue use of the app.
                </Section>
                <Section title="Health Disclaimer">
                    This app provides workout plans, calorie tracking, and fitness recommendations for informational purposes only. It is not a substitute for professional medical advice. Always consult a healthcare provider before beginning any fitness program.
                </Section>

                <Section title="User Responsibilities">
                    • Provide accurate personal and fitness information{"\n"}
                    • Use the app in a lawful manner{"\n"}
                    • Do not misuse challenges, rankings, or analytics features{"\n"}
                    • Respect other users in competitions and challenges
                </Section>

                <Section title="Challenges & Competitions">
                    Participation in challenges is voluntary. Rankings and performance metrics are generated automatically based on user data. We reserve the right to remove inappropriate or fraudulent activity.
                </Section>

                <Section title="Intellectual Property">
                    All app content, workout plans, graphics, and branding are the property of the app and may not be copied, distributed, or reproduced without permission.
                </Section>

                <Section title="Limitation of Liability">
                    We are not responsible for injuries, health complications, or damages resulting from workouts, exercises, or recommendations provided within the app.
                </Section>

                <Section title="Modifications">
                    We may update these Terms of Service at any time. Continued use of the app after changes are posted constitutes acceptance of those changes.
                </Section>

                <View style={{ height: 40 }} />

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0B0F14',
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
        color: '#A3E635',
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