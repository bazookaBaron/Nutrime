import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Mail, Instagram } from 'lucide-react-native';

export default function ContactScreen() {
    const router = useRouter();

    const Section = ({ icon, title, subtitle, onPress }) => (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
            <View style={styles.iconContainer}>
                {icon}
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardSubtitle}>{subtitle}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                    <ChevronLeft size={22} color="#A3E635" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Contact Us</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                <Text style={styles.subtitle}>
                    Have questions, feedback, or need support?
                    We're here to help.
                </Text>

                <Section
                    icon={<Mail size={20} color="#A3E635" />}
                    title="Email Support"
                    subtitle="support@valorfitness.app"
                    onPress={() => Linking.openURL('mailto:support@valorfitness.app')}
                />

                <Section
                    icon={<Instagram size={20} color="#A3E635" />}
                    title="Instagram"
                    subtitle="@valorfitness"
                    onPress={() => Linking.openURL('https://instagram.com/valorfitness')}
                />

                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                        Valor typically responds within 24–48 hours.
                        {"\n\n"}
                        Thank you for being part of the Valor community 💪
                    </Text>
                </View>

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
    subtitle: {
        color: '#6B7280',
        fontSize: 14,
        marginBottom: 20,
        lineHeight: 20,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#141A21',
        padding: 18,
        borderRadius: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#1F2937',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1A1F26',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    cardTitle: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    cardSubtitle: {
        color: '#9CA3AF',
        fontSize: 13,
        marginTop: 4,
    },
    infoBox: {
        backgroundColor: '#141A21',
        padding: 18,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#1F2937',
        marginTop: 10,
    },
    infoText: {
        color: '#D1D5DB',
        fontSize: 14,
        lineHeight: 22,
        textAlign: 'center',
    },
});