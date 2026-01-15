// src/utils/safeSubscribe.ts
// ============================================
// ROTAFRETE - Wrapper Seguro para Subscriptions Realtime
// ============================================
// Padrão Enterprise: Centraliza tratamento de erro para
// evitar que callbacks quebrem silenciosamente.
// ============================================

import { createLogger } from './logger';

const logger = createLogger('SafeSubscribe');

/**
 * Tipo genérico para dados recebidos do Aether SDK.
 * O backend pode enviar dados em formato "envelope" com Payload,
 * ou diretamente no objeto raiz.
 */
interface AetherRealtimePayload<T = unknown> {
    id?: string;
    projectId?: string;
    userId?: string;
    createdAt?: string;
    Payload?: T;
    [key: string]: unknown;
}

/**
 * Resultado da extração segura de dados.
 */
interface ExtractionResult<T> {
    success: boolean;
    data: T | null;
    error?: string;
}

/**
 * Extrai dados de forma segura do payload do Aether SDK.
 * Trata tanto o formato "envelope" (com Payload) quanto direto.
 * 
 * @param rawData - Dados brutos recebidos do subscription
 * @param requiredFields - Lista de campos obrigatórios para validação
 * @returns Objeto com data extraído ou null se inválido
 * 
 * @example
 * const { success, data, error } = extractPayloadSafe<Rota>(rawData, ['id', 'motoristaId']);
 * if (!success) {
 *   logger.warn('Payload inválido:', error);
 *   return;
 * }
 */
export function extractPayloadSafe<T>(
    rawData: AetherRealtimePayload<T>,
    requiredFields: (keyof T)[] = []
): ExtractionResult<T> {
    try {
        // 1. Validação básica do input
        if (!rawData || typeof rawData !== 'object') {
            return {
                success: false,
                data: null,
                error: 'rawData é null ou não é um objeto',
            };
        }

        // 2. Extração do payload (suporta ambos formatos)
        let extracted: T;

        if (rawData.Payload && typeof rawData.Payload === 'object') {
            // Formato "envelope" - mescla metadados com payload
            extracted = {
                id: rawData.id,
                projectId: rawData.projectId,
                userId: rawData.userId,
                createdAt: rawData.createdAt,
                ...rawData.Payload,
            } as T;
        } else {
            // Formato direto - usa o objeto como está
            extracted = rawData as unknown as T;
        }

        // 3. Validação dos campos obrigatórios
        for (const field of requiredFields) {
            if (extracted[field] === undefined || extracted[field] === null) {
                return {
                    success: false,
                    data: null,
                    error: `Campo obrigatório ausente: ${String(field)}`,
                };
            }
        }

        return {
            success: true,
            data: extracted,
        };
    } catch (error) {
        // Captura qualquer erro inesperado na extração
        logger.error('Erro ao extrair payload', error);
        return {
            success: false,
            data: null,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        };
    }
}

/**
 * Cria um callback de subscription seguro com tratamento de erro automático.
 * Garante que erros no callback não quebrem o subscription silenciosamente.
 * 
 * @param handler - Função de tratamento do evento
 * @param options - Opções de configuração
 * @returns Callback seguro para usar em .subscribe()
 * 
 * @example
 * const safeCallback = createSafeSubscriptionHandler<Rota>(
 *   (action, data) => {
 *     if (action === 'create') set(state => ({ rotas: [data, ...state.rotas] }));
 *   },
 *   {
 *     filterFn: (data) => data.motoristaId === currentUserId,
 *     requiredFields: ['id', 'motoristaId', 'data'],
 *     moduleName: 'RotaStore',
 *   }
 * );
 * 
 * getDb().collection('rotas').subscribe(safeCallback);
 */
export function createSafeSubscriptionHandler<T>(
    handler: (action: 'create' | 'update' | 'delete', data: T) => void | Promise<void>,
    options: {
        /** Função de filtro client-side (ex: verificar motoristaId) */
        filterFn?: (data: T) => boolean;
        /** Campos obrigatórios para validação */
        requiredFields?: (keyof T)[];
        /** Nome do módulo para logs */
        moduleName?: string;
        /** Callback de erro customizado */
        onError?: (error: Error, rawData: unknown) => void;
    } = {}
): (action: string, rawData: unknown) => void {
    const {
        filterFn,
        requiredFields = [],
        moduleName = 'Subscription',
        onError,
    } = options;

    const moduleLogger = createLogger(moduleName);

    return (action: string, rawData: unknown) => {
        try {
            // 1. Valida tipo da action
            const validActions = ['create', 'update', 'delete'];
            const normalizedAction = action.toLowerCase();

            if (!validActions.includes(normalizedAction)) {
                moduleLogger.warn(`Action desconhecida: ${action}`);
                return;
            }

            // 2. Extrai payload de forma segura
            const { success, data, error } = extractPayloadSafe<T>(
                rawData as AetherRealtimePayload<T>,
                requiredFields
            );

            if (!success || !data) {
                moduleLogger.warn(`Payload inválido para action ${action}:`, error);
                return;
            }

            // 3. Aplica filtro client-side se fornecido
            if (filterFn && !filterFn(data)) {
                // Silenciosamente ignora dados que não passam no filtro
                // (ex: dados de outro motorista)
                return;
            }

            // 4. Executa o handler com os dados validados
            const result = handler(normalizedAction as 'create' | 'update' | 'delete', data);

            // 5. Se o handler retornar Promise, trata erros async
            if (result instanceof Promise) {
                result.catch((asyncError) => {
                    moduleLogger.error(`Erro async no handler [${action}]:`, asyncError);
                    onError?.(asyncError, rawData);
                });
            }
        } catch (syncError) {
            // Captura erros síncronos no handler
            moduleLogger.error(`Erro síncrono no handler [${action}]:`, syncError);
            onError?.(syncError as Error, rawData);
        }
    };
}

/**
 * Debounce para callbacks de subscription.
 * Evita múltiplas chamadas em rajada (burst de eventos).
 * 
 * @param fn - Função a ser debounced
 * @param delay - Delay em ms (default: 300ms)
 */
export function debounceSubscription<T extends (...args: any[]) => any>(
    fn: T,
    delay: number = 300
): T {
    let timeoutId: NodeJS.Timeout | null = null;
    let lastArgs: Parameters<T> | null = null;

    return ((...args: Parameters<T>) => {
        lastArgs = args;

        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            if (lastArgs) {
                fn(...lastArgs);
            }
            timeoutId = null;
            lastArgs = null;
        }, delay);
    }) as T;
}
