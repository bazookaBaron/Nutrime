import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';

interface LottieAnimationProps {
    source: any;
    autoPlay?: boolean;
    loop?: boolean;
    style?: ViewStyle;
    onAnimationFinish?: () => void;
    speed?: number;
}

const LottieAnimation: React.FC<LottieAnimationProps> = ({
    source,
    autoPlay = true,
    loop = false,
    style,
    onAnimationFinish,
    speed = 1
}) => {
    const animation = useRef<LottieView>(null);

    const [hasError, setHasError] = React.useState(false);

    useEffect(() => {
        if (hasError) return;
        // Use a small timeout to ensure the native view is fully mounted before playing
        const timer = setTimeout(() => {
            if (autoPlay && animation.current) {
                animation.current.play();
            }
        }, 150);
        return () => clearTimeout(timer);
    }, [autoPlay, hasError]);

    if (hasError) {
        // Fallback if Lottie crashes or fails to load
        return <View style={[styles.container, style]} />;
    }

    return (
        <View style={[styles.container, style]}>
            <LottieView
                ref={animation}
                source={source}
                autoPlay={autoPlay}
                loop={loop}
                style={styles.lottie}
                onAnimationFinish={onAnimationFinish}
                onAnimationFailure={() => setHasError(true)}
                speed={speed}
                renderMode="SOFTWARE"
                hardwareAccelerationAndroid={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    lottie: {
        width: '100%',
        height: '100%',
    }
});

export default LottieAnimation;
