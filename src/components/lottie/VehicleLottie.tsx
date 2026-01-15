// src/components/lottie/VehicleLottie.tsx
// ============================================
// ROTAFRETE - Componente de Veículo Animado
// ============================================
// Exibe a animação Lottie correspondente ao tipo de veículo
// ============================================

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';
import { LOTTIE_FILES } from './lottieFiles';
import { type TipoVeiculo, VEICULOS } from '@/constants/pricing';

interface VehicleLottieProps {
    /** Tipo do veículo */
    tipoVeiculo: TipoVeiculo;
    /** Largura da animação */
    width?: number;
    /** Altura da animação */
    height?: number;
    /** Se deve rodar automaticamente */
    autoPlay?: boolean;
    /** Se deve repetir */
    loop?: boolean;
    /** Estilo adicional do container */
    style?: ViewStyle;
}

export function VehicleLottie({
    tipoVeiculo,
    width = 120,
    height = 80,
    autoPlay = true,
    loop = true,
    style,
}: VehicleLottieProps) {
    // Busca a configuração do veículo
    const veiculoConfig = VEICULOS.find(v => v.id === tipoVeiculo);

    if (!veiculoConfig) {
        console.warn(`[VehicleLottie] Veículo não encontrado: ${tipoVeiculo}`);
        return null;
    }

    // Obtém o arquivo Lottie correspondente
    const lottieKey = veiculoConfig.lottieFile as keyof typeof LOTTIE_FILES;
    const source = LOTTIE_FILES[lottieKey];

    if (!source) {
        console.warn(`[VehicleLottie] Arquivo Lottie não encontrado: ${lottieKey}`);
        return null;
    }

    return (
        <View style={[styles.container, { width, height }, style]}>
            <LottieView
                source={source}
                autoPlay={autoPlay}
                loop={loop}
                style={styles.lottie}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    lottie: {
        width: '100%',
        height: '100%',
    },
});
