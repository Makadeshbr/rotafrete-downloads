// app/_layout.tsx
// ============================================
// ROTAFRETE - Layout Raiz (Root Layout)
// ============================================
// Usa SDK Aether oficial @aether-baas/react-native v3.2.0+
// Com singleton automático via getAetherClient()
// ============================================
// [ATUALIZADO] Usa LoadingScreen profissional
// ============================================

import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  AetherProvider,
  createAsyncStorageAdapter,
  createSecureStoreAdapter,
  useAuth,
} from '@aether-baas/react-native';
import { AETHER_CONFIG } from '@/services/sdk';
import { LoadingScreen } from '@/components/guards';
import { usePushNotifications } from '@/hooks';
import { ToastProvider } from '@/components/ui/Toast';
import { setupNotificationChannels } from '@/services/background-notifications';

import '../global.css';

// Mantém a splash screen visível enquanto carrega
SplashScreen.preventAutoHideAsync();

// Adapters de storage para persistência de sessão
const storage = createAsyncStorageAdapter(AsyncStorage);
const secureStorage = createSecureStoreAdapter(SecureStore);

// ============================================
// CONTEÚDO DO LAYOUT COM AUTH DO SDK
// ============================================

/**
 * Componente interno que gerencia autenticação e navegação.
 * Usa o hook useAuth do SDK para estado de autenticação.
 */
function RootLayoutContent() {
  const router = useRouter();
  const segments = useSegments();

  // Hook oficial do SDK - estado de autenticação reativo
  const { user, isLoading, isAuthenticated } = useAuth();

  // [NOVO] Push Notifications
  const { register: registerPush, error: pushError } = usePushNotifications();

  const [fontsLoaded] = useFonts({});

  /**
   * Esconde a splash screen nativa quando o app termina de carregar.
   */
  useEffect(() => {
    if (!isLoading && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isLoading, fontsLoaded]);

  // [NOVO] Configura canais de notificação (Android) ao iniciar
  useEffect(() => {
    setupNotificationChannels();
  }, []);

  /**
   * [NOVO] Registra dispositivo para push notifications quando usuário faz login
   */
  useEffect(() => {
    if (user?.id && isAuthenticated) {
      console.log('[RootLayout] Registrando push notification para:', user.id);
      registerPush(user.id).catch(err => {
        console.error('[RootLayout] Erro ao registrar push:', err);
      });
    }
  }, [user?.id, isAuthenticated]);

  /**
   * Gerencia redirecionamento automático baseado no estado de auth e role.
   * - Usuário não autenticado fora de (auth) → redireciona para login
   * - Admin autenticado em (auth) → redireciona para (admin)
   * - Motorista autenticado em (auth) → redireciona para (tabs)
   */
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAdminGroup = segments[0] === '(admin)';

    if (!isAuthenticated && !inAuthGroup) {
      // Usuário não autenticado tentando acessar área protegida
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Usuário autenticado - verificar role para decidir destino
      const userRole = user?.metadata?.role;

      // DEBUG: Ver o que está vindo do SDK
      console.log('[RootLayout] 🔍 DEBUG User:', {
        id: user?.id,
        email: user?.email,
        metadata: user?.metadata,
        userRole,
      });

      if (userRole === 'admin') {
        // Admin vai para painel administrativo
        console.log('[RootLayout] ✅ Redirecionando para ADMIN');
        router.replace('/(admin)');
      } else {
        // Motorista vai para tabs
        console.log('[RootLayout] ✅ Redirecionando para TABS (motorista)');
        router.replace('/(tabs)');
      }
    }
  }, [isAuthenticated, isLoading, segments, user]);

  // Exibe loading screen profissional enquanto carrega
  if (isLoading || !fontsLoaded) {
    return (
      <>
        <StatusBar style="light" />
        <LoadingScreen />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0F172A' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* [NOVO] Telas Independentes (para evitar bug de histórico) */}
        <Stack.Screen
          name="fuel"
          options={{
            headerShown: false,
            presentation: 'card',
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: '#0F172A' }
          }}
        />
        <Stack.Screen
          name="tolls"
          options={{
            headerShown: false,
            presentation: 'card',
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: '#0F172A' }
          }}
        />
      </Stack>
    </>
  );
}

// ============================================
// ROOT LAYOUT COM AETHER PROVIDER OFICIAL
// ============================================
// SDK v3.2.0+ define singleton global automaticamente!
// Os stores Zustand podem usar getDb() diretamente.
// ============================================

/**
 * Layout raiz da aplicação.
 * Configura o AetherProvider com storage adapters para React Native.
 */


export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <AetherProvider
        config={AETHER_CONFIG}
        storage={storage}
        secureStorage={secureStorage}
      >
        <ToastProvider>
          <RootLayoutContent />
        </ToastProvider>
      </AetherProvider>
    </GestureHandlerRootView>
  );
}
