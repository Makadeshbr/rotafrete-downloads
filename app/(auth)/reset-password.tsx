// app/(auth)/reset-password.tsx
// ============================================
// ROTAFRETE - Tela de Redefinir Senha
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
    Alert,
    Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, ArrowLeft, CheckCircle, Key } from 'lucide-react-native';
import { getAetherClient } from '@aether-baas/react-native';

import { Button, Input } from '@/components/ui';

const { height } = Dimensions.get('window');

// Schema de validação
const resetPasswordSchema = z.object({
    token: z.string().min(6, 'Digite o código recebido por e-mail'),
    newPassword: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z.string().min(6, 'Confirme sua senha'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordScreen() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordForm>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            token: '',
            newPassword: '',
            confirmPassword: '',
        },
    });

    const onSubmit = async (data: ResetPasswordForm) => {
        setIsLoading(true);
        try {
            const aether = getAetherClient();
            await aether.tenantAuth.resetPassword(data.token, data.newPassword);

            setIsSuccess(true);
        } catch (error: any) {
            console.error('[ResetPassword] Erro:', error);
            Alert.alert(
                'Erro',
                error?.response?.data?.message ||
                error?.message ||
                'Não foi possível redefinir a senha. Verifique o código e tente novamente.'
            );
        } finally {
            setIsLoading(false);
        }
    };

    // Tela de sucesso
    if (isSuccess) {
        return (
            <LinearGradient colors={['#0F172A', '#020617']} style={styles.container}>
                <View style={styles.successContainer}>
                    <View style={styles.successIcon}>
                        <CheckCircle size={48} color="#22C55E" />
                    </View>

                    <Text style={styles.successTitle}>Senha Redefinida!</Text>
                    <Text style={styles.successText}>
                        Sua senha foi alterada com sucesso.{'\n'}
                        Faça login com sua nova senha.
                    </Text>

                    <View style={{ marginTop: 32, width: '100%' }}>
                        <Button
                            onPress={() => router.replace('/(auth)/login')}
                            fullWidth
                            size="lg"
                        >
                            Fazer Login
                        </Button>
                    </View>
                </View>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient colors={['#0F172A', '#020617']} style={styles.container}>
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
                                colors={['#22C55E', '#16A34A']}
                                style={styles.iconGradient}
                            >
                                <Key size={36} color="#FFFFFF" />
                            </LinearGradient>
                        </View>

                        <Text style={styles.title}>Nova Senha</Text>
                        <Text style={styles.subtitle}>
                            Digite o código que você recebeu{'\n'}por e-mail e sua nova senha.
                        </Text>

                        {/* Formulário */}
                        <View style={styles.form}>
                            {/* Código/Token */}
                            <Controller
                                control={control}
                                name="token"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <Input
                                        label="Código de Recuperação"
                                        placeholder="Digite o código do e-mail"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        error={errors.token?.message}
                                        autoCapitalize="characters"
                                        autoFocus
                                    />
                                )}
                            />

                            {/* Nova Senha */}
                            <Controller
                                control={control}
                                name="newPassword"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <Input
                                        label="Nova Senha"
                                        placeholder="••••••••"
                                        type="password"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        error={errors.newPassword?.message}
                                        leftIcon={<Lock size={20} color="#64748B" />}
                                    />
                                )}
                            />

                            {/* Confirmar Senha */}
                            <Controller
                                control={control}
                                name="confirmPassword"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <Input
                                        label="Confirmar Nova Senha"
                                        placeholder="••••••••"
                                        type="password"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        error={errors.confirmPassword?.message}
                                        leftIcon={<Lock size={20} color="#64748B" />}
                                    />
                                )}
                            />

                            <View style={{ marginTop: 24 }}>
                                <Button
                                    onPress={handleSubmit(onSubmit)}
                                    loading={isLoading}
                                    fullWidth
                                    size="xl"
                                    icon={<CheckCircle size={20} color="#FFFFFF" />}
                                    iconPosition="right"
                                >
                                    Redefinir Senha
                                </Button>
                            </View>
                        </View>

                        {/* Link para reenviar código */}
                        <TouchableOpacity
                            style={styles.resendLink}
                            onPress={() => router.replace('/(auth)/forgot-password' as any)}
                        >
                            <Text style={styles.resendLinkText}>
                                Não recebeu o código? <Text style={styles.resendLinkBold}>Reenviar</Text>
                            </Text>
                        </TouchableOpacity>
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
        marginBottom: 32,
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
        shadowColor: '#22C55E',
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
        marginBottom: 40,
    },
    form: {
        width: '100%',
    },
    resendLink: {
        marginTop: 32,
        padding: 16,
    },
    resendLinkText: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
    },
    resendLinkBold: {
        color: '#FF6B00',
        fontWeight: '600',
    },
    // Success state
    successContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    successIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    successTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#22C55E',
        marginBottom: 16,
    },
    successText: {
        fontSize: 16,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 24,
    },
});
