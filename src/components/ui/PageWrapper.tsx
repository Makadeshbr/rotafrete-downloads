import React from 'react';
import { StyleSheet, ViewProps } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface PageWrapperProps extends ViewProps {
    children: React.ReactNode;
}

export function PageWrapper({ children, style, ...props }: PageWrapperProps) {
    return (
        <LinearGradient
            colors={['#0F172A', '#020617']} // Dark 900 -> Dark 950
            style={styles.container}
        >
            <Animated.View
                entering={FadeIn.duration(600)}
                style={[styles.content, style]}
                {...props}
            >
                {children}
            </Animated.View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
});
