import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LOTTIE_FILES } from '@/components/lottie/lottieFiles';

// ============================================
// COMPONENTE SIMPLIFICADO - SÓ VISUAL
// ============================================

interface VehicleMaintenanceLottieProps {
    tipoVeiculo: string;
}

function getVehicleLottieSource(tipo: string) {
    const normalizedKey = Object.keys(LOTTIE_FILES).find(
        key => key.toUpperCase() === tipo.toUpperCase()
    );

    if (normalizedKey) {
        return LOTTIE_FILES[normalizedKey as keyof typeof LOTTIE_FILES];
    }
    return LOTTIE_FILES.Utilitario;
}

export function VehicleMaintenanceLottie({ tipoVeiculo }: VehicleMaintenanceLottieProps) {
    const lottieSource = useMemo(() => getVehicleLottieSource(tipoVeiculo), [tipoVeiculo]);

    return (
        <Animated.View
            entering={FadeIn.duration(800)}
            style={styles.container}
        >
            <LottieView
                source={lottieSource}
                autoPlay
                loop
                style={styles.lottie}
                resizeMode="contain"
            />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: 280,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 24,
        backgroundColor: 'rgba(30, 41, 59, 0.4)',
        overflow: 'hidden',
    },
    lottie: {
        width: '100%',
        height: '100%',
    },
});
