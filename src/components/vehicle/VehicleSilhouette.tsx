// src/components/vehicle/VehicleSilhouette.tsx
// ============================================
// ROTAFRETE - Visualização do Veículo com Hotspots
// ============================================
// Usa imagem real do veículo com pontos de
// interação (hotspots) animados posicionados
// sobre as partes do veículo
// ============================================

import React, { useEffect } from 'react';
import {
    View,
    Image,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Text,
    Pressable,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    withSpring,
    Easing,
    FadeIn,
    FadeInUp,
    cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
    Settings,
    Gauge,
    Zap,
    Lightbulb,
    Circle,
    AlertTriangle,
    CheckCircle,
    XCircle,
} from 'lucide-react-native';

import {
    TipoVeiculo,
    getVeiculoConfig,
    STATUS_MANUTENCAO,
    PARTES_VEICULO,
} from '@/constants';
import type { ParteVeiculo, StatusManutencao } from '@/constants';

// ============================================
// TIPOS E CONSTANTES
// ============================================

interface VehicleSilhouetteProps {
    tipoVeiculo: TipoVeiculo;
    statusVeiculo: Record<ParteVeiculo, StatusManutencao>;
    onPartPress: (parte: ParteVeiculo) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTAINER_WIDTH = Math.min(SCREEN_WIDTH - 40, 340);
const CONTAINER_HEIGHT = CONTAINER_WIDTH * 0.55;

// Imagem do veículo (Fiorino) - caminho relativo
const VEHICLE_IMAGE = require('../../../assets/images/fiorino_utilitario.png');

// Posições dos hotspots como porcentagem do container
// Ajustadas para a imagem da Fiorino (vista 3/4 frontal)
const HOTSPOT_POSITIONS: Record<string, { x: number; y: number; label: string }> = {
    // Pneus
    PNEU_DIANTEIRO_E: { x: 22, y: 80, label: 'Pneu Diant.' },
    PNEU_TRASEIRO_E: { x: 72, y: 82, label: 'Pneu Tras.' },

    // Motor (capô frontal)
    MOTOR: { x: 15, y: 50, label: 'Motor' },

    // Faróis (frente)
    FAROL: { x: 8, y: 60, label: 'Faróis' },

    // Lanternas (traseira)
    LANTERNA: { x: 92, y: 55, label: 'Lanternas' },

    // Freios (centro-baixo)
    FREIOS: { x: 45, y: 85, label: 'Freios' },

    // Suspensão
    SUSPENSAO: { x: 55, y: 88, label: 'Suspensão' },
};

// ============================================
// COMPONENTE: Hotspot Animado
// ============================================

interface HotspotProps {
    parte: ParteVeiculo;
    status: StatusManutencao;
    position: { x: number; y: number; label: string };
    onPress: () => void;
    containerWidth: number;
    containerHeight: number;
}

function Hotspot({
    parte,
    status,
    position,
    onPress,
    containerWidth,
    containerHeight,
}: HotspotProps) {
    const config = STATUS_MANUTENCAO[status];
    const scale = useSharedValue(1);
    const pulseScale = useSharedValue(1);
    const glowOpacity = useSharedValue(0.3);

    // Configuração de animação por status
    useEffect(() => {
        cancelAnimation(pulseScale);
        cancelAnimation(glowOpacity);

        const duration = status === 'URGENTE' ? 600 : status === 'ATENCAO' ? 1200 : 2500;
        const maxScale = status === 'URGENTE' ? 1.4 : status === 'ATENCAO' ? 1.25 : 1.1;
        const maxGlow = status === 'URGENTE' ? 0.9 : status === 'ATENCAO' ? 0.6 : 0.3;

        pulseScale.value = withRepeat(
            withSequence(
                withTiming(maxScale, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: duration / 2, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );

        glowOpacity.value = withRepeat(
            withSequence(
                withTiming(maxGlow, { duration: duration / 2 }),
                withTiming(0.15, { duration: duration / 2 })
            ),
            -1,
            true
        );

        return () => {
            cancelAnimation(pulseScale);
            cancelAnimation(glowOpacity);
        };
    }, [status]);

    const handlePress = () => {
        console.log('[HOTSPOT] Pressionado:', parte); // Debug

        const hapticType =
            status === 'URGENTE'
                ? Haptics.ImpactFeedbackStyle.Heavy
                : status === 'ATENCAO'
                    ? Haptics.ImpactFeedbackStyle.Medium
                    : Haptics.ImpactFeedbackStyle.Light;

        Haptics.impactAsync(hapticType);

        scale.value = withSequence(
            withSpring(0.8, { stiffness: 500 }),
            withSpring(1, { stiffness: 400 })
        );

        onPress();
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
        opacity: glowOpacity.value,
    }));

    // Calcula posição absoluta
    const left = (position.x / 100) * containerWidth - 22;
    const top = (position.y / 100) * containerHeight - 22;

    // Ícone baseado no status
    const StatusIcon = status === 'OK' ? CheckCircle : status === 'ATENCAO' ? AlertTriangle : XCircle;

    return (
        <Pressable
            onPress={handlePress}
            style={[
                styles.hotspotContainer,
                { left, top },
            ]}
        >
            <Animated.View style={animatedStyle}>
                {/* Glow/Pulse ring */}
                <Animated.View
                    style={[
                        styles.hotspotGlow,
                        pulseStyle,
                        { backgroundColor: config.cor },
                    ]}
                />

                {/* Botão principal */}
                <View
                    style={[
                        styles.hotspotButton,
                        {
                            backgroundColor: config.cor,
                            borderColor: '#FFFFFF',
                        },
                    ]}
                >
                    <StatusIcon size={16} color="#FFFFFF" />
                </View>

                {/* Label */}
                <View style={styles.hotspotLabelContainer}>
                    <Text style={styles.hotspotLabel} numberOfLines={1}>
                        {position.label}
                    </Text>
                </View>
            </Animated.View>
        </Pressable>
    );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function VehicleSilhouette({
    tipoVeiculo,
    statusVeiculo,
    onPartPress,
}: VehicleSilhouetteProps) {
    const vehicleConfig = getVeiculoConfig(tipoVeiculo);

    // Partes visíveis na imagem (vista lateral/3-4)
    const visibleParts: ParteVeiculo[] = [
        'MOTOR',
        'FAROL',
        'LANTERNA',
        'FREIOS',
        'SUSPENSAO',
        'PNEU_DIANTEIRO_E',
        'PNEU_TRASEIRO_E',
    ];

    const handleHotspotPress = (parte: ParteVeiculo) => {
        console.log('[VEHICLE] Hotspot clicado:', parte); // Debug
        onPartPress(parte);
    };

    return (
        <Animated.View
            entering={FadeIn.duration(500)}
            style={styles.container}
        >
            {/* Tag do tipo de veículo */}
            <Animated.View
                entering={FadeInUp.delay(100).duration(400)}
                style={[
                    styles.vehicleTypeTag,
                    {
                        backgroundColor: `${vehicleConfig?.cor}20`,
                        borderColor: vehicleConfig?.cor,
                    },
                ]}
            >
                <Text style={[styles.vehicleTypeName, { color: vehicleConfig?.cor }]}>
                    {vehicleConfig?.nome || 'Utilitário'}
                </Text>
            </Animated.View>

            {/* Container do veículo */}
            <View style={[styles.vehicleContainer, { width: CONTAINER_WIDTH, height: CONTAINER_HEIGHT }]}>
                {/* Imagem do veículo */}
                <Image
                    source={VEHICLE_IMAGE}
                    style={styles.vehicleImage}
                    resizeMode="contain"
                />

                {/* Hotspots sobre a imagem */}
                {visibleParts.map((parteId) => {
                    const position = HOTSPOT_POSITIONS[parteId];
                    if (!position) return null;

                    return (
                        <Hotspot
                            key={parteId}
                            parte={parteId}
                            status={statusVeiculo[parteId]}
                            position={position}
                            onPress={() => handleHotspotPress(parteId)}
                            containerWidth={CONTAINER_WIDTH}
                            containerHeight={CONTAINER_HEIGHT}
                        />
                    );
                })}
            </View>

            {/* Legenda de status */}
            <Animated.View
                entering={FadeInUp.delay(300).duration(400)}
                style={styles.legend}
            >
                {Object.entries(STATUS_MANUTENCAO).map(([key, value]) => (
                    <View key={key} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: value.cor }]} />
                        <Text style={styles.legendText}>{value.label}</Text>
                    </View>
                ))}
            </Animated.View>

            {/* Dica de interação */}
            <Animated.Text
                entering={FadeIn.delay(500)}
                style={styles.hint}
            >
                Toque nos pontos para ver detalhes e atualizar
            </Animated.Text>
        </Animated.View>
    );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    vehicleTypeTag: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 16,
    },
    vehicleTypeName: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    vehicleContainer: {
        position: 'relative',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 8,
    },
    vehicleImage: {
        width: '100%',
        height: '100%',
    },
    hotspotContainer: {
        position: 'absolute',
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
    },
    hotspotGlow: {
        position: 'absolute',
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    hotspotButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 8,
    },
    hotspotLabelContainer: {
        position: 'absolute',
        bottom: -14,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        minWidth: 50,
    },
    hotspotLabel: {
        fontSize: 9,
        color: '#FFFFFF',
        fontWeight: '600',
        textAlign: 'center',
    },
    legend: {
        flexDirection: 'row',
        gap: 20,
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#334155',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 2,
    },
    legendText: {
        fontSize: 13,
        color: '#94A3B8',
        fontWeight: '500',
    },
    hint: {
        marginTop: 12,
        fontSize: 12,
        color: '#64748B',
        textAlign: 'center',
    },
});
