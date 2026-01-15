// app/(tabs)/inspection.tsx
// ============================================
// ROTAFRETE - Tela de Inspeção Semanal
// ============================================
// Tela principal para o motorista gerenciar suas
// inspeções veiculares semanais.
// ============================================

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Camera,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Settings,
  History,
  Send,
  RefreshCw,
} from 'lucide-react-native';
import { useAuth } from '@aether-baas/react-native';

// Componentes
import {
  CategoryGrid,
  ProgressRing,
  DeadlineTimer,
  InspectionCard,
  StatusBadge,
  ItemPhotoCard,
} from '@/components/inspection';

// Store e constantes
import { useInspectionStore, useInspectionProgress, useInspectionAlerts } from '@/store/useInspectionStore';
import { CATEGORIAS_ORDENADAS, formatarSemanaISO } from '@/constants/inspection';
import type { InspecaoVeicular, ItemInspecao, CategoriaInspecao } from '@/types/inspection';

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function InspectionScreen() {
  const { user } = useAuth();

  // Store de inspeção
  const {
    inspecaoAtual,
    itensInspecao,
    historico: historicoInspecoes,
    isLoading,
    isUploading: isEnviandoFoto,
    error,
    uploadProgress,
    itemSelecionadoId: itemEmUpload,
    carregarInspecaoAtual: carregarInspecaoAtualRaw,
    carregarHistorico,
    enviarInspecao,
    getItensCategoria: getItensPorCategoria,
    podeEnviar: podeFinalizarEnvio,
    limparErro,
  } = useInspectionStore();

  // Wrapper para carregarInspecaoAtual com dados do motorista
  const carregarInspecaoAtual = async (userId: string, _dadosMotorista: object, _dadosVeiculo: object) => {
    await carregarInspecaoAtualRaw(userId);
  };

  // Wrapper para finalizarEnvio
  const finalizarEnvio = async () => {
    if (user && inspecaoAtual) {
      await enviarInspecao(inspecaoAtual.id, user.id);
    }
  };

  // Subscriptions (Realtime Implementation)
  const [unsubscribeFunc, setUnsubscribeFunc] = useState<(() => void) | null>(null);

  const iniciarSubscriptions = (userId: string) => {
    // Evita múltiplas subscriptions
    if (unsubscribeFunc) return;

    // Inicia a escuta
    const unsub = useInspectionStore.getState().subscribeToCurrentInspection(userId);
    setUnsubscribeFunc(() => unsub);
  };

  const pararSubscriptions = () => {
    if (unsubscribeFunc) {
      unsubscribeFunc();
      setUnsubscribeFunc(null);
    }
  };

  // Função para obter itens pendentes de reenvio
  const getItensPendentesReenvio = () => {
    return itensInspecao.filter(item => item.requerReenvio);
  };

  // Hooks derivados
  const progress = useInspectionProgress();
  const alerts = useInspectionAlerts();

  // Estado local
  const [refreshing, setRefreshing] = useState(false);
  const [categoriaExpandida, setCategoriaExpandida] = useState<CategoriaInspecao | null>(null);

  // ─── Carrega dados iniciais ──────────────
  useEffect(() => {
    if (user) {
      carregarDados();
      iniciarSubscriptions(user.id);
    }

    return () => {
      pararSubscriptions();
    };
  }, [user?.id]);

  // Função para carregar/recarregar dados
  const carregarDados = async () => {
    if (!user) return;

    // Dados do motorista e veículo (normalmente viriam do perfil)
    const dadosMotorista = {
      nome: user.name || 'Motorista',
      email: user.email || '',
    };

    // TODO: Buscar dados reais do veículo do motorista
    const dadosVeiculo = {
      placa: user.metadata?.placaVeiculo || 'ABC-1234',
      modelo: user.metadata?.modeloVeiculo || 'Veículo',
      tipo: user.metadata?.tipoVeiculo || 'UTILITARIO',
    };

    await carregarInspecaoAtual(user.id, dadosMotorista, dadosVeiculo);
    await carregarHistorico(user.id, 5);
  };

  // ─── Pull to refresh ─────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await carregarDados();
    setRefreshing(false);
  }, [user?.id]);

  // ─── Handlers ────────────────────────────

  // Abre câmera para capturar foto de um item
  const handleCapturaFoto = (item: ItemInspecao) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/inspection/camera/[categoria]',
      params: {
        categoria: item.categoria,
        itemId: item.id,
        itemNome: item.nomeExibicao,
        isReenvio: item.requerReenvio ? 'true' : 'false',
      },
    });
  };

  // Abre categoria para ver todos os itens
  const handleAbrirCategoria = (categoria: CategoriaInspecao) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!inspecaoAtual) {
      Alert.alert(
        'Aguarde',
        'Carregando dados da inspeção...',
        [{ text: 'OK' }]
      );
      return;
    }

    // Navega direto para a câmera da categoria
    router.push({
      pathname: '/inspection/camera/[categoria]',
      params: {
        categoria: categoria,
      },
    });
  };

  // Finaliza o envio da inspeção
  const handleFinalizarEnvio = async () => {
    if (!podeFinalizarEnvio()) {
      Alert.alert(
        'Inspeção Incompleta',
        'Você precisa enviar fotos de todos os itens obrigatórios antes de finalizar.',
        [{ text: 'OK' }]
      );
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Alert.alert(
      'Finalizar Inspeção',
      'Tem certeza que deseja enviar a inspeção para análise? Após o envio, você não poderá mais adicionar fotos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            await finalizarEnvio();
            Alert.alert(
              'Inspeção Enviada!',
              'Sua inspeção foi enviada para análise. Você receberá uma notificação quando a avaliação for concluída.',
              [{ text: 'OK' }]
            );
          },
        },
      ]
    );
  };

  // Abre histórico de inspeções
  const handleAbrirHistorico = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/inspection/historico');
  };

  // Abre configurações de notificação
  const handleAbrirConfiguracoes = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/inspection/configuracoes');
  };

  // ─── Renderização ────────────────────────

  // Itens que precisam de reenvio (críticos/atenção)
  const itensPendentesReenvio = getItensPendentesReenvio();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Inspeção Semanal</Text>
          {inspecaoAtual ? (
            <Text style={styles.headerSubtitle}>
              {formatarSemanaISO(inspecaoAtual.semanaReferencia)}
            </Text>
          ) : (
            <Text style={styles.headerSubtitle}>
              {formatarSemanaISO(new Date().toISOString().split('T')[0])}
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleAbrirHistorico}
          >
            <History size={22} color="#94A3B8" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleAbrirConfiguracoes}
          >
            <Settings size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
            colors={['#3B82F6']}
          />
        }
      >
        {/* Erro */}
        {error && (
          <TouchableOpacity style={styles.errorBanner} onPress={limparErro}>
            <AlertTriangle size={16} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </TouchableOpacity>
        )}

        {/* Empty State Explícito quando não há inspeção */}
        {!inspecaoAtual && !isLoading && (
          <View style={styles.emptyContainer}>
            <AlertTriangle size={48} color="#64748B" />
            <Text style={styles.emptyTitle}>Nenhuma Inspeção Ativa</Text>
            <Text style={styles.emptyText}>
              Não foi encontrada uma inspeção programada para esta semana.
              Puxe para baixo para atualizar ou tente novamente.
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={async () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                await carregarDados();
              }}
            >
              <RefreshCw size={20} color="#FFF" />
              <Text style={styles.retryButtonText}>Tentar Novamente</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Renderiza o conteúdo APENAS se inspecaoAtual existir */}
        {inspecaoAtual && (
          <>
            {/* Card de Prazo (se inspeção pendente) */}
            {(inspecaoAtual.status === 'PENDENTE' ||
              inspecaoAtual.status === 'PARCIAL') && (
                <View style={styles.deadlineSection}>
                  <DeadlineTimer
                    deadline={inspecaoAtual.dataLimiteEnvio}
                    label="Prazo de Envio"
                    size="medium"
                  />
                </View>
              )}

            {/* Card de Progresso */}
            <View style={styles.progressCard}>
              <LinearGradient
                colors={['#1E293B', '#0F172A']}
                style={styles.progressGradient}
              >
                {/* Progresso circular */}
                <View style={styles.progressContent}>
                  <ProgressRing
                    progress={progress.porcentagem}
                    size={100}
                    strokeWidth={8}
                    progressColor={progress.porcentagem === 100 ? '#22C55E' : '#3B82F6'}
                  />
                  <View style={styles.progressInfo}>
                    <Text style={styles.progressTitle}>Progresso</Text>
                    <Text style={styles.progressCount}>
                      {progress.enviados} de {progress.total} itens
                    </Text>
                    <StatusBadge
                      status={
                        inspecaoAtual.status === 'ENVIADA'
                          ? 'PENDENTE'
                          : inspecaoAtual.status as any
                      }
                      size="md"
                    />
                  </View>
                </View>

                {/* Contadores de status */}
                {(inspecaoAtual.itensAprovados > 0 ||
                  inspecaoAtual.itensAtencao > 0 ||
                  inspecaoAtual.itensCriticos > 0) && (
                    <View style={styles.statusCounters}>
                      {inspecaoAtual.itensAprovados > 0 && (
                        <View style={styles.statusCounter}>
                          <CheckCircle size={14} color="#22C55E" />
                          <Text style={styles.statusCounterText}>
                            {inspecaoAtual.itensAprovados} OK
                          </Text>
                        </View>
                      )}
                      {inspecaoAtual.itensAtencao > 0 && (
                        <View style={styles.statusCounter}>
                          <AlertTriangle size={14} color="#F59E0B" />
                          <Text style={styles.statusCounterTextWarning}>
                            {inspecaoAtual.itensAtencao} Atenção
                          </Text>
                        </View>
                      )}
                      {inspecaoAtual.itensCriticos > 0 && (
                        <View style={styles.statusCounter}>
                          <AlertTriangle size={14} color="#EF4444" />
                          <Text style={styles.statusCounterTextCritical}>
                            {inspecaoAtual.itensCriticos} Crítico
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
              </LinearGradient>
            </View>

            {/* Seção de Reenvios Pendentes */}
            {itensPendentesReenvio.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <RefreshCw size={18} color="#EF4444" />
                  <Text style={styles.sectionTitleCritical}>
                    Reenvios Pendentes ({itensPendentesReenvio.length})
                  </Text>
                </View>
                <Text style={styles.sectionDescription}>
                  Itens que precisam de nova foto após manutenção
                </Text>
                {itensPendentesReenvio.map((item) => (
                  <ItemPhotoCard
                    key={item.id}
                    item={item}
                    isUploading={itemEmUpload === item.id}
                    uploadProgress={uploadProgress}
                    onPress={handleCapturaFoto}
                    variant="expanded"
                  />
                ))}
              </View>
            )}

            {/* Grid de Categorias */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Camera size={18} color="#3B82F6" />
                <Text style={styles.sectionTitle}>Enviar Fotos por Categoria</Text>
              </View>

              <CategoryGrid
                categorias={CATEGORIAS_ORDENADAS
                  .filter(cat => itensInspecao.some(i => i.categoria === cat.id)) // [FIX] Show only active categories
                  .map(cat => {
                    const itensCategoria = itensInspecao.filter(i => i.categoria === cat.id);
                    const enviados = itensCategoria.filter(i => i.fotoUrl).length;
                    return {
                      categoria: cat.id,
                      itensEnviados: enviados,
                      totalItens: itensCategoria.length,
                      completa: enviados === itensCategoria.length && itensCategoria.length > 0,
                    };
                  })}
                onCategoriaPress={handleAbrirCategoria}
              />
            </View>

            {/* Lista de itens da categoria expandida */}
            {categoriaExpandida && (
              <View style={styles.itensExpandidos}>
                <Text style={styles.itensExpandidosTitle}>
                  {CATEGORIAS_ORDENADAS.find((c) => c.id === categoriaExpandida)?.nome}
                </Text>
                {getItensPorCategoria(categoriaExpandida).map((item) => (
                  <ItemPhotoCard
                    key={item.id}
                    item={item}
                    isUploading={itemEmUpload === item.id}
                    uploadProgress={uploadProgress}
                    onPress={handleCapturaFoto}
                    variant="expanded"
                  />
                ))}
              </View>
            )}

            {/* Botão de Finalizar Envio */}
            {(inspecaoAtual.status === 'PENDENTE' ||
              inspecaoAtual.status === 'PARCIAL') && (
                <TouchableOpacity
                  style={[
                    styles.finalizarButton,
                    !podeFinalizarEnvio() && styles.finalizarButtonDisabled,
                  ]}
                  onPress={handleFinalizarEnvio}
                  disabled={!podeFinalizarEnvio() || isLoading}
                  activeOpacity={0.8}
                >
                  <Send size={20} color="#fff" />
                  <Text style={styles.finalizarButtonText}>
                    Enviar Inspeção Completa
                  </Text>
                </TouchableOpacity>
              )}

            {/* Status de Inspeção Enviada */}
            {inspecaoAtual.status === 'ENVIADA' && (
              <View style={styles.enviadaCard}>
                <Clock size={32} color="#3B82F6" />
                <Text style={styles.enviadaTitle}>Inspeção Enviada!</Text>
                <Text style={styles.enviadaDescription}>
                  Sua inspeção foi enviada para análise. Você receberá uma
                  notificação quando a avaliação for concluída.
                </Text>
                {inspecaoAtual.dataEnvio && (
                  <Text style={styles.enviadaDate}>
                    Enviada em{' '}
                    {new Date(inspecaoAtual.dataEnvio).toLocaleString('pt-BR')}
                  </Text>
                )}
              </View>
            )}

            {/* [NOVO] Status de Inspeção Avaliada/Finalizada */}
            {(inspecaoAtual.status === 'APROVADA' ||
              inspecaoAtual.status === 'REPROVADA' ||
              inspecaoAtual.status === 'EM_ANALISE') && (
                <View style={[
                  styles.enviadaCard,
                  inspecaoAtual.status === 'APROVADA' && { backgroundColor: '#052E16', borderColor: '#166534' },
                  inspecaoAtual.status === 'REPROVADA' && { backgroundColor: '#450A0A', borderColor: '#7F1D1D' },
                ]}>
                  <CheckCircle
                    size={48}
                    color={
                      inspecaoAtual.status === 'APROVADA' ? '#22C55E' :
                        inspecaoAtual.status === 'REPROVADA' ? '#EF4444' : '#3B82F6'
                    }
                  />
                  <Text style={[
                    styles.enviadaTitle,
                    inspecaoAtual.status === 'APROVADA' && { color: '#22C55E' },
                    inspecaoAtual.status === 'REPROVADA' && { color: '#EF4444' },
                  ]}>
                    {inspecaoAtual.status === 'APROVADA' && 'Inspeção Aprovada! ✓'}
                    {inspecaoAtual.status === 'EM_ANALISE' && 'Em Análise pelo Admin'}
                    {inspecaoAtual.status === 'REPROVADA' && 'Inspeção com Pendências'}
                  </Text>
                  <Text style={styles.enviadaDescription}>
                    {inspecaoAtual.status === 'APROVADA'
                      ? 'Sua inspeção desta semana foi concluída com sucesso. Aguarde a próxima inspeção semanal.'
                      : inspecaoAtual.status === 'EM_ANALISE'
                        ? 'O administrador está analisando sua inspeção. Você receberá uma notificação quando terminar.'
                        : 'Sua inspeção foi avaliada. Verifique se há itens que precisam de reenvio na seção acima.'
                    }
                  </Text>
                  {inspecaoAtual.dataAvaliacao && (
                    <Text style={styles.enviadaDate}>
                      Avaliada em{' '}
                      {new Date(inspecaoAtual.dataAvaliacao).toLocaleString('pt-BR')}
                    </Text>
                  )}
                </View>
              )}
          </>
        )}

        {/* Histórico Recente */}
        {historicoInspecoes.length > 1 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <History size={18} color="#64748B" />
              <Text style={styles.sectionTitle}>Histórico Recente</Text>
              <TouchableOpacity onPress={handleAbrirHistorico}>
                <Text style={styles.sectionLink}>Ver todas</Text>
              </TouchableOpacity>
            </View>
            {historicoInspecoes
              .filter((i) => i.id !== inspecaoAtual?.id)
              .slice(0, 3)
              .map((inspecao) => (
                <InspectionCard
                  key={inspecao.id}
                  inspecao={inspecao}
                  onPress={() => {
                    // TODO: Navegar para detalhes da inspeção
                  }}
                  variant="compact"
                />
              ))}
          </View>
        )}

        {/* Espaço inferior */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 8,
    backgroundColor: '#1E293B',
    borderRadius: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F1F5F9',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },

  // Erro
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#450A0A',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#7F1D1D',
  },
  errorText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#FCA5A5',
  },

  // Deadline
  deadlineSection: {
    marginBottom: 16,
  },

  // Progress Card
  progressCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  progressGradient: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  progressContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressInfo: {
    flex: 1,
    marginLeft: 20,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  progressCount: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  statusCounters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  statusCounter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusCounterText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#22C55E',
    fontWeight: '500',
  },
  statusCounterTextWarning: {
    marginLeft: 4,
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
  },
  statusCounterTextCritical: {
    marginLeft: 4,
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },

  // Seções
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E2E8F0',
    marginLeft: 8,
    flex: 1,
  },
  sectionTitleCritical: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 8,
    flex: 1,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 12,
    marginLeft: 26,
  },
  sectionLink: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '500',
  },

  // Itens expandidos
  itensExpandidos: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  itensExpandidosTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 12,
  },

  // Botão Finalizar
  finalizarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
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

  // Card Enviada
  enviadaCard: {
    alignItems: 'center',
    backgroundColor: '#052E16',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#166534',
    marginTop: 8,
  },
  enviadaTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#22C55E',
    marginTop: 12,
  },
  enviadaDescription: {
    fontSize: 14,
    color: '#86EFAC',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  enviadaDate: {
    fontSize: 12,
    color: '#4ADE80',
    marginTop: 12,
  },

  bottomSpacer: {
    height: 100,
  },
});
