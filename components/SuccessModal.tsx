import * as React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Easing } from 'react-native';
import { Flame } from 'lucide-react-native';
import LottieAnimation from './Animation/LottieAnimation';

interface SuccessModalProps {
    visible: boolean;
    title: string;
    caloriesBurned: string | number;
    onClose: () => void;
}

export default function SuccessModal({ visible, title, caloriesBurned, onClose }: SuccessModalProps) {
    const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
    const opacityAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 300,
                    easing: Easing.out(Easing.back(1.5)),
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            scaleAnim.setValue(0.8);
            opacityAnim.setValue(0);
        }
    }, [visible]);

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Animated.View style={[styles.modalCard, {
                    opacity: opacityAnim,
                    transform: [{ scale: scaleAnim }]
                }]}>
                    <View style={styles.animationContainer}>
                        <LottieAnimation
                            source={{ uri: 'https://lottie.host/80517861-6893-4556-912e-161805566089/L8Hl27v6jG.json' }} // Modern checkmark
                            style={styles.lottie}
                        />
                    </View>

                    <View style={styles.confettiContainer}>
                        <LottieAnimation
                            source={{ uri: 'https://lottie.host/fa04256c-0355-4424-b15f-559d877e8ea6/confetti.json' }}
                            style={styles.confetti}
                            loop={true}
                        />
                    </View>

                    <Text style={styles.title}>{title}</Text>

                    <View style={styles.statsContainer}>
                        <Flame size={24} color="#FF6B6B" />
                        <Text style={styles.statsText}>
                            <Text style={styles.statsValue}>{caloriesBurned}</Text> kcal burned
                        </Text>
                    </View>

                    <Text style={styles.subtitle}>
                        Great job tracking this workout! Keep pushing towards your goals.
                    </Text>

                    <TouchableOpacity style={styles.button} onPress={onClose}>
                        <Text style={styles.buttonText}>Continue</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalCard: {
        backgroundColor: '#1E1E1E',
        borderRadius: 24,
        padding: 32,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    animationContainer: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    lottie: {
        width: 120,
        height: 120,
    },
    confettiContainer: {
        ...StyleSheet.absoluteFillObject,
        pointerEvents: 'none',
        zIndex: 999,
    },
    confetti: {
        width: '100%',
        height: '100%',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 24,
        textAlign: 'center',
    },
    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 107, 107, 0.3)',
    },
    statsText: {
        color: '#FFF',
        fontSize: 16,
        marginLeft: 10,
    },
    statsValue: {
        fontWeight: 'bold',
        fontSize: 20,
        color: '#FF6B6B',
    },
    subtitle: {
        color: '#888',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 20,
    },
    button: {
        backgroundColor: '#bef264',
        width: '100%',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    buttonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
