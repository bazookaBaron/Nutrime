import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

export default function AboutScreen() {
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
                <Text style={styles.headerTitle}>About Valor</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                <Section title="Our Mission">
                    Valor was built to help individuals unlock their true athletic potential.
                    We believe fitness is not just about workouts — it’s about discipline, consistency, and courage.
                </Section>

                <Section title="What Valor Does">
                    • Personalized workout schedules{"\n"}
                    • Smart calorie & macro tracking{"\n"}
                    • Real-time analytics & progress insights{"\n"}
                    • Competitive challenges & rankings{"\n"}
                    • Streak tracking & XP-based growth system
                </Section>

                <Section title="Why Valor?">
                    Valor combines science-based fitness planning with gamification.
                    Earn XP, level up, build streaks, and compete — while improving your health and strength.
                </Section>

                <Section title="Built for Athletes">
                    Whether you're a beginner or advanced lifter, Valor adapts to your height, weight, age, and lifestyle to create workouts tailored specifically for you.
                </Section>

                <Section title="Our Vision">
                    To build a global fitness community driven by progress, competition, and self-improvement.
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