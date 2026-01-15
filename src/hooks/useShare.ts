// rotafrete/src/hooks/useShare.ts
// ============================================
// ROTAFRETE - Hook de Compartilhamento
// ============================================
// Permite compartilhar PDFs via WhatsApp e Email
// ============================================

import { useCallback } from 'react';
import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';
import { Alert, Platform } from 'react-native';

export interface UseShareReturn {
    /** Compartilha arquivo via sistema (WhatsApp, etc) */
    shareFile: (uri: string, title: string) => Promise<void>;
    /** Envia arquivo por email */
    shareEmail: (uri: string, subject: string, body: string) => Promise<void>;
    /** Verifica se compartilhamento está disponível */
    isSharingAvailable: () => Promise<boolean>;
    /** Verifica se email está disponível */
    isEmailAvailable: () => Promise<boolean>;
}

/**
 * Hook para compartilhar arquivos
 * 
 * @example
 * ```tsx
 * const { shareFile, shareEmail } = useShare();
 * 
 * const handleShare = async () => {
 *   await shareFile(pdfUri, 'Extrato Mensal');
 * };
 * 
 * const handleEmail = async () => {
 *   await shareEmail(pdfUri, 'Extrato 01/2026', 'Segue meu extrato');
 * };
 * ```
 */
export function useShare(): UseShareReturn {
    /**
     * Compartilha arquivo via sistema nativo
     * (WhatsApp, Telegram, Drive, etc)
     */
    const shareFile = useCallback(async (uri: string, title: string) => {
        try {
            const available = await Sharing.isAvailableAsync();

            if (!available) {
                Alert.alert(
                    'Erro',
                    'Compartilhamento não disponível neste dispositivo'
                );
                return;
            }

            await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: title,
                UTI: 'com.adobe.pdf', // iOS
            });

        } catch (error: any) {
            console.error('[useShare] Erro ao compartilhar:', error);
            Alert.alert('Erro', 'Não foi possível compartilhar o arquivo');
        }
    }, []);

    /**
     * Compartilha arquivo por email
     */
    const shareEmail = useCallback(async (
        uri: string,
        subject: string,
        body: string
    ) => {
        try {
            const available = await MailComposer.isAvailableAsync();

            if (!available) {
                Alert.alert(
                    'Email não disponível',
                    'Configure uma conta de email no dispositivo',
                    [
                        { text: 'OK' },
                        {
                            text: 'Compartilhar de outra forma',
                            onPress: () => shareFile(uri, subject)
                        }
                    ]
                );
                return;
            }

            const result = await MailComposer.composeAsync({
                subject,
                body,
                attachments: [uri],
            });

            if (result.status === 'sent') {
                Alert.alert('Sucesso', 'Email enviado com sucesso!');
            }

        } catch (error: any) {
            console.error('[useShare] Erro ao enviar email:', error);
            Alert.alert('Erro', 'Não foi possível enviar o email');
        }
    }, [shareFile]);

    /**
     * Verifica se compartilhamento está disponível
     */
    const isSharingAvailable = useCallback(async () => {
        try {
            return await Sharing.isAvailableAsync();
        } catch {
            return false;
        }
    }, []);

    /**
     * Verifica se email está disponível
     */
    const isEmailAvailable = useCallback(async () => {
        try {
            return await MailComposer.isAvailableAsync();
        } catch {
            return false;
        }
    }, []);

    return {
        shareFile,
        shareEmail,
        isSharingAvailable,
        isEmailAvailable,
    };
}

export default useShare;
