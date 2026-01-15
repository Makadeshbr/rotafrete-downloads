// src/services/background-notifications.ts
// ============================================
// ROTAFRETE - Background Notification Handler
// ============================================
// Configuração do handler para mensagens em background (Headless JS)
// Essencial para Android (Quit/Background State)
// ============================================

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

function isExpoGo() {
    return Constants.appOwnership === 'expo';
}

// Handler que será executado mesmo com o app fechado (Android)
try {
    if (!isExpoGo()) {
        const messaging = require('@react-native-firebase/messaging').default;

        messaging().setBackgroundMessageHandler(async (remoteMessage: any) => {
            console.log('[Background] Mensagem recebida em background (Headless):', remoteMessage);

            // Se a mensagem tiver notification, o sistema mostra automaticamente.
            // Se for apenas data-only, podemos agendar uma local notification.
            // No caso do Aether, geralmente enviamos notification payload.
        });
    }
} catch (error) {
    console.warn('[Background] Falha ao registrar handler (pode ser Expo Go):', error);
}

// Configuração de Canais (Android)
// Deve ser chamado cedo para garantir que o canal exista quando a notificação chegar
export async function setupNotificationChannels() {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'RotaFrete Geral',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF6B00',
            sound: 'default', // Garante som
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            bypassDnd: true,
        });

        console.log('[Background] Canal de notificação configurado: default');
    }
}
