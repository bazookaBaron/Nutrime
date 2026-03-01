import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Mail, ExternalLink } from 'lucide-react-native';

export default function SupportScreen() {
    const router = useRouter();

    const handleEmailSupport = () => {
        const email = 'support@nutrientapp.com'; // Placeholder
        Linking.openURL(`mailto:${email}`).catch(err => {
            Alert.alert("Error", "Could not open email client.");
        });
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                    <ChevronLeft size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Contact Support</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.title}>Need Help?</Text>
                    <Text style={styles.description}>
                        If you've encountered a bug, have a billing question, or just need some assistance using Nutrient, we're here to help!
                    </Text>

                    <TouchableOpacity style={styles.contactBtn} onPress={handleEmailSupport}>
                        <Mail size={20} color="#000" />
                        <Text style={styles.contactBtnText}>Email Support Team</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.card}>
                    <Text style={styles.title}>Community & Social</Text>
                    <Text style={styles.description}>Follow us for the latest updates and tips on maintaining your health and fitness.</Text>

                    <TouchableOpacity style={styles.linkRow}>
                        <Text style={styles.linkText}>Follow us on Twitter</Text>
                        <ExternalLink size={16} color="#9ca3af" />
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.linkRow}>
                        <Text style={styles.linkText}>Join our Discord Server</Text>
                        <ExternalLink size={16} color="#9ca3af" />
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111827',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1f2937',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#374151',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    content: {
        padding: 24,
    },
    card: {
        backgroundColor: '#1f2937',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#374151',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    description: {
        color: '#9ca3af',
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 24,
    },
    contactBtn: {
        backgroundColor: '#bef264',
        borderRadius: 12,
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    contactBtnText: {
        color: '#111827',
        fontWeight: 'bold',
        fontSize: 16,
    },
    linkRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    linkText: {
        color: '#d1d5db',
        fontSize: 15,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#374151',
        marginVertical: 4,
    }
});
