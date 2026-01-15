// src/components/vehicle/VehicleAnimatedSVG.tsx
// ============================================
// ROTAFRETE - Veículo SVG Animado
// ============================================
// Diagrama interativo do veículo com SVG
// e animações usando Reanimated
// ============================================

import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text as RNText } from 'react-native';
import Svg, { G, Path, Circle, Rect, Ellipse, Text as SvgText } from 'react-native-svg';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    Easing,
    FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
    CheckCircle,
    AlertTriangle,
    XCircle,
} from 'lucide-react-native';

import {
    STATUS_MANUTENCAO,
    PARTES_VEICULO,
    type ParteVeiculo,
    type StatusManutencao,
    type TipoVeiculo,
} from '@/constants';

// ============================================
// TIPOS
// ============================================

interface VehicleAnimatedSVGProps {
    tipoVeiculo: TipoVeiculo | string;
    statusVeiculo: Record<ParteVeiculo, StatusManutencao>;
    onPartPress: (parte: ParteVeiculo) => void;
}

interface HotspotProps {
    parte: ParteVeiculo;
    status: StatusManutencao;
    x: number;
    y: number;
    label: string;
    onPress: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTAINER_WIDTH = Math.min(SCREEN_WIDTH - 40, 340);
const CONTAINER_HEIGHT = CONTAINER_WIDTH * 0.6;

// Posições dos hotspots (em % do container)
const HOTSPOT_CONFIG: Record<string, { x: number; y: number; label: string }> = {
    MOTOR: { x: 18, y: 45, label: 'Motor' },
    FAROL: { x: 8, y: 55, label: 'Faróis' },
    LANTERNA: { x: 92, y: 50, label: 'Lanternas' },
    FREIOS: { x: 45, y: 80, label: 'Freios' },
    SUSPENSAO: { x: 60, y: 82, label: 'Suspensão' },
    PNEU_DIANTEIRO_E: { x: 22, y: 78, label: 'Pneu D.' },
    PNEU_TRASEIRO_E: { x: 75, y: 80, label: 'Pneu T.' },
};

// ============================================
// COMPONENTE: Hotspot Animado
// ============================================

function Hotspot({ parte, status, x, y, label, onPress }: HotspotProps) {
    const config = STATUS_MANUTENCAO[status];
    const pulseScale = useSharedValue(1);

    useEffect(() => {
        const duration = status === 'URGENTE' ? 600 : status === 'ATENCAO' ? 1200 : 2500;
        const maxScale = status === 'URGENTE' ? 1.3 : status === 'ATENCAO' ? 1.2 : 1.1;

        pulseScale.value = withRepeat(
            withSequence(
                withTiming(maxScale, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: duration / 2, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
    }, [status]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
    }));

    const handlePress = () => {
        Haptics.impactAsync(
            status === 'URGENTE'
                ? Haptics.ImpactFeedbackStyle.Heavy
                : status === 'ATENCAO'
                    ? Haptics.ImpactFeedbackStyle.Medium
                    : Haptics.ImpactFeedbackStyle.Light
        );
        onPress();
    };

    // Converte % para posição pixel
    const left = (x / 100) * CONTAINER_WIDTH - 18;
    const top = (y / 100) * CONTAINER_HEIGHT - 18;

    const Icon = status === 'OK' ? CheckCircle : status === 'ATENCAO' ? AlertTriangle : XCircle;

    return (
        <TouchableOpacity
            onPress={handlePress}
            style={[styles.hotspotContainer, { left, top }]}
            activeOpacity={0.8}
        >
            <Animated.View style={[styles.hotspotPulse, { backgroundColor: config.cor }, animatedStyle]} />
            <View style={[styles.hotspotButton, { backgroundColor: config.cor }]}>
                <Icon size={14} color="#FFFFFF" />
            </View>
            <View style={styles.hotspotLabel}>
                <RNText style={styles.hotspotLabelText}>{label}</RNText>
            </View>
        </TouchableOpacity>
    );
}

// ============================================
// COMPONENTE: SVG do Veículo (Fiorino)
// ============================================

function VehicleSVG() {
    return (
        <Svg
            width={CONTAINER_WIDTH * 0.85}
            height={CONTAINER_HEIGHT * 0.85}
            viewBox="0 0 400 200"
            style={styles.vehicleSvg}
        >
            {/* Corpo principal da van */}
            <G>
                {/* Carroceria */}
                <Path
                    d="M50,140 L50,80 C50,70 60,60 80,60 L320,60 C340,60 350,70 350,80 L350,140 Z"
                    fill="#E8E8E8"
                    stroke="#CCCCCC"
                    strokeWidth="2"
                />

                {/* Cabine */}
                <Path
                    d="M50,80 L50,100 L20,120 L20,140 L80,140 L80,80 Z"
                    fill="#D0D0D0"
                    stroke="#BBBBBB"
                    strokeWidth="2"
                />

                {/* Janelas */}
                <Rect x="55" y="70" width="20" height="25" rx="3" fill="#87CEEB" stroke="#6BB3D9" strokeWidth="1" />
                <Rect x="90" y="65" width="50" height="30" rx="3" fill="#87CEEB" stroke="#6BB3D9" strokeWidth="1" />
                <Rect x="150" y="65" width="50" height="30" rx="3" fill="#87CEEB" stroke="#6BB3D9" strokeWidth="1" />

                {/* Para-choque dianteiro */}
                <Rect x="15" y="135" width="40" height="12" rx="3" fill="#333" />

                {/* Para-choque traseiro */}
                <Rect x="345" y="135" width="40" height="12" rx="3" fill="#333" />

                {/* Farol dianteiro */}
                <Ellipse cx="25" cy="115" rx="8" ry="12" fill="#FFEB3B" stroke="#FFC107" strokeWidth="1" />

                {/* Lanterna traseira */}
                <Rect x="355" y="85" width="8" height="25" rx="2" fill="#F44336" stroke="#D32F2F" strokeWidth="1" />

                {/* Rodas */}
                <Circle cx="80" cy="155" r="22" fill="#333" stroke="#222" strokeWidth="2" />
                <Circle cx="80" cy="155" r="12" fill="#666" />
                <Circle cx="80" cy="155" r="5" fill="#888" />

                <Circle cx="310" cy="155" r="22" fill="#333" stroke="#222" strokeWidth="2" />
                <Circle cx="310" cy="155" r="12" fill="#666" />
                <Circle cx="310" cy="155" r="5" fill="#888" />

                {/* Detalhes do capô */}
                <Path
                    d="M25,95 L45,75"
                    stroke="#AAA"
                    strokeWidth="2"
                    strokeLinecap="round"
                />

                {/* Logo/Marca */}
                <Circle cx="200" cy="100" r="15" fill="#3B82F6" opacity="0.3" />
            </G>
        </Svg>
    );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function VehicleAnimatedSVG({
    tipoVeiculo,
    statusVeiculo,
    onPartPress,
}: VehicleAnimatedSVGProps) {
    // Partes visíveis no diagrama
    const visibleParts: ParteVeiculo[] = [
        'MOTOR',
        'FAROL',
        'LANTERNA',
        'FREIOS',
        'SUSPENSAO',
        'PNEU_DIANTEIRO_E',
        'PNEU_TRASEIRO_E',
    ];

    return (
        <Animated.View entering={FadeIn.duration(500)} style={styles.container}>
            {/* Container do veículo */}
            <View style={[styles.vehicleContainer, { width: CONTAINER_WIDTH, height: CONTAINER_HEIGHT }]}>
                {/* SVG do veículo */}
                <VehicleSVG />

                {/* Hotspots */}
                {visibleParts.map((parteId) => {
                    const config = HOTSPOT_CONFIG[parteId];
                    if (!config) return null;

                    return (
                        <Hotspot
                            key={parteId}
                            parte={parteId}
                            status={statusVeiculo[parteId]}
                            x={config.x}
                            y={config.y}
                            label={config.label}
                            onPress={() => onPartPress(parteId)}
                        />
                    );
                })}
            </View>

            {/* Legenda */}
            <View style={styles.legend}>
                {Object.entries(STATUS_MANUTENCAO).map(([key, value]) => (
                    <View key={key} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: value.cor }]} />
                        <RNText style={styles.legendText}>{value.label}</RNText>
                    </View>
                ))}
            </View>

            {/* Dica */}
            <RNText style={styles.hint}>Toque nos pontos para atualizar</RNText>
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
    vehicleContainer: {
        position: 'relative',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'visible',
    },
    vehicleSvg: {
        alignSelf: 'center',
    },
    hotspotContainer: {
        position: 'absolute',
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    hotspotPulse: {
        position: 'absolute',
        width: 36,
        height: 36,
        borderRadius: 18,
        opacity: 0.3,
    },
    hotspotButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 6,
    },
    hotspotLabel: {
        position: 'absolute',
        bottom: -14,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    hotspotLabelText: {
        fontSize: 9,
        color: '#FFFFFF',
        fontWeight: '600',
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