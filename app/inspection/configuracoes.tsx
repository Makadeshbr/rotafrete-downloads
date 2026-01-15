// app/inspection/configuracoes.tsx
// ============================================
// ROTAFRETE - Configurações de Inspeção
// ============================================
// Permite ao motorista configurar lembretes
// e notificações do sistema de inspeção.
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Bell,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Settings,
} from 'lucide-react-native';

// Store e constantes
import { useInspectionStore } from '@/store/useInspectionStore';
import { DIAS_SEMANA, HORARIOS_DISPONIVEIS } from '@/constants/inspection';
import type { ConfigInspecaoMotorista, DiaSemana } from '@/types/inspection';

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function ConfiguracoesInspecaoScreen() {
  // Store
  const {
    configMotorista,
    carregarConfigMotorista,
    atualizarConfigMotorista,
  } = useInspectionStore();

  // Estado local para loading
  const [isSalvando, setIsSalvando] = useState(false);

  // Estado local para edição
  const [config, setConfig] = useState<Partial<ConfigInspecaoMotorista>>({
    notificacoesAtivas: true,
    notificarAvaliacao: true,
    notificarCriticos: true,
    lembreteAntecipado: true,
    diaLembretePrincipal: 2, // Terça
    horaLembretePrincipal: '08:00',
    horaLembreteAntecipado: '08:00',
  });

  // Pickers
  const [showDiaPicker, setShowDiaPicker] = useState(false);
  const [showHoraPicker, setShowHoraPicker] = useState(false);
  const [showHoraAntecipadoPicker, setShowHoraAntecipadoPicker] = useState(false);

  // Carrega config inicial
  useEffect(() => {
    // TODO: Pegar ID real do usuário
    carregarConfigMotorista('user-id');
  }, []);

  // Sincroniza com config carregada
  useEffect(() => {
    if (configMotorista) {
      setConfig({
        notificacoesAtivas: configMotorista.notificacoesAtivas,
        notificarAvaliacao: configMotorista.notificarAvaliacao,
        notificarCriticos: configMotorista.notificarCriticos,
        lembreteAntecipado: configMotorista.lembreteAntecipado,
        diaLembretePrincipal: configMotorista.diaLembretePrincipal,
        horaLembretePrincipal: configMotorista.horaLembretePrincipal,
        horaLembreteAntecipado: configMotorista.horaLembreteAntecipado,
      });
    }
  }, [configMotorista]);

  // Handlers
  const handleSalvar = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSalvando(true);
    try {
      // TODO: Pegar ID real do usuário
      await atualizarConfigMotorista('user-id', config);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Sucesso', 'Configurações salvas com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar as configurações.');
    } finally {
      setIsSalvando(false);
    }
  };

  const handleToggle = (key: keyof ConfigInspecaoMotorista, value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSelectDia = (dia: DiaSemana) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConfig((prev) => ({ ...prev, diaLembretePrincipal: dia }));
    setShowDiaPicker(false);
  };

  const handleSelectHora = (hora: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConfig((prev) => ({ ...prev, horaLembretePrincipal: hora }));
    setShowHoraPicker(false);
  };

  const handleSelectHoraAntecipado = (hora: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConfig((prev) => ({ ...prev, horaLembreteAntecipado: hora }));
    setShowHoraAntecipadoPicker(false);
  };

  // Encontra nome do dia
  const diaNome = DIAS_SEMANA.find((d) => d.valor === config.diaLembretePrincipal)?.nome || '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#F1F5F9" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Configurações</Text>
          <Text style={styles.headerSubtitle}>Notificações de inspeção</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Seção: Notificações Gerais */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bell size={18} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Notificações</Text>
          </View>

          <View style={styles.optionCard}>
            <View style={styles.optionItem}>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Notificações ativas</Text>
                <Text style={styles.optionDescription}>
                  Receber lembretes e alertas do sistema
                </Text>
              </View>
              <Switch
                value={config.notificacoesAtivas}
                onValueChange={(v) => handleToggle('notificacoesAtivas', v)}
                trackColor={{ false: '#334155', true: '#22C55E' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.optionDivider} />

            <View style={styles.optionItem}>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Notificar avaliação</Text>
                <Text style={styles.optionDescription}>
                  Receber notificação quando a inspeção for avaliada
                </Text>
              </View>
              <Switch
                value={config.notificarAvaliacao}
                onValueChange={(v) => handleToggle('notificarAvaliacao', v)}
                trackColor={{ false: '#334155', true: '#22C55E' }}
                thumbColor="#fff"
                disabled={!config.notificacoesAtivas}
              />
            </View>

            <View style={styles.optionDivider} />

            <View style={styles.optionItem}>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Alertas críticos</Text>
                <Text style={styles.optionDescription}>
                  Notificação imediata para itens marcados como crítico
                </Text>
              </View>
              <Switch
                value={config.notificarCriticos}
                onValueChange={(v) => handleToggle('notificarCriticos', v)}
                trackColor={{ false: '#334155', true: '#EF4444' }}
                thumbColor="#fff"
                disabled={!config.notificacoesAtivas}
              />
            </View>
          </View>
        </View>

        {/* Seção: Lembretes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={18} color="#F59E0B" />
            <Text style={styles.sectionTitle}>Lembretes</Text>
          </View>

          <View style={styles.optionCard}>
            {/* Dia do lembrete */}
            <TouchableOpacity
              style={styles.optionItemTouchable}
              onPress={() => setShowDiaPicker(!showDiaPicker)}
              disabled={!config.notificacoesAtivas}
            >
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Dia do lembrete</Text>
                <Text style={styles.optionDescription}>
                  Dia da semana para receber o lembrete principal
                </Text>
              </View>
              <View style={styles.optionValue}>
                <Text style={styles.optionValueText}>{diaNome}</Text>
                <ChevronRight size={18} color="#64748B" />
              </View>
            </TouchableOpacity>

            {showDiaPicker && (
              <View style={styles.pickerContainer}>
                {DIAS_SEMANA.map((dia) => (
                  <TouchableOpacity
                    key={dia.valor}
                    style={[
                      styles.pickerOption,
                      config.diaLembretePrincipal === dia.valor &&
                      styles.pickerOptionActive,
                    ]}
                    onPress={() => handleSelectDia(dia.valor)}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        config.diaLembretePrincipal === dia.valor &&
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

            {/* Hora do lembrete */}
            <TouchableOpacity
              style={styles.optionItemTouchable}
              onPress={() => setShowHoraPicker(!showHoraPicker)}
              disabled={!config.notificacoesAtivas}
            >
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Horário do lembrete</Text>
                <Text style={styles.optionDescription}>
                  Hora para receber o lembrete principal
                </Text>
              </View>
              <View style={styles.optionValue}>
                <Text style={styles.optionValueText}>
                  {config.horaLembretePrincipal}
                </Text>
                <ChevronRight size={18} color="#64748B" />
              </View>
            </TouchableOpacity>

            {showHoraPicker && (
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
                      config.horaLembretePrincipal === hora &&
                      styles.pickerOptionActive,
                    ]}
                    onPress={() => handleSelectHora(hora)}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        config.horaLembretePrincipal === hora &&
                        styles.pickerOptionTextActive,
                      ]}
                    >
                      {hora}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={styles.optionDivider} />

            {/* Lembrete antecipado */}
            <View style={styles.optionItem}>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Lembrete antecipado</Text>
                <Text style={styles.optionDescription}>
                  Receber lembrete 1 dia antes do prazo
                </Text>
              </View>
              <Switch
                value={config.lembreteAntecipado}
                onValueChange={(v) => handleToggle('lembreteAntecipado', v)}
                trackColor={{ false: '#334155', true: '#22C55E' }}
                thumbColor="#fff"
                disabled={!config.notificacoesAtivas}
              />
            </View>

            {config.lembreteAntecipado && (
              <>
                <View style={styles.optionDivider} />
                <TouchableOpacity
                  style={styles.optionItemTouchable}
                  onPress={() =>
                    setShowHoraAntecipadoPicker(!showHoraAntecipadoPicker)
                  }
                  disabled={!config.notificacoesAtivas}
                >
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionLabel}>
                      Horário do lembrete antecipado
                    </Text>
                  </View>
                  <View style={styles.optionValue}>
                    <Text style={styles.optionValueText}>
                      {config.horaLembreteAntecipado}
                    </Text>
                    <ChevronRight size={18} color="#64748B" />
                  </View>
                </TouchableOpacity>

                {showHoraAntecipadoPicker && (
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
                          config.horaLembreteAntecipado === hora &&
                          styles.pickerOptionActive,
                        ]}
                        onPress={() => handleSelectHoraAntecipado(hora)}
                      >
                        <Text
                          style={[
                            styles.pickerOptionText,
                            config.horaLembreteAntecipado === hora &&
                            styles.pickerOptionTextActive,
                          ]}
                        >
                          {hora}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </>
            )}
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <AlertTriangle size={18} color="#F59E0B" />
          <Text style={styles.infoText}>
            Os lembretes serão enviados somente se houver uma inspeção pendente
            para a semana. O prazo padrão é configurado pelo administrador.
          </Text>
        </View>

        {/* Botão Salvar */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSalvar}
          disabled={isSalvando}
          activeOpacity={0.8}
        >
          {isSalvando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <CheckCircle size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Salvar Configurações</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
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
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  headerSubtitle: {
    fontSize: 12,
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginLeft: 8,
  },

  // Cards de Opções
  optionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    overflow: 'hidden',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
});
