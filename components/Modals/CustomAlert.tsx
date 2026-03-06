import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { useAlert } from '../../context/AlertContext';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const CustomAlert = () => {
    const { alertConfig, hideAlert } = useAlert();
    const { visible, title, message, buttons } = alertConfig;

    if (!visible) return null;

    const getIcon = () => {
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('error') || lowerTitle.includes('fail') || lowerTitle.includes('invalid')) return <XCircle color="#ef4444" size={32} />;
        if (lowerTitle.includes('success') || lowerTitle.includes('complete') || lowerTitle.includes('won')) return <CheckCircle2 color="#bef264" size={32} />;
        if (lowerTitle.includes('warn')) return <AlertCircle color="#fbbf24" size={32} />;
        return <Info color="#3b82f6" size={32} />;
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={hideAlert}
        >
            <View style={styles.overlay}>
                <View style={styles.alertBox}>
                    <View style={styles.iconContent}>
                        {getIcon()}
                    </View>

                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <View style={styles.buttonContainer}>
                        {buttons.map((btn: any, index: number) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.button,
                                    index === buttons.length - 1 && styles.primaryBtn,
                                    btn.style === 'cancel' && styles.cancelBtn
                                ]}
                                onPress={() => {
                                    if (btn.onPress) btn.onPress();
                                    hideAlert();
                                }}
                            >
                                <Text style={[
                                    styles.btnText,
                                    index === buttons.length - 1 && styles.primaryBtnText,
                                    btn.style === 'cancel' && styles.cancelBtnText
                                ]}>
                                    {btn.text}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    alertBox: {
        width: Math.min(width * 0.85, 400),
        backgroundColor: '#1f2937',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#374151'
    },
    iconContent: {
        marginBottom: 16
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
        textAlign: 'center'
    },
    message: {
        fontSize: 15,
        color: '#9ca3af',
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 22
    },
    buttonContainer: {
        width: '100%',
        flexDirection: 'row',
        gap: 12,
        justifyContent: 'center'
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#374151'
    },
    primaryBtn: {
        backgroundColor: '#bef264'
    },
    cancelBtn: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#4b5563'
    },
    btnText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#fff'
    },
    primaryBtnText: {
        color: '#000'
    },
    cancelBtnText: {
        color: '#9ca3af'
    }
});

export default CustomAlert;
