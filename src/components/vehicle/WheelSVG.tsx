// src/components/vehicle/WheelSVG.tsx
// ============================================
// ROTAFRETE - Componente SVG de Roda Animada
// ============================================
// Roda interativa com animações de rotação,
// status visual e feedback tátil
// ============================================

import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    withSpring,
    Easing,
    cancelAnimation,
    runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { STATUS_MANUTENCAO, type StatusManutencao } from '@/constants';

// ============================================
// TIPOS
// ============================================

interface WheelSVGProps {
    size: number;
    status: StatusManutencao;
    onPress: () => void;
    label?: string;
    isDual?: boolean; // Rodado duplo para VAN/VUC
}

// ============================================
// COMPONENTE ANIMADO DO SVG
// ============================================

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function WheelSVG({
    size,
    status,
    onPress,
    label,
    isDual = false,
}: WheelSVGProps) {
    const config = STATUS_MANUTENCAO[status];
    const center = size / 2;
    const outerRadius = size / 2 - 2;
    const innerRadius = size / 3;
    const hubRadius = size / 6;

    // Valores animados
    const rotation = useSharedValue(0);
    const scale = useSharedValue(1);
    const pulseScale = useSharedValue(1);
    const glowOpacity = useSharedValue(0.2);

    // Animação contínua baseada no status
    useEffect(() => {
        cancelAnimation(rotation);
        cancelAnimation(pulseScale);
        cancelAnimation(glowOpacity);

        // Rotação sutil contínua
        rotation.value = withRepeat(
            withTiming(360, { duration: 20000, easing: Easing.linear }),
            -1
        );

        // Pulse baseado no status
        const duration = status === 'URGENTE' ? 800 : status === 'ATENCAO' ? 1500 : 3000;
        const maxScale = status === 'URGENTE' ? 1.15 : status === 'ATENCAO' ? 1.1 : 1.05;
        const maxGlow = status === 'URGENTE' ? 0.7 : status === 'ATENCAO' ? 0.5 : 0.3;

        pulseScale.value = withRepeat(
            withSequence(
                withTiming(maxScale, { duration: duration / 2 }),
                withTiming(1, { duration: duration / 2 })
            ),
            -1,
            true
        );

        glowOpacity.value = withRepeat(
            withSequence(
                withTiming(maxGlow, { duration: duration / 2 }),
                withTiming(0.1, { duration: duration / 2 })
            ),
            -1,
            true
        );

        return () => {
            cancelAnimation(rotation);
            cancelAnimation(pulseScale);
            cancelAnimation(glowOpacity);
        };
    }, [status]);

    // Handler de press com haptics
    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        scale.value = withSequence(
            withSpring(0.9, { stiffness: 400 }),
            withSpring(1, { stiffness: 300 })
        );
        onPress();
    };

    // Estilos animados
    const containerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value * pulseScale.value }],
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
    }));

    // Gera os raios da roda
    const renderSpokes = () => {
        const spokes = [];
        const spokeCount = 6;
        for (let i = 0; i < spokeCount; i++) {
            const angle = (i * 360) / spokeCount;
            const x1 = center + Math.cos((angle * Math.PI) / 180) * hubRadius;
            const y1 = center + Math.sin((angle * Math.PI) / 180) * hubRadius;
            const x2 = center + Math.cos((angle * Math.PI) / 180) * innerRadius;
            const y2 = center + Math.sin((angle * Math.PI) / 180) * innerRadius;
            spokes.push(
                <Line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#64748B"
                    strokeWidth={2}
                />
            );
        }
        return spokes;
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.8}
            style={styles.touchable}
        >
            <Animated.View style={[styles.container, containerStyle]}>
                {/* Glow effect */}
                <Animated.View
                    style={[
                        styles.glow,
                        glowStyle,
                        {
                            width: size + 20,
                            height: size + 20,
                            borderRadius: (size + 20) / 2,
                            backgroundColor: config.cor,
                        },
                    ]}
                />

                {/* SVG da roda */}
                <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <Defs>
                        <RadialGradient id="wheelGradient" cx="50%" cy="50%" r="50%">
                            <Stop offset="0%" stopColor="#475569" />
                            <Stop offset="70%" stopColor="#1E293B" />
                            <Stop offset="100%" stopColor="#0F172A" />
                        </RadialGradient>
                        <RadialGradient id="statusGlow" cx="50%" cy="50%" r="50%">
                            <Stop offset="0%" stopColor={config.cor} stopOpacity="0.8" />
                            <Stop offset="100%" stopColor={config.cor} stopOpacity="0" />
                        </RadialGradient>
                    </Defs>

                    {/* Sombra da roda */}
                    <Circle
                        cx={center + 3}
                        cy={center + 3}
                        r={outerRadius}
                        fill="rgba(0,0,0,0.3)"
                    />

                    {/* Pneu (aro externo) */}
                    <Circle
                        cx={center}
                        cy={center}
                        r={outerRadius}
                        fill="#1E1E1E"
                        stroke={config.cor}
                        strokeWidth={3}
                    />

                    {/* Banda de rodagem */}
                    <Circle
                        cx={center}
                        cy={center}
                        r={outerRadius - 4}
                        fill="none"
                        stroke="#333333"
                        strokeWidth={6}
                        strokeDasharray={status === 'URGENTE' ? '4,4' : status === 'ATENCAO' ? '8,4' : 'none'}
                    />

                    {/* Roda (aro interno) */}
                    <Circle
                        cx={center}
                        cy={center}
                        r={innerRadius}
                        fill="url(#wheelGradient)"
                        stroke="#64748B"
                        strokeWidth={2}
                    />

                    {/* Raios */}
                    <G>{renderSpokes()}</G>

                    {/* Centro (hub) */}
                    <Circle
                        cx={center}
                        cy={center}
                        r={hubRadius}
                        fill="#475569"
                        stroke={config.cor}
                        strokeWidth={2}
                    />

                    {/* Indicador de status no centro */}
                    <Circle
                        cx={center}
                        cy={center}
                        r={hubRadius - 4}
                        fill={config.cor}
                    />
                </Svg>

                {/* Badge de rodado duplo */}
                {isDual && (
                    <View style={styles.dualBadge}>
                        <Animated.Text style={styles.dualText}>2x</Animated.Text>
                    </View>
                )}
            </Animated.View>
        </TouchableOpacity>
    );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
    touchable: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    glow: {
        position: 'absolute',
    },
    dualBadge: {
        position: 'absolute',
        bottom: -8,
        right: -8,
        backgroundColor: '#3B82F6',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    dualText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
    },
});
