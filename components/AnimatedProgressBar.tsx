import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

interface AnimatedProgressBarProps {
    progress: number;
    color: string;
    height?: number;
    backgroundColor?: string;
    duration?: number;
}

const AnimatedProgressBar = ({
    progress,
    color,
    height = 6,
    backgroundColor = '#eeeeee',
    duration = 500
}: AnimatedProgressBarProps) => {
    const animatedWidth = useSharedValue(0);

    useEffect(() => {
        animatedWidth.value = withTiming(Math.min(progress, 1), { duration });
    }, [progress]);

    const animatedStyle = useAnimatedStyle(() => ({
        width: `${animatedWidth.value * 100}%`,
    }));

    return (
        <View style={{ height, backgroundColor, borderRadius: height / 2, overflow: 'hidden', width: '100%' }}>
            <Animated.View style={[{ height: '100%', backgroundColor: color, borderRadius: height / 2 }, animatedStyle]} />
        </View>
    );
};

export default AnimatedProgressBar;
