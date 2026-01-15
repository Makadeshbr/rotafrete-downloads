// app/(auth)/register.tsx
// ============================================
// ROTAFRETE - Tela de Cadastro Premium
// ============================================
// Usa SDK Aether 100% nativo (sem wrappers)
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  Car,
  Truck,
  Bus,
  Container,
  Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@aether-baas/react-native';

import { Button, Input, Card } from '@/components/ui';
import { VEICULOS, type TipoVeiculo } from '@/constants';
import { motoristaService } from '@/services/motorista-service';

const { width, height } = Dimensions.get('window');

// Schema de validação
const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Digite um e-mail válido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  tipoVeiculo: z.enum(['PASSEIO', 'UTILITARIO', 'VAN', 'VUC']),
  placaVeiculo: z.string().min(7, 'Placa inválida').max(8, 'Placa inválida'),
  modeloVeiculo: z.string().min(2, 'Informe o modelo do veículo'),
});

type RegisterForm = z.infer<typeof registerSchema>;

// Mapeamento de ícones
const VehicleIcons: Record<TipoVeiculo, React.FC<any>> = {
  PASSEIO: Car,
  UTILITARIO: Truck,
  VAN: Bus,
  VUC: Container,
};

export default function RegisterScreen() {
  const router = useRouter();

  // Hook oficial do SDK - sem wrappers!
  const { signUp, isPending, error, clearError } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      tipoVeiculo: undefined,
      placaVeiculo: '',
      modeloVeiculo: '',
    },
  });

  const selectedVehicle = watch('tipoVeiculo');

  const onSubmit = async (data: RegisterForm) => {
    clearError();
    // Usa signUp do SDK diretamente com metadata
    const user = await signUp({
      email: data.email,
      password: data.password,
      name: data.name,
      metadata: {
        tipoVeiculo: data.tipoVeiculo,
        placaVeiculo: data.placaVeiculo.toUpperCase(),
        modeloVeiculo: data.modeloVeiculo,
        role: 'motorista', // Novos usuários são sempre motoristas
      },
    });

    if (user) {
      // [NOVO] Cria perfil na coleção 'motoristas' (padrão Firebase)
      try {
        await motoristaService.criarPerfil({
          userId: user.id,
          nome: data.name,
          email: data.email,
          tipoVeiculo: data.tipoVeiculo as any,
          placaVeiculo: data.placaVeiculo.toUpperCase(),
          modeloVeiculo: data.modeloVeiculo,
          role: 'motorista',
          status: 'ativo',
        });
        console.log('[Register] ✅ Perfil de motorista criado');

        // Só navega se o perfil for criado com sucesso
        router.replace('/(tabs)');
      } catch (err) {
        console.error('[Register] ❌ Erro crítico ao criar perfil:', err);
        alert('Conta criada, mas houve um erro ao salvar seu perfil. Por favor, entre em contato com o suporte.');
      }
    }
  };

  const goToStep2 = () => {
    // Validação básica antes de avançar
    const name = watch('name');
    const email = watch('email');
    const password = watch('password');

    if (name.length >= 2 && email.includes('@') && password.length >= 6) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep(2);
    }
  };

  const selectVehicle = (tipo: TipoVeiculo) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setValue('tipoVeiculo', tipo);
  };

  return (
    <LinearGradient
      colors={['#0F172A', '#020617']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            {step === 2 && (
              <TouchableOpacity
                onPress={() => setStep(1)}
                style={styles.backButton}
              >
                <ArrowLeft size={24} color="#94A3B8" />
              </TouchableOpacity>
            )}

            <Text style={styles.title}>
              {step === 1 ? 'Criar Conta' : 'Seu Veículo'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 1
                ? 'Preencha seus dados para começar'
                : 'Selecione o tipo do seu veículo'}
            </Text>

            {/* Progress indicator */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressDot, styles.progressDotActive]} />
              <View style={styles.progressLine} />
              <View
                style={[
                  styles.progressDot,
                  step === 2 && styles.progressDotActive,
                ]}
              />
            </View>
          </View>

          {/* Mensagem de erro global */}
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          {/* Step 1: Dados pessoais */}
          {step === 1 && (
            <View style={styles.form}>
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Nome completo"
                    placeholder="Seu nome"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.name?.message}
                    leftIcon={<User size={20} color="#64748B" />}
                    autoFocus
                  />
                )}
              />

              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="E-mail"
                    placeholder="seu@email.com"
                    type="email"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.email?.message}
                    leftIcon={<Mail size={20} color="#64748B" />}
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Senha"
                    placeholder="Mínimo 6 caracteres"
                    type="password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.password?.message}
                    leftIcon={<Lock size={20} color="#64748B" />}
                  />
                )}
              />

              <Button
                onPress={goToStep2}
                fullWidth
                size="xl"
                icon={<ArrowRight size={20} color="#FFFFFF" />}
                iconPosition="right"
              >
                Continuar
              </Button>
            </View>
          )}

          {/* Step 2: Dados do veículo */}
          {step === 2 && (
            <View style={styles.form}>
              {/* Seleção de tipo de veículo */}
              <Text style={styles.sectionLabel}>Tipo de veículo</Text>
              <View style={styles.vehicleGrid}>
                {VEICULOS.map((veiculo) => {
                  const Icon = VehicleIcons[veiculo.id];
                  const isSelected = selectedVehicle === veiculo.id;

                  return (
                    <TouchableOpacity
                      key={veiculo.id}
                      onPress={() => selectVehicle(veiculo.id)}
                      activeOpacity={0.8}
                      style={[
                        styles.vehicleCard,
                        isSelected && styles.vehicleCardSelected,
                        { borderColor: isSelected ? veiculo.cor : '#334155' },
                      ]}
                    >
                      {isSelected && (
                        <View
                          style={[
                            styles.vehicleCheckmark,
                            { backgroundColor: veiculo.cor },
                          ]}
                        >
                          <Check size={12} color="#FFFFFF" />
                        </View>
                      )}
                      <View
                        style={[
                          styles.vehicleIconContainer,
                          { backgroundColor: `${veiculo.cor}20` },
                        ]}
                      >
                        <Icon
                          size={28}
                          color={isSelected ? veiculo.cor : '#64748B'}
                        />
                      </View>
                      <Text
                        style={[
                          styles.vehicleName,
                          isSelected && { color: veiculo.cor },
                        ]}
                      >
                        {veiculo.nome}
                      </Text>
                      <Text style={styles.vehicleDesc} numberOfLines={1}>
                        {veiculo.descricao}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {errors.tipoVeiculo && (
                <Text style={styles.errorText}>Selecione um tipo de veículo</Text>
              )}

              {/* Placa e Modelo */}
              <Controller
                control={control}
                name="placaVeiculo"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Placa do veículo"
                    placeholder="ABC-1234"
                    value={value}
                    onChangeText={(text) => onChange(text.toUpperCase())}
                    onBlur={onBlur}
                    error={errors.placaVeiculo?.message}
                    maxLength={8}
                    autoCapitalize="characters"
                  />
                )}
              />

              <Controller
                control={control}
                name="modeloVeiculo"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Modelo do veículo"
                    placeholder="Ex: Fiat Fiorino 2020"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.modeloVeiculo?.message}
                  />
                )}
              />

              <Button
                onPress={handleSubmit(onSubmit)}
                loading={isPending}
                fullWidth
                size="xl"
                icon={<Check size={20} color="#FFFFFF" />}
                iconPosition="right"
              >
                Criar Conta
              </Button>
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Já tem uma conta?</Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Fazer login</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#334155',
  },
  progressDotActive: {
    backgroundColor: '#FF6B00',
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: '#334155',
  },
  form: {
    marginBottom: 32,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  errorBannerText: {
    color: '#F87171',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 12,
    marginLeft: 4,
  },
  vehicleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  vehicleCard: {
    width: (width - 48 - 12) / 2,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#334155',
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  vehicleCardSelected: {
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
  },
  vehicleCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  vehicleDesc: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: -16,
    marginBottom: 16,
    marginLeft: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    color: '#64748B',
    fontSize: 16,
  },
  footerLink: {
    color: '#FF6B00',
    fontSize: 16,
    fontWeight: '700',
  },
});
