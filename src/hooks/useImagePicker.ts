// src/hooks/useImagePicker.ts
// ============================================
// ROTAFRETE - Hook para Seleção de Imagem
// ============================================
// Hook customizado que encapsula expo-image-picker
// Suporta seleção via câmera ou galeria
// Retorna dados compatíveis com upload via SDK
// ============================================

import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

// ============================================
// TIPOS
// ============================================

/**
 * Resultado da seleção de imagem
 * Contém dados necessários para upload
 */
export interface ImageResult {
    /** URI local da imagem */
    uri: string;
    /** MIME type (image/jpeg, image/png) */
    type: string;
    /** Nome do arquivo */
    name: string;
    /** Tamanho em bytes (opcional) */
    size?: number;
    /** Largura em pixels */
    width: number;
    /** Altura em pixels */
    height: number;
    /** Base64 da imagem (se solicitado) */
    base64?: string;
}

/**
 * Opções de configuração do picker
 */
export interface ImagePickerOptions {
    /** Qualidade da imagem (0-1), padrão: 0.8 */
    quality?: number;
    /** Permitir edição antes de confirmar */
    allowsEditing?: boolean;
    /** Proporção de corte [largura, altura] */
    aspect?: [number, number];
    /** Incluir base64 na resposta */
    base64?: boolean;
    /** Tamanho máximo em bytes (5MB padrão) */
    maxSize?: number;
}

/**
 * Retorno do hook useImagePicker
 */
export interface UseImagePickerReturn {
    /** Seleciona imagem da galeria */
    pickFromGallery: () => Promise<ImageResult | null>;
    /** Captura foto pela câmera */
    pickFromCamera: () => Promise<ImageResult | null>;
    /** Indica se está processando */
    isLoading: boolean;
    /** Último erro ocorrido */
    error: string | null;
    /** Limpa o erro */
    clearError: () => void;
}

// ============================================
// CONSTANTES
// ============================================

/** Tamanho máximo padrão: 5MB */
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024;

/** Qualidade padrão: 80% */
const DEFAULT_QUALITY = 0.8;

// ============================================
// HOOK PRINCIPAL
// ============================================

/**
 * Hook para seleção de imagem via câmera ou galeria.
 * 
 * @param options - Configurações do picker
 * @returns Funções e estado do picker
 * 
 * @example
 * ```tsx
 * const { pickFromGallery, pickFromCamera, isLoading } = useImagePicker({
 *   quality: 0.9,
 *   allowsEditing: true,
 *   aspect: [1, 1], // Quadrado para avatar
 * });
 * 
 * const handleSelectPhoto = async () => {
 *   const image = await pickFromGallery();
 *   if (image) {
 *     console.log('Imagem selecionada:', image.uri);
 *   }
 * };
 * ```
 */
export function useImagePicker(options: ImagePickerOptions = {}): UseImagePickerReturn {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        quality = DEFAULT_QUALITY,
        allowsEditing = true,
        aspect = [1, 1],
        base64 = false,
        maxSize = DEFAULT_MAX_SIZE,
    } = options;

    /**
     * Solicita permissão de acesso à galeria
     * @returns true se permissão concedida
     */
    const requestGalleryPermission = useCallback(async (): Promise<boolean> => {
        // No Android 13+, não precisa de permissão para galeria
        if (Platform.OS === 'android' && Platform.Version >= 33) {
            return true;
        }

        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert(
                'Permissão Necessária',
                'Precisamos acessar sua galeria para selecionar fotos.',
                [{ text: 'OK' }]
            );
            return false;
        }

        return true;
    }, []);

    /**
     * Solicita permissão de acesso à câmera
     * @returns true se permissão concedida
     */
    const requestCameraPermission = useCallback(async (): Promise<boolean> => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert(
                'Permissão Necessária',
                'Precisamos acessar sua câmera para tirar fotos.',
                [{ text: 'OK' }]
            );
            return false;
        }

        return true;
    }, []);

    /**
     * Processa o resultado do picker e valida
     * @param result - Resultado bruto do ImagePicker
     * @returns ImageResult processado ou null
     */
    const processResult = useCallback((
        result: ImagePicker.ImagePickerResult
    ): ImageResult | null => {
        // Usuário cancelou
        if (result.canceled || !result.assets?.[0]) {
            return null;
        }

        const asset = result.assets[0];

        // Valida tamanho do arquivo
        if (asset.fileSize && asset.fileSize > maxSize) {
            const maxMB = Math.round(maxSize / (1024 * 1024));
            setError(`Imagem muito grande. Máximo: ${maxMB}MB`);
            Alert.alert('Imagem muito grande', `Selecione uma imagem menor que ${maxMB}MB.`);
            return null;
        }

        // Extrai nome do arquivo da URI
        const uriParts = asset.uri.split('/');
        const fileName = uriParts[uriParts.length - 1] || `photo_${Date.now()}.jpg`;

        // Determina o MIME type
        const extension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';

        return {
            uri: asset.uri,
            type: mimeType,
            name: fileName,
            size: asset.fileSize,
            width: asset.width,
            height: asset.height,
            base64: asset.base64 ?? undefined, // Converte null para undefined
        };
    }, [maxSize]);

    /**
     * Abre a galeria para selecionar uma imagem
     * @returns Dados da imagem ou null se cancelado
     */
    const pickFromGallery = useCallback(async (): Promise<ImageResult | null> => {
        setError(null);
        setIsLoading(true);

        try {
            // Verifica permissão
            const hasPermission = await requestGalleryPermission();
            if (!hasPermission) {
                return null;
            }

            // Abre picker
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing,
                aspect,
                quality,
                base64,
                exif: false, // Não precisamos de metadados EXIF
            });

            return processResult(result);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao selecionar imagem';
            setError(message);
            console.error('[useImagePicker] Erro na galeria:', err);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [requestGalleryPermission, allowsEditing, aspect, quality, base64, processResult]);

    /**
     * Abre a câmera para capturar uma foto
     * @returns Dados da imagem ou null se cancelado
     */
    const pickFromCamera = useCallback(async (): Promise<ImageResult | null> => {
        setError(null);
        setIsLoading(true);

        try {
            // Verifica permissão
            const hasPermission = await requestCameraPermission();
            if (!hasPermission) {
                return null;
            }

            // Abre câmera
            const result = await ImagePicker.launchCameraAsync({
                allowsEditing,
                aspect,
                quality,
                base64,
                exif: false,
            });

            return processResult(result);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao capturar foto';
            setError(message);
            console.error('[useImagePicker] Erro na câmera:', err);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [requestCameraPermission, allowsEditing, aspect, quality, base64, processResult]);

    /**
     * Limpa o último erro
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        pickFromGallery,
        pickFromCamera,
        isLoading,
        error,
        clearError,
    };
}

export default useImagePicker;
