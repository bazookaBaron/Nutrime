import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, Alert } from 'react-native';
import { useUser } from '../context/UserContext';
import { wearableService } from '../services/WearableService';
import { Watch, Smartphone, Check, X, RefreshCw } from 'lucide-react-native';

export default function ConnectedDevicesPanel() {
    const [connected, setConnected] = useState(false);
    const [checking, setChecking] = useState(false);

    const deviceName = Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect';
    const DeviceIcon = Platform.OS === 'ios' ? Watch : Smartphone;

    React.useEffect(() => {
        const checkStatus = async () => {
            const isConnected = await wearableService.checkConnection();
            if (isConnected) setConnected(true);
        };
        checkStatus();
    }, []);

    // Removed programmatic handleConnect due to native crash (lateinit requestPermission)
    // Users will now be guided to connect manually through OS settings

    return (
        <View style={styles.container}>
            <Text style={styles.title}>CONNECTED DEVICES</Text>

            <View style={styles.card}>
                <View style={styles.row}>
                    <View style={[styles.iconContainer, connected ? styles.iconConnected : styles.iconDisconnected]}>
                        <DeviceIcon size={24} color={connected ? '#bef264' : '#9ca3af'} />
                    </View>

                    <View style={styles.info}>
                        <Text style={styles.deviceName}>{deviceName}</Text>
                        <Text style={styles.status}>
                            {connected ? 'Connected' : 'Not Connected'}
                        </Text>
                    </View>

                    {connected ? (
                        <View style={styles.connectedBadge}>
                            <Check size={16} color="#bef264" />
                            <Text style={styles.connectedText}>Active</Text>
                        </View>
                    ) : (
                        <View style={styles.disconnectedBadge}>
                            <X size={16} color="#ef4444" />
                            <Text style={styles.disconnectedText}>Inactive</Text>
                        </View>
                    )}
                </View>

                {!connected && (
                    <View style={styles.guideContainer}>
                        <Text style={styles.guideTitle}>How to Connect</Text>
                        <Text style={styles.guideStep}>
                            1. Download <Text style={{ color: '#fff' }}>{Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect'}</Text> from the store.
                        </Text>
                        <Text style={styles.guideStep}>
                            2. Open the app settings on your device.
                        </Text>
                        <Text style={styles.guideStep}>
                            3. Grant <Text style={{ color: '#fff' }}>Nutrient Tracker</Text> permission to read your active energy, steps, and sleep data.
                        </Text>
                        <Text style={[styles.guideStep, { marginTop: 8, fontStyle: 'italic', color: '#9ca3af' }]}>
                            Once permitted, background sync will start automatically on your next launch.
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    title: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#6b7280',
        marginBottom: 12,
        letterSpacing: 1,
    },
    card: {
        backgroundColor: '#1f2937',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#374151',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    iconConnected: {
        backgroundColor: 'rgba(190, 242, 100, 0.1)',
    },
    iconDisconnected: {
        backgroundColor: 'rgba(107, 114, 128, 0.1)',
    },
    info: {
        flex: 1,
    },
    deviceName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    status: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 2,
    },
    connectButton: {
        backgroundColor: '#bef264',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 80,
        alignItems: 'center',
    },
    connectText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    connectedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(190, 242, 100, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    connectedText: {
        color: '#bef264',
        fontSize: 12,
        fontWeight: 'bold',
    },
    disconnectedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    disconnectedText: {
        color: '#ef4444',
        fontSize: 12,
        fontWeight: 'bold',
    },
    guideContainer: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#374151',
    },
    guideTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    guideStep: {
        fontSize: 13,
        color: '#d1d5db',
        marginBottom: 6,
        lineHeight: 18,
    },
});
