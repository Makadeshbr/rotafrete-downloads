// src/services/sdk.ts
// ============================================
// ROTAFRETE - Configuração do SDK Aether
// ============================================
// CORREÇÃO: Nomenclatura clara e sem hardcode de credenciais.
// ============================================

/**
 * Configuração do Aether SDK.
 * 
 * IMPORTANTE: 
 * - Nunca commite valores reais no código
 * - Use sempre variáveis de ambiente
 * - Em produção, configure via CI/CD ou .env
 */
export const AETHER_CONFIG = {
    /**
     * URL base da API Aether.
     * Em produção: URL do Railway/Vercel
     * Em desenvolvimento: http://localhost:3000
     */
    baseUrl: process.env.EXPO_PUBLIC_AETHER_API_URL,

    /**
     * ID do projeto Aether (usado para identificar o tenant).
     * Este NÃO é um segredo, é um identificador público.
     */
    projectId: process.env.EXPO_PUBLIC_AETHER_PROJECT_ID,
} as const;

// Validação em runtime para evitar deploy com config faltando
if (!AETHER_CONFIG.baseUrl) {
    console.error(
        '[SDK] ❌ EXPO_PUBLIC_AETHER_API_URL não definida. ' +
        'Configure no .env ou nas variáveis de ambiente.'
    );
}

if (!AETHER_CONFIG.projectId) {
    console.error(
        '[SDK] ❌ EXPO_PUBLIC_AETHER_PROJECT_ID não definida. ' +
        'Configure no .env ou nas variáveis de ambiente.'
    );
}

// Re-exports para conveniência
export {
    getAetherClient,
    isAetherClientReady,
    getDb,
    getAuth,
    getStorage,
    getFunctions,
    getAI,
} from '@aether-baas/react-native';

export default AETHER_CONFIG;
