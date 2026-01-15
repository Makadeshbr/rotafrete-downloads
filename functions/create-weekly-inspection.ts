/// <reference path="../src/types/aether-functions.d.ts" />
// rotafrete/functions/create-weekly-inspection.ts
// ============================================
// ROTAFRETE - Aether Cron Function: Gerador de Inspeção Semanal
// ============================================
// [FIX v2.0] Corrigido:
// - Campos motoristaId e semanaReferencia nos itens
// - Filtro de motoristas inclusivo
// - Performance com Promise.all em chunks
// ============================================

import { AetherFunction, getDb, getPush } from '@aether-baas/functions';

// ============================================
// ITENS PADRÃO
// ============================================

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
 */
function getSemanaISO(d: Date = new Date()): string {
    const date = new Date(d.valueOf());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
    const week1 = new Date(date.getFullYear(), 0, 4);
    const weekNum = Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7) + 1;
    return `${date.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}

/**
 * Extrai o role do usuário de forma consistente.
 * [FIX] O role pode estar em diferentes locais.
 */
function extrairRole(user: any): string | undefined {
    if (user.role && typeof user.role === 'string') {
        return user.role.toLowerCase();
    }
    if (user.metadata?.role && typeof user.metadata.role === 'string') {
        return user.metadata.role.toLowerCase();
    }
    if (user.data?.role && typeof user.data.role === 'string') {
        return user.data.role.toLowerCase();
    }
    return undefined;
}

/**
 * Verifica se o status indica usuário ativo.
 * [FIX] Aceita 'active' (inglês) e 'ativo' (português).
 */
function isUsuarioAtivo(status: string | undefined): boolean {
    if (!status) return false;
    const s = status.toLowerCase();
    return s === 'active' || s === 'ativo';
}

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

export const createWeeklyInspection: AetherFunction = async (context) => {
    const db = getDb();
    const log = console.log;
    const semanaAtual = getSemanaISO();

    log(`🚀 [WeeklyInspection] Iniciando para semana: ${semanaAtual}`);
    log(`📅 [WeeklyInspection] Data/hora: ${new Date().toISOString()}`);

    try {
        // ============================================
        // 1. BUSCA TODOS OS USUÁRIOS
        // ============================================
        // [FIX] Busca sem filtro e filtra localmente para lógica inclusiva

        const usersResult = await db.collection('tenant_users').list({
            limit: 500
        });

        const allUsers = usersResult.data || [];
        log(`👥 [WeeklyInspection] Total usuários no sistema: ${allUsers.length}`);

        // ============================================
        // 2. FILTRA MOTORISTAS ATIVOS
        // ============================================
        // [FIX] Lógica inclusiva igual à função manual

        const motoristas = allUsers.filter((user: any) => {
            const role = extrairRole(user);

            // Aceita: motorista, driver, client, ou sem role (exclui apenas admin)
            const isMotoristaCandidate =
                role === 'motorista' ||
                role === 'driver' ||
                role === 'client' ||
                !role;

            const isAdmin = role === 'admin';
            const isAtivo = isUsuarioAtivo(user.status);

            return isMotoristaCandidate && !isAdmin && isAtivo;
        });

        log(`🚗 [WeeklyInspection] Motoristas ativos filtrados: ${motoristas.length}`);

        if (motoristas.length === 0) {
            return {
                success: true,
                message: 'Nenhum motorista ativo encontrado',
                debug: {
                    totalUsuarios: allUsers.length,
                    semana: semanaAtual
                }
            };
        }

        // ============================================
        // 3. CRIA INSPEÇÕES
        // ============================================

        let criadas = 0;
        let jaExistentes = 0;
        const erros: string[] = [];

        for (const driver of motoristas) {
            try {
                // 3.1 Verifica duplicidade
                const existingResult = await db.collection('inspecoes_veiculares').list({
                    filter: {
                        motoristaId: driver.id,
                        semanaReferencia: semanaAtual
                    },
                    limit: 1
                });

                if (existingResult.data && existingResult.data.length > 0) {
                    jaExistentes++;
                    continue;
                }

                // 3.2 Calcula data limite (+5 dias)
                const dataLimite = new Date();
                dataLimite.setDate(dataLimite.getDate() + 5);
                const now = new Date().toISOString();

                // 3.3 Cria Inspeção
                const novaInspecao = await db.collection('inspecoes_veiculares').create({
                    // IDs
                    motoristaId: driver.id,
                    userId: driver.id,

                    // Dados do motorista (snapshot)
                    motorista: {
                        id: driver.id,
                        nome: driver.name || driver.email?.split('@')[0] || 'Motorista',
                        email: driver.email || ''
                    },

                    // Referências
                    veiculoId: driver.metadata?.veiculoId || driver.veiculoId || null,
                    semanaReferencia: semanaAtual,

                    // Status
                    status: 'PENDENTE',

                    // Datas
                    dataInicio: now,
                    dataLimite: dataLimite.toISOString(),
                    dataLimiteEnvio: dataLimite.toISOString(),

                    // Contadores
                    totalItens: ITENS_PADRAO.length,
                    itensEnviados: 0,
                    itensAprovados: 0,
                    itensReprovados: 0,
                    itensAtencao: 0,
                    itensCriticos: 0,

                    // Auditoria
                    createdAt: now,
                    updatedAt: now,
                    criadoPor: 'system:cron-weekly'
                });

                // 3.4 Cria Itens em chunks para performance
                // [FIX CRÍTICO] Incluir motoristaId e semanaReferencia!
                const CHUNK_SIZE = 10;
                for (let i = 0; i < ITENS_PADRAO.length; i += CHUNK_SIZE) {
                    const chunk = ITENS_PADRAO.slice(i, i + CHUNK_SIZE);
                    await Promise.all(chunk.map(modeloItem =>
                        db.collection('itens_inspecao').create({
                            // IDs - CRÍTICO!
                            inspecaoId: novaInspecao.id,
                            motoristaId: driver.id,          // ← FIX: Campo obrigatório!
                            semanaReferencia: semanaAtual,   // ← FIX: Campo obrigatório!

                            // Dados do item
                            categoria: modeloItem.cat,
                            itemId: modeloItem.id,
                            nomeExibicao: modeloItem.nome,
                            obrigatorio: modeloItem.obrigatorio,

                            // Status
                            status: 'PENDENTE',
                            statusAvaliacao: 'PENDENTE',
                            statusResolucao: null,
                            requerReenvio: false,

                            // Fotos
                            fotoUrl: null,
                            fotoThumbnailUrl: null,
                            fotoMetadata: null,

                            // Observações
                            observacao: null,
                            observacaoAvaliador: null,

                            // Auditoria
                            createdAt: now,
                            updatedAt: now
                        })
                    ));
                }

                criadas++;
                log(`✅ [WeeklyInspection] Criada para ${driver.name || driver.email}`);

                // [CORRIGIDO] Verifica preferências antes de enviar push
                try {
                    // Busca configurações de notificação do motorista
                    const settingsResult = await db.collection('notification_settings').list({
                        filter: { motoristaId: driver.id },
                        limit: 1,
                    });
                    const settings = settingsResult.data?.[0];

                    // Só envia push se notificações estiverem ativas (ou se não tiver config = default ativo)
                    const notificacoesAtivas = settings?.notificacoesAtivas !== false;

                    // Verifica silenciamento temporário
                    let estaSilenciado = false;
                    if (settings?.silenciadoAte) {
                        estaSilenciado = new Date(settings.silenciadoAte) > new Date();
                    }

                    if (!notificacoesAtivas) {
                        log(`🔕 [WeeklyInspection] Notificações desativadas para ${driver.name || driver.email}`);
                    } else if (estaSilenciado) {
                        log(`🔇 [WeeklyInspection] Motorista ${driver.name || driver.email} está silenciado`);
                    } else {
                        // Envia push notification
                        const push = getPush();
                        await push.send({
                            userId: driver.id,
                            title: '📝 Nova Inspeção Semanal',
                            body: `Sua inspeção da semana ${semanaAtual} está disponível. Envie as fotos até ${dataLimite.toLocaleDateString('pt-BR')}.`,
                            data: {
                                type: 'nova_inspecao',
                                inspecaoId: novaInspecao.id,
                                semana: semanaAtual,
                            },
                        });
                        log(`📤 [WeeklyInspection] Notificação enviada para ${driver.name || driver.email}`);
                    }
                } catch (pushErr: any) {
                    log(`⚠️ [WeeklyInspection] Falha ao notificar ${driver.id}: ${pushErr.message}`);
                }

            } catch (err: any) {
                const msg = `Erro para ${driver.id}: ${err.message}`;
                log(`❌ [WeeklyInspection] ${msg}`);
                erros.push(msg);
            }
        }

        // ============================================
        // 4. RESULTADO
        // ============================================

        log(`📊 [WeeklyInspection] Resumo:`);
        log(`   - Motoristas: ${motoristas.length}`);
        log(`   - Criadas: ${criadas}`);
        log(`   - Já existiam: ${jaExistentes}`);
        log(`   - Erros: ${erros.length}`);

        return {
            success: true,
            resumo: {
                semana: semanaAtual,
                totalMotoristas: motoristas.length,
                criadas,
                jaExistiam: jaExistentes,
                erros: erros.length > 0 ? erros : undefined
            }
        };

    } catch (error: any) {
        log(`❌ [WeeklyInspection] Erro fatal: ${error.message}`);
        return { success: false, error: error.message };
    }
};

export default createWeeklyInspection;

// ============================================
// CONFIGURAÇÃO DO TRIGGER
// ============================================

export const config = {
    type: 'cron',
    schedule: '0 8 * * 1', // Segunda-feira às 08:00
    description: 'Gera inspeções semanais para motoristas ativos',
    timezone: 'America/Sao_Paulo'
};