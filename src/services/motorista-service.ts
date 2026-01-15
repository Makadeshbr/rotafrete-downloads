// src/services/motorista-service.ts
// ============================================
// ROTAFRETE - Serviço de Perfil de Motoristas
// ============================================
// Gerencia a coleção 'motoristas' que armazena
// os dados de perfil dos usuários (separado do Auth).
// Padrão profissional igual ao Firebase.
// ============================================

import { getDb } from '@aether-baas/react-native';
import { createLogger } from '@/utils/logger';

const logger = createLogger('MotoristaService');
const COLLECTION_MOTORISTAS = 'motoristas';

// ============================================
// TIPOS
// ============================================

export interface MotoristaProfile {
    id: string;
    /** UID do usuário no Auth */
    userId: string;
    /** Nome completo */
    nome: string;
    /** Email */
    email: string;
    /** Telefone */
    telefone?: string;
    /** Foto de perfil URL */
    fotoUrl?: string;
    /** Tipo de veículo */
    tipoVeiculo?: 'PASSEIO' | 'UTILITARIO' | 'VAN' | 'VUC' | 'CAMINHAO_LEVE' | 'CAMINHAO_MEDIO' | 'CAMINHAO_PESADO';
    /** Placa do veículo */
    placaVeiculo?: string;
    /** Modelo do veículo */
    modeloVeiculo?: string;
    /** Role do usuário */
    role: 'motorista' | 'admin';
    /** Status do motorista */
    status: 'ativo' | 'inativo' | 'suspenso';
    /** Data de cadastro */
    createdAt: string;
    /** Última atualização */
    updatedAt: string;
    /** Último login */
    lastLoginAt?: string;
}

export type CriarMotoristaInput = Omit<MotoristaProfile, 'id' | 'createdAt' | 'updatedAt' | 'lastLoginAt'>;

export type AtualizarMotoristaInput = Partial<Omit<MotoristaProfile, 'id' | 'userId' | 'createdAt'>>;

// ============================================
// SERVIÇO
// ============================================

export const motoristaService = {
    /**
     * Cria um novo perfil de motorista após registro.
     * Deve ser chamado logo após o signUp.
     */
    async criarPerfil(input: CriarMotoristaInput): Promise<MotoristaProfile> {
        try {
            const db = getDb();
            const agora = new Date().toISOString();

            const perfil = {
                ...input,
                createdAt: agora,
                updatedAt: agora,
            };

            // Usa o userId como ID do documento (facilita busca)
            const result = await db.collection(COLLECTION_MOTORISTAS).create({
                ...perfil,
                id: input.userId,
            });

            logger.info('Perfil de motorista criado', { userId: input.userId });

            return {
                ...perfil,
                id: result.id || input.userId,
            } as MotoristaProfile;
        } catch (error) {
            logger.error('Erro ao criar perfil de motorista', error);
            throw error;
        }
    },

    /**
     * Busca perfil de um motorista pelo userId.
     */
    async buscarPorUserId(userId: string): Promise<MotoristaProfile | null> {
        try {
            const db = getDb();

            // Tenta buscar pelo ID do documento (que é o userId)
            try {
                const result = await db.collection(COLLECTION_MOTORISTAS).get(userId);
                if (result) {
                    return result as unknown as MotoristaProfile;
                }
            } catch (getError: any) {
                // Se for 404, ignora e tenta fallback. Se for outro erro, lança.
                // Verificações comuns de "not found" em SDKs
                const isNotFound =
                    getError?.status === 404 ||
                    getError?.code === 'NOT_FOUND' ||
                    getError?.message?.toLowerCase?.().includes('not found');

                if (!isNotFound) {
                    throw getError;
                }
            }

            // Fallback: busca por filter (caso ID não bata ou estratégia mude)
            const listResult = await db.collection(COLLECTION_MOTORISTAS).list({
                filter: { userId },
                limit: 1,
            }) as any;

            if (listResult && listResult.items && listResult.items.length > 0) {
                return listResult.items[0] as unknown as MotoristaProfile;
            } else if (Array.isArray(listResult) && listResult.length > 0) {
                // Suporte a legacy return type se houver
                return listResult[0] as unknown as MotoristaProfile;
            }

            return null;
        } catch (error) {
            logger.warn('Erro ao buscar perfil:', error);
            // Se chegou aqui, é erro real ou 404 do list
            return null;
        }
    },

    /**
     * Atualiza perfil de um motorista.
     */
    async atualizarPerfil(userId: string, dados: AtualizarMotoristaInput): Promise<MotoristaProfile> {
        try {
            const db = getDb();

            const atualizado = {
                ...dados,
                updatedAt: new Date().toISOString(),
            };

            await db.collection(COLLECTION_MOTORISTAS).update(userId, atualizado);

            const perfil = await this.buscarPorUserId(userId);
            if (!perfil) {
                throw new Error('Perfil não encontrado após atualização');
            }

            logger.info('Perfil atualizado', { userId });
            return perfil;
        } catch (error) {
            logger.error('Erro ao atualizar perfil', error);
            throw error;
        }
    },

    /**
     * Registra último login do motorista.
     */
    async registrarLogin(userId: string): Promise<void> {
        try {
            const db = getDb();
            await db.collection(COLLECTION_MOTORISTAS).update(userId, {
                lastLoginAt: new Date().toISOString(),
            });
        } catch (error) {
            // Erro silencioso - não crítico
            logger.warn('Erro ao registrar login', error);
        }
    },

    /**
     * Lista todos os motoristas (apenas para admin).
     * Usa o SDK AdminModule para buscar usuários.
     */
    async listarTodos(): Promise<MotoristaProfile[]> {
        try {
            // Primeiro tenta buscar da coleção 'motoristas'
            const db = getDb();
            let result = await db.collection(COLLECTION_MOTORISTAS).list({
                limit: 100,
            }) as any;

            let motoristas = (result || []) as unknown as MotoristaProfile[];

            // Se coleção motoristas tem dados, retorna
            if (motoristas.length > 0) {
                logger.debug('Motoristas encontrados na coleção motoristas', { total: motoristas.length });
                return motoristas.filter(m => m.role !== 'admin');
            }

            // Fallback: usa SDK AdminModule para buscar tenant users
            logger.debug('Coleção motoristas vazia, usando SDK getAdmin().listUsers()');

            // Importa getAdmin, getAuth e getAetherClient do SDK
            const { getAdmin, getAetherClient } = await import('@aether-baas/react-native');

            // Obtém o token do cliente
            const client = getAetherClient();
            const token = client.getToken();

            if (!token) {
                logger.warn('Token não disponível - usuário não autenticado');
                return [];
            }

            // Configura o módulo admin com o token
            const admin = getAdmin();
            admin.setAccessToken(token);

            try {
                // Usa o SDK para listar usuários
                const result = await admin.listUsers({ limit: 100 });

                // Mapeia os usuários da API para MotoristaProfile
                motoristas = result.users
                    .filter(u => u.role !== 'admin' && !u.email?.includes('@rotafrete.admin'))
                    .map(user => ({
                        id: user.id,
                        userId: user.id,
                        nome: user.name || user.email?.split('@')[0] || 'Motorista',
                        email: user.email,
                        telefone: user.phone || (user.metadata as any)?.telefone,
                        fotoUrl: user.avatarUrl || (user.metadata as any)?.avatarUrl,
                        tipoVeiculo: (user.metadata as any)?.tipoVeiculo || 'UTILITARIO',
                        placaVeiculo: (user.metadata as any)?.placaVeiculo || '',
                        modeloVeiculo: (user.metadata as any)?.modeloVeiculo || '',
                        role: (user.role as 'motorista' | 'admin') || 'motorista',
                        status: user.status === 'active' ? 'ativo' as const : 'inativo' as const,
                        createdAt: user.createdAt,
                        updatedAt: user.updatedAt || user.createdAt,
                    }));

                logger.debug('Motoristas carregados via SDK AdminModule', { total: motoristas.length });
                return motoristas;
            } catch (adminError) {
                logger.warn('Erro ao usar AdminModule, endpoint pode não existir ainda', adminError);
                return [];
            }
        } catch (error) {
            logger.error('Erro ao listar motoristas', error);
            throw error;
        }
    },

    /**
     * Lista motoristas ativos (para admin).
     */
    async listarAtivos(): Promise<MotoristaProfile[]> {
        try {
            const db = getDb();
            const result = await db.collection(COLLECTION_MOTORISTAS).list({
                filter: { role: 'motorista', status: 'ativo' },
                limit: 100,
            }) as any;

            return (result || []) as unknown as MotoristaProfile[];
        } catch (error) {
            logger.error('Erro ao listar motoristas ativos', error);
            throw error;
        }
    },

    /**
     * Conta total de motoristas.
     */
    async contarTodos(): Promise<number> {
        try {
            const motoristas = await this.listarTodos();
            return motoristas.length;
        } catch (error) {
            logger.error('Erro ao contar motoristas', error);
            return 0;
        }
    },

    /**
     * Verifica se perfil existe para userId.
     */
    async perfilExiste(userId: string): Promise<boolean> {
        const perfil = await this.buscarPorUserId(userId);
        return perfil !== null;
    },
};

export default motoristaService;
