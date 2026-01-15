// app/(admin)/configuracoes.tsx
// ============================================
// ROTAFRETE - Configurações do Sistema (Admin)
// ============================================
// Permite ao admin configurar prazos, lembretes
// e itens do checklist de inspeção.
// ============================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  Settings,
  Clock,
  Calendar,
  Bell,
  CheckCircle,
  ChevronRight,
  AlertTriangle,
  List,
  Save,
  LogOut,
} from 'lucide-react-native';

// Store e constantes
import { useAdminStore } from '@/store/useAdminStore';
import { useAuthWithRole } from '@/hooks/useAuthWithRole';
import {
  DIAS_SEMANA,
  HORARIOS_DISPONIVEIS,
  OPCOES_PRAZO_MANUTENCAO,
  ITENS_INSPECAO,
  CATEGORIAS_ORDENADAS,
} from '@/constants/inspection';
import type { ConfigInspecaoGlobal, DiaSemana, ItemInspecaoId } from '@/types/inspection';

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function ConfiguracoesAdminScreen() {
  // Store
  const { configGlobal, isLoading, carregarConfigGlobal, atualizarConfigGlobal } =
    useAdminStore();

  // Auth - pega o ID do admin logado
  const { user } = useAuthWithRole();

  // Estado local
  const [config, setConfig] = useState<Partial<ConfigInspecaoGlobal>>({
    diaPrazoEnvio: 4,
    horaPrazoEnvio: '18:00',
    diaLembretePadrao: 2,
    horaLembretePadrao: '08:00',
    prazoAtencaoPadrao: 7,
    prazoCriticoPadrao: 3,
    itensAtivos: ITENS_INSPECAO.filter((i) => i.obrigatorio).map((i) => i.id),
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showDiaPrazoPicker, setShowDiaPrazoPicker] = useState(false);
  const [showHoraPrazoPicker, setShowHoraPrazoPicker] = useState(false);
  const [showDiaLembretePicker, setShowDiaLembretePicker] = useState(false);
  const [showItensConfig, setShowItensConfig] = useState(false);

  // Carrega config inicial
  useEffect(() => {
    carregarConfigGlobal();
  }, []);

  // Sincroniza com config carregada
  useEffect(() => {
    if (configGlobal) {
      setConfig({
        diaPrazoEnvio: configGlobal.diaPrazoEnvio,
        horaPrazoEnvio: configGlobal.horaPrazoEnvio,
        diaLembretePadrao: configGlobal.diaLembretePadrao,
        horaLembretePadrao: configGlobal.horaLembretePadrao,
        prazoAtencaoPadrao: configGlobal.prazoAtencaoPadrao,
        prazoCriticoPadrao: configGlobal.prazoCriticoPadrao,
        itensAtivos: configGlobal.itensAtivos,
      });
    }
  }, [configGlobal]);

  // Handlers
  const handleSalvar = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);

    try {
      await atualizarConfigGlobal(config, user?.id || 'admin');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Sucesso', 'Configurações salvas com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar as configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleItem = (itemId: ItemInspecaoId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConfig((prev) => {
      const itensAtivos = prev.itensAtivos || [];
      const isAtivo = itensAtivos.includes(itemId);

      return {
        ...prev,
        itensAtivos: isAtivo
          ? itensAtivos.filter((id) => id !== itemId)
          : [...itensAtivos, itemId],
      };
    });
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              const { getAuth } = await import('@aether-baas/react-native');
              const auth = getAuth();
              await auth.signOut();
              router.replace('/(auth)/login');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível sair. Tente novamente.');
            }
          },
        },
      ]
    );
  };

  // Encontra nomes
  const diaPrazoNome =
    DIAS_SEMANA.find((d) => d.valor === config.diaPrazoEnvio)?.nome || '';
  const diaLembreteNome =
    DIAS_SEMANA.find((d) => d.valor === config.diaLembretePadrao)?.nome || '';

  const itensAtivos = config.itensAtivos || [];
  const totalItens = ITENS_INSPECAO.length;
  const itensObrigatorios = ITENS_INSPECAO.filter((i) => i.obrigatorio).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Configurações</Text>
        <Text style={styles.headerSubtitle}>Sistema de inspeção</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Seção: Prazos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={18} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Prazos de Envio</Text>
          </View>

          <View style={styles.optionCard}>
            {/* Dia do prazo */}
            <TouchableOpacity
              style={styles.optionItemTouchable}
              onPress={() => setShowDiaPrazoPicker(!showDiaPrazoPicker)}
            >
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Dia limite de envio</Text>
                <Text style={styles.optionDescription}>
                  Dia da semana em que o motorista deve enviar a inspeção
                </Text>
              </View>
              <View style={styles.optionValue}>
                <Text style={styles.optionValueText}>{diaPrazoNome}</Text>
                <ChevronRight size={18} color="#64748B" />
              </View>
            </TouchableOpacity>

            {showDiaPrazoPicker && (
              <View style={styles.pickerContainer}>
                {DIAS_SEMANA.map((dia) => (
                  <TouchableOpacity
                    key={dia.valor}
                    style={[
                      styles.pickerOption,
                      config.diaPrazoEnvio === dia.valor && styles.pickerOptionActive,
                    ]}
                    onPress={() => {
                      setConfig((prev) => ({ ...prev, diaPrazoEnvio: dia.valor }));
                      setShowDiaPrazoPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        config.diaPrazoEnvio === dia.valor &&
                        styles.pickerOptionTextActive,
                      ]}
                    >
                      {dia.nome}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.optionDivider} />

            {/* Hora do prazo */}
            <TouchableOpacity
              style={styles.optionItemTouchable}
              onPress={() => setShowHoraPrazoPicker(!showHoraPrazoPicker)}
            >
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Horário limite</Text>
                <Text style={styles.optionDescription}>
                  Hora limite para envio no dia definido
                </Text>
              </View>
              <View style={styles.optionValue}>
                <Text style={styles.optionValueText}>{config.horaPrazoEnvio}</Text>
                <ChevronRight size={18} color="#64748B" />
              </View>
            </TouchableOpacity>

            {showHoraPrazoPicker && (
              <ScrollView
                horizontal
                style={styles.pickerContainerHorizontal}
                showsHorizontalScrollIndicator={false}
              >
                {HORARIOS_DISPONIVEIS.map((hora) => (
                  <TouchableOpacity
                    key={hora}
                    style={[
                      styles.pickerOptionHorizontal,
                      config.horaPrazoEnvio === hora && styles.pickerOptionActive,
                    ]}
                    onPress={() => {
                      setConfig((prev) => ({ ...prev, horaPrazoEnvio: hora }));
                      setShowHoraPrazoPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        config.horaPrazoEnvio === hora &&
                        styles.pickerOptionTextActive,
                      ]}
                    >
                      {hora}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>

        {/* Seção: Lembretes Padrão */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bell size={18} color="#F59E0B" />
            <Text style={styles.sectionTitle}>Lembretes Padrão</Text>
          </View>

          <View style={styles.optionCard}>
            <TouchableOpacity
              style={styles.optionItemTouchable}
              onPress={() => setShowDiaLembretePicker(!showDiaLembretePicker)}
            >
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Dia do lembrete padrão</Text>
                <Text style={styles.optionDescription}>
                  Para motoristas que não configuraram preferência
                </Text>
              </View>
              <View style={styles.optionValue}>
                <Text style={styles.optionValueText}>{diaLembreteNome}</Text>
                <ChevronRight size={18} color="#64748B" />
              </View>
            </TouchableOpacity>

            {showDiaLembretePicker && (
              <View style={styles.pickerContainer}>
                {DIAS_SEMANA.map((dia) => (
                  <TouchableOpacity
                    key={dia.valor}
                    style={[
                      styles.pickerOption,
                      config.diaLembretePadrao === dia.valor &&
                      styles.pickerOptionActive,
                    ]}
                    onPress={() => {
                      setConfig((prev) => ({
                        ...prev,
                        diaLembretePadrao: dia.valor,
                      }));
                      setShowDiaLembretePicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        config.diaLembretePadrao === dia.valor &&
                        styles.pickerOptionTextActive,
                      ]}
                    >
                      {dia.nome}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Seção: Prazos de Manutenção */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={18} color="#EF4444" />
            <Text style={styles.sectionTitle}>Prazos de Manutenção</Text>
          </View>

          <View style={styles.optionCard}>
            <View style={styles.optionItem}>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Prazo para itens "Atenção"</Text>
                <Text style={styles.optionDescription}>
                  Dias padrão para manutenção de itens com status Atenção
                </Text>
              </View>
              <View style={styles.prazoSelector}>
                {[3, 5, 7, 14].map((dias) => (
                  <TouchableOpacity
                    key={dias}
                    style={[
                      styles.prazoOption,
                      config.prazoAtencaoPadrao === dias &&
                      styles.prazoOptionActive,
                    ]}
                    onPress={() =>
                      setConfig((prev) => ({ ...prev, prazoAtencaoPadrao: dias }))
                    }
                  >
                    <Text
                      style={[
                        styles.prazoOptionText,
                        config.prazoAtencaoPadrao === dias &&
                        styles.prazoOptionTextActive,
                      ]}
                    >
                      {dias}d
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.optionDivider} />

            <View style={styles.optionItem}>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Prazo para itens "Crítico"</Text>
                <Text style={styles.optionDescription}>
                  Dias padrão para manutenção urgente
                </Text>
              </View>
              <View style={styles.prazoSelector}>
                {[1, 2, 3, 5].map((dias) => (
                  <TouchableOpacity
                    key={dias}
                    style={[
                      styles.prazoOption,
                      config.prazoCriticoPadrao === dias &&
                      styles.prazoOptionActive,
                      { borderColor: '#EF4444' },
                    ]}
                    onPress={() =>
                      setConfig((prev) => ({ ...prev, prazoCriticoPadrao: dias }))
                    }
                  >
                    <Text
                      style={[
                        styles.prazoOptionText,
                        config.prazoCriticoPadrao === dias &&
                        styles.prazoOptionTextActive,
                        config.prazoCriticoPadrao === dias && { color: '#EF4444' },
                      ]}
                    >
                      {dias}d
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Seção: Itens do Checklist */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeaderTouchable}
            onPress={() => setShowItensConfig(!showItensConfig)}
          >
            <List size={18} color="#22C55E" />
            <Text style={styles.sectionTitle}>Itens do Checklist</Text>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>
                {itensAtivos.length}/{totalItens}
              </Text>
            </View>
            <ChevronRight
              size={18}
              color="#64748B"
              style={{
                transform: [{ rotate: showItensConfig ? '90deg' : '0deg' }],
              }}
            />
          </TouchableOpacity>

          {showItensConfig && (
            <View style={styles.itensContainer}>
              {CATEGORIAS_ORDENADAS.map((categoria) => {
                const itensCategoria = ITENS_INSPECAO.filter(
                  (i) => i.categoria === categoria.id
                );

                return (
                  <View key={categoria.id} style={styles.categoriaContainer}>
                    <Text style={styles.categoriaTitulo}>{categoria.nome}</Text>
                    {itensCategoria.map((item) => {
                      const isAtivo = itensAtivos.includes(item.id);

                      return (
                        <View key={item.id} style={styles.itemRow}>
                          <View style={styles.itemInfo}>
                            <Text style={styles.itemNome}>{item.nome}</Text>
                            {item.obrigatorio && (
                              <Text style={styles.itemObrigatorio}>
                                Obrigatório
                              </Text>
                            )}
                          </View>
                          <Switch
                            value={isAtivo}
                            onValueChange={() => handleToggleItem(item.id)}
                            trackColor={{ false: '#334155', true: '#22C55E' }}
                            thumbColor="#fff"
                          />
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <AlertTriangle size={18} color="#F59E0B" />
          <Text style={styles.infoText}>
            Alterações nos prazos afetarão apenas novas inspeções. Inspeções já
            criadas manterão seus prazos originais.
          </Text>
        </View>

        {/* Botão Salvar */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSalvar}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Save size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Salvar Configurações</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Botão Gerar Inspeção Manual */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: '#3B82F6', marginTop: 12 }]}
          onPress={() => {
            Alert.alert(
              'Gerar Inspeções',
              'Deseja gerar as inspeções desta semana para todos os motoristas ativos? Se já existirem, não serão duplicadas.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Gerar Agora',
                  onPress: async () => {
                    try {
                      // Feedback visual imediato
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      Alert.alert('Iniciando', 'A solicitação foi enviada. O processo pode levar alguns segundos.');

                      const { gerarInspecaoSemanal } = useAdminStore.getState();
                      const result = await gerarInspecaoSemanal();

                      // Feedback final baseado no resultado
                      if (result && result.success) {
                        Alert.alert(
                          'Sucesso',
                          `Geração concluída!\n\nCriadas: ${result.summary.created}\nJá existiam: ${result.summary.alreadyExisted}\nTotal Ativos: ${result.summary.totalActiveDrivers}`
                        );
                      } else {
                        // Caso a store retorne algo que não seja sucesso explícito (depende da impl da store)
                        // Mas se der erro, cai no catch abaixo.
                      }

                    } catch (e: any) {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                      Alert.alert('Erro', `Falha ao gerar inspeções: ${e.message || 'Erro desconhecido'}`);
                    }
                  }
                }
              ]
            );
          }}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          <CheckCircle size={20} color="#fff" />
          <Text style={styles.saveButtonText}>Gerar Inspeção da Semana</Text>
        </TouchableOpacity>

        {/* Botão Sair */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <LogOut size={20} color="#EF4444" />
          <Text style={styles.logoutButtonText}>Sair da Conta</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
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

  // Header
  header: {
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

  // Content
  content: {
    flex: 1,
    padding: 16,
  },

  // Seções
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginLeft: 8,
    flex: 1,
  },
  sectionBadge: {
    backgroundColor: '#172554',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  sectionBadgeText: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '600',
  },

  // Cards de Opções
  optionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    overflow: 'hidden',
  },
  optionItem: {
    padding: 16,
  },
  optionItemTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  optionInfo: {
    flex: 1,
    marginRight: 16,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F1F5F9',
  },
  optionDescription: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  optionValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  optionValueText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  optionDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginHorizontal: 16,
  },

  // Pickers
  pickerContainer: {
    padding: 12,
    backgroundColor: '#0F172A',
  },
  pickerContainerHorizontal: {
    padding: 12,
    backgroundColor: '#0F172A',
  },
  pickerOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  pickerOptionHorizontal: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#1E293B',
  },
  pickerOptionActive: {
    backgroundColor: '#172554',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  pickerOptionTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },

  // Prazo Selector
  prazoSelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  prazoOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0F172A',
  },
  prazoOptionActive: {
    backgroundColor: '#172554',
    borderColor: '#3B82F6',
  },
  prazoOptionText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  prazoOptionTextActive: {
    color: '#3B82F6',
  },

  // Itens
  itensContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoriaContainer: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  categoriaTitulo: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemNome: {
    fontSize: 14,
    color: '#E2E8F0',
  },
  itemObrigatorio: {
    fontSize: 10,
    color: '#F59E0B',
    marginTop: 2,
  },

  // Info
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#422006',
    borderRadius: 10,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#713F12',
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: '#FDE68A',
    lineHeight: 18,
  },

  // Botão Salvar
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  // Botão Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});
