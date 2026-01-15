// src/components/inspection/ProgressRing.tsx
// ============================================
// ROTAFRETE - Anel de Progresso Circular
// ============================================
// Exibe o progresso de envio da inspeção em
// formato de anel circular animado.
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

// ============================================
// TIPOS
// ============================================

interface ProgressRingProps {
  /** Progresso de 0 a 100 */
  progress: number;
  /** Tamanho do anel (diâmetro) */
  size?: number;
  /** Espessura do traço */
  strokeWidth?: number;
  /** Cor do progresso */
  progressColor?: string;
  /** Cor do fundo do anel */
  backgroundColor?: string;
  /** Se deve mostrar o texto de porcentagem */
  showPercentage?: boolean;
  /** Texto customizado no centro */
  centerText?: string;
  /** Subtexto abaixo do número */
  subText?: string;
}

// ============================================
// COMPONENTE
// ============================================

/**
 * Anel de progresso circular para exibir progresso de inspeção.
 * 
 * @example
 * ```tsx
 * <ProgressRing progress={75} />
 * <ProgressRing 
 *   progress={50} 
 *   size={120} 
 *   showPercentage 
 *   subText="enviados"
 * />
 * ```
 */
export function ProgressRing({
  progress,
  size = 100,
  strokeWidth = 10,
  progressColor = '#22C55E',
  backgroundColor = '#334155',
  showPercentage = true,
  centerText,
  subText,
}: ProgressRingProps): React.ReactElement {
  // Garante que o progresso está entre 0 e 100
  const normalizedProgress = Math.min(100, Math.max(0, progress));

  // Calcula dimensões do SVG
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (normalizedProgress / 100) * circumference;

  // Determina a cor baseada no progresso
  const getProgressColor = () => {
    if (normalizedProgress === 100) return '#22C55E'; // Verde
    if (normalizedProgress >= 75) return '#3B82F6';   // Azul
    if (normalizedProgress >= 50) return '#F59E0B';   // Âmbar
    return '#64748B'; // Cinza
  };

  const finalColor = progressColor || getProgressColor();

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* Círculo de fundo */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={backgroundColor}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Círculo de progresso */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={finalColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>

      {/* Conteúdo central */}
      <View style={styles.centerContent}>
        {showPercentage && !centerText && (
          <Text style={[styles.percentageText, { fontSize: size / 4 }]}>
            {Math.round(normalizedProgress)}%
          </Text>
        )}
        {centerText && (
          <Text style={[styles.centerText, { fontSize: size / 5 }]}>
            {centerText}
          </Text>
        )}
        {subText && (
          <Text style={[styles.subText, { fontSize: size / 8 }]}>
            {subText}
          </Text>
        )}
      </View>
    </View>
  );
}

// ============================================
// VARIANTE: PROGRESSO COM CONTADORES
// ============================================

interface ProgressRingWithCountProps extends Omit<ProgressRingProps, 'centerText' | 'subText'> {
  /** Quantidade concluída */
  completed: number;
  /** Quantidade total */
  total: number;
  /** Label para exibir (ex: "itens", "fotos") */
  label?: string;
}

/**
 * Variante do ProgressRing que exibe contadores (ex: 12/18).
 * 
 * @example
 * ```tsx
 * <ProgressRingWithCount 
 *   completed={12} 
 *   total={18} 
 *   label="itens"
 * />
 * ```
 */
export function ProgressRingWithCount({
  completed,
  total,
  label = 'itens',
  size = 100,
  ...props
}: ProgressRingWithCountProps): React.ReactElement {
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <ProgressRing
        {...props}
        progress={progress}
        size={size}
        showPercentage={false}
      />
      <View style={styles.centerContent}>
        <Text style={[styles.countText, { fontSize: size / 4 }]}>
          {completed}/{total}
        </Text>
        <Text style={[styles.subText, { fontSize: size / 8 }]}>
          {label}
        </Text>
      </View>
    </View>
  );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  centerText: {
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  countText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  subText: {
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 2,
  },
});

export default ProgressRing;
