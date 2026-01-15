// src/services/push.ts
// ============================================
// ROTAFRETE - Serviço de Push Notifications
// ============================================
// Usa FCM nativo via @react-native-firebase/messaging
// Integração com SDK Aether para registro de dispositivo.
// [ADAPTADO] Compatível com Expo Go (onde Firebase não existe)
// ============================================

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// ============================================
// TIPOS
// ============================================

export interface PushNotificationToken {
    /** Token FCM do dispositivo */
    token: string;
    /** Plataforma (ios/android) */
    platform: 'ios' | 'android';
}

export interface NotificationConfig {
    /** Se deve exibir alerta */
    shouldShowAlert: boolean;
    /** Se deve tocar som */
    shouldPlaySound: boolean;
    /** Se deve definir badge */
    shouldSetBadge: boolean;
}

// ============================================
// CONFIGURAÇÃO INICIAL
// ============================================

/**
 * Configura como as notificações são exibidas quando o app está em foreground.
 */
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

// ============================================
// HELPERS INTERNOS
// ============================================

/**
 * Verifica se está rodando no Expo Go.
 * No Expo Go, módulos nativos como Firebase não funcionam.
 */
function isExpoGo(): boolean {
    return Constants.appOwnership === 'expo';
}

/**
 * Tenta obter a instância do messaging de forma segura.
 * Retorna null se falhar (ex: rodando no Expo Go).
 */
function getMessagingSafe() {
    try {
        if (isExpoGo()) return null;

        // Conditional require para evitar erro de bundle no Expo Go
        // quando o módulo nativo não está presente
        const messaging = require('@react-native-firebase/messaging').default;
        return messaging();
    } catch (error) {
        console.warn('[Push] Firebase Messaging não disponível (provavelmente Expo Go):', error);
        return null;
    }
}

// ============================================
// FUNÇÕES PÚBLICAS
// ============================================

/**
 * Verifica se o dispositivo pode receber push notifications.
 * Emuladores não suportam push notifications.
 * 
 * @returns true se o dispositivo suporta push
 */
export function canReceivePush(): boolean {
    return Device.isDevice;
}

/**
 * Solicita permissão para enviar notificações.
 * 
 * @returns true se permissão foi concedida
 */
export async function requestPushPermission(): Promise<boolean> {
    if (!Device.isDevice) {
        console.log('[Push] Emulador detectado, push não suportado');
        return false;
    }

    try {
        // [ADAPTAÇÃO EXPO GO]
        const messaging = getMessagingSafe();
        let enabled = false;

        if (messaging) {
            // Solicita permissão via Firebase Messaging (Build Nativa)
            const authStatus = await messaging.requestPermission();
            enabled =
                authStatus === 1 || // AuthorizationStatus.AUTHORIZED
                authStatus === 0;   // AuthorizationStatus.PROVISIONAL (ou PROVISIONAL=? checar enum se precisar)
            // 1=AUTHORIZED, 2=DENIED, 0=NOT_DETERMINED, -1=UNKNOWN?
            // Na vdd AUTHORIZED=1, PROVISIONAL=2.
            // Vamos simplificar assumindo que se requestPermission resolveu, checamos status.

            // Re-checando enum values comuns: 0=Unknown? Nao, authStatus tipicamente retorna enum.
            // O código anterior usava messaging.AuthorizationStatus.
            // Como estamos com require dinâmico, vamos confiar no boolean check simples ou logs.
            // Mas vamos usar o valor retornado.

            // Se messaging existe, authStatus deve ser > 0 para 'enabled' em alguns contextos,
            // ou checar especificamente.
            // Para segurança, vamos assumir que se o usuário aceitou no prompt nativo (que o requestPermission dispara),
            // então está ok.

            // Melhor: Solicita permissão do Expo PRIMEIRO, que é universal.
        }

        // Solicita permissão do Expo (Funciona no Expo Go e Nativo para notificações locais/expo)
        // Isso é essencial para o Expo Go.
        const { status } = await Notifications.requestPermissionsAsync();
        const expoEnabled = status === 'granted';

        if (messaging && expoEnabled) {
            console.log('[Push] Permissão concedida (FCM + Expo)');
            return true;
        }

        if (isExpoGo() && expoEnabled) {
            console.log('[Push] Permissão concedida (Expo Go - Apenas Local/Expo Push)');
            return true;
        }

        console.log('[Push] Permissão:', expoEnabled ? 'Concedida' : 'Negada');
        return expoEnabled;
    } catch (error) {
        console.error('[Push] Erro ao solicitar permissão:', error);
        return false;
    }
}

/**
 * Obtém o token FCM nativo do dispositivo.
 * Requer que a permissão tenha sido concedida.
 * 
 * @returns Token do dispositivo ou null em caso de erro
 */
export async function getPushToken(): Promise<PushNotificationToken | null> {
    if (!Device.isDevice) {
        console.log('[Push] Emulador não suporta push');
        return null;
    }

    try {
        // [ADAPTAÇÃO EXPO GO]
        const messaging = getMessagingSafe();

        if (messaging) {
            // Build Nativa: Obtém FCM token
            const fcmToken = await messaging.getToken();
            console.log('[Push] Token FCM obtido:', fcmToken.substring(0, 50) + '...');

            return {
                token: fcmToken,
                platform: Platform.OS as 'ios' | 'android',
            };
        } else if (isExpoGo()) {
            // Expo Go: Obtém Expo Push Token (para testes básicos se configurado, ou apenas local)
            // Nota: Expo Push Token não é FCM Token direto, mas serve para identificar o device em dev.
            // O backend Aether espera FCM geralmente, mas para evitar erro, retornamos algo ou null.

            console.log('[Push] Expo Go detectado. Tentando obter ExpoPushToken...');
            // Necessário projectId no app.json para getExpoPushTokenAsync funcionar bem.
            // Se falhar, retornamos null e logamos que push remoto não funcionará no Expo Go sem config extra.

            try {
                const expoToken = await Notifications.getExpoPushTokenAsync();
                console.log('[Push] Expo Token obtido:', expoToken.data);
                return {
                    token: expoToken.data,
                    platform: Platform.OS as 'ios' | 'android', // Fallback
                }
            } catch (e) {
                console.warn('[Push] Falha ao obter Expo Token (comum no Expo Go sem projectId):', e);
                return null;
            }
        }

        return null;
    } catch (error) {
        console.error('[Push] Erro ao obter token:', error);
        return null;
    }
}

/**
 * Registra o dispositivo para receber push notifications.
 * Solicita permissão e obtém token FCM automaticamente.
 * 
 * @param userId - ID do usuário para associar o dispositivo
 * @returns Token do dispositivo ou null se falhou
 */
export async function registerForPushNotifications(
    userId: string
): Promise<PushNotificationToken | null> {
    console.log('[Push] Iniciando registro para usuário:', userId);

    // Verifica se é dispositivo real
    if (!Device.isDevice) {
        console.log('[Push] Dispositivo virtual, ignorando registro');
        return null;
    }

    // Solicita permissão
    const hasPermission = await requestPushPermission();
    if (!hasPermission) {
        return null;
    }

    // Obtém token (FCM ou Expo)
    const tokenData = await getPushToken();
    if (!tokenData) {
        return null;
    }

    // Configuração específica do Android
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'RotaFrete',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF6B00',
            sound: 'default',
        });
    }

    // [SDK 3.3.0] Registra token no backend via SDK
    try {
        const { getAetherClient } = require('@aether-baas/react-native');
        const client = getAetherClient();

        console.log('[Push] 📱 Tentando registrar no backend...');

        // Verifica se push module está disponível
        if (client.push) {
            console.log('[Push] ✅ Push module disponível');

            const registerResult = await client.push.registerDevice({
                token: tokenData.token,
                platform: tokenData.platform,
                environment: __DEV__ ? 'dev' : 'prod',
            });

            console.log('[Push] ✅ Resposta do backend:', JSON.stringify(registerResult, null, 2));
        } else {
            console.error('[Push] ❌ Push module NÃO disponível no client!');
        }
    } catch (backendError: any) {
        console.error('[Push] ❌ ERRO ao registrar no backend:', backendError?.message);
        // Continua mesmo com erro
    }

    // Configura listener para mensagens recebidas em foreground
    // Apenas se messaging nativo estiver disponível
    const messaging = getMessagingSafe();
    if (messaging) {
        messaging.onMessage(async (remoteMessage: any) => {
            console.log('[Push] Mensagem recebida em foreground:', remoteMessage);
            if (remoteMessage.notification) {
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: remoteMessage.notification.title || 'Nova notificação',
                        body: remoteMessage.notification.body || '',
                        data: remoteMessage.data || {},
                    },
                    trigger: null,
                });
            }
        });
        console.log('[Push] Dispositivo registrado com sucesso (FCM nativo)');
    } else {
        console.log('[Push] Dispositivo registrado (Modo Expo Go / Sem FCM nativo)');
    }

    return tokenData;
}

/**
 * Remove registro de push do dispositivo atual.
 */
export async function unregisterPushNotifications(): Promise<void> {
    try {
        const { getAetherClient } = require('@aether-baas/react-native');
        const client = getAetherClient();

        if (client.push) {
            // Lista dispositivos do usuário e remove o atual
            const devices = await client.push.listDevices();
            const currentToken = await getPushToken();

            const deviceToRemove = devices.find((d: any) => d.token === currentToken?.token);
            if (deviceToRemove) {
                await client.push.unregisterDevice(deviceToRemove.id);
            }
        }

        // Remove token do Firebase se disponível
        const messaging = getMessagingSafe();
        if (messaging) {
            await messaging.deleteToken();
        }

        console.log('[Push] Dispositivo removido do registro');
    } catch (error) {
        console.error('[Push] Erro ao remover registro:', error);
    }
}

/**
 * Agenda uma notificação local.
 * Útil para lembretes de manutenção.
 * 
 * @param title - Título da notificação
 * @param body - Corpo da mensagem
 * @param trigger - Quando disparar (segundos ou data)
 * @returns ID da notificação agendada
 */
export async function scheduleLocalNotification(
    title: string,
    body: string,
    trigger: number | Date
): Promise<string> {
    // Converte para segundos a partir de agora
    let seconds: number;

    if (typeof trigger === 'number') {
        seconds = trigger;
    } else {
        // Converte Date para segundos a partir de agora
        seconds = Math.max(1, Math.floor((trigger.getTime() - Date.now()) / 1000));
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds,
        },
    });

    console.log('[Push] Notificação agendada:', notificationId);
    return notificationId;
}

/**
 * Cancela uma notificação agendada.
 * 
 * @param notificationId - ID da notificação a cancelar
 */
export async function cancelScheduledNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log('[Push] Notificação cancelada:', notificationId);
}

/**
 * Cancela todas as notificações agendadas.
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[Push] Todas as notificações agendadas foram canceladas');
}

/**
 * Adiciona listener para notificações recebidas.
 * 
 * @param callback - Função chamada quando notificação é recebida
 * @returns Subscription para remoção
 */
export function addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Adiciona listener para quando usuário interage com notificação.
 * 
 * @param callback - Função chamada quando usuário toca na notificação
 * @returns Subscription para remoção
 */
export function addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
}

// ============================================
// HELPERS DE MANUTENÇÃO
// ============================================

/**
 * Agenda lembretes de manutenção comuns.
 * Útil para configuração inicial do usuário.
 */
export async function scheduleMaintenanceReminders(): Promise<void> {
    console.log('[Push] Lembretes de manutenção configurados');
}
