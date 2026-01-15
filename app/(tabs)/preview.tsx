// app/(tabs)/preview.tsx
// ============================================
// ROTAFRETE - Tela de Prévia de Rota
// ============================================
// [CORREÇÃO] Tema escuro consistente com o app
// [CORREÇÃO] Adicionado toggle IDA+VOLTA (distância × 2)
// [CORREÇÃO] Adicionado input de paradas com cálculo de bônus
// [CORREÇÃO] Mostra breakdown de valores (KM + Paradas)
// ============================================

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  Keyboard,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Search,
  MapPin,
  Navigation,
  Sun,
  Moon,
  Calendar,
  Info,
  Package,
  ArrowLeftRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@aether-baas/react-native';
import { PageWrapper, Card, Button } from '@/components/ui';
import { LottieAnimation } from '@/components/lottie';
import { mapsService } from '@/services/maps';
import {
  calcularFreteCompleto,
  formatarMoeda,
  type Turno,
  type TipoVeiculo,
} from '@/constants/pricing';

const { width } = Dimensions.get('window');

// ============================================
// TIPOS
// ============================================

interface ResultadoAPI {
  distanciaKm: number;
  duracaoMinutos: number;
  origem: string;
  destino: string;
}

interface CalculoPrevia {
  turno: Turno;
  tipoDia: string;
  valorKm: number;
  valorParadas: number;
  valorTotal: number;
  faixaKm: string;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function PreviewScreen() {
  const { user } = useAuth();

  // Refs para inputs
  const destinoRef = useRef<TextInput>(null);

  // Estado de busca
  const [origem, setOrigem] = useState('');
  const [destino, setDestino] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resultado, setResultado] = useState<ResultadoAPI | null>(null);

  // Estado de opções de cálculo
  const [isIdaVolta, setIsIdaVolta] = useState(true);
  const [paradasInput, setParadasInput] = useState('');

  // Tipo de veículo do usuário
  const tipoVeiculo: TipoVeiculo = (user as any)?.tipoVeiculo || 'UTILITARIO';

  // Data de hoje
  const hoje = new Date();

  // ============================================
  // Buscar distância na API
  // ============================================
  const handleBuscarRota = async () => {
    if (!origem.trim() || !destino.trim()) {
      Alert.alert('Atenção', 'Preencha origem e destino');
      return;
    }

    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    setResultado(null);

    try {
      const apiResult = await mapsService.calcularDistancia(destino);

      if (!apiResult || !apiResult.distanciaKm) {
        throw new Error('Não foi possível calcular a rota');
      }

      console.log('[Prévia] API retornou:', apiResult.distanciaKm, 'km (IDA apenas)');

      setResultado({
        distanciaKm: apiResult.distanciaKm,
        duracaoMinutos: apiResult.duracaoMinutos || 0,
        origem: apiResult.origemFormatada || origem,
        destino: apiResult.destinoFormatado || destino,
      });
    } catch (error: any) {
      console.error('[Prévia] Erro:', error);
      Alert.alert('Erro', error.message || 'Erro ao buscar rota');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // Calcular distância total (com toggle IDA+VOLTA)
  // ============================================
  const getDistanciaTotal = useCallback((): number => {
    if (!resultado) return 0;
    return isIdaVolta ? resultado.distanciaKm * 2 : resultado.distanciaKm;
  }, [resultado, isIdaVolta]);

  // ============================================
  // Calcular valores para os 4 cenários
  // ============================================
  const calcularCenarios = useCallback((): CalculoPrevia[] => {
    const distanciaTotal = getDistanciaTotal();
    if (distanciaTotal <= 0) return [];

    const paradas = parseInt(paradasInput) || 0;

    const cenarios: CalculoPrevia[] = [];

    // Cenário 1: Semana AM
    const semanaAM = calcularFreteCompleto(
      distanciaTotal,
      tipoVeiculo,
      'AM',
      hoje,
      paradas
    );
    cenarios.push({
      turno: 'AM',
      tipoDia: 'Semana',
      valorKm: semanaAM.valorKm,
      valorParadas: semanaAM.valorParadas,
      valorTotal: semanaAM.valorTotal,
      faixaKm: semanaAM.faixaKm,
    });

    // Cenário 2: Semana PM
    const semanaPM = calcularFreteCompleto(
      distanciaTotal,
      tipoVeiculo,
      'PM',
      hoje,
      paradas
    );
    cenarios.push({
      turno: 'PM',
      tipoDia: 'Semana',
      valorKm: semanaPM.valorKm,
      valorParadas: semanaPM.valorParadas,
      valorTotal: semanaPM.valorTotal,
      faixaKm: semanaPM.faixaKm,
    });

    // Cenário 3: Domingo/Feriado AM
    const domFerAM = calcularFreteCompleto(
      distanciaTotal,
      tipoVeiculo,
      'AM',
      new Date('2025-01-01'),
      paradas
    );
    cenarios.push({
      turno: 'AM',
      tipoDia: 'Dom/Feriado',
      valorKm: domFerAM.valorKm,
      valorParadas: domFerAM.valorParadas,
      valorTotal: domFerAM.valorTotal,
      faixaKm: domFerAM.faixaKm,
    });

    // Cenário 4: Domingo/Feriado PM
    const domFerPM = calcularFreteCompleto(
      distanciaTotal,
      tipoVeiculo,
      'PM',
      new Date('2025-01-01'),
      paradas
    );
    cenarios.push({
      turno: 'PM',
      tipoDia: 'Dom/Feriado',
      valorKm: domFerPM.valorKm,
      valorParadas: domFerPM.valorParadas,
      valorTotal: domFerPM.valorTotal,
      faixaKm: domFerPM.faixaKm,
    });

    return cenarios;
  }, [getDistanciaTotal, paradasInput, tipoVeiculo]);

  const cenarios = resultado ? calcularCenarios() : [];
  const distanciaTotal = getDistanciaTotal();
  const paradasNum = parseInt(paradasInput) || 0;

  // ============================================
  // RENDER
  // ============================================
  return (
    <PageWrapper>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Prévia de Rota</Text>
          <Text style={styles.subtitle}>
            Calcule o valor estimado antes de aceitar uma rota
          </Text>
        </View>

        {/* Card de busca */}
        <Card variant="elevated" style={styles.searchCard}>
          {/* ... inputs ... */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabel}>
              <View style={[styles.inputDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.inputLabelText}>Origem</Text>
            </View>
            <TextInput
              style={styles.input}
              value={origem}
              onChangeText={setOrigem}
              placeholder="Ex: Avaré, SP"
              placeholderTextColor="#64748B"
              returnKeyType="next"
              onSubmitEditing={() => destinoRef.current?.focus()}
            />
          </View>

          {/* Linha conectora com Lottie */}
          <View style={styles.connector}>
            {/* [LOTTIE] Animação de mapa entre origem e destino */}
            <View style={{ width: 40, height: 60, marginLeft: -14, marginVertical: -10 }}>
              <LottieAnimation
                name="previaMapa"
                width={40}
                height={60}
                speed={0.8}
              />
            </View>
          </View>

          {/* Input Destino */}
          <View style={styles.inputGroup}>
            {/* ... */}
            <View style={styles.inputLabel}>
              <View style={[styles.inputDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.inputLabelText}>Destino</Text>
            </View>
            <TextInput
              ref={destinoRef}
              style={styles.input}
              value={destino}
              onChangeText={setDestino}
              placeholder="Ex: São Paulo, SP"
              placeholderTextColor="#64748B"
              returnKeyType="search"
              onSubmitEditing={handleBuscarRota}
            />
          </View>

          {/* Botão de busca */}
          <View style={{ marginTop: 16 }}>
            <Button
              onPress={handleBuscarRota}
              disabled={isLoading || !origem.trim() || !destino.trim()}
              loading={isLoading}
              icon={<Search size={20} color="#FFF" />}
              iconPosition="left"
            >
              Calcular Rota
            </Button>
          </View>
        </Card>

        {/* ... Rest of content ... */}
        {/* Keeping original logic for options and results */}

        {/* Card de Opções */}
        {resultado && (
          <Card variant="default" style={styles.optionsCard}>
            <Text style={styles.optionsTitle}>Opções de Cálculo</Text>

            {/* Toggle IDA+VOLTA */}
            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <ArrowLeftRight size={20} color="#3B82F6" />
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionLabel}>IDA + VOLTA</Text>
                  <Text style={styles.optionHint}>
                    Multiplica a distância por 2
                  </Text>
                </View>
              </View>
              <Switch
                value={isIdaVolta}
                onValueChange={setIsIdaVolta}
                trackColor={{ false: '#334155', true: '#3B82F680' }}
                thumbColor={isIdaVolta ? '#3B82F6' : '#64748B'}
              />
            </View>

            {/* Input de Paradas */}
            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                {/* [LOTTIE] Animação de pacotes */}
                <View style={{ width: 40, height: 40 }}>
                  <LottieAnimation name="AnimacaoPacotes" width={40} height={40} />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionLabel}>Paradas / Entregas</Text>
                  <Text style={styles.optionHint}>
                    Adicional por entrega realizada
                  </Text>
                </View>
              </View>
              <View style={styles.paradasInputWrapper}>
                <TextInput
                  style={styles.paradasInput}
                  value={paradasInput}
                  onChangeText={setParadasInput}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor="#64748B"
                />
              </View>
            </View>

            {/* Info sobre cálculo de paradas */}
            {paradasNum > 0 && (
              <View style={styles.infoBox}>
                <Info size={16} color="#94A3B8" />
                <Text style={styles.infoText}>
                  Cálculo de paradas:{'\n'}
                  • 0-60: R$0,35/parada{'\n'}
                  • 61-90: R$2,00/parada{'\n'}
                  • 91+: R$1,04/parada
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Resultado da busca */}
        {resultado && (
          <Card variant="elevated" style={styles.resultCard}>
            {/* ... Keep existing result logic ... */}
            {/* Rota encontrada */}
            <View style={styles.routeInfo}>
              <View style={styles.routePoint}>
                <MapPin size={16} color="#10B981" />
                <Text style={styles.routeText} numberOfLines={2}>
                  {resultado.origem}
                </Text>
              </View>
              <View style={styles.routeArrow}>
                <Navigation size={16} color="#64748B" />
              </View>
              <View style={styles.routePoint}>
                <MapPin size={16} color="#EF4444" />
                <Text style={styles.routeText} numberOfLines={2}>
                  {resultado.destino}
                </Text>
              </View>
            </View>

            {/* Estatísticas da rota */}
            <View style={styles.routeStats}>
              <View style={styles.routeStat}>
                <Text style={styles.routeStatLabel}>Distância IDA</Text>
                <Text style={styles.routeStatValue}>
                  {resultado.distanciaKm} km
                </Text>
              </View>

              <View style={styles.routeStat}>
                <Text style={styles.routeStatLabel}>
                  {isIdaVolta ? 'Total (IDA+VOLTA)' : 'Total'}
                </Text>
                <Text style={[styles.routeStatValue, styles.routeStatHighlight]}>
                  {distanciaTotal} km
                </Text>
              </View>

              {paradasNum > 0 && (
                <View style={styles.routeStat}>
                  <Text style={styles.routeStatLabel}>Paradas</Text>
                  <Text style={styles.routeStatValue}>{paradasNum}</Text>
                </View>
              )}
            </View>

            {/* Aviso sobre IDA+VOLTA */}
            {isIdaVolta && (
              <View style={styles.warningBox}>
                <Info size={14} color="#F59E0B" />
                <Text style={styles.warningText}>
                  Cálculo considera IDA + VOLTA ({resultado.distanciaKm} × 2 = {distanciaTotal} km)
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Estimativas por cenário */}
        {cenarios.length > 0 && (
          <View style={styles.estimativasSection}>
            <Text style={styles.sectionTitle}>Estimativas de Valor</Text>
            <Text style={styles.sectionSubtitle}>
              Veículo: {tipoVeiculo} • Faixa: {cenarios[0].faixaKm}
            </Text>

            <View style={styles.cenariosGrid}>
              {cenarios.map((cenario, index) => (
                <Card
                  key={`${cenario.tipoDia}-${cenario.turno}`}
                  variant="default"
                  style={{
                    ...styles.cenarioCard,
                    ...(index === 0 ? styles.cenarioCardDestaque : {}),
                  }}
                >
                  {/* Header do cenário */}
                  <View style={styles.cenarioHeader}>
                    <View style={styles.cenarioTurno}>
                      {cenario.turno === 'AM' ? (
                        <Sun size={16} color="#F59E0B" />
                      ) : (
                        <Moon size={16} color="#6366F1" />
                      )}
                      <Text style={styles.cenarioTurnoText}>
                        {cenario.turno}
                      </Text>
                    </View>
                    <View style={styles.cenarioDia}>
                      <Calendar size={14} color="#94A3B8" />
                      <Text style={styles.cenarioDiaText}>
                        {cenario.tipoDia}
                      </Text>
                    </View>
                  </View>

                  {/* Breakdown de valores */}
                  <View style={styles.cenarioBreakdown}>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>KM:</Text>
                      <Text style={styles.breakdownValue}>
                        {formatarMoeda(cenario.valorKm)}
                      </Text>
                    </View>
                    {cenario.valorParadas > 0 && (
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Paradas:</Text>
                        <Text style={styles.breakdownValue}>
                          {formatarMoeda(cenario.valorParadas)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Valor total */}
                  <View style={styles.cenarioTotal}>
                    <Text style={styles.cenarioTotalLabel}>TOTAL</Text>
                    <Text style={styles.cenarioTotalValue}>
                      {formatarMoeda(cenario.valorTotal)}
                    </Text>
                  </View>
                </Card>
              ))}
            </View>
          </View>
        )}

        {/* Legenda */}
        <View style={styles.legenda}>
          {/* ... */}
          <Text style={styles.legendaTitle}>Legenda</Text>
          <View style={styles.legendaItem}>
            <Sun size={14} color="#F59E0B" />
            <Text style={styles.legendaText}>AM = Manhã (5h às 12h)</Text>
          </View>
          <View style={styles.legendaItem}>
            <Moon size={14} color="#6366F1" />
            <Text style={styles.legendaText}>PM = Tarde/Noite (12h às 22h)</Text>
          </View>
          <View style={styles.legendaItem}>
            <Info size={14} color="#94A3B8" />
            <Text style={styles.legendaText}>
              Valores baseados na tabela oficial da transportadora
            </Text>
          </View>
        </View>
      </ScrollView>
    </PageWrapper>
  );
}

// ============================================
// ESTILOS - TEMA ESCURO
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },

  // Header
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },

  // Search Card
  searchCard: {
    padding: 16,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 4,
  },
  inputLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  inputDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  inputLabelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 14,
    fontSize: 16,
    color: '#FFFFFF',
  },
  connector: {
    paddingLeft: 4,
    paddingVertical: 4,
  },
  connectorLine: {
    width: 2,
    height: 20,
    backgroundColor: '#334155',
    marginLeft: 3,
  },

  // Options Card
  optionsCard: {
    padding: 16,
    marginBottom: 16,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  optionHint: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  paradasInputWrapper: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    minWidth: 60,
  },
  paradasInput: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    paddingVertical: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  infoText: {
    fontSize: 12,
    color: '#94A3B8',
    flex: 1,
    lineHeight: 18,
  },

  // Result Card
  resultCard: {
    padding: 16,
    marginBottom: 16,
  },
  routeInfo: {
    marginBottom: 16,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 4,
  },
  routeText: {
    fontSize: 14,
    color: '#E2E8F0',
    flex: 1,
  },
  routeArrow: {
    paddingLeft: 4,
    paddingVertical: 4,
  },
  routeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  routeStat: {
    alignItems: 'center',
  },
  routeStatLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  routeStatValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 4,
  },
  routeStatHighlight: {
    color: '#3B82F6',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  warningText: {
    fontSize: 12,
    color: '#F59E0B',
    flex: 1,
  },

  // Estimativas Section
  estimativasSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    marginBottom: 16,
  },
  cenariosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cenarioCard: {
    width: (width - 52) / 2,
    padding: 12,
  },
  cenarioCardDestaque: {
    borderWidth: 2,
    borderColor: '#FF6B00',
  },
  cenarioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cenarioTurno: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cenarioTurnoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cenarioDia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cenarioDiaText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  cenarioBreakdown: {
    marginBottom: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  breakdownValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#E2E8F0',
  },
  cenarioTotal: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    alignItems: 'center',
  },
  cenarioTotalLabel: {
    fontSize: 10,
    color: '#64748B',
    letterSpacing: 0.5,
  },
  cenarioTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#22C55E',
    marginTop: 2,
  },

  // Legenda
  legenda: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  legendaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  legendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  legendaText: {
    fontSize: 13,
    color: '#94A3B8',
  },
});