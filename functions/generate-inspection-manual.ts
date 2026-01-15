/// <reference path="../src/types/aether-functions.d.ts" />
// rotafrete/functions/generate-inspection-manual.ts
// ============================================
// ROTAFRETE - HTTP Function: Gerador Manual de Inspeções
// ============================================
// [ENTERPRISE FIX] Corrigido para usar fonte única de verdade
// para dados de usuários, garantindo consistência de IDs.
// ============================================

import { AetherFunction, getDb } from '@aether-baas/functions';

// ============================================
// TIPOS
// ============================================

interface MotoristaParaInspecao {
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
    veiculoId?: string;
    metadata?: Record<string, any>;
}

interface InspecaoVeicular {
    id: string;
    motoristaId: string;
    semanaReferencia: string;
    status: string;
    [key: string]: any;
}

// ============================================
// ITENS PADRÃO DA INSPEÇÃO
// ============================================
// [ENTERPRISE] Lista centralizada de itens que compõem uma inspeção veicular.
// Mantida aqui para consistência com o CRON job.

const ITENS_PADRAO = [
    // PNEUS
    { id: 'PNEU_DIANTEIRO_ESQ', cat: 'PNEUS', nome: 'Pneu Dianteiro Esquerdo', obrigatorio: true },
    { id: 'PNEU_DIANTEIRO_DIR', cat: 'PNEUS', nome: 'Pneu Dianteiro Direito', obrigatorio: true },
    { id: 'PNEU_TRASEIRO_ESQ', cat: 'PNEUS', nome: 'Pneu Traseiro Esquerdo', obrigatorio: true },
    { id: 'PNEU_TRASEIRO_DIR', cat: 'PNEUS', nome: 'Pneu Traseiro Direito', obrigatorio: true },
    { id: 'ESTEPE', cat: 'PNEUS', nome: 'Estepe', obrigatorio: true },
    { id: 'MACACO_CHAVE', cat: 'PNEUS', nome: 'Macaco e Chave de Roda', obrigatorio: true },
    // FREIOS
    { id: 'FREIO_DIANTEIRO', cat: 'FREIOS', nome: 'Freio Dianteiro', obrigatorio: true },
    { id: 'FREIO_TRASEIRO', cat: 'FREIOS', nome: 'Freio Traseiro', obrigatorio: true },
    { id: 'FREIO_MAO', cat: 'FREIOS', nome: 'Freio de Mão', obrigatorio: true },
    { id: 'FLUIDO_FREIO', cat: 'FREIOS', nome: 'Nível Fluido de Freio', obrigatorio: true },
    // ILUMINAÇÃO
    { id: 'FAROL_BAIXO_ESQ', cat: 'ILUMINACAO', nome: 'Farol Baixo Esquerdo', obrigatorio: true },
    { id: 'FAROL_BAIXO_DIR', cat: 'ILUMINACAO', nome: 'Farol Baixo Direito', obrigatorio: true },
    { id: 'FAROL_ALTO', cat: 'ILUMINACAO', nome: 'Farol Alto', obrigatorio: true },
    { id: 'LANTERNA_TRAS_ESQ', cat: 'ILUMINACAO', nome: 'Lanterna Traseira Esquerda', obrigatorio: true },
    { id: 'LANTERNA_TRAS_DIR', cat: 'ILUMINACAO', nome: 'Lanterna Traseira Direita', obrigatorio: true },
    { id: 'LUZ_FREIO', cat: 'ILUMINACAO', nome: 'Luz de Freio', obrigatorio: true },
    { id: 'SETAS_PISCAS', cat: 'ILUMINACAO', nome: 'Setas e Piscas', obrigatorio: true },
    { id: 'LUZ_RE', cat: 'ILUMINACAO', nome: 'Luz de Ré', obrigatorio: true },
    // VISIBILIDADE
    { id: 'PARABRISA', cat: 'VISIBILIDADE', nome: 'Parabrisa', obrigatorio: true },
    { id: 'RETROVISOR_INTERNO', cat: 'VISIBILIDADE', nome: 'Retrovisor Interno', obrigatorio: true },
    { id: 'RETROVISOR_ESQ', cat: 'VISIBILIDADE', nome: 'Retrovisor Externo Esquerdo', obrigatorio: true },
    { id: 'RETROVISOR_DIR', cat: 'VISIBILIDADE', nome: 'Retrovisor Externo Direito', obrigatorio: true },
    { id: 'LIMPADOR_PARABRISA', cat: 'VISIBILIDADE', nome: 'Limpador de Parabrisa', obrigatorio: true },
    // SEGURANÇA
    { id: 'CINTO_MOTORISTA', cat: 'SEGURANCA', nome: 'Cinto do Motorista', obrigatorio: true },
    { id: 'CINTO_PASSAGEIRO', cat: 'SEGURANCA', nome: 'Cinto do Passageiro', obrigatorio: true },
    { id: 'EXTINTOR', cat: 'SEGURANCA', nome: 'Extintor de Incêndio', obrigatorio: true },
    { id: 'TRIANGULO', cat: 'SEGURANCA', nome: 'Triângulo de Sinalização', obrigatorio: true },
    { id: 'BUZINA', cat: 'SEGURANCA', nome: 'Buzina', obrigatorio: true },
    { id: 'TRAVAS_FECHADURAS', cat: 'SEGURANCA', nome: 'Travas e Fechaduras', obrigatorio: true },
    // FLUIDOS
    { id: 'OLEO_MOTOR', cat: 'FLUIDOS', nome: 'Nível de Óleo do Motor', obrigatorio: true },
    { id: 'AGUA_ARREFECIMENTO', cat: 'FLUIDOS', nome: 'Água/Líquido de Arrefecimento', obrigatorio: true },
    { id: 'FLUIDO_DIRECAO', cat: 'FLUIDOS', nome: 'Fluido de Direção Hidráulica', obrigatorio: false },
    { id: 'BATERIA', cat: 'FLUIDOS', nome: 'Bateria', obrigatorio: true },
    { id: 'CORREIAS', cat: 'FLUIDOS', nome: 'Correias do Motor', obrigatorio: true },
    // DOCUMENTAÇÃO
    { id: 'CRLV', cat: 'DOCUMENTACAO', nome: 'CRLV em Dia', obrigatorio: true },
    { id: 'TACOGRAFO', cat: 'DOCUMENTACAO', nome: 'Tacógrafo/Registro', obrigatorio: false },
    { id: 'LIMPEZA_VEICULO', cat: 'DOCUMENTACAO', nome: 'Limpeza Geral do Veículo', obrigatorio: true },
    { id: 'COMPARTIMENTO_CARGA', cat: 'DOCUMENTACAO', nome: 'Compartimento de Carga', obrigatorio: true }
];

// ============================================
// HELPERS
// ============================================

/**
 * Calcula a semana ISO atual no formato YYYY-Www.
 * [ENTERPRISE] Usa algoritmo ISO 8601 para consistência global.
 * 
 * @param d - Data de referência (default: agora)
 * @returns String no formato "2026-W02"
 */
function getSemanaISO(d: Date = new Date()): string {
    const date = new Date(d.valueOf());
    date.setHours(0, 0, 0, 0);
    // Ajusta para quinta-feira da mesma semana (ponto de referência ISO)
    date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
    const week1 = new Date(date.getFullYear(), 0, 4);
    const weekNum = Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7) + 1;
    return `${date.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}

/**
 * Extrai o role do usuário de forma consistente.
 * [ENTERPRISE] O role pode estar em diferentes locais dependendo de como
 * o usuário foi criado. Esta função normaliza a busca.
 * 
 * @param user - Objeto do usuário
 * @returns Role normalizado ou undefined
 */
function extrairRole(user: any): string | undefined {
    // Prioridade 1: Campo role direto (mais comum)
    if (user.role && typeof user.role === 'string') {
        return user.role.toLowerCase();
    }
    // Prioridade 2: role dentro de metadata
    if (user.metadata?.role && typeof user.metadata.role === 'string') {
        return user.metadata.role.toLowerCase();
    }
    // Prioridade 3: role dentro de data (formato Aether v2)
    if (user.data?.role && typeof user.data.role === 'string') {
        return user.data.role.toLowerCase();
    }
    return undefined;
}

/**
 * Verifica se o status do usuário indica que está ativo.
 * [ENTERPRISE] Suporta diferentes padrões de status.
 * 
 * @param status - Status do usuário
 * @returns true se ativo
 */
function isUsuarioAtivo(status: string | undefined): boolean {
    if (!status) return false;
    const statusNormalizado = status.toLowerCase();
    return statusNormalizado === 'active' || statusNormalizado === 'ativo';
}

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

/**
 * REWRITE TO RESPECT GLOBAL CONFIG
 */
export const generateInspectionManual: AetherFunction = async (context) => {
    const db = getDb();

    const log = console.log;
    const semanaAtual = getSemanaISO();

    log(`🔧 [InspectionManual] Iniciando geração para semana: ${semanaAtual}`);

    try {
        // [1] FETCH GLOBAL CONFIG
        let configGlobal: any = { itensAtivos: [] }; // Default empty
        try {
            const configResult = await db.collection('config_inspecao_global').list({ limit: 1 });
            if (configResult && configResult.data && configResult.data.length > 0) {
                configGlobal = configResult.data[0];
                log(`⚙️ [Config] Configuração global carregada. ID: ${configGlobal.id}, Itens ativos: ${configGlobal.itensAtivos?.length || 0}`);
            } else {
                log(`⚠️ [Config] Nenhuma configuração global encontrada. Usando todos os itens padrão.`);
                // Fallback: activate all if no config exists (safe default)
                configGlobal.itensAtivos = ITENS_PADRAO.map(i => i.id);
            }
        } catch (e: any) {
            log(`❌ [Config] Erro ao buscar config global: ${e.message}. Criando padrão...`);

            // [SELF-HEAL] Create the missing configuration document
            try {
                const newConfig = {
                    id: 'default',
                    itensAtivos: ITENS_PADRAO.map(i => i.id),
                    updatedAt: new Date().toISOString(),
                    updatedBy: 'system-auto-heal'
                };
                // We use 'create' to force table creation if supported, or ensure doc exists
                await db.collection('config_inspecao_global').create(newConfig);
                log(`✅ [Config] Configuração padrão criada com sucesso.`);
            } catch (createError: any) {
                log(`⚠️ [Config] Falha ao criar config padrão: ${createError.message}`);
                // Proceed with memory-only fallback
            }

            configGlobal.itensAtivos = ITENS_PADRAO.map(i => i.id);
        }
        const debugInfo = {
            foundConfig: !!configGlobal.itensAtivos,
            configId: configGlobal.id,
            configSize: configGlobal.itensAtivos?.length,
            sampleItem: configGlobal.itensAtivos?.[0],
            allConfigKeys: Object.keys(configGlobal)
        };

        // [2] FILTER ITEMS BASED ON CONFIG
        const itensParaCriar = ITENS_PADRAO.filter(item => {
            // If config exists and has itensAtivos, check if item is in it
            if (configGlobal.itensAtivos && Array.isArray(configGlobal.itensAtivos)) {
                return configGlobal.itensAtivos.includes(item.id);
            }
            return true; // Default to true if no config structure
        });

        log(`📋 [InspectionManual] Itens selecionados para esta semana: ${itensParaCriar.length}`);


        // [3] BUSCAR MOTORISTAS (Reusing previous robust logic)
        log(`👥 [InspectionManual] Buscando motoristas...`);
        let allUsers: any[] = [];
        let result: { data: any[] } = await db.collection('tenant_users').list({ limit: 500 });
        allUsers = result.data || [];

        const motoristas: MotoristaParaInspecao[] = allUsers
            .filter(user => {
                const role = extrairRole(user);
                const isExplicitMotorista = role === 'motorista' || role === 'driver';
                const isDefaultRole = !role || role === 'client' || role.trim() === '';
                const isAdmin = role === 'admin';
                const isMotoristaCandadate = (isExplicitMotorista || isDefaultRole) && !isAdmin;
                const isAtivo = isUsuarioAtivo(user.status);
                return isMotoristaCandadate && isAtivo;
            })
            .map(user => ({
                id: user.id,
                email: user.email || '',
                name: user.name || user.email?.split('@')[0] || 'Motorista',
                role: extrairRole(user) || 'motorista',
                status: user.status || 'active',
                veiculoId: user.metadata?.veiculoId || user.data?.veiculoId,
                metadata: user.metadata || user.data || {}
            }));

        if (motoristas.length === 0) {
            return { success: false, error: 'Nenhum motorista ativo encontrado.' };
        }

        // [4] PROCESS
        let criadas = 0;
        let jaExistentes = 0;
        const detalhes: any[] = [];

        for (const motorista of motoristas) {
            try {
                // Check existing
                const existingResult = await db.collection('inspecoes_veiculares').list({
                    filter: { motoristaId: motorista.id, semanaReferencia: semanaAtual },
                    limit: 1
                });

                let existingId = null;
                if (existingResult.data && existingResult.data.length > 0) {
                    existingId = existingResult.data[0].id;
                }

                if (existingId) {
                    if (context.data.force === true) {
                        log(`   ⚠️ [FORCE] Deletando inspeção anterior ${existingId} para ${motorista.email}`);

                        // [CRITICAL] Delete OLD items first to prevent orphans
                        const itensAntigos = await db.collection('itens_inspecao').list({
                            filter: { inspecaoId: existingId },
                            limit: 100 // Should cover all
                        });

                        if (itensAntigos.data && itensAntigos.data.length > 0) {
                            // Delete sequentially to avoid rate limits if many
                            for (const item of itensAntigos.data) {
                                await db.collection('itens_inspecao').delete(item.id);
                            }
                        }

                        // Delete the inspection itself
                        await db.collection('inspecoes_veiculares').delete(existingId);
                    } else {
                        jaExistentes++;
                        detalhes.push({ motorista: motorista.email, resultado: 'JÁ_EXISTE' });
                        continue;
                    }
                }

                // Create Header
                const dataLimite = new Date();
                dataLimite.setDate(dataLimite.getDate() + 5);

                const novaInspecao = await db.collection('inspecoes_veiculares').create({
                    motoristaId: motorista.id,
                    userId: motorista.id,
                    motorista: { id: motorista.id, nome: motorista.name, email: motorista.email },
                    veiculoId: motorista.veiculoId || null,
                    semanaReferencia: semanaAtual,
                    status: 'PENDENTE',
                    dataInicio: new Date().toISOString(),
                    dataLimite: dataLimite.toISOString(),
                    dataLimiteEnvio: dataLimite.toISOString(),
                    totalItens: itensParaCriar.length, // [FIX] Use filtered length
                    itensEnviados: 0,
                    itensAprovados: 0,
                    itensReprovados: 0,
                    itensAtencao: 0,
                    itensCriticos: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    criadoPor: 'system:manual-generation'
                });

                // Create Items (Filtered)
                const CHUNK_SIZE = 10;
                for (let i = 0; i < itensParaCriar.length; i += CHUNK_SIZE) {
                    const chunk = itensParaCriar.slice(i, i + CHUNK_SIZE);
                    await Promise.all(chunk.map(modeloItem =>
                        db.collection('itens_inspecao').create({
                            inspecaoId: novaInspecao.id,
                            motoristaId: motorista.id,
                            semanaReferencia: semanaAtual,
                            categoria: modeloItem.cat,
                            itemId: modeloItem.id,
                            nomeExibicao: modeloItem.nome,
                            obrigatorio: modeloItem.obrigatorio,
                            status: 'PENDENTE',
                            statusAvaliacao: 'PENDENTE',
                            statusResolucao: null,
                            fotos: [],
                            observacao: null,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        })
                    ));
                }

                criadas++;
                detalhes.push({ motorista: motorista.email, resultado: 'CRIADA' });

            } catch (err: any) {
                log(`Erro processando motorista ${motorista.email}: ${err.message}`);
            }
        }

        return {
            success: true,
            summary: {
                totalActiveDrivers: motoristas.length,
                created: criadas,
                alreadyExisted: jaExistentes,
                week: semanaAtual,
                activeItemsCount: itensParaCriar.length,
                debug: debugInfo
            },
            details: detalhes
        };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export default generateInspectionManual;

// ============================================
// CONFIGURAÇÃO DE DEPLOY
// ============================================

export const config = {
    type: 'http',
    description: 'Trigger manual para gerar inspeções da semana atual',
    public: false // Requer autenticação do Admin
};