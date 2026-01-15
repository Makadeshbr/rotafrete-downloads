// app/(admin)/avaliar/[inspecaoId].tsx
// ============================================
// ROTAFRETE - Tela de Avaliação de Inspeção
// ============================================
// [FIXED] Adicionado proteção contra dados nulos (crash da placa)
// ============================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  User,
  Truck,
  Calendar,
  MessageSquare,
  Send,
  ZoomIn,
  X,
  ChevronDown,
} from 'lucide-react-native';

// Store e serviços
import { useAdminStore } from '@/store/useAdminStore';
import { useAuth } from '@aether-baas/react-native';
import { inspectionService } from '@/services/inspection-service';
import {
  STATUS_AVALIACAO_CONFIG,
  CATEGORIAS_INSPECAO,
  ITENS_INSPECAO_MAP,
  OPCOES_PRAZO_MANUTENCAO,
} from '@/constants/inspection';
import type {
  InspecaoVeicular,
  ItemInspecao,
  StatusAvaliacao,
  AvaliarItemInput,
} from '@/types/inspection';

// ============================================
// TIPOS LOCAIS
// ============================================

interface AvaliacaoState {
  status: StatusAvaliacao;
  observacao: string;
  diasPrazo: number | null;
}

// ============================================
// COMPONENTE DE SELEÇÃO DE STATUS
// ============================================

interface StatusSelectorProps {
  selectedStatus: StatusAvaliacao;
  onSelect: (status: StatusAvaliacao) => void;
}

function StatusSelector({ selectedStatus, onSelect }: StatusSelectorProps) {
  const statusOptions: StatusAvaliacao[] = ['BOM_ESTADO', 'ATENCAO', 'CRITICO'];

  return (
    <View style={styles.statusSelector}>
      {statusOptions.map((status) => {
        const config = STATUS_AVALIACAO_CONFIG[status];
        const isSelected = selectedStatus === status;

        return (
          <TouchableOpacity
            key={status}
            style={[
              styles.statusOption,
              {
                backgroundColor: isSelected ? config.bg : '#0F172A',
                borderColor: isSelected ? config.border : '#334155',
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(status);
            }}
            activeOpacity={0.7}
          >
            {status === 'BOM_ESTADO' && (
              <CheckCircle size={20} color={isSelected ? config.icon : '#64748B'} />
            )}
            {status === 'ATENCAO' && (
              <AlertTriangle size={20} color={isSelected ? config.icon : '#64748B'} />
            )}
            {status === 'CRITICO' && (
              <XCircle size={20} color={isSelected ? config.icon : '#64748B'} />
            )}
            <Text
              style={[
                styles.statusOptionText,
                { color: isSelected ? config.text : '#94A3B8' },
              ]}
            >
              {config.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function AvaliarInspecaoScreen() {
  const { inspecaoId } = useLocalSearchParams<{ inspecaoId: string }>();

  // Usuário autenticado (admin)
  const { user } = useAuth();

  // Estado da store
  const { avaliarItem } = useAdminStore();

  // Estados locais
  const [inspecao, setInspecao] = useState<InspecaoVeicular | null>(null);
  const [itens, setItens] = useState<ItemInspecao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Estado do item sendo avaliado
  const [itemSelecionado, setItemSelecionado] = useState<ItemInspecao | null>(null);
  const [avaliacao, setAvaliacao] = useState<AvaliacaoState>({
    status: 'PENDENTE',
    observacao: '',
    diasPrazo: null,
  });

  // Modal de foto ampliada
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);

  // Modal de prazo
  const [showPrazoPicker, setShowPrazoPicker] = useState(false);

  // ─── Carrega dados iniciais ──────────────
  useEffect(() => {
    if (inspecaoId) {
      carregarInspecao();
    }
  }, [inspecaoId]);

  const carregarInspecao = async () => {
    setIsLoading(true);
    try {
      const insp = await inspectionService.getInspecaoPorId(inspecaoId);
      const itensInsp = await inspectionService.listarItensInspecao(inspecaoId);

      setInspecao(insp);
      setItens(itensInsp);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar a inspeção.');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Handlers ────────────────────────────

  const handleSelecionarItem = (item: ItemInspecao) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setItemSelecionado(item);
    setAvaliacao({
      status: item.statusAvaliacao,
      observacao: item.observacaoAdmin || '',
      diasPrazo: item.diasParaManutencao || null,
    });
  };

  const handleSalvarAvaliacao = async () => {
    if (!itemSelecionado || !inspecao) return;

    // Valida se selecionou um status
    if (avaliacao.status === 'PENDENTE') {
      Alert.alert('Atenção', 'Selecione um status para este item.');
      return;
    }

    // Se for crítico ou atenção, precisa de prazo
    if (
      (avaliacao.status === 'CRITICO' || avaliacao.status === 'ATENCAO') &&
      !avaliacao.diasPrazo
    ) {
      Alert.alert('Atenção', 'Defina um prazo para manutenção.');
      return;
    }

    setIsSaving(true);
    try {
      const input: AvaliarItemInput = {
        itemId: itemSelecionado.id,
        status: avaliacao.status,
        observacao: avaliacao.observacao || undefined,
        diasParaManutencao: avaliacao.diasPrazo || undefined,
      };

      // [FIX] Usa dados reais do admin logado
      const adminId = user?.id || 'admin-unknown';
      const adminNome = user?.name || user?.email || 'Admin';
      await avaliarItem(input, adminId, adminNome);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Atualiza o item na lista local
      setItens((prev) =>
        prev.map((i) =>
          i.id === itemSelecionado.id
            ? {
              ...i,
              statusAvaliacao: avaliacao.status,
              observacaoAdmin: avaliacao.observacao,
              diasParaManutencao: avaliacao.diasPrazo || undefined,
            }
            : i
        )
      );

      // Fecha o modal de avaliação
      setItemSelecionado(null);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar a avaliação.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalizarAvaliacao = async () => {
    if (!inspecao) return;

    // Verifica se todos os itens foram avaliados
    const itensNaoAvaliados = itens.filter((i) => i.statusAvaliacao === 'PENDENTE');
    if (itensNaoAvaliados.length > 0) {
      Alert.alert(
        'Avaliação Incompleta',
        `Ainda há ${itensNaoAvaliados.length} item(s) pendente(s) de avaliação.`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Finalizar Avaliação',
      'Tem certeza que deseja finalizar a avaliação desta inspeção? O motorista será notificado.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Finalizar',
          onPress: async () => {
            setIsSaving(true);
            try {
              // [FIX] Usa dados reais do admin e chama inspectionService diretamente
              const adminId = user?.id || 'admin-unknown';
              const adminNome = user?.name || user?.email || 'Admin';

              await inspectionService.finalizarAvaliacao(
                inspecao.id,
                adminId,
                adminNome
              );

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Sucesso', 'Avaliação finalizada com sucesso! O motorista foi notificado.', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error: any) {
              console.error('[Admin] Erro ao finalizar avaliação:', error);
              Alert.alert('Erro', error?.message || 'Não foi possível finalizar a avaliação.');
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  // ─── Agrupa itens por categoria ──────────
  const itensPorCategoria = itens.reduce((acc, item) => {
    if (!acc[item.categoria]) {
      acc[item.categoria] = [];
    }
    acc[item.categoria].push(item);
    return acc;
  }, {} as Record<string, ItemInspecao[]>);

  // ─── Loading ─────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Carregando inspeção...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Contadores ──────────────────────────
  const contadores = {
    avaliados: itens.filter((i) => i.statusAvaliacao !== 'PENDENTE').length,
    aprovados: itens.filter((i) => i.statusAvaliacao === 'BOM_ESTADO').length,
    atencao: itens.filter((i) => i.statusAvaliacao === 'ATENCAO').length,
    criticos: itens.filter((i) => i.statusAvaliacao === 'CRITICO').length,
    total: itens.length,
  };

  // ─── Renderização ────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#F1F5F9" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Avaliar Inspeção</Text>
          <Text style={styles.headerSubtitle}>
            {/* [FIX] Blindagem contra nulos */}
            {inspecao?.motorista?.nome || 'Motorista'} • {inspecao?.veiculo?.placa || 'Sem placa'}
          </Text>
        </View>
      </View>

      {/* Info do Motorista */}
      <View style={styles.motoristaCard}>
        <View style={styles.motoristaRow}>
          <View style={styles.motoristaIcon}>
            <User size={20} color="#3B82F6" />
          </View>
          <View style={styles.motoristaInfo}>
            {/* [FIX] Blindagem contra nulos */}
            <Text style={styles.motoristaNome}>{inspecao?.motorista?.nome || 'Nome não disponível'}</Text>
            <Text style={styles.motoristaEmail}>{inspecao?.motorista?.email || 'Email não disponível'}</Text>
          </View>
        </View>
        <View style={styles.veiculoRow}>
          <View style={styles.veiculoItem}>
            <Truck size={14} color="#64748B" />
            {/* [FIX] Blindagem contra nulos */}
            <Text style={styles.veiculoText}>{inspecao?.veiculo?.placa || 'Placa N/A'}</Text>
          </View>
          <View style={styles.veiculoItem}>
            <Calendar size={14} color="#64748B" />
            <Text style={styles.veiculoText}>
              {inspecao?.dataEnvio
                ? new Date(inspecao.dataEnvio).toLocaleDateString('pt-BR')
                : '-'}
            </Text>
          </View>
        </View>
      </View>

      {/* Progresso da Avaliação */}
      <View style={styles.progressoBar}>
        <View style={styles.progressoInfo}>
          <Text style={styles.progressoText}>
            {contadores.avaliados}/{contadores.total} itens avaliados
          </Text>
          <View style={styles.progressoCounters}>
            <View style={styles.counterBadge}>
              <CheckCircle size={12} color="#22C55E" />
              <Text style={styles.counterText}>{contadores.aprovados}</Text>
            </View>
            <View style={styles.counterBadge}>
              <AlertTriangle size={12} color="#F59E0B" />
              <Text style={styles.counterTextWarning}>{contadores.atencao}</Text>
            </View>
            <View style={styles.counterBadge}>
              <XCircle size={12} color="#EF4444" />
              <Text style={styles.counterTextCritical}>{contadores.criticos}</Text>
            </View>
          </View>
        </View>
        <View style={styles.progressoBarTrack}>
          <View
            style={[
              styles.progressoBarFill,
              {
                width: `${contadores.total > 0 ? (contadores.avaliados / contadores.total) * 100 : 0}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Lista de Itens por Categoria */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {Object.entries(itensPorCategoria).map(([categoria, itensCategoria]) => {
          const categoriaConfig = CATEGORIAS_INSPECAO[categoria as keyof typeof CATEGORIAS_INSPECAO];

          return (
            <View key={categoria} style={styles.categoriaSection}>
              <Text style={styles.categoriaTitulo}>
                {categoriaConfig?.nome || categoria}
              </Text>

              <View style={styles.itensGrid}>
                {itensCategoria.map((item) => {
                  const statusConfig = STATUS_AVALIACAO_CONFIG[item.statusAvaliacao];
                  const itemConfig = ITENS_INSPECAO_MAP[item.itemId];

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.itemCard,
                        { borderColor: statusConfig.border },
                      ]}
                      onPress={() => handleSelecionarItem(item)}
                      activeOpacity={0.8}
                    >
                      {/* Thumbnail */}
                      {/* Thumbnail (Main Card Click handles interactions) */}
                      <View style={styles.itemThumbnail}>
                        {item.fotoUrl ? (
                          <>
                            <Image
                              source={{ uri: item.fotoUrl }}
                              style={styles.itemImage}
                              resizeMode="cover"
                            />
                            <View style={styles.zoomOverlay}>
                              <ZoomIn size={16} color="#fff" />
                            </View>
                          </>
                        ) : (
                          <View style={styles.itemNoImage}>
                            <Text style={styles.itemNoImageText}>Sem foto</Text>
                          </View>
                        )}
                      </View>

                      {/* Info */}
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemNome} numberOfLines={1}>
                          {itemConfig?.nome || item.nomeExibicao}
                        </Text>
                        <View
                          style={[
                            styles.itemStatus,
                            { backgroundColor: statusConfig.bg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.itemStatusText,
                              { color: statusConfig.text },
                            ]}
                          >
                            {statusConfig.label}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* Botão Finalizar */}
        <TouchableOpacity
          style={[
            styles.finalizarButton,
            contadores.avaliados < contadores.total && styles.finalizarButtonDisabled,
          ]}
          onPress={handleFinalizarAvaliacao}
          disabled={contadores.avaliados < contadores.total || isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Send size={20} color="#fff" />
              <Text style={styles.finalizarButtonText}>
                Finalizar Avaliação
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Modal de Avaliação do Item */}
      <Modal
        visible={!!itemSelecionado}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setItemSelecionado(null)}
      >
        {itemSelecionado && (
          <SafeAreaView style={styles.modalContainer}>
            {/* Header do Modal */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setItemSelecionado(null)}
                style={styles.modalCloseButton}
              >
                <X size={24} color="#F1F5F9" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Avaliar Item</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Foto do Item */}
              <TouchableOpacity
                style={styles.modalFoto}
                onPress={() =>
                  itemSelecionado.fotoUrl &&
                  setFotoAmpliada(itemSelecionado.fotoUrl)
                }
              >
                {itemSelecionado.fotoUrl ? (
                  <Image
                    source={{ uri: itemSelecionado.fotoUrl }}
                    style={styles.modalFotoImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.modalNoFoto}>
                    <Text style={styles.modalNoFotoText}>Sem foto</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Nome do Item */}
              <Text style={styles.modalItemNome}>
                {ITENS_INSPECAO_MAP[itemSelecionado.itemId]?.nome ||
                  itemSelecionado.nomeExibicao}
              </Text>
              <Text style={styles.modalItemDescricao}>
                {ITENS_INSPECAO_MAP[itemSelecionado.itemId]?.descricao}
              </Text>

              {/* Seletor de Status */}
              <Text style={styles.modalSectionTitle}>Status</Text>
              <StatusSelector
                selectedStatus={avaliacao.status}
                onSelect={(status) =>
                  setAvaliacao((prev) => ({ ...prev, status }))
                }
              />

              {/* Prazo (se CRITICO ou ATENCAO) */}
              {(avaliacao.status === 'CRITICO' ||
                avaliacao.status === 'ATENCAO') && (
                  <>
                    <Text style={styles.modalSectionTitle}>
                      Prazo para Manutenção
                    </Text>
                    <TouchableOpacity
                      style={styles.prazoSelector}
                      onPress={() => setShowPrazoPicker(true)}
                    >
                      <Clock size={18} color="#F59E0B" />
                      <Text style={styles.prazoSelectorText}>
                        {avaliacao.diasPrazo
                          ? OPCOES_PRAZO_MANUTENCAO.find(
                            (o) => o.valor === avaliacao.diasPrazo
                          )?.label || `${avaliacao.diasPrazo} dias`
                          : 'Selecionar prazo'}
                      </Text>
                      <ChevronDown size={18} color="#64748B" />
                    </TouchableOpacity>

                    {/* Picker de Prazo */}
                    {showPrazoPicker && (
                      <View style={styles.prazoOptions}>
                        {OPCOES_PRAZO_MANUTENCAO.map((opcao) => (
                          <TouchableOpacity
                            key={opcao.valor}
                            style={[
                              styles.prazoOption,
                              avaliacao.diasPrazo === opcao.valor &&
                              styles.prazoOptionSelected,
                            ]}
                            onPress={() => {
                              setAvaliacao((prev) => ({
                                ...prev,
                                diasPrazo: opcao.valor,
                              }));
                              setShowPrazoPicker(false);
                            }}
                          >
                            <Text
                              style={[
                                styles.prazoOptionText,
                                avaliacao.diasPrazo === opcao.valor &&
                                styles.prazoOptionTextSelected,
                              ]}
                            >
                              {opcao.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                )}

              {/* Observação */}
              <Text style={styles.modalSectionTitle}>Observação (opcional)</Text>
              <View style={styles.observacaoContainer}>
                <MessageSquare size={18} color="#64748B" />
                <TextInput
                  style={styles.observacaoInput}
                  placeholder="Adicione uma observação para o motorista..."
                  placeholderTextColor="#64748B"
                  value={avaliacao.observacao}
                  onChangeText={(text) =>
                    setAvaliacao((prev) => ({ ...prev, observacao: text }))
                  }
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Botão Salvar */}
              <TouchableOpacity
                style={styles.salvarButton}
                onPress={handleSalvarAvaliacao}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <CheckCircle size={20} color="#fff" />
                    <Text style={styles.salvarButtonText}>
                      Salvar Avaliação
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* Modal de Foto Ampliada */}
      <Modal
        visible={!!fotoAmpliada}
        transparent
        animationType="fade"
        onRequestClose={() => setFotoAmpliada(null)}
      >
        <View style={styles.fotoAmpliadaContainer}>
          <TouchableOpacity
            style={styles.fotoAmpliadaClose}
            onPress={() => setFotoAmpliada(null)}
          >
            <X size={28} color="#fff" />
          </TouchableOpacity>
          {fotoAmpliada && (
            <Image
              source={{ uri: fotoAmpliada }}
              style={styles.fotoAmpliadaImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================
// ESTILOS (MANTIDOS ORIGINAIS)
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 14,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },

  // Card Motorista
  motoristaCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 14,
  },
  motoristaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  motoristaIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#172554',
    alignItems: 'center',
    justifyContent: 'center',
  },
  motoristaInfo: {
    marginLeft: 12,
    flex: 1,
  },
  motoristaNome: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  motoristaEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  veiculoRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 16,
  },
  veiculoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  veiculoText: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 6,
  },

  // Progresso
  progressoBar: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
  },
  progressoInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressoText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  progressoCounters: {
    flexDirection: 'row',
    gap: 8,
  },
  counterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterText: {
    fontSize: 12,
    color: '#22C55E',
    marginLeft: 4,
    fontWeight: '600',
  },
  counterTextWarning: {
    fontSize: 12,
    color: '#F59E0B',
    marginLeft: 4,
    fontWeight: '600',
  },
  counterTextCritical: {
    fontSize: 12,
    color: '#EF4444',
    marginLeft: 4,
    fontWeight: '600',
  },
  progressoBarTrack: {
    height: 6,
    backgroundColor: '#0F172A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressoBarFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },

  // Categorias
  categoriaSection: {
    marginBottom: 20,
  },
  categoriaTitulo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 10,
  },
  itensGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  // Item Card
  itemCard: {
    width: '48%',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
  },
  itemThumbnail: {
    width: '100%',
    aspectRatio: 1.2,
    backgroundColor: '#0F172A',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  zoomOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 6,
    borderRadius: 6,
  },
  itemNoImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemNoImageText: {
    fontSize: 12,
    color: '#64748B',
  },
  itemInfo: {
    padding: 10,
  },
  itemNome: {
    fontSize: 12,
    fontWeight: '500',
    color: '#E2E8F0',
    marginBottom: 6,
  },
  itemStatus: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  itemStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Botão Finalizar
  finalizarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  finalizarButtonDisabled: {
    backgroundColor: '#334155',
    opacity: 0.6,
  },
  finalizarButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },

  bottomSpacer: {
    height: 100,
  },

  // Modal de Avaliação
  modalContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalFoto: {
    width: '100%',
    aspectRatio: 1.3,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  modalFotoImage: {
    width: '100%',
    height: '100%',
  },
  modalNoFoto: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalNoFotoText: {
    fontSize: 14,
    color: '#64748B',
  },
  modalItemNome: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  modalItemDescricao: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 10,
    marginTop: 8,
  },

  // Status Selector
  statusSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statusOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    gap: 6,
  },
  statusOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Prazo Selector
  prazoSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  prazoSelectorText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#E2E8F0',
  },
  prazoOptions: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    marginTop: 8,
    overflow: 'hidden',
  },
  prazoOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  prazoOptionSelected: {
    backgroundColor: '#172554',
  },
  prazoOptionText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  prazoOptionTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },

  // Observação
  observacaoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  observacaoInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#F1F5F9',
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Botão Salvar
  salvarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 40,
  },
  salvarButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },

  // Modal Foto Ampliada
  fotoAmpliadaContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fotoAmpliadaClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  fotoAmpliadaImage: {
    width: '100%',
    height: '80%',
  },
});