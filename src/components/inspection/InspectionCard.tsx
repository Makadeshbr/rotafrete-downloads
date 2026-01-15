// src/components/inspection/InspectionCard.tsx
// ============================================
// Componente Card de Inspeção
// ============================================
// Card resumido de uma inspeção semanal, usado
// na home do motorista e no histórico.
// ============================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  ChevronRight,
  Camera,
  FileCheck,
} from 'lucide-react-native';
import { ProgressRing } from './ProgressRing';
import { StatusBadge } from './StatusBadge';
import { formatarSemanaISO } from '@/constants/inspection';
import type { InspecaoVeicular, StatusInspecao } from '@/types/inspection';

// ============================================
// TIPOS
// ============================================

interface InspectionCardProps {
  /** Dados da inspeção */
  inspecao: InspecaoVeicular;
  /** Callback ao pressionar o card */
  onPress: (inspecao: InspecaoVeicular) => void;
  /** Se é a inspeção da semana atual (destaque visual) */
  isCurrentWeek?: boolean;
  /** Variante do card */
  variant?: 'default' | 'compact' | 'highlight';
}

// ============================================
// CONFIGURAÇÃO DE STATUS
// ============================================

const STATUS_CONFIG: Record<
  StatusInspecao,
  {
    label: string;
    icon: React.ComponentType<any>;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  PENDENTE: {
    label: 'Pendente',
    icon: Clock,
    color: '#F59E0B',
    bgColor: '#422006',
    borderColor: '#713F12',
  },
  ENVIADA: {
    label: 'Enviada',
    icon: FileCheck,
    color: '#3B82F6',
    bgColor: '#172554',
    borderColor: '#1E40AF',
  },
  EM_ANALISE: {
    label: 'Em Análise',
    icon: Clock,
    color: '#8B5CF6',
    bgColor: '#2E1065',
    borderColor: '#5B21B6',
  },
  APROVADA: {
    label: 'Aprovada',
    icon: CheckCircle,
    color: '#22C55E',
    bgColor: '#052E16',
    borderColor: '#166534',
  },
  REPROVADA: {
    label: 'Reprovada',
    icon: XCircle,
    color: '#EF4444',
    bgColor: '#450A0A',
    borderColor: '#7F1D1D',
  },
  PARCIAL: {
    label: 'Parcial',
    icon: AlertTriangle,
    color: '#F59E0B',
    bgColor: '#422006',
    borderColor: '#713F12',
  },
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function InspectionCard({
  inspecao,
  onPress,
  isCurrentWeek = false,
  variant = 'default',
}: InspectionCardProps) {
  const statusConfig = STATUS_CONFIG[inspecao.status];
  const StatusIcon = statusConfig.icon;

  // Calcula progresso
  const progresso =
    inspecao.totalItens > 0
      ? Math.round((inspecao.itensEnviados / inspecao.totalItens) * 100)
      : 0;

  // Formata datas
  const semanaFormatada = formatarSemanaISO(inspecao.semanaReferencia);
  const dataLimite = new Date(inspecao.dataLimiteEnvio);
  const dataLimiteFormatada = dataLimite.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });

  // Verifica se está atrasado
  const isAtrasado =
    inspecao.status === 'PENDENTE' && new Date() > dataLimite;

  // Handler de press
  const handlePress = () => {
    onPress(inspecao);
  };

  // ─── Versão Compacta ─────────────────────
  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={styles.compactContainer}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        {/* Status Icon */}
        <View
          style={[
            styles.compactStatusIcon,
            { backgroundColor: statusConfig.bgColor },
          ]}
        >
          <StatusIcon size={16} color={statusConfig.color} />
        </View>

        {/* Info */}
        <View style={styles.compactInfo}>
          <Text style={styles.compactSemana}>{semanaFormatada}</Text>
          <Text style={[styles.compactStatus, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>

        {/* Progresso ou seta */}
        {inspecao.status === 'PENDENTE' || inspecao.status === 'PARCIAL' ? (
          <Text style={styles.compactProgresso}>{progresso}%</Text>
        ) : (
          <ChevronRight size={16} color="#64748B" />
        )}
      </TouchableOpacity>
    );
  }

  // ─── Versão Highlight (Semana Atual) ─────
  if (variant === 'highlight' || isCurrentWeek) {
    return (
      <TouchableOpacity
        style={[
          styles.highlightContainer,
          { borderColor: statusConfig.borderColor },
          isAtrasado && styles.highlightContainerAtrasado,
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {/* Header */}
        <View style={styles.highlightHeader}>
          <View style={styles.highlightTitleRow}>
            <Camera size={20} color="#3B82F6" />
            <Text style={styles.highlightTitle}>Inspeção Semanal</Text>
          </View>
          <View
            style={[
              styles.highlightBadge,
              { backgroundColor: statusConfig.bgColor },
            ]}
          >
            <StatusIcon size={14} color={statusConfig.color} />
            <Text
              style={[styles.highlightBadgeText, { color: statusConfig.color }]}
            >
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Semana e Prazo */}
        <View style={styles.highlightInfo}>
          <Text style={styles.highlightSemana}>{semanaFormatada}</Text>
          <Text
            style={[
              styles.highlightPrazo,
              isAtrasado && styles.highlightPrazoAtrasado,
            ]}
          >
            {isAtrasado ? '⚠️ Prazo vencido' : `Prazo: ${dataLimiteFormatada}`}
          </Text>
        </View>

        {/* Progresso */}
        <View style={styles.highlightProgressContainer}>
          <View style={styles.highlightProgressInfo}>
            <Text style={styles.highlightProgressLabel}>
              {inspecao.itensEnviados} de {inspecao.totalItens} itens
            </Text>
            <Text style={styles.highlightProgressPercent}>{progresso}%</Text>
          </View>
          <View style={styles.highlightProgressBar}>
            <View
              style={[
                styles.highlightProgressFill,
                {
                  width: `${progresso}%`,
                  backgroundColor:
                    progresso === 100 ? '#22C55E' : statusConfig.color,
                },
              ]}
            />
          </View>
        </View>

        {/* Alertas */}
        {(inspecao.itensCriticos > 0 || inspecao.itensAtencao > 0) && (
          <View style={styles.highlightAlerts}>
            {inspecao.itensCriticos > 0 && (
              <View style={styles.highlightAlertItem}>
                <XCircle size={14} color="#EF4444" />
                <Text style={styles.highlightAlertTextCritical}>
                  {inspecao.itensCriticos} crítico
                  {inspecao.itensCriticos > 1 ? 's' : ''}
                </Text>
              </View>
            )}
            {inspecao.itensAtencao > 0 && (
              <View style={styles.highlightAlertItem}>
                <AlertTriangle size={14} color="#F59E0B" />
                <Text style={styles.highlightAlertTextWarning}>
                  {inspecao.itensAtencao} atenção
                </Text>
              </View>
            )}
          </View>
        )}

        {/* CTA */}
        <View style={styles.highlightCTA}>
          <Text style={styles.highlightCTAText}>
            {inspecao.status === 'PENDENTE'
              ? 'Enviar Fotos'
              : inspecao.status === 'PARCIAL'
              ? 'Continuar'
              : 'Ver Detalhes'}
          </Text>
          <ChevronRight size={18} color="#3B82F6" />
        </View>
      </TouchableOpacity>
    );
  }

  // ─── Versão Padrão ───────────────────────
  return (
    <TouchableOpacity
      style={[
        styles.container,
        { borderColor: statusConfig.borderColor },
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {/* Coluna esquerda: Progresso Ring */}
      <View style={styles.progressColumn}>
        <ProgressRing
          progress={progresso}
          size={56}
          strokeWidth={4}
          color={statusConfig.color}
        />
      </View>

      {/* Coluna central: Info */}
      <View style={styles.infoColumn}>
        <Text style={styles.semanaText}>{semanaFormatada}</Text>

        <View style={styles.statusRow}>
          <StatusIcon size={14} color={statusConfig.color} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>

        {/* Contadores */}
        <View style={styles.countersRow}>
          <Text style={styles.counterText}>
            {inspecao.itensEnviados}/{inspecao.totalItens} itens
          </Text>
          {inspecao.itensCriticos > 0 && (
            <View style={styles.counterBadge}>
              <Text style={styles.counterBadgeText}>
                {inspecao.itensCriticos} crítico
                {inspecao.itensCriticos > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Prazo */}
        {inspecao.status === 'PENDENTE' && (
          <Text
            style={[
              styles.prazoText,
              isAtrasado && styles.prazoTextAtrasado,
            ]}
          >
            {isAtrasado ? 'Atrasado' : `Prazo: ${dataLimiteFormatada}`}
          </Text>
        )}

        {/* Data de envio */}
        {inspecao.dataEnvio && (
          <Text style={styles.envioText}>
            Enviada:{' '}
            {new Date(inspecao.dataEnvio).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        )}
      </View>

      {/* Coluna direita: Seta */}
      <View style={styles.arrowColumn}>
        <ChevronRight size={20} color="#64748B" />
      </View>
    </TouchableOpacity>
  );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
  // ─── Container Padrão ────────────────────
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  progressColumn: {
    marginRight: 12,
  },
  infoColumn: {
    flex: 1,
  },
  arrowColumn: {
    marginLeft: 8,
  },
  semanaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  countersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  counterText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  counterBadge: {
    backgroundColor: '#450A0A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  counterBadgeText: {
    fontSize: 10,
    color: '#EF4444',
    fontWeight: '500',
  },
  prazoText: {
    fontSize: 11,
    color: '#64748B',
  },
  prazoTextAtrasado: {
    color: '#EF4444',
    fontWeight: '600',
  },
  envioText: {
    fontSize: 11,
    color: '#64748B',
  },

  // ─── Container Compacto ──────────────────
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  compactStatusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactInfo: {
    flex: 1,
    marginLeft: 10,
  },
  compactSemana: {
    fontSize: 13,
    fontWeight: '500',
    color: '#E2E8F0',
  },
  compactStatus: {
    fontSize: 11,
    fontWeight: '500',
  },
  compactProgresso: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },

  // ─── Container Highlight ─────────────────
  highlightContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
  },
  highlightContainerAtrasado: {
    borderColor: '#EF4444',
  },
  highlightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  highlightTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  highlightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
    marginLeft: 8,
  },
  highlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  highlightBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  highlightInfo: {
    marginBottom: 16,
  },
  highlightSemana: {
    fontSize: 14,
    color: '#94A3B8',
  },
  highlightPrazo: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  highlightPrazoAtrasado: {
    color: '#EF4444',
    fontWeight: '600',
  },
  highlightProgressContainer: {
    marginBottom: 12,
  },
  highlightProgressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  highlightProgressLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  highlightProgressPercent: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  highlightProgressBar: {
    height: 6,
    backgroundColor: '#0F172A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  highlightProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  highlightAlerts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  highlightAlertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  highlightAlertTextCritical: {
    fontSize: 11,
    color: '#EF4444',
    marginLeft: 4,
    fontWeight: '500',
  },
  highlightAlertTextWarning: {
    fontSize: 11,
    color: '#F59E0B',
    marginLeft: 4,
    fontWeight: '500',
  },
  highlightCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingVertical: 10,
    borderRadius: 8,
  },
  highlightCTAText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    marginRight: 4,
  },
});

export default InspectionCard;
