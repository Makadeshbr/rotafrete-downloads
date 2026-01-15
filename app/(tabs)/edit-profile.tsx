// app/(tabs)/edit-profile.tsx
// ============================================
// ROTAFRETE - Tela de Editar Perfil [COMPLETA]
// ============================================
// Versão enterprise-ready com:
// - Upload de foto via SDK Storage
// - Todos os campos funcionais
// - Validações robustas
// - Feedback visual profissional
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  User,
  Phone,
  Car,
  Truck,
  Bus,
  Container,
  Sun,
  Moon,
  Check,
  Camera,
  ImageIcon,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { Card, CardContent, Button, Input, PageWrapper } from '@/components/ui';
import { useAuth, useStorageResult } from '@aether-baas/react-native';
import { useImagePicker, type ImageResult } from '@/hooks';
import { VEICULOS, type TipoVeiculo } from '@/constants';
import type { Turno } from '@/constants/pricing';
import { VehicleLottie } from '@/components/lottie'; // [LOTTIE] Import

// ============================================
// CONSTANTES
// ============================================

/** Mapeamento de ícones para tipos de veículo */
const VehicleIcons: Record<TipoVeiculo, React.FC<any>> = {
  PASSEIO: Car,
  UTILITARIO: Truck,
  VAN: Bus,
  VUC: Container,
};

/** Regex para validação de placa (Mercosul e antiga) */
const PLACA_REGEX = /^[A-Z]{3}[-]?[0-9][A-Z0-9][0-9]{2}$/;

/** Regex para validação de telefone */
const TELEFONE_REGEX = /^\(?[0-9]{2}\)?[\s.-]?[0-9]{4,5}[\s.-]?[0-9]{4}$/;

// ============================================
// COMPONENTE: AVATAR PICKER
// ============================================

interface AvatarPickerProps {
  /** URL atual do avatar */
  currentAvatarUrl?: string;
  /** Nome do usuário (para fallback) */
  userName: string;
  /** Callback quando nova imagem é selecionada */
  onImageSelected: (image: ImageResult) => void;
  /** Se está fazendo upload */
  isUploading: boolean;
  /** Progresso do upload (0-100) */
  uploadProgress?: number;
}

/**
 * Componente para seleção de foto de perfil.
 * Suporta câmera e galeria com preview.
 */
function AvatarPicker({
  currentAvatarUrl,
  userName,
  onImageSelected,
  isUploading,
  uploadProgress,
}: AvatarPickerProps) {
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const { pickFromGallery, pickFromCamera, isLoading } = useImagePicker({
    quality: 0.8,
    allowsEditing: true,
    aspect: [1, 1], // Quadrado para avatar
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  /**
   * Abre o seletor de origem da imagem
   */
  const handleSelectImage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (Platform.OS === 'ios') {
      // iOS usa ActionSheet nativo
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancelar', 'Tirar Foto', 'Escolher da Galeria'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            const image = await pickFromCamera();
            if (image) handleImagePicked(image);
          } else if (buttonIndex === 2) {
            const image = await pickFromGallery();
            if (image) handleImagePicked(image);
          }
        }
      );
    } else {
      // Android usa Alert com botões
      Alert.alert(
        'Alterar Foto',
        'Escolha a origem da imagem',
        [
          {
            text: 'Câmera',
            onPress: async () => {
              const image = await pickFromCamera();
              if (image) handleImagePicked(image);
            },
          },
          {
            text: 'Galeria',
            onPress: async () => {
              const image = await pickFromGallery();
              if (image) handleImagePicked(image);
            },
          },
          { text: 'Cancelar', style: 'cancel' },
        ]
      );
    }
  };

  /**
   * Processa a imagem selecionada
   */
  const handleImagePicked = (image: ImageResult) => {
    setPreviewUri(image.uri);
    onImageSelected(image);
  };

  /**
   * Remove a imagem selecionada (volta ao avatar atual)
   */
  const handleRemovePreview = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPreviewUri(null);
  };

  // Determina a URI a exibir
  const displayUri = previewUri || currentAvatarUrl;
  const showImage = displayUri && !isUploading;

  return (
    <View style={styles.avatarContainer}>
      <TouchableOpacity
        style={styles.avatarWrapper}
        onPress={handleSelectImage}
        disabled={isUploading || isLoading}
        activeOpacity={0.8}
      >
        {showImage ? (
          // Exibe foto
          <Image source={{ uri: displayUri }} style={styles.avatarImage} />
        ) : (
          // Fallback: inicial do nome
          <LinearGradient
            colors={['#FF6B00', '#EA580C']}
            style={styles.avatarGradient}
          >
            {isUploading ? (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                {uploadProgress !== undefined && (
                  <Text style={styles.uploadProgressText}>
                    {Math.round(uploadProgress)}%
                  </Text>
                )}
              </View>
            ) : (
              <Text style={styles.avatarInitial}>
                {userName?.charAt(0)?.toUpperCase() || 'M'}
              </Text>
            )}
          </LinearGradient>
        )}

        {/* Overlay de loading */}
        {isUploading && showImage && (
          <View style={styles.uploadOverlayAbsolute}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            {uploadProgress !== undefined && (
              <Text style={styles.uploadProgressText}>
                {Math.round(uploadProgress)}%
              </Text>
            )}
          </View>
        )}

        {/* Ícone de câmera */}
        {!isUploading && !isLoading && (
          <View style={styles.cameraButton}>
            <Camera size={16} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>

      {/* Botão para remover preview */}
      {previewUri && !isUploading && (
        <TouchableOpacity
          style={styles.removePreviewButton}
          onPress={handleRemovePreview}
        >
          <X size={14} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      <Text style={styles.avatarHelperText}>
        Toque para alterar a foto
      </Text>
    </View>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function EditProfileScreen() {
  const router = useRouter();

  // Hooks do SDK
  const { user, updateProfile, isPending } = useAuth();
  const { upload, isUploading, uploadProgress } = useStorageResult();

  // Metadata do usuário
  const metadata = user?.metadata as any;

  // Estados do formulário
  const [name, setName] = useState(user?.name || '');
  const [telefone, setTelefone] = useState(metadata?.telefone || '');
  const [tipoVeiculo, setTipoVeiculo] = useState<TipoVeiculo>(
    (metadata?.tipoVeiculo as TipoVeiculo) || 'UTILITARIO'
  );
  const [placaVeiculo, setPlacaVeiculo] = useState(metadata?.placaVeiculo || '');
  const [modeloVeiculo, setModeloVeiculo] = useState(metadata?.modeloVeiculo || '');
  const [turnoPreferido, setTurnoPreferido] = useState<Turno>(
    (metadata?.turnoPreferido as Turno) || 'AM'
  );

  // Estado da foto
  const [selectedImage, setSelectedImage] = useState<ImageResult | null>(null);
  const [localUploadProgress, setLocalUploadProgress] = useState(0);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // URL atual do avatar
  const currentAvatarUrl = user?.avatarUrl || metadata?.avatarUrl;

  /**
   * Valida os campos do formulário
   * @returns Mensagem de erro ou null se válido
   */
  const validateForm = (): string | null => {
    if (!name.trim()) {
      return 'Nome é obrigatório';
    }

    if (name.trim().length < 3) {
      return 'Nome deve ter pelo menos 3 caracteres';
    }

    if (telefone && !TELEFONE_REGEX.test(telefone.replace(/\D/g, ''))) {
      return 'Telefone inválido';
    }

    if (placaVeiculo && !PLACA_REGEX.test(placaVeiculo.toUpperCase().replace('-', ''))) {
      return 'Placa inválida. Use o formato ABC-1234 ou ABC1D23';
    }

    return null;
  };

  /**
   * Faz upload da foto de perfil
   * @returns URL do arquivo ou null em caso de erro
   */
  const uploadPhoto = async (): Promise<string | null> => {
    if (!selectedImage) return null;

    setIsUploadingPhoto(true);
    setLocalUploadProgress(0);

    try {
      console.log('[EditProfile] Iniciando upload de foto...');

      // Cria um Blob a partir da URI local
      const response = await fetch(selectedImage.uri);
      const blob = await response.blob();

      // Valida se o blob tem tamanho válido
      if (blob.size === 0) {
        throw new Error('Imagem inválida ou corrompida');
      }

      const userIdForPath = user?.id || 'user';
      const sanitizedUserId = userIdForPath;

      // Nome do arquivo
      const timestamp = Date.now();
      const fileName = `avatar_${timestamp}.jpg`;
      const folderPath = `users/${sanitizedUserId}`;

      console.log('[EditProfile] SDK Upload to:', { folderPath, fileName });

      // Faz upload via SDK
      const result = await upload(blob, {
        fileName: fileName,
        contentType: 'image/jpeg',
        folder: folderPath,
        onProgress: (progress: { percent: number }) => {
          setLocalUploadProgress(progress.percent);
        },
      } as any);

      console.log('[EditProfile] Resultado do upload (SDK):', JSON.stringify(result, null, 2));


      if (result.success) {
        return result.data.downloadUrl || result.data.publicUrl || result.data.url || '';
      }

      console.error('[EditProfile] Falha reportada pelo SDK:', result.error);
      throw new Error(result.error || 'Erro desconhecido no upload');

    } catch (error: any) {
      console.error('[EditProfile] Erro no upload (SDK):', error);
      Alert.alert(
        'Erro no Upload',
        error?.message || 'Não foi possível enviar a foto.',
        [{ text: 'OK' }]
      );
      return null;
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  /**
   * Salva as alterações do perfil
   */
  const handleSalvar = async () => {
    // Valida formulário
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Campos Inválidos', validationError);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      let avatarUrl = currentAvatarUrl;

      // Faz upload da foto se foi alterada
      if (selectedImage) {
        const uploadedUrl = await uploadPhoto();
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        } else {
          // Pergunta se deseja continuar sem a foto
          return new Promise<void>((resolve) => {
            Alert.alert(
              'Erro no Upload',
              'Não foi possível enviar a foto. Deseja salvar mesmo assim?',
              [
                { text: 'Cancelar', style: 'cancel', onPress: () => resolve() },
                {
                  text: 'Salvar sem Foto',
                  onPress: async () => {
                    await saveProfile(currentAvatarUrl);
                    resolve();
                  },
                },
              ]
            );
          });
        }
      }

      await saveProfile(avatarUrl);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao atualizar perfil');
    }
  };

  /**
   * Salva o perfil no backend
   */
  const saveProfile = async (avatarUrl?: string) => {
    // [SYNC] Dados limpos para envio
    const safeName = name.trim();
    const safeTelefone = telefone.trim() || undefined;
    const safePlaca = placaVeiculo.toUpperCase().trim() || undefined;
    const safeModelo = modeloVeiculo.trim() || undefined;
    const safeAvatar = avatarUrl || undefined;

    console.log('[EditProfile] Salvando perfil:', {
      name: safeName,
      phone: safeTelefone,
      avatarUrl: safeAvatar,
      metadata: { tipoVeiculo, placaVeiculo: safePlaca, modeloVeiculo: safeModelo, turnoPreferido },
    });

    try {
      // 1. [SYNC] Atualiza coleção 'motoristas' (para Admins verem)
      // Tenta atualizar ou criar se não existir (upsert logic simplificada)
      if (user?.id) {
        // Import inline para evitar ciclos se houver
        const { motoristaService } = await import('@/services/motorista-service');

        try {
          // [UPSERT LOGIC]
          // Tenta atualizar primeiro. Se falhar com erro de "não encontrado", cria.
          // Isso evita race conditions e erros de "duplicate key".
          try {
            await motoristaService.atualizarPerfil(user.id, {
              nome: safeName,
              telefone: safeTelefone,
              fotoUrl: safeAvatar,
              tipoVeiculo,
              placaVeiculo: safePlaca,
              modeloVeiculo: safeModelo,
            });
            console.log('[EditProfile] ✅ Perfil atualizado (update)');
          } catch (updateError: any) {
            console.log('[EditProfile] Update falhou, tentando criar...', updateError?.message);

            // Se falhou o update, assume que não existe e tenta criar
            await motoristaService.criarPerfil({
              userId: user.id,
              nome: safeName,
              email: user.email || '',
              telefone: safeTelefone,
              fotoUrl: safeAvatar,
              tipoVeiculo,
              placaVeiculo: safePlaca,
              modeloVeiculo: safeModelo,
              role: 'motorista',
              status: 'ativo'
            });
            console.log('[EditProfile] ✅ Perfil criado (create)');
          }
        } catch (syncError) {
          console.warn('[EditProfile] ⚠️ Falha ao sincronizar coleção motoristas:', syncError);
          // Não bloqueia o fluxo principal
        }
      }

      // 2. Atualiza Metadata do Auth (para app local)
      const updateData = {
        name: safeName,
        phone: safeTelefone,
        avatarUrl: safeAvatar,
        metadata: {
          tipoVeiculo,
          placaVeiculo: safePlaca,
          modeloVeiculo: safeModelo,
          turnoPreferido,
          // Redundância importante para alguns casos de uso
          telefone: safeTelefone,
          avatarUrl: safeAvatar,
        },
      };

      console.log('[EditProfile] Enviando para Auth API:', JSON.stringify(updateData, null, 2));

      const result = await updateProfile(updateData);
      console.log('[EditProfile] Resposta da API:', JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('[EditProfile] ERRO ao salvar perfil:', error?.message || error);
      throw error;
    }
    Alert.alert('Sucesso', 'Perfil atualizado e sincronizado!', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  /**
   * Formata telefone enquanto digita
   */
  const handleTelefoneChange = (value: string) => {
    // Remove todos os caracteres não numéricos
    const numeros = value.replace(/\D/g, '');

    // Aplica máscara (00) 00000-0000
    let formatado = numeros;
    if (numeros.length > 0) {
      formatado = `(${numeros.slice(0, 2)}`;
      if (numeros.length > 2) {
        formatado += `) ${numeros.slice(2, 7)}`;
        if (numeros.length > 7) {
          formatado += `-${numeros.slice(7, 11)}`;
        }
      }
    }

    setTelefone(formatado);
  };

  /**
   * Formata placa enquanto digita
   */
  const handlePlacaChange = (value: string) => {
    // Remove caracteres inválidos e converte para maiúsculo
    const limpo = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Aplica máscara ABC-1234 ou ABC1D23
    let formatado = limpo;
    if (limpo.length > 3) {
      formatado = `${limpo.slice(0, 3)}-${limpo.slice(3, 7)}`;
    }

    setPlacaVeiculo(formatado);
  };

  // Verifica se está em processo de salvamento
  const isSaving = isPending || isUploadingPhoto;

  return (
    <PageWrapper>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            disabled={isSaving}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Editar Perfil</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Avatar Picker */}
        <AvatarPicker
          currentAvatarUrl={currentAvatarUrl}
          userName={name || user?.name || ''}
          onImageSelected={setSelectedImage}
          isUploading={isUploadingPhoto}
          uploadProgress={localUploadProgress}
        />

        {/* Dados Pessoais */}
        <Text style={styles.sectionTitle}>Dados Pessoais</Text>
        <Card variant="default">
          <CardContent>
            <Input
              label="Nome Completo"
              placeholder="Seu nome"
              value={name}
              onChangeText={setName}
              leftIcon={<User size={20} color="#64748B" />}
              maxLength={100}
              autoCapitalize="words"
            />
            <Input
              label="Telefone"
              placeholder="(00) 00000-0000"
              value={telefone}
              onChangeText={handleTelefoneChange}
              type="phone"
              leftIcon={<Phone size={20} color="#64748B" />}
              maxLength={16}
              keyboardType="phone-pad"
            />
          </CardContent>
        </Card>

        {/* Tipo de Veículo */}
        <Text style={styles.sectionTitle}>Tipo de Veículo</Text>
        <View style={styles.vehicleGrid}>
          {VEICULOS.map((veiculo) => {
            const Icon = VehicleIcons[veiculo.id];
            const isSelected = tipoVeiculo === veiculo.id;

            return (
              <TouchableOpacity
                key={veiculo.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTipoVeiculo(veiculo.id);
                }}
                activeOpacity={0.8}
                disabled={isSaving}
                style={[
                  styles.vehicleCard,
                  isSelected && styles.vehicleCardSelected,
                  { borderColor: isSelected ? veiculo.cor : '#334155' },
                ]}
              >
                {isSelected && (
                  <View style={[styles.vehicleCheckmark, { backgroundColor: veiculo.cor }]}>
                    <Check size={12} color="#FFFFFF" />
                  </View>
                )}
                <View
                  style={[styles.vehicleIconContainer, { backgroundColor: `${veiculo.cor}20`, overflow: 'hidden' }]}
                >
                  {isSelected ? (
                    // [LOTTIE] Exibe animação quando selecionado
                    <View style={{ width: 60, height: 40, transform: [{ scale: 1.3 }] }}>
                      <VehicleLottie tipoVeiculo={veiculo.id} width={60} height={40} />
                    </View>
                  ) : (
                    <Icon size={24} color={isSelected ? veiculo.cor : '#64748B'} />
                  )}
                </View>
                <Text style={[styles.vehicleName, isSelected && { color: veiculo.cor }]}>
                  {veiculo.nome}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Dados do Veículo */}
        <Text style={styles.sectionTitle}>Dados do Veículo</Text>
        <Card variant="default">
          <CardContent>
            <Input
              label="Placa"
              placeholder="ABC-1234"
              value={placaVeiculo}
              onChangeText={handlePlacaChange}
              maxLength={8}
              autoCapitalize="characters"
            />
            <Input
              label="Modelo"
              placeholder="Ex: Fiat Fiorino 2020"
              value={modeloVeiculo}
              onChangeText={setModeloVeiculo}
              maxLength={50}
              autoCapitalize="words"
            />
          </CardContent>
        </Card>

        {/* Turno Preferido */}
        <Text style={styles.sectionTitle}>Turno Preferido</Text>
        <View style={styles.turnoContainer}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setTurnoPreferido('AM');
            }}
            disabled={isSaving}
            style={[styles.turnoOption, turnoPreferido === 'AM' && styles.turnoOptionSelected]}
          >
            <Sun size={24} color={turnoPreferido === 'AM' ? '#FF6B00' : '#64748B'} />
            <Text style={[styles.turnoText, turnoPreferido === 'AM' && styles.turnoTextSelected]}>
              Manhã
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setTurnoPreferido('PM');
            }}
            disabled={isSaving}
            style={[styles.turnoOption, turnoPreferido === 'PM' && styles.turnoOptionSelected]}
          >
            <Moon size={24} color={turnoPreferido === 'PM' ? '#FF6B00' : '#64748B'} />
            <Text style={[styles.turnoText, turnoPreferido === 'PM' && styles.turnoTextSelected]}>
              Tarde
            </Text>
          </TouchableOpacity>
        </View>

        {/* Botão Salvar */}
        <View style={{ marginTop: 24 }}>
          <Button
            onPress={handleSalvar}
            loading={isSaving}
            disabled={isSaving}
            fullWidth
            size="xl"
          >
            {isUploadingPhoto ? 'Enviando foto...' : 'Salvar Alterações'}
          </Button>
        </View>

        {/* Espaço extra para scroll */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </PageWrapper>
  );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 100 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },

  // Avatar
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarWrapper: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    borderWidth: 3,
    borderColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePreviewButton: {
    position: 'absolute',
    top: 0,
    right: '50%',
    marginRight: -70,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadOverlayAbsolute: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 60,
  },
  uploadProgressText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  avatarHelperText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
  },

  // Sections
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 12,
    marginTop: 24,
    marginLeft: 4,
  },

  // Vehicle Grid
  vehicleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  vehicleCard: {
    width: '47%',
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
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  vehicleName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F1F5F9',
  },

  // Turno
  turnoContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  turnoOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#334155',
    borderRadius: 16,
    paddingVertical: 20,
  },
  turnoOptionSelected: {
    borderColor: '#FF6B00',
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
  },
  turnoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  turnoTextSelected: {
    color: '#FF6B00',
  },
});
