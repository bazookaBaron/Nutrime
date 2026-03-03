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

    useEffect(() => {
        if (autoPlay) {
            animation.current?.play();
        }
    }, [autoPlay]);

    return (
        <View style={[styles.container, style]}>
            <LottieView
                ref={animation}
                source={source}
                autoPlay={autoPlay}
                loop={loop}
                style={StyleSheet.absoluteFill}
                onAnimationFinish={onAnimationFinish}
                speed={speed}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default LottieAnimation;
