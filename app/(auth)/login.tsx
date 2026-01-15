// app/(auth)/login.tsx
// ============================================
// ROTAFRETE - Tela de Login Premium
// ============================================
// Usa SDK Aether 100% nativo (sem wrappers)
// ============================================

import React from 'react';
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
import * as Linking from 'expo-linking';
import { LinearGradient } from 'expo-linear-gradient';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Truck, ArrowRight } from 'lucide-react-native';
import { useAuth } from '@aether-baas/react-native';

import { Button, Input } from '@/components/ui';

const { width, height } = Dimensions.get('window');

// Schema de validação
const loginSchema = z.object({
  email: z.string().email('Digite um e-mail válido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();

  // Hook oficial do SDK - sem wrappers!
  const { signIn, signInWithOAuth, isPending, error, clearError } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginForm) => {
    clearError();
    const user = await signIn(data);
    if (user) {
      // Verifica role para decidir destino
      const userRole = (user as any)?.metadata?.role;
      console.log('[Login] 🔍 User role:', userRole, 'metadata:', (user as any)?.metadata);

      if (userRole === 'admin') {
        console.log('[Login] ✅ Redirecionando para ADMIN');
        router.replace('/(admin)');
      } else {
        console.log('[Login] ✅ Redirecionando para TABS (motorista)');
        router.replace('/(tabs)');
      }
    }
  };


  // Google OAuth Login
  const handleGoogleLogin = async () => {
    try {
      clearError();
      // O backend exige redirect_uri. Usamos deep link do Expo.
      // Isso criará algo como: exp://HOST:PORT/ ou rotafrete://
      // O Expo Router deve lidar com o retorno se configurado.
      const redirectUrl = Linking.createURL('auth/callback');
      console.log('================================================================');
      console.log('[Login] REDIRECT URI GERADA:', redirectUrl);
      console.log('================================================================');

      // Opcional: Mostrar alerta para facilitar pro usuário ver
      // Alert.alert('Redirect URI', redirectUrl);

      console.log('[Login] Iniciando OAuth Google com redirect:', redirectUrl);

      // Usa método OAuth do SDK Aether com redirect explícito
      // @ts-ignore - Definição de tipo pode estar desatualizada no cache, mas JS foi atualizado
      await (signInWithOAuth as any)('google', { redirectTo: redirectUrl });

    } catch (err: any) {
      console.error('[Login] Erro Google OAuth:', err);
      // Erro será exibido pelo SDK via error state
    }
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
          {/* Header com Logo */}
          <View style={styles.header}>
            {/* Círculo decorativo com gradiente */}
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={['#FF6B00', '#EA580C']}
                style={styles.logoGradient}
              >
                <Truck size={48} color="#FFFFFF" strokeWidth={2} />
              </LinearGradient>
            </View>

            <Text style={styles.title}>RotaFrete</Text>
            <Text style={styles.subtitle}>
              Controle seus ganhos de forma{'\n'}simples e eficiente
            </Text>
          </View>

          {/* Formulário */}
          <View style={styles.form}>
            {/* Mensagem de erro global */}
            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            {/* Email */}
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
                  autoFocus
                />
              )}
            />

            {/* Senha */}
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Senha"
                  placeholder="••••••••"
                  type="password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                  leftIcon={<Lock size={20} color="#64748B" />}
                />
              )}
            />

            {/* Esqueci a senha */}
            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => router.push('/(auth)/forgot-password' as any)}
            >
              <Text style={styles.forgotPasswordText}>
                Esqueceu sua senha?
              </Text>
            </TouchableOpacity>

            {/* Botão de Login */}
            <Button
              onPress={handleSubmit(onSubmit)}
              loading={isPending}
              fullWidth
              size="xl"
              icon={<ArrowRight size={20} color="#FFFFFF" />}
              iconPosition="right"
            >
              Entrar
            </Button>
          </View>

          {/* Footer - Criar conta */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Ainda não tem uma conta?
            </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Criar conta</Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Badge Aether */}
          <View style={styles.aetherBadge}>
            <Text style={styles.aetherText}>
              Powered by{' '}
              <Text style={styles.aetherBrand}>Aether Platform</Text>
            </Text>
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
    paddingTop: height * 0.08,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoGradient: {
    width: 100,
    height: 100,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: -8,
  },
  forgotPasswordText: {
    color: '#FF6B00',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
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
  aetherBadge: {
    alignItems: 'center',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(71, 85, 105, 0.3)',
  },
  aetherText: {
    color: '#475569',
    fontSize: 12,
  },
  aetherBrand: {
    color: '#64748B',
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(71, 85, 105, 0.3)',
  },
  dividerText: {
    color: '#64748B',
    fontSize: 14,
    marginHorizontal: 16,
    fontWeight: '500',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  googleIcon: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
});
