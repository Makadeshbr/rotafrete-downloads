// src/components/inspection/ItemPhotoCard.tsx
// ============================================
// Componente de Card de Foto de Item
// ============================================
// Exibe um item de inspeção com sua foto, status
// e ações disponíveis (enviar/reenviar foto).
// ============================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Camera,
  Check,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  ChevronRight,
} from 'lucide-react-native';
import { StatusBadge } from './StatusBadge';
import { STATUS_AVALIACAO_CONFIG, ITENS_INSPECAO_MAP } from '@/constants/inspection';
import type { ItemInspecao, StatusAvaliacao } from '@/types/inspection';

// ============================================
// TIPOS
// ============================================

interface ItemPhotoCardProps {
  /** Dados do item de inspeção */
  item: ItemInspecao;
  /** Se este item está em upload no momento */
  isUploading?: boolean;
  /** Progresso do upload (0-100) */
  uploadProgress?: number;
  /** Callback ao pressionar para enviar/reenviar foto */
  onPress: (item: ItemInspecao) => void;
  /** Callback ao pressionar para ver foto em tela cheia */
  onViewPhoto?: (item: ItemInspecao) => void;
  /** Estilo compacto (para grid) ou expandido (para lista) */
  variant?: 'compact' | 'expanded';
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function ItemPhotoCard({
  item,
  isUploading = false,
  uploadProgress = 0,
  onPress,
  onViewPhoto,
  variant = 'expanded',
}: ItemPhotoCardProps) {
  // Busca configuração do item
  const itemConfig = ITENS_INSPECAO_MAP[item.itemId];
  const statusConfig = STATUS_AVALIACAO_CONFIG[item.statusAvaliacao];

  // Determina se tem foto
  const temFoto = !!item.fotoUrl;
  const temFotoReenvio = !!item.fotoReenvioUrl;

  // Determina se precisa de ação
  const precisaEnviar = !temFoto;
  const precisaReenviar = item.requerReenvio && item.statusResolucao === 'PENDENTE';
  const foiReavaliado = item.requerReenvio && item.statusResolucao === 'REENVIADO';

  // Handler de press com haptics
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(item);
  };

  const handleViewPhoto = () => {
    if (onViewPhoto && temFoto) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onViewPhoto(item);
    }
  };

  // ─── Renderiza versão compacta (para grid) ───
  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={[
          styles.compactContainer,
          precisaReenviar && styles.compactContainerCritical,
        ]}
        onPress={handlePress}
        disabled={isUploading}
        activeOpacity={0.7}
      >
        {/* Thumbnail ou placeholder */}
        <View style={styles.compactThumbnail}>
          {temFoto ? (
            <Image
              source={{ uri: item.fotoUrl }}
              style={styles.compactImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.compactPlaceholder}>
              <Camera size={24} color="#64748B" />
            </View>
          )}

          {/* Overlay de upload */}
          {isUploading && (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.uploadText}>{uploadProgress}%</Text>
            </View>
          )}

          {/* Badge de status no canto */}
          {temFoto && !precisaEnviar && (
            <View style={styles.compactStatusBadge}>
              <StatusBadge status={item.statusAvaliacao} size="small" />
            </View>
          )}
        </View>

        {/* Nome do item */}
        <Text style={styles.compactLabel} numberOfLines={2}>
          {itemConfig?.nome || item.nomeExibicao}
        </Text>

        {/* Indicador de ação necessária */}
        {precisaEnviar && (
          <View style={styles.compactAction}>
            <Camera size={12} color="#3B82F6" />
            <Text style={styles.compactActionText}>Enviar</Text>
          </View>
        )}

        {precisaReenviar && (
          <View style={[styles.compactAction, styles.compactActionCritical]}>
            <RefreshCw size={12} color="#EF4444" />
            <Text style={[styles.compactActionText, styles.compactActionTextCritical]}>
              Reenviar
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // ─── Renderiza versão expandida (para lista) ───
  return (
    <TouchableOpacity
      style={[
        styles.container,
        precisaReenviar && styles.containerCritical,
        foiReavaliado && styles.containerPending,
      ]}
      onPress={handlePress}
      disabled={isUploading}
      activeOpacity={0.8}
    >
      {/* Thumbnail da foto */}
      <TouchableOpacity
        style={styles.thumbnailContainer}
        onPress={handleViewPhoto}
        disabled={!temFoto}
      >
        {temFoto ? (
          <>
            <Image
              source={{ uri: precisaReenviar && temFotoReenvio ? item.fotoReenvioUrl : item.fotoUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
            {/* Overlay de upload */}
            {isUploading && (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.uploadText}>{uploadProgress}%</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.placeholderContainer}>
            <Camera size={28} color="#64748B" />
            {isUploading ? (
              <ActivityIndicator color="#64748B" style={{ marginTop: 4 }} />
            ) : (
              <Text style={styles.placeholderText}>Tirar foto</Text>
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* Informações do item */}
      <View style={styles.infoContainer}>
        {/* Nome e status */}
        <View style={styles.header}>
          <Text style={styles.itemName} numberOfLines={1}>
            {itemConfig?.nome || item.nomeExibicao}
          </Text>
          {temFoto && (
            <StatusBadge status={item.statusAvaliacao} size="small" />
          )}
        </View>

        {/* Descrição/dica */}
        {!temFoto && itemConfig?.descricao && (
          <Text style={styles.description} numberOfLines={2}>
            {itemConfig.descricao}
          </Text>
        )}

        {/* Observação do admin */}
        {item.observacaoAdmin && (
          <View style={styles.observacaoContainer}>
            <AlertTriangle size={12} color={statusConfig.icon} />
            <Text
              style={[styles.observacaoText, { color: statusConfig.text }]}
              numberOfLines={2}
            >
              {item.observacaoAdmin}
            </Text>
          </View>
        )}

        {/* Prazo de manutenção */}
        {item.prazoManutencao && precisaReenviar && (
          <View style={styles.prazoContainer}>
            <Clock size={12} color="#F59E0B" />
            <Text style={styles.prazoText}>
              Prazo: {new Date(item.prazoManutencao).toLocaleDateString('pt-BR')}
              {item.diasParaManutencao && ` (${item.diasParaManutencao} dias)`}
            </Text>
          </View>
        )}

        {/* Status de reenvio */}
        {foiReavaliado && (
          <View style={styles.reenvioDoneContainer}>
            <Check size={12} color="#22C55E" />
            <Text style={styles.reenvioDoneText}>
              Foto reenviada - Aguardando avaliação
            </Text>
          </View>
        )}
      </View>

      {/* Ícone de ação */}
      <View style={styles.actionContainer}>
        {precisaEnviar && (
          <View style={styles.actionButton}>
            <Camera size={20} color="#3B82F6" />
          </View>
        )}
        {precisaReenviar && !foiReavaliado && (
          <View style={[styles.actionButton, styles.actionButtonCritical]}>
            <RefreshCw size={20} color="#EF4444" />
          </View>
        )}
        {temFoto && !precisaReenviar && !precisaEnviar && (
          <ChevronRight size={20} color="#64748B" />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
  // ─── Container Expandido ─────────────────
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  containerCritical: {
    borderColor: '#EF4444',
    backgroundColor: '#1E1E2E',
  },
  containerPending: {
    borderColor: '#F59E0B',
    backgroundColor: '#1E1E2E',
  },

  // ─── Thumbnail ───────────────────────────
  thumbnailContainer: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
  },
  placeholderText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
  },

  // ─── Upload Overlay ──────────────────────
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    marginTop: 4,
  },

  // ─── Info Container ──────────────────────
  infoContainer: {
    flex: 1,
    marginLeft: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F1F5F9',
    flex: 1,
    marginRight: 8,
  },
  description: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    lineHeight: 16,
  },

  // ─── Observação ──────────────────────────
  observacaoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  observacaoText: {
    fontSize: 11,
    marginLeft: 4,
    flex: 1,
    lineHeight: 14,
  },

  // ─── Prazo ───────────────────────────────
  prazoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  prazoText: {
    fontSize: 11,
    color: '#F59E0B',
    marginLeft: 4,
    fontWeight: '500',
  },

  // ─── Reenvio Done ────────────────────────
  reenvioDoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  reenvioDoneText: {
    fontSize: 11,
    color: '#22C55E',
    marginLeft: 4,
  },

  // ─── Action ──────────────────────────────
  actionContainer: {
    marginLeft: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonCritical: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },

  // ─── Container Compacto ──────────────────
  compactContainer: {
    width: '48%',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  compactContainerCritical: {
    borderColor: '#EF4444',
  },
  compactThumbnail: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    marginBottom: 8,
  },
  compactImage: {
    width: '100%',
    height: '100%',
  },
  compactPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactStatusBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  compactLabel: {
    fontSize: 12,
    color: '#E2E8F0',
    fontWeight: '500',
    marginBottom: 4,
  },
  compactAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactActionText: {
    fontSize: 10,
    color: '#3B82F6',
    marginLeft: 4,
    fontWeight: '500',
  },
  compactActionCritical: {},
  compactActionTextCritical: {
    color: '#EF4444',
  },
});

export default ItemPhotoCard;
