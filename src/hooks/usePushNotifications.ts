// src/hooks/usePushNotifications.ts
// ============================================
// ROTAFRETE - Hook de Push Notifications
// ============================================
// Hook para gerenciar estado e listeners de push.
// Integra com o serviço de push para uso em componentes.
// ============================================

import { useState, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import {
    canReceivePush,
    registerForPushNotifications,
    addNotificationReceivedListener,
    addNotificationResponseListener,
    scheduleLocalNotification,
    type PushNotificationToken,
} from '@/services/push';

// ============================================
// TIPOS
// ============================================

export interface UsePushNotificationsReturn {
    /** Token do dispositivo (se registrado) */
    pushToken: PushNotificationToken | null;
    /** Última notificação recebida */
    lastNotification: Notifications.Notification | null;
    /** Se o dispositivo suporta push */
    isSupported: boolean;
    /** Se está registrando dispositivo */
    isRegistering: boolean;
    /** Erro (se houver) */
    error: string | null;
    /** Registra dispositivo para push */
    register: (userId: string) => Promise<boolean>;
    /** Agenda notificação local */
    scheduleNotification: (title: string, body: string, seconds: number) => Promise<string | null>;
}

// ============================================
// HOOK
// ============================================

/**
 * Hook para gerenciamento de push notifications.
 * 
 * @example
 * ```tsx
 * function App() {
 *   const { pushToken, register, scheduleNotification } = usePushNotifications();
 *   const { user } = useAuth();
 * 
 *   useEffect(() => {
 *     if (user?.id) {
 *       register(user.id);
 *     }
 *   }, [user?.id]);
 * 
 *   const handleReminder = () => {
 *     scheduleNotification('Lembrete', 'Hora de verificar o veículo!', 3600);
 *   };
 * 
 *   return <Button onPress={handleReminder}>Agendar Lembrete</Button>;
 * }
 * ```
 */
export function usePushNotifications(): UsePushNotificationsReturn {
    const [pushToken, setPushToken] = useState<PushNotificationToken | null>(null);
    const [lastNotification, setLastNotification] = useState<Notifications.Notification | null>(null);
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isSupported = canReceivePush();

    /**
     * Configura listeners de notificação
     */
    useEffect(() => {
        if (!isSupported) return;

        // Listener para notificações recebidas (app em foreground)
        const notificationListener = addNotificationReceivedListener((notification) => {
            console.log('[usePushNotifications] Notificação recebida:', notification);
            setLastNotification(notification);
        });

        // Listener para interação com notificação
        const responseListener = addNotificationResponseListener((response) => {
            console.log('[usePushNotifications] Usuário interagiu:', response);
            // Aqui você pode implementar deep linking baseado na notificação
            const data = response.notification.request.content.data;
            if (data?.screen) {
                // router.push(data.screen);
            }
        });

        // Cleanup
        return () => {
            notificationListener.remove();
            responseListener.remove();
        };
    }, [isSupported]);

    /**
     * Registra dispositivo para push
     */
    const register = useCallback(async (userId: string): Promise<boolean> => {
        if (!isSupported) {
            console.log('[usePushNotifications] Dispositivo não suportado');
            return false;
        }

        setIsRegistering(true);
        setError(null);

        try {
            const token = await registerForPushNotifications(userId);

            if (token) {
                setPushToken(token);
                console.log('[usePushNotifications] Registro concluído:', token.token);
                return true;
            }

            return false;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao registrar push';
            setError(message);
            console.error('[usePushNotifications] Erro:', message);
            return false;
        } finally {
            setIsRegistering(false);
        }
    }, [isSupported]);

    /**
     * Agenda uma notificação local
     */
    const scheduleNotification = useCallback(async (
        title: string,
        body: string,
        seconds: number
    ): Promise<string | null> => {
        try {
            const id = await scheduleLocalNotification(title, body, seconds);
            return id;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao agendar notificação';
            setError(message);
            console.error('[usePushNotifications] Erro ao agendar:', message);
            return null;
        }
    }, []);

    return {
        pushToken,
        lastNotification,
        isSupported,
        isRegistering,
        error,
        register,
        scheduleNotification,
    };
}

export default usePushNotifications;
