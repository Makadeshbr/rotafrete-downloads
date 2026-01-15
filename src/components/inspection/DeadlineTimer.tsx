// src/components/inspection/DeadlineTimer.tsx
// ============================================
// Componente de Timer de Prazo
// ============================================
// Exibe o prazo de envio/manutenção com contagem
// regressiva e indicadores visuais de urgência.
// ============================================

import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react-native';

// ============================================
// TIPOS
// ============================================

interface DeadlineTimerProps {
  /** Data limite (ISO string) */
  deadline: string;
  /** Rótulo a exibir (ex: "Prazo de envio", "Prazo de manutenção") */
  label?: string;
  /** Se deve mostrar contagem regressiva em tempo real */
  showCountdown?: boolean;
  /** Callback quando o prazo expira */
  onExpire?: () => void;
  /** Tamanho do componente */
  size?: 'small' | 'medium' | 'large';
  /** Se deve mostrar apenas o tempo restante (sem data) */
  compact?: boolean;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number; // Total em milissegundos
  isExpired: boolean;
}

// ============================================
// HELPERS
// ============================================

/**
 * Calcula o tempo restante até uma data.
 */
function calculateTimeRemaining(deadline: string): TimeRemaining {
  const now = new Date().getTime();
  const target = new Date(deadline).getTime();
  const diff = target - now;

  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      total: 0,
      isExpired: true,
    };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    total: diff,
    isExpired: false,
  };
}

/**
 * Formata a data para exibição.
 */
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Determina o nível de urgência baseado no tempo restante.
 */
function getUrgencyLevel(timeRemaining: TimeRemaining): 'normal' | 'warning' | 'critical' | 'expired' {
  if (timeRemaining.isExpired) return 'expired';
  if (timeRemaining.days === 0 && timeRemaining.hours < 6) return 'critical';
  if (timeRemaining.days === 0) return 'warning';
  if (timeRemaining.days === 1) return 'warning';
  return 'normal';
}

// ============================================
// CORES POR URGÊNCIA
// ============================================

const URGENCY_COLORS = {
  normal: {
    bg: '#0F172A',
    border: '#334155',
    text: '#94A3B8',
    accent: '#3B82F6',
    icon: '#64748B',
  },
  warning: {
    bg: '#422006',
    border: '#713F12',
    text: '#FCD34D',
    accent: '#F59E0B',
    icon: '#F59E0B',
  },
  critical: {
    bg: '#450A0A',
    border: '#7F1D1D',
    text: '#FCA5A5',
    accent: '#EF4444',
    icon: '#EF4444',
  },
  expired: {
    bg: '#1E1E1E',
    border: '#7F1D1D',
    text: '#9CA3AF',
    accent: '#6B7280',
    icon: '#EF4444',
  },
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function DeadlineTimer({
  deadline,
  label = 'Prazo',
  showCountdown = true,
  onExpire,
  size = 'medium',
  compact = false,
}: DeadlineTimerProps) {
  // Estado do tempo restante
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(deadline)
  );

  // Atualiza a contagem regressiva
  useEffect(() => {
    if (!showCountdown) return;

    const interval = setInterval(() => {
      const newTime = calculateTimeRemaining(deadline);
      setTimeRemaining(newTime);

      // Chama callback quando expira
      if (newTime.isExpired && onExpire) {
        onExpire();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline, showCountdown, onExpire]);

  // Determina urgência e cores
  const urgency = useMemo(() => getUrgencyLevel(timeRemaining), [timeRemaining]);
  const colors = URGENCY_COLORS[urgency];

  // Formata a contagem regressiva
  const countdownText = useMemo(() => {
    if (timeRemaining.isExpired) return 'Expirado';

    const { days, hours, minutes, seconds } = timeRemaining;

    if (days > 0) {
      return `${days}d ${hours}h restantes`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}min restantes`;
    }
    if (minutes > 0) {
      return `${minutes}min ${seconds}s restantes`;
    }
    return `${seconds}s restantes`;
  }, [timeRemaining]);

  // Ícone baseado no status
  const IconComponent = useMemo(() => {
    if (timeRemaining.isExpired) return XCircle;
    if (urgency === 'critical') return AlertTriangle;
    return Clock;
  }, [timeRemaining.isExpired, urgency]);

  // Tamanhos
  const sizeStyles = {
    small: { padding: 6, fontSize: 10, iconSize: 12 },
    medium: { padding: 10, fontSize: 12, iconSize: 16 },
    large: { padding: 14, fontSize: 14, iconSize: 20 },
  };
  const currentSize = sizeStyles[size];

  // ─── Versão Compacta ─────────────────────
  if (compact) {
    return (
      <View
        style={[
          styles.compactContainer,
          { backgroundColor: colors.bg, borderColor: colors.border },
        ]}
      >
        <IconComponent size={currentSize.iconSize} color={colors.icon} />
        <Text
          style={[
            styles.compactText,
            { color: colors.text, fontSize: currentSize.fontSize },
          ]}
        >
          {countdownText}
        </Text>
      </View>
    );
  }

  // ─── Versão Completa ─────────────────────
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          padding: currentSize.padding,
        },
      ]}
    >
      {/* Cabeçalho com ícone e label */}
      <View style={styles.header}>
        <IconComponent size={currentSize.iconSize} color={colors.icon} />
        <Text
          style={[
            styles.label,
            { color: colors.text, fontSize: currentSize.fontSize - 2 },
          ]}
        >
          {label}
        </Text>
      </View>

      {/* Data formatada */}
      <Text
        style={[
          styles.dateText,
          { color: colors.accent, fontSize: currentSize.fontSize },
        ]}
      >
        {formatDate(deadline)}
      </Text>

      {/* Contagem regressiva */}
      {showCountdown && (
        <View style={styles.countdownContainer}>
          {!timeRemaining.isExpired ? (
            <>
              {/* Blocos de tempo */}
              <View style={styles.timeBlocks}>
                {timeRemaining.days > 0 && (
                  <TimeBlock
                    value={timeRemaining.days}
                    label="dias"
                    color={colors.accent}
                    size={size}
                  />
                )}
                <TimeBlock
                  value={timeRemaining.hours}
                  label="horas"
                  color={colors.accent}
                  size={size}
                />
                <TimeBlock
                  value={timeRemaining.minutes}
                  label="min"
                  color={colors.accent}
                  size={size}
                />
                {timeRemaining.days === 0 && (
                  <TimeBlock
                    value={timeRemaining.seconds}
                    label="seg"
                    color={colors.accent}
                    size={size}
                  />
                )}
              </View>
            </>
          ) : (
            <View style={styles.expiredContainer}>
              <XCircle size={20} color={colors.icon} />
              <Text style={[styles.expiredText, { color: colors.text }]}>
                Prazo expirado
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ============================================
// COMPONENTE DE BLOCO DE TEMPO
// ============================================

interface TimeBlockProps {
  value: number;
  label: string;
  color: string;
  size: 'small' | 'medium' | 'large';
}

function TimeBlock({ value, label, color, size }: TimeBlockProps) {
  const blockSizes = {
    small: { width: 36, height: 32, fontSize: 14, labelSize: 8 },
    medium: { width: 48, height: 40, fontSize: 18, labelSize: 10 },
    large: { width: 56, height: 48, fontSize: 22, labelSize: 12 },
  };
  const currentSize = blockSizes[size];

  return (
    <View style={styles.timeBlock}>
      <View
        style={[
          styles.timeBlockValue,
          {
            width: currentSize.width,
            height: currentSize.height,
            borderColor: color,
          },
        ]}
      >
        <Text
          style={[
            styles.timeBlockNumber,
            { color, fontSize: currentSize.fontSize },
          ]}
        >
          {value.toString().padStart(2, '0')}
        </Text>
      </View>
      <Text
        style={[
          styles.timeBlockLabel,
          { color: '#64748B', fontSize: currentSize.labelSize },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    marginLeft: 6,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateText: {
    fontWeight: '600',
    marginBottom: 12,
  },
  countdownContainer: {
    marginTop: 4,
  },
  timeBlocks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  timeBlock: {
    alignItems: 'center',
  },
  timeBlockValue: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBlockNumber: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timeBlockLabel: {
    marginTop: 4,
    fontWeight: '500',
  },
  expiredContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  expiredText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },

  // Versão compacta
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  compactText: {
    marginLeft: 6,
    fontWeight: '600',
  },
});

export default DeadlineTimer;
