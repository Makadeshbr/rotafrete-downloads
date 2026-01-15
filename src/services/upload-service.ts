// src/services/upload-service.ts
// ============================================
// ROTAFRETE - Serviço de Upload Resiliente
// ============================================
// Padrão Enterprise: Renovação proativa de token,
// retry inteligente que diferencia erros de auth.
// ============================================

import { getStorage, getAuth, getAetherClient } from '@aether-baas/react-native';
import { createLogger } from '@/utils/logger';

const logger = createLogger('UploadService');

// Constantes de configuração
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_RETRIES = 3;
const BASE_DELAY = 1000; // 1 segundo

/**
 * Erros que indicam problema de autenticação.
 * Quando ocorrem, devemos tentar renovar o token antes de retry.
 */
const AUTH_ERROR_CODES = [401, 403];

/**
 * Erros que indicam problema de rede/servidor temporário.
 * Esses podem ser retryados com backoff.
 */
const RETRYABLE_ERROR_CODES = [408, 429, 500, 502, 503, 504];

interface UploadOptions {
    contentType?: string;
    folder?: string;
    metadata?: Record<string, string>;
    /** Callback de progresso (0-100) */
    onProgress?: (progress: number) => void;
}

interface UploadResult {
    success: boolean;
    url?: string;
    error?: string;
    metadata?: {
        size: number;
        mimeType: string;
    };
}

/**
 * Verifica se o erro é relacionado a autenticação.
 */
function isAuthError(error: unknown): boolean {
    if (error && typeof error === 'object') {
        const errObj = error as Record<string, unknown>;

        // Verifica código HTTP
        if (AUTH_ERROR_CODES.includes(Number(errObj.status || errObj.statusCode))) {
            return true;
        }

        // Verifica mensagem de erro
        const message = String(errObj.message || '').toLowerCase();
        if (message.includes('unauthorized') ||
            message.includes('token') ||
            message.includes('expired') ||
            message.includes('invalid credentials')) {
            return true;
        }
    }
    return false;
}

/**
 * Verifica se o erro pode ser retryado.
 */
function isRetryableError(error: unknown): boolean {
    if (error && typeof error === 'object') {
        const errObj = error as Record<string, unknown>;
        const status = Number(errObj.status || errObj.statusCode);

        if (RETRYABLE_ERROR_CODES.includes(status)) {
            return true;
        }

        // Erros de rede são retryáveis
        const message = String(errObj.message || '').toLowerCase();
        if (message.includes('network') ||
            message.includes('timeout') ||
            message.includes('econnreset')) {
            return true;
        }
    }
    return false;
}

/**
 * Tenta renovar o token de autenticação.
 */
async function tryRefreshToken(): Promise<boolean> {
    try {
        logger.debug('Tentando renovar token...');

        const client = getAetherClient();

        // Acesso correto ao tenantAuth (SDK v3.x) e não 'auth'
        // @ts-ignore - Propriedade existe mas types podem estar desatualizados
        const authModule = client.tenantAuth || client.auth;

        if (authModule && typeof authModule.refreshSession === 'function') {
            const result = await authModule.refreshSession();
            // refreshSession retorna { accessToken } ou lança erro/retorna null
            if (result && result.accessToken) {
                logger.info('Token renovado com sucesso via refreshSession');
                return true;
            }
        }

        logger.warn('Nenhum método de refresh funcionou');
        return false;
    } catch (error) {
        logger.error('Falha ao renovar token', error);
        return false;
    }
}

/**
 * Realiza upload com retry inteligente e renovação de token.
 *
 * Fluxo:
 * 1. Valida arquivo (tamanho)
 * 2. Tenta upload
 * 3. Se erro de auth: renova token e tenta novamente (1x)
 * 4. Se erro retryável: aplica backoff exponencial
 * 5. Se outros erros: falha imediatamente
 *
 * @example
 * const result = await uploadWithRetry(
 *   blob,
 *   'foto_pneu.jpg',
 *   { folder: 'inspecoes/2026-W02', contentType: 'image/jpeg' }
 * );
 */
export async function uploadWithRetry(
    file: Blob,
    fileName: string,
    options: UploadOptions = {}
): Promise<UploadResult> {
    // 1. Validação de entrada
    if (!file) {
        return { success: false, error: 'Arquivo não fornecido' };
    }

    if (file.size > MAX_FILE_SIZE) {
        return {
            success: false,
            error: `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Limite: 10MB`
        };
    }

    if (!fileName || fileName.trim() === '') {
        return { success: false, error: 'Nome do arquivo não fornecido' };
    }

    const storage = getStorage();
    let authRetryUsed = false;

    // 2. Loop de retry com lógica inteligente
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            logger.debug(`Upload tentativa ${attempt}/${MAX_RETRIES}`, { fileName });

            // Simula progresso para o callback
            options.onProgress?.(10 + (attempt - 1) * 20);

            // CORREÇÃO: Signature do SDK é upload(file, options)
            // O fileName vai dentro das options
            const result = await storage.upload(file, {
                fileName: fileName,
                contentType: options.contentType || 'application/octet-stream',
                folder: options.folder,
                // metadata: options.metadata, // SDK não parece suportar metadata no upload direto segundo d.ts
            });

            options.onProgress?.(90);

            // 3. Verifica resultado
            if (!result.success || !result.data) {
                throw new Error(result.error || 'Upload falhou sem mensagem de erro');
            }

            // Extrai URL do resultado
            const url = result.data.downloadUrl ||
                result.data.publicUrl ||
                result.data.url;

            if (!url) {
                logger.warn('Upload completou mas URL não encontrada', { result });
            }

            options.onProgress?.(100);

            return {
                success: true,
                url,
                metadata: {
                    size: file.size,
                    mimeType: result.data.contentType || options.contentType || 'application/octet-stream',
                },
            };

        } catch (error) {
            logger.warn(`Upload falhou na tentativa ${attempt}`, error);

            // 4. Tratamento de erro de autenticação
            if (isAuthError(error) && !authRetryUsed) {
                logger.info('Erro de auth detectado, tentando renovar token...');
                authRetryUsed = true;

                const refreshed = await tryRefreshToken();
                if (refreshed) {
                    // Não conta como tentativa, volta ao início do loop
                    attempt--;
                    continue;
                } else {
                    // Não conseguiu renovar, falha imediatamente
                    return {
                        success: false,
                        error: 'Sessão expirada. Por favor, faça login novamente.',
                    };
                }
            }

            // 5. Verifica se deve fazer retry
            if (attempt < MAX_RETRIES && isRetryableError(error)) {
                const delay = BASE_DELAY * Math.pow(2, attempt - 1); // Exponential backoff
                logger.info(`Aguardando ${delay}ms antes do retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            // 6. Erro não retryável ou esgotou tentativas
            const errorMessage = error instanceof Error
                ? error.message
                : 'Erro desconhecido no upload';

            return {
                success: false,
                error: `Upload falhou após ${attempt} tentativas: ${errorMessage}`,
            };
        }
    }

    // Fallback (não deveria chegar aqui)
    return {
        success: false,
        error: 'Upload falhou: máximo de tentativas excedido',
    };
}

export default { uploadWithRetry };
