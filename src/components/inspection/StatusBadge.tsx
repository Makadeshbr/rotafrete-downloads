// src/components/inspection/StatusBadge.tsx
// ============================================
// ROTAFRETE - Badge de Status de Avaliação
// ============================================
// Exibe o status de um item de inspeção com
// cores e ícones apropriados.
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock
} from 'lucide-react-native';
import { STATUS_AVALIACAO_CONFIG } from '@/constants/inspection';
import type { StatusAvaliacao } from '@/types/inspection';

// ============================================
// TIPOS
// ============================================

interface StatusBadgeProps {
  /** Status a ser exibido */
  status: StatusAvaliacao;
  /** Tamanho do badge (pequeno, médio ou grande) */
  size?: 'sm' | 'md' | 'lg';
  /** Se deve mostrar o label de texto */
  showLabel?: boolean;
  /** Se deve mostrar apenas o ícone */
  iconOnly?: boolean;
}

// ============================================
// CONSTANTES
// ============================================

const SIZES = {
  sm: {
    padding: 4,
    paddingHorizontal: 8,
    fontSize: 10,
    iconSize: 12,
    borderRadius: 4,
  },
  md: {
    padding: 6,
    paddingHorizontal: 12,
    fontSize: 12,
    iconSize: 16,
    borderRadius: 6,
  },
  lg: {
    padding: 8,
    paddingHorizontal: 16,
    fontSize: 14,
    iconSize: 20,
    borderRadius: 8,
  },
};

const ICONS = {
  PENDENTE: Clock,
  BOM_ESTADO: CheckCircle,
  ATENCAO: AlertTriangle,
  CRITICO: XCircle,
};

// ============================================
// COMPONENTE
// ============================================

/**
 * Badge que exibe o status de avaliação de um item.
 * 
 * @example
 * ```tsx
 * <StatusBadge status="BOM_ESTADO" />
 * <StatusBadge status="CRITICO" size="lg" showLabel />
 * <StatusBadge status="ATENCAO" iconOnly />
 * ```
 */
export function StatusBadge({
  status,
  size = 'md',
  showLabel = true,
  iconOnly = false,
}: StatusBadgeProps): React.ReactNode {
  const config = STATUS_AVALIACAO_CONFIG[status];
  const sizeConfig = SIZES[size];
  const Icon = ICONS[status];

  if (!config || !sizeConfig) {
    // Return null if status or size is invalid to prevent crash
    return null;
  }

  const containerStyle = [
    styles.container,
    {
      backgroundColor: config.bg,
      borderColor: config.border,
      padding: sizeConfig.padding,
      paddingHorizontal: iconOnly ? sizeConfig.padding : sizeConfig.paddingHorizontal,
      borderRadius: sizeConfig.borderRadius,
    },
  ];

  return (
    <View style={containerStyle}>
      <Icon
        size={sizeConfig.iconSize}
        color={config.icon}
        strokeWidth={2}
      />
      {showLabel && !iconOnly && (
        <Text
          style={[
            styles.label,
            {
              color: config.text,
              fontSize: sizeConfig.fontSize,
              marginLeft: 4,
            },
          ]}
        >
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
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  label: {
    fontWeight: '600',
  },
});

export default StatusBadge;
