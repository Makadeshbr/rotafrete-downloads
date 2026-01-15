// app/inspection/camera/[categoria].tsx
// ============================================
// ROTAFRETE - Tela de Câmera Guiada
// ============================================
// Permite ao motorista capturar fotos de cada
// item de inspeção com dicas visuais e guias.
// ============================================

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Camera,
  FlipHorizontal,
  Image as ImageIcon,
  Check,
  X,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  AlertTriangle,
} from 'lucide-react-native';

// Store e constantes
import { useInspectionStore } from '@/store/useInspectionStore';
import {
  ITENS_INSPECAO_MAP,
  CATEGORIAS_INSPECAO,
  ITENS_POR_CATEGORIA,
} from '@/constants/inspection';
import type { ItemInspecao, CategoriaInspecao, ItemInspecaoId } from '@/types/inspection';

// ============================================
// COMPONENTE DE DICA
// ============================================

interface DicaItemProps {
  itemId: ItemInspecaoId;
}

function DicaItem({ itemId }: DicaItemProps) {
  const config = ITENS_INSPECAO_MAP[itemId];
  if (!config) return null;

  return (
    <View style={styles.dicaContainer}>
      <View style={styles.dicaHeader}>
        <Lightbulb size={16} color="#F59E0B" />
        <Text style={styles.dicaTitulo}>Dica para foto</Text>
      </View>
      <Text style={styles.dicaTexto}>{config.descricao}</Text>
    </View>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function CameraScreen() {
  const params = useLocalSearchParams<{
    categoria: CategoriaInspecao;
    itemId?: string;
    itemNome?: string;
    isReenvio?: string;
  }>();

  const categoria = params.categoria;
  const itemIdInicial = params.itemId;
  const isReenvio = params.isReenvio === 'true';

  // Permissões de câmera
  const [permission, requestPermission] = useCameraPermissions();

  // Refs
  const cameraRef = useRef<CameraView>(null);

  // Store
  const {
    itensInspecao,
    inspecaoAtual,
    isUploading: isEnviandoFoto,
    uploadProgress,
    enviarFotoItem,
    reenviarFotoItem,
    getItensCategoria,
  } = useInspectionStore();

  // Estados locais
  const [facing, setFacing] = useState<CameraType>('back');
  const [fotoCapturada, setFotoCapturada] = useState<{
    uri: string;
    width: number;
    height: number;
  } | null>(null);
  const [itemAtualIndex, setItemAtualIndex] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);

  // Itens da categoria - usa getItensCategoria para buscar ItemInspecao[]
  const itensCategoria = getItensCategoria(categoria);
  const itemAtual: ItemInspecao | undefined = itensCategoria[itemAtualIndex];
  const categoriaConfig = CATEGORIAS_INSPECAO[categoria];

  // Inicializa no item correto se veio com itemId
  useEffect(() => {
    if (itemIdInicial) {
      const index = itensCategoria.findIndex((i) => i.id === itemIdInicial);
      if (index >= 0) {
        setItemAtualIndex(index);
      }
    }
  }, [itemIdInicial]);

  // [NOVO] Pula automaticamente para o primeiro item SEM foto
  // (exceto se veio com itemId específico ou é reenvio)
  useEffect(() => {
    if (itemIdInicial || isReenvio) return;

    const primeiroSemFoto = itensCategoria.findIndex(
      (i) => !i.fotoUrl || i.requerReenvio
    );

    if (primeiroSemFoto >= 0 && primeiroSemFoto !== itemAtualIndex) {
      setItemAtualIndex(primeiroSemFoto);
    }
  }, [itensCategoria.length]); // Só executa quando itens carregam

  // ─── Verifica permissão ──────────────────
  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Verificando permissões...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Camera size={64} color="#64748B" />
          <Text style={styles.permissionTitle}>Acesso à Câmera</Text>
          <Text style={styles.permissionText}>
            Precisamos de acesso à câmera para você fotografar os itens da inspeção.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Permitir Acesso</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.permissionButtonSecondary}
            onPress={() => router.back()}
          >
            <Text style={styles.permissionButtonSecondaryText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Verifica se há itens para fotografar ─────
  if (itensCategoria.length === 0 || !itemAtual) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <AlertTriangle size={64} color="#F59E0B" />
          <Text style={styles.permissionTitle}>Nenhum item encontrado</Text>
          <Text style={styles.permissionText}>
            Não há itens de inspeção para esta categoria. {'\n'}
            {inspecaoAtual ? '' : 'Primeiro crie uma nova inspeção semanal.'}
          </Text>
          <TouchableOpacity
            style={styles.permissionButtonSecondary}
            onPress={() => router.back()}
          >
            <Text style={styles.permissionButtonSecondaryText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Handlers ────────────────────────────

  // [NOVO] Função interna que realmente captura a foto
  const executarCaptura = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const foto = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });

      if (foto) {
        setFotoCapturada({
          uri: foto.uri,
          width: foto.width,
          height: foto.height,
        });
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível capturar a foto. Tente novamente.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleCapturarFoto = async () => {
    if (!cameraRef.current || isCapturing) return;

    // [NOVO] Bloqueia se a inspeção já foi finalizada/aceita
    if (inspecaoAtual && inspecaoAtual.status !== 'PENDENTE' && inspecaoAtual.status !== 'ENVIADA') {
      Alert.alert(
        'Inspeção Finalizada',
        'Esta inspeção já foi avaliada e não pode ser alterada. Aguarde a próxima inspeção semanal.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      return;
    }

    // [NOVO] Se o item já tem foto e não requer reenvio, exige confirmação
    if (itemAtual?.fotoUrl && !itemAtual.requerReenvio) {
      Alert.alert(
        'Substituir foto?',
        'Este item já possui uma foto enviada. Deseja substituí-la?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sim, substituir',
            style: 'destructive',
            onPress: () => executarCaptura(), // Chama direto a função de captura
          },
        ]
      );
      return;
    }

    // Captura normal (item novo ou reenvio)
    await executarCaptura();
  };

  // [NOVO] Função interna que realmente abre a galeria
  const executarEscolherGaleria = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setFotoCapturada({
        uri: asset.uri,
        width: asset.width || 1920,
        height: asset.height || 1440,
      });
    }
  };

  const handleEscolherGaleria = async () => {
    // [NOVO] Bloqueia se a inspeção já foi finalizada/aceita
    if (inspecaoAtual && inspecaoAtual.status !== 'PENDENTE' && inspecaoAtual.status !== 'ENVIADA') {
      Alert.alert(
        'Inspeção Finalizada',
        'Esta inspeção já foi avaliada e não pode ser alterada. Aguarde a próxima inspeção semanal.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      return;
    }

    // [NOVO] Se o item já tem foto e não requer reenvio, exige confirmação
    if (itemAtual?.fotoUrl && !itemAtual.requerReenvio) {
      Alert.alert(
        'Substituir foto?',
        'Este item já possui uma foto enviada. Deseja substituí-la?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sim, substituir',
            style: 'destructive',
            onPress: () => executarEscolherGaleria(), // Chama direto
          },
        ]
      );
      return;
    }

    // Galeria normal (item novo ou reenvio)
    await executarEscolherGaleria();
  };

  const handleConfirmarFoto = async () => {
    if (!fotoCapturada || !itemAtual || !inspecaoAtual) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Cria input compatível com EnviarFotoItemInput/ReenviarFotoInput
      const fotoData = {
        uri: fotoCapturada.uri,
        type: 'image/jpeg',
        name: `${itemAtual.itemId}_${Date.now()}.jpg`,
        width: fotoCapturada.width,
        height: fotoCapturada.height,
      };

      if (isReenvio || itemAtual.requerReenvio) {
        await reenviarFotoItem(
          { itemId: itemAtual.id, foto: fotoData },
          inspecaoAtual.motoristaId
        );
      } else {
        await enviarFotoItem(
          { itemId: itemAtual.id, foto: fotoData },
          inspecaoAtual.motoristaId
        );
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Limpa a foto e vai para o próximo item
      setFotoCapturada(null);

      // Se tem mais itens na categoria, vai para o próximo
      if (itemAtualIndex < itensCategoria.length - 1) {
        setItemAtualIndex(itemAtualIndex + 1);
      } else {
        // Todos os itens da categoria foram fotografados
        Alert.alert(
          'Categoria Completa!',
          `Todas as fotos de "${categoriaConfig?.nome}" foram enviadas.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível enviar a foto. Tente novamente.');
    }
  };

  const handleDescartarFoto = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFotoCapturada(null);
  };

  const handleTrocarCamera = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  const handleItemAnterior = () => {
    if (itemAtualIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setItemAtualIndex(itemAtualIndex - 1);
      setFotoCapturada(null);
    }
  };

  const handleProximoItem = () => {
    if (itemAtualIndex < itensCategoria.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setItemAtualIndex(itemAtualIndex + 1);
      setFotoCapturada(null);
    }
  };

  const handlePularItem = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (itemAtualIndex < itensCategoria.length - 1) {
      setItemAtualIndex(itemAtualIndex + 1);
      setFotoCapturada(null);
    } else {
      router.back();
    }
  };

  // ─── Tela de preview da foto ─────────────
  if (fotoCapturada) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleDescartarFoto}
          >
            <ArrowLeft size={24} color="#F1F5F9" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Confirmar Foto</Text>
            <Text style={styles.headerSubtitle}>
              {ITENS_INSPECAO_MAP[itemAtual?.itemId]?.nome || itemAtual?.nomeExibicao}
            </Text>
          </View>
        </View>

        {/* Preview da foto */}
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: fotoCapturada.uri }}
            style={styles.previewImage}
            resizeMode="contain"
          />
        </View>

        {/* Ações */}
        <View style={styles.previewActions}>
          <TouchableOpacity
            style={styles.previewActionDescartar}
            onPress={handleDescartarFoto}
            disabled={isEnviandoFoto}
          >
            <X size={24} color="#EF4444" />
            <Text style={styles.previewActionTextDescartar}>Tirar Outra</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.previewActionConfirmar,
              isEnviandoFoto && styles.previewActionDisabled,
            ]}
            onPress={handleConfirmarFoto}
            disabled={isEnviandoFoto}
          >
            {isEnviandoFoto ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.previewActionTextConfirmar}>
                  {uploadProgress}%
                </Text>
              </>
            ) : (
              <>
                <Check size={24} color="#fff" />
                <Text style={styles.previewActionTextConfirmar}>
                  Confirmar
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Tela da câmera ──────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#F1F5F9" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{categoriaConfig?.nome}</Text>
          <Text style={styles.headerSubtitle}>
            Item {itemAtualIndex + 1} de {itensCategoria.length}
          </Text>
        </View>
        <TouchableOpacity style={styles.skipButton} onPress={handlePularItem}>
          <Text style={styles.skipButtonText}>Pular</Text>
        </TouchableOpacity>
      </View>

      {/* Nome do item atual */}
      <View style={styles.itemInfo}>
        <View style={styles.itemNavigation}>
          <TouchableOpacity
            style={[
              styles.navButton,
              itemAtualIndex === 0 && styles.navButtonDisabled,
            ]}
            onPress={handleItemAnterior}
            disabled={itemAtualIndex === 0}
          >
            <ChevronLeft
              size={20}
              color={itemAtualIndex === 0 ? '#334155' : '#F1F5F9'}
            />
          </TouchableOpacity>

          <View style={styles.itemNameContainer}>
            <Text style={styles.itemName}>
              {ITENS_INSPECAO_MAP[itemAtual?.itemId]?.nome || itemAtual?.nomeExibicao}
            </Text>
            {itemAtual?.fotoUrl && !itemAtual.requerReenvio && (
              <View style={styles.itemJaEnviado}>
                <Check size={12} color="#22C55E" />
                <Text style={styles.itemJaEnviadoText}>Já enviado</Text>
              </View>
            )}
            {itemAtual?.requerReenvio && (
              <View style={styles.itemReenvio}>
                <RefreshCw size={12} color="#EF4444" />
                <Text style={styles.itemReenvioText}>Reenvio necessário</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.navButton,
              itemAtualIndex === itensCategoria.length - 1 &&
              styles.navButtonDisabled,
            ]}
            onPress={handleProximoItem}
            disabled={itemAtualIndex === itensCategoria.length - 1}
          >
            <ChevronRight
              size={20}
              color={
                itemAtualIndex === itensCategoria.length - 1
                  ? '#334155'
                  : '#F1F5F9'
              }
            />
          </TouchableOpacity>
        </View>

        {/* Dica para a foto */}
        {itemAtual && <DicaItem itemId={itemAtual.itemId} />}
      </View>

      {/* Câmera */}
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
        >
          {/* Guia visual */}
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraGuide}>
              <View style={styles.guideCorner} />
              <View style={[styles.guideCorner, styles.guideCornerTR]} />
              <View style={[styles.guideCorner, styles.guideCornerBL]} />
              <View style={[styles.guideCorner, styles.guideCornerBR]} />
            </View>
          </View>
        </CameraView>
      </View>

      {/* Controles da câmera */}
      <View style={styles.cameraControls}>
        {/* Galeria */}
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleEscolherGaleria}
        >
          <ImageIcon size={28} color="#F1F5F9" />
        </TouchableOpacity>

        {/* Capturar */}
        <TouchableOpacity
          style={styles.captureButton}
          onPress={handleCapturarFoto}
          disabled={isCapturing}
        >
          <View style={styles.captureButtonInner}>
            {isCapturing ? (
              <ActivityIndicator color="#0F172A" size="small" />
            ) : (
              <Camera size={32} color="#0F172A" />
            )}
          </View>
        </TouchableOpacity>

        {/* Trocar câmera */}
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleTrocarCamera}
        >
          <FlipHorizontal size={28} color="#F1F5F9" />
        </TouchableOpacity>
      </View>

      {/* Indicador de progresso */}
      <View style={styles.progressIndicator}>
        {itensCategoria.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index === itemAtualIndex && styles.progressDotActive,
              itensCategoria[index]?.fotoUrl && styles.progressDotComplete,
            ]}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 14,
  },

  // Permissão
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F1F5F9',
    marginTop: 20,
  },
  permissionText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  permissionButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  permissionButtonSecondary: {
    marginTop: 16,
    padding: 12,
  },
  permissionButtonSecondaryText: {
    color: '#64748B',
    fontSize: 14,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  skipButton: {
    padding: 8,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },

  // Item Info
  itemInfo: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  itemNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  navButton: {
    padding: 8,
    backgroundColor: '#1E293B',
    borderRadius: 8,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  itemNameContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
    textAlign: 'center',
  },
  itemJaEnviado: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  itemJaEnviadoText: {
    fontSize: 11,
    color: '#22C55E',
    marginLeft: 4,
  },
  itemReenvio: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  itemReenvioText: {
    fontSize: 11,
    color: '#EF4444',
    marginLeft: 4,
  },

  // Dica
  dicaContainer: {
    backgroundColor: '#422006',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#713F12',
  },
  dicaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dicaTitulo: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FCD34D',
    marginLeft: 6,
  },
  dicaTexto: {
    fontSize: 13,
    color: '#FDE68A',
    lineHeight: 18,
  },

  // Câmera
  cameraContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraGuide: {
    width: '80%',
    aspectRatio: 4 / 3,
    position: 'relative',
  },
  guideCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#3B82F6',
    borderTopWidth: 3,
    borderLeftWidth: 3,
    top: 0,
    left: 0,
  },
  guideCornerTR: {
    borderLeftWidth: 0,
    borderRightWidth: 3,
    left: undefined,
    right: 0,
  },
  guideCornerBL: {
    borderTopWidth: 0,
    borderBottomWidth: 3,
    top: undefined,
    bottom: 0,
  },
  guideCornerBR: {
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    top: undefined,
    left: undefined,
    bottom: 0,
    right: 0,
  },

  // Controles
  cameraControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 32,
    gap: 40,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#3B82F6',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Progresso
  progressIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 20,
    gap: 6,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#334155',
  },
  progressDotActive: {
    backgroundColor: '#3B82F6',
    width: 24,
  },
  progressDotComplete: {
    backgroundColor: '#22C55E',
  },

  // Preview
  previewContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
  },
  previewImage: {
    flex: 1,
  },
  previewActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  previewActionDescartar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#EF4444',
    gap: 8,
  },
  previewActionTextDescartar: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  previewActionConfirmar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    gap: 8,
  },
  previewActionDisabled: {
    backgroundColor: '#334155',
  },
  previewActionTextConfirmar: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
