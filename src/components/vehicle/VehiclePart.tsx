// src/components/vehicle/VehiclePart.tsx
// ============================================
// ROTAFRETE - Componente de Parte do Veículo
// ============================================
// Botão interativo genérico para partes do veículo
// com animações e feedback visual
// ============================================

import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    withSpring,
    Easing,
    cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
    Settings,
    Gauge,
    Zap,
    Lightbulb,
    Circle,
    Droplet,
    Filter,
    Battery,
    Link,
} from 'lucide-react-native';
import { STATUS_MANUTENCAO, type StatusManutencao, type ParteVeiculo } from '@/constants';
import { PART_POSITIONS, type PartPosition } from './vehiclePaths';

// ============================================
// TIPOS
// ============================================

interface VehiclePartProps {
    parte: ParteVeiculo;
    status: StatusManutencao;
    onPress: () => void;
    size?: 'sm' | 'md' | 'lg';
}

// ============================================
// MAPEAMENTO DE ÍCONES
// ============================================

const ICON_MAP: Record<string, React.ComponentType<any>> = {
    MOTOR: Settings,
    OLEO: Droplet,
    FILTROS: Filter,
    BATERIA: Battery,
    CORREIA: Link,
    FREIOS: Gauge,
    SUSPENSAO: Zap,
    FAROL: Lightbulb,
    LANTERNA: Lightbulb,
    EMBREAGEM: Circle,
};

// ============================================
// TAMANHOS
// ============================================

const SIZES = {
    sm: { button: 28, icon: 12, glow: 40, font: 8 },
    md: { button: 36, icon: 16, glow: 52, font: 9 },
    lg: { button: 44, icon: 20, glow: 64, font: 10 },
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function VehiclePart({
    parte,
    status,
    onPress,
    size = 'md',
}: VehiclePartProps) {
    const config = STATUS_MANUTENCAO[status];
    const partConfig = PART_POSITIONS[parte];
    const sizeConfig = SIZES[size];

    // Valores animados
    const scale = useSharedValue(1);
    const pulseScale = useSharedValue(1);
    const glowOpacity = useSharedValue(0.2);
    const rotation = useSharedValue(0);

    // Animações baseadas no status
    useEffect(() => {
        cancelAnimation(pulseScale);
        cancelAnimation(glowOpacity);
        cancelAnimation(rotation);

        const duration = status === 'URGENTE' ? 800 : status === 'ATENCAO' ? 1500 : 3000;
        const maxScale = status === 'URGENTE' ? 1.2 : status === 'ATENCAO' ? 1.15 : 1.08;
        const maxGlow = status === 'URGENTE' ? 0.8 : status === 'ATENCAO' ? 0.5 : 0.25;

        // Pulse animation
        pulseScale.value = withRepeat(
            withSequence(
                withTiming(maxScale, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: duration / 2, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );

        // Glow animation
        glowOpacity.value = withRepeat(
            withSequence(
                withTiming(maxGlow, { duration: duration / 2 }),
                withTiming(0.1, { duration: duration / 2 })
            ),
            -1,
            true
        );

        // Shake para URGENTE
        if (status === 'URGENTE') {
            rotation.value = withRepeat(
                withSequence(
                    withTiming(-5, { duration: 50 }),
                    withTiming(5, { duration: 100 }),
                    withTiming(-5, { duration: 100 }),
                    withTiming(0, { duration: 50 }),
                    withTiming(0, { duration: 400 })
                ),
                -1
            );
        } else {
            rotation.value = 0;
        }

        return () => {
            cancelAnimation(pulseScale);
            cancelAnimation(glowOpacity);
            cancelAnimation(rotation);
        };
    }, [status]);

    // Handler de press
    const handlePress = () => {
        const hapticType =
            status === 'URGENTE'
                ? Haptics.ImpactFeedbackStyle.Heavy
                : status === 'ATENCAO'
                    ? Haptics.ImpactFeedbackStyle.Medium
                    : Haptics.ImpactFeedbackStyle.Light;

        Haptics.impactAsync(hapticType);

        scale.value = withSequence(
            withSpring(0.85, { stiffness: 500 }),
            withSpring(1, { stiffness: 400 })
        );

        onPress();
    };

    // Estilos animados
    const containerStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value * pulseScale.value },
            { rotate: `${rotation.value}deg` },
        ],
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
    }));

    // Renderiza ícone da parte
    const IconComponent = ICON_MAP[parte] || Circle;

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
                            width: sizeConfig.glow,
                            height: sizeConfig.glow,
                            borderRadius: sizeConfig.glow / 2,
                            backgroundColor: config.cor,
                        },
                    ]}
                />

                {/* Botão principal */}
                <View
                    style={[
                        styles.button,
                        {
                            width: sizeConfig.button,
                            height: sizeConfig.button,
                            borderRadius: sizeConfig.button / 2,
                            backgroundColor: `${config.cor}30`,
                            borderColor: config.cor,
                        },
                    ]}
                >
                    <IconComponent size={sizeConfig.icon} color={config.cor} />
                </View>

                {/* Status dot */}
                <View
                    style={[
                        styles.statusDot,
                        {
                            backgroundColor: config.cor,
                            top: -2,
                            right: -2,
                        },
                    ]}
                />
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
    button: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    statusDot: {
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#0F172A',
    },
});
