// src/components/vehicle/StatusIndicator.tsx
// ============================================
// ROTAFRETE - Indicador de Status Animado
// ============================================
// Componente que mostra o status da parte do veículo
// com animações de pulse/glow baseadas na urgência
// ============================================

import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    Easing,
    interpolate,
    cancelAnimation,
} from 'react-native-reanimated';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react-native';
import { STATUS_MANUTENCAO, type StatusManutencao } from '@/constants';

// ============================================
// TIPOS
// ============================================

interface StatusIndicatorProps {
    status: StatusManutencao;
    size?: number;
    showIcon?: boolean;
    showLabel?: boolean;
}

// ============================================
// CONFIGURAÇÕES DE ANIMAÇÃO POR STATUS
// ============================================

const ANIMATION_CONFIG = {
    OK: {
        duration: 3000,
        pulseScale: 1.1,
        glowOpacity: 0.3,
    },
    ATENCAO: {
        duration: 1500,
        pulseScale: 1.2,
        glowOpacity: 0.5,
    },
    URGENTE: {
        duration: 800,
        pulseScale: 1.3,
        glowOpacity: 0.7,
    },
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function StatusIndicator({
    status,
    size = 24,
    showIcon = true,
    showLabel = false,
}: StatusIndicatorProps) {
    const config = STATUS_MANUTENCAO[status];
    const animConfig = ANIMATION_CONFIG[status];

    // Valores animados
    const pulseScale = useSharedValue(1);
    const glowOpacity = useSharedValue(0);
    const rotation = useSharedValue(0);

    // Inicia animações baseadas no status
    useEffect(() => {
        // Cancela animações anteriores
        cancelAnimation(pulseScale);
        cancelAnimation(glowOpacity);
        cancelAnimation(rotation);

        // Animação de pulse
        pulseScale.value = withRepeat(
            withSequence(
                withTiming(animConfig.pulseScale, {
                    duration: animConfig.duration / 2,
                    easing: Easing.inOut(Easing.ease),
                }),
                withTiming(1, {
                    duration: animConfig.duration / 2,
                    easing: Easing.inOut(Easing.ease),
                })
            ),
            -1, // Repete infinitamente
            true // Reverse
        );

        // Animação de glow
        glowOpacity.value = withRepeat(
            withSequence(
                withTiming(animConfig.glowOpacity, {
                    duration: animConfig.duration / 2,
                    easing: Easing.inOut(Easing.ease),
                }),
                withTiming(0.1, {
                    duration: animConfig.duration / 2,
                    easing: Easing.inOut(Easing.ease),
                })
            ),
            -1,
            true
        );

        // Animação extra de shake para URGENTE
        if (status === 'URGENTE') {
            rotation.value = withRepeat(
                withSequence(
                    withTiming(-3, { duration: 50 }),
                    withTiming(3, { duration: 100 }),
                    withTiming(-3, { duration: 100 }),
                    withTiming(0, { duration: 50 }),
                    withTiming(0, { duration: 500 }) // Pausa
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

    // Estilos animados
    const pulseStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: pulseScale.value },
            { rotate: `${rotation.value}deg` },
        ],
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
        transform: [{ scale: interpolate(glowOpacity.value, [0, 1], [1, 1.5]) }],
    }));

    // Renderiza ícone baseado no status
    const renderIcon = () => {
        const iconSize = size * 0.6;
        const iconColor = '#FFFFFF';

        switch (status) {
            case 'OK':
                return <CheckCircle size={iconSize} color={iconColor} />;
            case 'ATENCAO':
                return <AlertTriangle size={iconSize} color={iconColor} />;
            case 'URGENTE':
                return <XCircle size={iconSize} color={iconColor} />;
        }
    };

    return (
        <View style={[styles.container, { width: size * 2, height: size * 2 }]}>
            {/* Camada de glow */}
            <Animated.View
                style={[
                    styles.glow,
                    glowStyle,
                    {
                        width: size * 2,
                        height: size * 2,
                        borderRadius: size,
                        backgroundColor: config.cor,
                    },
                ]}
            />

            {/* Indicador principal */}
            <Animated.View
                style={[
                    pulseStyle,
                    styles.indicator,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        backgroundColor: config.cor,
                    },
                ]}
            >
                {showIcon && renderIcon()}
            </Animated.View>

            {/* Label opcional */}
            {showLabel && (
                <Text style={[styles.label, { color: config.cor }]}>
                    {config.label}
                </Text>
            )}
        </View>
    );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    glow: {
        position: 'absolute',
    },
    indicator: {
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    label: {
        marginTop: 8,
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});
