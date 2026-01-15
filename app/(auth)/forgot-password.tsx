// app/(auth)/forgot-password.tsx
// ============================================
// ROTAFRETE - Tela de Esqueci a Senha
// ============================================
// TEMPORÁRIO: Mostra contato WhatsApp até ter domínio para email

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, MessageCircle, Phone } from 'lucide-react-native';

import { Button } from '@/components/ui';

// Número de contato para suporte
const WHATSAPP_NUMBER = '5514988407303';
const WHATSAPP_MESSAGE = 'Olá! Preciso de ajuda para recuperar minha senha do RotaFrete.';

export default function ForgotPasswordScreen() {
    const router = useRouter();

    const handleWhatsApp = () => {
        const url = `whatsapp://send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
        Linking.openURL(url).catch(() => {
            // Fallback para web se WhatsApp não estiver instalado
            Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`);
        });
    };

    const handleCall = () => {
        Linking.openURL(`tel:+${WHATSAPP_NUMBER}`);
    };

    return (
        <LinearGradient colors={['#0F172A', '#020617']} style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <ArrowLeft size={24} color="#F1F5F9" />
                </TouchableOpacity>
            </View>

            {/* Conteúdo */}
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <LinearGradient
                        colors={['#FF6B00', '#EA580C']}
                        style={styles.iconGradient}
                    >
                        <MessageCircle size={36} color="#FFFFFF" />
                    </LinearGradient>
                </View>

                <Text style={styles.title}>Esqueceu a senha?</Text>
                <Text style={styles.subtitle}>
                    Entre em contato conosco pelo WhatsApp{'\n'}para recuperar sua senha.
                </Text>

                {/* Info Box */}
                <View style={styles.infoBox}>
                    <Text style={styles.infoTitle}>📱 Suporte RotaFrete</Text>
                    <Text style={styles.infoNumber}>(14) 98840-7303</Text>
                    <Text style={styles.infoHint}>
                        Atendimento de segunda a sexta,{'\n'}das 8h às 18h
                    </Text>
                </View>

                {/* Botões */}
                <View style={styles.buttons}>
                    <Button
                        onPress={handleWhatsApp}
                        fullWidth
                        size="xl"
                        icon={<MessageCircle size={20} color="#FFFFFF" />}
                    >
                        Chamar no WhatsApp
                    </Button>

                    <TouchableOpacity
                        style={styles.callButton}
                        onPress={handleCall}
                    >
                        <Phone size={18} color="#64748B" />
                        <Text style={styles.callButtonText}>Ou ligue diretamente</Text>
                    </TouchableOpacity>
                </View>

                {/* Link para voltar */}
                <TouchableOpacity
                    style={styles.loginLink}
                    onPress={() => router.back()}
                >
                    <Text style={styles.loginLinkText}>
                        Lembrou a senha? <Text style={styles.loginLinkBold}>Fazer login</Text>
                    </Text>
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 60,
        marginBottom: 24,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    iconContainer: {
        marginBottom: 24,
    },
    iconGradient: {
        width: 80,
        height: 80,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#FF6B00',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 12,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    infoBox: {
        width: '100%',
        backgroundColor: 'rgba(255, 107, 0, 0.1)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 107, 0, 0.3)',
        padding: 24,
        alignItems: 'center',
        marginBottom: 32,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FF6B00',
        marginBottom: 8,
    },
    infoNumber: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    infoHint: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 18,
    },
    buttons: {
        width: '100%',
    },
    callButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 16,
        padding: 12,
    },
    callButtonText: {
        fontSize: 14,
        color: '#64748B',
    },
    loginLink: {
        marginTop: 32,
        padding: 16,
    },
    loginLinkText: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
    },
    loginLinkBold: {
        color: '#FF6B00',
        fontWeight: '600',
    },
});
