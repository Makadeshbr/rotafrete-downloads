// app/(tabs)/assistant.tsx
// ============================================
// ROTAFRETE - Assistente Virtual IA INTELIGENTE
// ============================================
// [v2.0] IA com acesso aos dados REAIS do usuário
// Usa mesma lógica de cálculo que a tela inicial
// ============================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bot, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useAuth, getDb } from '@aether-baas/react-native';
import { PageWrapper } from '@/components/ui';
import { MessageBubble, ChatInput, QuickActions, type ChatMessage } from '@/components/chat';

import { VEICULOS, formatarMoeda, PARTES_VEICULO, type TipoVeiculo, type ParteVeiculo, type StatusManutencao } from '@/constants';
import { LottieAnimation } from '@/components/lottie'; // [LOTTIE] Import

// ============================================
// TIPOS DOS DADOS
// ============================================

interface DadosUsuario {
    nome: string;
    email: string;
    telefone?: string;
    tipoVeiculo: string;
    placaVeiculo?: string;
    modeloVeiculo?: string;
    turnoPreferido: string;
}

interface ResumoFinanceiro {
    totalRotas: number;
    kmRodados: number;
    ganhosBrutos: number;
    gastosAbastecimento: number;
    gastosPedagio: number;
    gastosManutencao: number;
    lucroLiquido: number;
    mediaConsumo: number;
    mediaGanhoRota: number;
    periodoInicio: string;
    periodoFim: string;
}

interface ItemManutencao {
    nome: string;
    status: StatusManutencao;
    parteVeiculo: ParteVeiculo;
}

// ============================================
// CONSTANTES
// ============================================

const WELCOME_MESSAGE: ChatMessage = {
    id: 'welcome',
    role: 'assistant',
    content: 'Olá! 👋 Sou seu assistente RotaFrete com acesso aos seus dados em tempo real!\n\nPosso responder sobre seus gastos, consumo, rotas, manutenção e muito mais. Pergunte algo!',
    timestamp: new Date(),
};

// ============================================
// FUNÇÕES DE CÁLCULO (MESMA LÓGICA DA TELA INICIAL)
// ============================================

/**
 * Calcula início e fim da semana de trabalho
 * Semana: Sexta (5) a Quinta (4) - mesma lógica do useResumoFinanceiroStore
 */
function calcularPeriodoSemana(dataReferencia: Date): { inicio: Date; fim: Date } {
    const diaSemana = dataReferencia.getDay();
    let inicioSemana: Date;
    let fimSemana: Date;

    if (diaSemana === 4) {
        // É quinta - fim da semana atual
        fimSemana = new Date(dataReferencia);
        inicioSemana = new Date(dataReferencia);
        inicioSemana.setDate(inicioSemana.getDate() - 6);
    } else if (diaSemana === 5) {
        // É sexta - início da semana nova
        inicioSemana = new Date(dataReferencia);
        fimSemana = new Date(dataReferencia);
        fimSemana.setDate(fimSemana.getDate() + 6);
    } else if (diaSemana === 6) {
        // Sábado
        inicioSemana = new Date(dataReferencia);
        inicioSemana.setDate(inicioSemana.getDate() - 1);
        fimSemana = new Date(inicioSemana);
        fimSemana.setDate(fimSemana.getDate() + 6);
    } else {
        // Domingo a Quarta
        inicioSemana = new Date(dataReferencia);
        const diasAteSexta = diaSemana === 0 ? 2 : (diaSemana + 2);
        inicioSemana.setDate(inicioSemana.getDate() - diasAteSexta);
        fimSemana = new Date(inicioSemana);
        fimSemana.setDate(fimSemana.getDate() + 6);
    }

    return { inicio: inicioSemana, fim: fimSemana };
}

/**
 * Busca dados do usuário
 */
function getDadosUsuario(user: any): DadosUsuario {
    const metadata = user?.metadata as any;
    const tipoVeiculoId = (metadata?.tipoVeiculo || 'UTILITARIO') as TipoVeiculo;
    const veiculoConfig = VEICULOS.find(v => v.id === tipoVeiculoId);

    return {
        nome: user?.name || 'Motorista',
        email: user?.email || '',
        telefone: user?.phone || metadata?.telefone,
        tipoVeiculo: veiculoConfig?.nome || 'Utilitário',
        placaVeiculo: metadata?.placaVeiculo,
        modeloVeiculo: metadata?.modeloVeiculo,
        turnoPreferido: metadata?.turnoPreferido === 'AM' ? 'Manhã' : 'Tarde',
    };
}

/**
 * Busca resumo financeiro da semana (Sexta-Quinta)
 * Mesma lógica do useResumoFinanceiroStore
 */
async function getResumoSemana(userId: string): Promise<ResumoFinanceiro> {
    const db = getDb();
    const hoje = new Date();
    const { inicio, fim } = calcularPeriodoSemana(hoje);

    const inicioStr = format(inicio, 'yyyy-MM-dd');
    const fimStr = format(fim, 'yyyy-MM-dd');

    // Normalizar datas para comparação robusta
    const inicioNorm = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
    const fimNorm = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate(), 23, 59, 59);

    console.log('[Assistant] Buscando semana:', inicioStr, 'a', fimStr);

    try {
        // Buscar rotas e despesas (unificadas)
        const [rotas, despesas] = await Promise.all([
            db.collection('rotas').list({ filter: { motoristaId: userId } }),
            db.collection('despesas').list({ filter: { motoristaId: userId } }),
        ]);

        console.log(`[Assistant] Encontrados: ${rotas.length} rotas, ${despesas.length} despesas`);

        // Helper para validar data
        const validarData = (item: any): boolean => {
            const raws = [item.data, item.createdAt].filter(Boolean);
            if (raws.length === 0) return false;
            try {
                const dDate = parseISO(raws[0]);
                const dDateNorm = new Date(dDate.getFullYear(), dDate.getMonth(), dDate.getDate());
                return dDateNorm >= inicioNorm && dDateNorm <= fimNorm;
            } catch {
                return false;
            }
        };

        // Filtrar por período
        const rotasSemana = rotas.filter(validarData);
        const despesasSemana = despesas.filter(validarData);

        // Debug
        if (despesasSemana.length > 0) {
            console.log('[Assistant] Exemplo despesa semana:', despesasSemana[0]);
        }

        // Calcular totais das rotas
        const kmRodados = rotasSemana.reduce((sum: number, r: any) => sum + (r.kmRodados || 0), 0);
        const ganhosBrutos = rotasSemana.reduce((sum: number, r: any) => sum + (r.valorFrete || 0), 0);

        // Calcular totais das despesas por tipo
        const gastosAbastecimento = despesasSemana
            .filter((d: any) => d.tipo === 'COMBUSTIVEL')
            .reduce((sum: number, d: any) => sum + (d.valor || 0), 0);

        const gastosPedagio = despesasSemana
            .filter((d: any) => d.tipo === 'PEDAGIO')
            .reduce((sum: number, d: any) => sum + (d.valor || 0), 0);

        const gastosManutencao = despesasSemana
            .filter((d: any) => d.tipo === 'MANUTENCAO')
            .reduce((sum: number, d: any) => sum + (d.valor || 0), 0);

        // Litros (apenas se houver campo litros em despesas de COMBUSTIVEL, caso contrário estimar ou ignorar)
        // Como o novo model Despesa não garante 'litros', vamos ignorar ou adaptar se necessário.
        // Para média de consumo, precisariamos dos litros. Se não tiver, retornamos 0.
        const litrosAbastecidos = despesasSemana
            .filter((d: any) => d.tipo === 'COMBUSTIVEL')
            .reduce((sum: number, d: any) => sum + (d.litros || 0), 0); // Assumindo que o campo litros pode existir extras e.g. em 'descricao' ou metadados, ou foi migrado. Se não, média será 0.

        const mediaConsumo = litrosAbastecidos > 0 ? kmRodados / litrosAbastecidos : 0;
        const totalDespesas = gastosAbastecimento + gastosPedagio + gastosManutencao;

        console.log('[Assistant] Resumo calculado:', {
            rotas: rotasSemana.length,
            bruto: ganhosBrutos,
            despesas: totalDespesas
        });

        return {
            totalRotas: rotasSemana.length,
            kmRodados,
            ganhosBrutos,
            gastosAbastecimento,
            gastosPedagio,
            gastosManutencao,
            lucroLiquido: ganhosBrutos - totalDespesas,
            mediaConsumo,
            mediaGanhoRota: rotasSemana.length > 0 ? ganhosBrutos / rotasSemana.length : 0,
            periodoInicio: format(inicio, 'dd/MM', { locale: ptBR }),
            periodoFim: format(fim, 'dd/MM', { locale: ptBR }),
        };
    } catch (error) {
        console.error('[Assistant] Erro ao buscar resumo:', error);
        return {
            totalRotas: 0, kmRodados: 0, ganhosBrutos: 0,
            gastosAbastecimento: 0, gastosPedagio: 0, gastosManutencao: 0,
            lucroLiquido: 0, mediaConsumo: 0, mediaGanhoRota: 0,
            periodoInicio: '', periodoFim: '',
        };
    }
}

/**
 * Busca status de manutenção do veículo
 * Mesma lógica do useManutencaoStore
 */
async function getStatusManutencao(userId: string): Promise<{ urgentes: ItemManutencao[]; atencao: ItemManutencao[] }> {
    const db = getDb();

    try {
        const statusList = await db.collection('status_veiculo').list({
            filter: { motoristaId: userId },
        });

        console.log('[Assistant] Status encontrados:', statusList.length);

        const itens: ItemManutencao[] = statusList.map((item: any) => {
            const parteKey = item.parteVeiculo as ParteVeiculo;
            const parteInfo = PARTES_VEICULO.find(p => p.id === parteKey);
            return {
                parteVeiculo: parteKey,
                status: item.status,
                nome: parteInfo?.nome || item.parteVeiculo,
            };
        });

        return {
            urgentes: itens.filter(i => i.status === 'URGENTE'),
            atencao: itens.filter(i => i.status === 'ATENCAO'),
        };
    } catch (error) {
        console.error('[Assistant] Erro ao buscar manutenção:', error);
        return { urgentes: [], atencao: [] };
    }
}

// ============================================
// GERADOR DE RESPOSTAS INTELIGENTE
// ============================================

async function gerarRespostaInteligente(
    pergunta: string,
    dadosUsuario: DadosUsuario,
    userId: string
): Promise<string> {
    const lowerPergunta = pergunta.toLowerCase();

    // ============== GASTOS DA SEMANA ==============
    if (lowerPergunta.includes('gast') && lowerPergunta.includes('semana')) {
        const resumo = await getResumoSemana(userId);

        if (resumo.totalRotas === 0) {
            return `📊 ${dadosUsuario.nome.split(' ')[0]}, você não registrou nenhuma rota esta semana (${resumo.periodoInicio} a ${resumo.periodoFim}).\n\nComece registrando suas viagens!`;
        }

        const totalGastos = resumo.gastosAbastecimento + resumo.gastosPedagio + resumo.gastosManutencao;

        return `📊 **Semana ${resumo.periodoInicio} a ${resumo.periodoFim}, ${dadosUsuario.nome.split(' ')[0]}:**\n
💰 **Ganho Bruto: ${formatarMoeda(resumo.ganhosBrutos)}**

**Despesas:**
⛽ Combustível: ${formatarMoeda(resumo.gastosAbastecimento)}
🛣️ Pedágios: ${formatarMoeda(resumo.gastosPedagio)}
🔧 Manutenção: ${formatarMoeda(resumo.gastosManutencao)}
━━━━━━━━━━━━━━━━━━
� **Total Despesas: ${formatarMoeda(totalGastos)}**

✅ **Lucro Líquido: ${formatarMoeda(resumo.lucroLiquido)}**

📈 ${resumo.totalRotas} rota${resumo.totalRotas > 1 ? 's' : ''} • ${resumo.kmRodados.toFixed(0)} km`;
    }

    // ============== MÉDIA DE CONSUMO ==============
    if (lowerPergunta.includes('consumo') || lowerPergunta.includes('média') || lowerPergunta.includes('km/l')) {
        const resumo = await getResumoSemana(userId);

        if (resumo.mediaConsumo === 0) {
            return `⛽ ${dadosUsuario.nome.split(' ')[0]}, ainda não há dados suficientes para calcular sua média de consumo.\n\nRegistre seus abastecimentos!`;
        }

        const eficiencia = resumo.mediaConsumo >= 10 ? '✅ Excelente!' :
            resumo.mediaConsumo >= 7 ? '👍 Boa!' : '⚠️ Pode melhorar!';

        return `⛽ **Média de consumo, ${dadosUsuario.nome.split(' ')[0]}:**\n
🚗 Veículo: **${dadosUsuario.tipoVeiculo}** ${dadosUsuario.placaVeiculo ? `(${dadosUsuario.placaVeiculo})` : ''}
📊 Média: **${resumo.mediaConsumo.toFixed(1)} km/l** ${eficiencia}
🛣️ KM rodados: **${resumo.kmRodados.toFixed(0)} km**

💡 **Dicas:**
• Velocidade constante
• Pneus calibrados
• Evite acelerações bruscas`;
    }

    // ============== ROTAS DO MÊS ==============
    if (lowerPergunta.includes('rota') && (lowerPergunta.includes('mês') || lowerPergunta.includes('fiz'))) {
        const resumo = await getResumoSemana(userId);

        return `📅 **Semana ${resumo.periodoInicio} a ${resumo.periodoFim}, ${dadosUsuario.nome.split(' ')[0]}:**\n
🚚 Rotas: **${resumo.totalRotas}**
🛣️ KM: **${resumo.kmRodados.toFixed(0)} km**
💰 Bruto: **${formatarMoeda(resumo.ganhosBrutos)}**
💵 Líquido: **${formatarMoeda(resumo.lucroLiquido)}**`;
    }

    // ============== MANUTENÇÃO ==============
    if (lowerPergunta.includes('manutençã') || lowerPergunta.includes('manutenca') || lowerPergunta.includes('pendente')) {
        const { urgentes, atencao } = await getStatusManutencao(userId);

        if (urgentes.length === 0 && atencao.length === 0) {
            return `🔧 **Manutenção, ${dadosUsuario.nome.split(' ')[0]}:**\n
✅ **Tudo em ordem!** Nenhum item precisa de atenção.

💡 Continue mantendo seu veículo em dia!`;
        }

        let resposta = `🔧 **Status de manutenção, ${dadosUsuario.nome.split(' ')[0]}:**\n\n`;

        if (urgentes.length > 0) {
            resposta += `🔴 **URGENTE (${urgentes.length}):**\n`;
            urgentes.forEach(item => {
                resposta += `• ${item.nome}\n`;
            });
            resposta += '\n';
        }

        if (atencao.length > 0) {
            resposta += `🟡 **ATENÇÃO (${atencao.length}):**\n`;
            atencao.forEach(item => {
                resposta += `• ${item.nome}\n`;
            });
        }

        resposta += '\n⚠️ Cuide dessas manutenções para evitar problemas!';
        return resposta;
    }

    // ============== PERFIL ==============
    if (lowerPergunta.includes('meu veículo') || lowerPergunta.includes('meu carro') || lowerPergunta.includes('perfil')) {
        return `👤 **Seu perfil, ${dadosUsuario.nome}:**\n
📧 Email: ${dadosUsuario.email}
📱 Telefone: ${dadosUsuario.telefone || 'Não informado'}

🚗 **Veículo:**
• Tipo: **${dadosUsuario.tipoVeiculo}**
• Placa: **${dadosUsuario.placaVeiculo || 'Não informada'}**
• Modelo: **${dadosUsuario.modeloVeiculo || 'Não informado'}**
• Turno: **${dadosUsuario.turnoPreferido}**`;
    }

    // ============== SAUDAÇÕES ==============
    if (lowerPergunta.includes('olá') || lowerPergunta.includes('oi') || lowerPergunta.includes('bom dia') || lowerPergunta.includes('boa tarde') || lowerPergunta.includes('boa noite')) {
        const resumo = await getResumoSemana(userId);
        const hora = new Date().getHours();
        const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

        return `${saudacao}, ${dadosUsuario.nome.split(' ')[0]}! 👋\n
📊 **Resumo da semana (${resumo.periodoInicio} - ${resumo.periodoFim}):**
🚚 Rotas: **${resumo.totalRotas}**
💰 Bruto: **${formatarMoeda(resumo.ganhosBrutos)}**
💵 Líquido: **${formatarMoeda(resumo.lucroLiquido)}**

Como posso ajudar?`;
    }

    // ============== COMO USAR ==============
    if (lowerPergunta.includes('usar') && lowerPergunta.includes('app')) {
        return `📱 **Como usar o RotaFrete:**\n
🏠 **Início**: Registre rotas diárias
📍 **Prévia**: Calcule fretes antes de aceitar
📊 **Histórico**: Resumo financeiro completo
🔧 **Manutenção**: Controle do veículo
💬 **Assistente**: Tire dúvidas comigo!
👤 **Perfil**: Seus dados

💡 Registre tudo diariamente!`;
    }

    // ============== FORA DO ESCOPO ==============
    if (lowerPergunta.includes('receita') || lowerPergunta.includes('clima') || lowerPergunta.includes('piada') ||
        lowerPergunta.includes('notícia') || lowerPergunta.includes('futebol') || lowerPergunta.includes('política')) {
        return `🚫 ${dadosUsuario.nome.split(' ')[0]}, só posso ajudar com o RotaFrete:\n
• Gastos e ganhos
• Média de consumo  
• Rotas realizadas
• Manutenção do veículo`;
    }

    // ============== RESPOSTA PADRÃO ==============
    return `🤔 ${dadosUsuario.nome.split(' ')[0]}, posso ajudar com:\n
• **"Quanto gastei esta semana?"**
• **"Qual minha média de consumo?"**
• **"Tenho manutenção pendente?"**
• **"Meu perfil"**

Escolha uma opção!`;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function AssistantScreen() {
    const { user } = useAuth();
    const flatListRef = useRef<FlatList>(null);

    const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
    const [isProcessing, setIsProcessing] = useState(false);

    const dadosUsuario = getDadosUsuario(user);

    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages]);

    const handleSend = useCallback(async (content: string) => {
        if (!content.trim() || isProcessing) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: content.trim(),
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);
        setIsProcessing(true);

        try {
            const responseText = await gerarRespostaInteligente(content, dadosUsuario, user?.id || '');

            const assistantMessage: ChatMessage = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: responseText,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('[Assistant] Erro:', error);

            const errorMessage: ChatMessage = {
                id: `error-${Date.now()}`,
                role: 'assistant',
                content: '😅 Erro ao processar. Tente novamente!',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsProcessing(false);
        }
    }, [isProcessing, dadosUsuario, user?.id]);

    const renderMessage = useCallback(({ item }: { item: ChatMessage }) => (
        <MessageBubble message={item} />
    ), []);

    const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

    return (
        <PageWrapper>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        {/* Mantendo LinearGradient local para o ícone, se necessário, ou substituir por View simples com cor */}
                        {/* Vou manter o import de LinearGradient se for usado no Icon, mas eu removi o import global. 
                            O ícone usa LinearGradient na linha 510. Preciso manter o import se for usado lá.
                            Mas eu removi o import na linha 18.
                            Vou recolocar o import de LinearGradient para uso local (ícone) mas mudar o root para PageWrapper.
                        */}
                        {/* UPDATE: Vou restaurar o import de LinearGradient apenas para o ícone ou mudar o ícone para View simples. 
                            O ícone é pequeno. PageWrapper cuida do fundo. 
                            Vou mudar o ícone para View com background brand-500.
                        */}
                        <View style={[styles.headerIcon, { backgroundColor: '#FF6B00' }]}>
                            {/* [LOTTIE] Animação do Assistente */}
                            <LottieAnimation name="ChatIa" width={40} height={40} speed={1.2} />
                        </View>
                        <View style={styles.headerText}>
                            <Text style={styles.headerTitle}>Assistente RotaFrete</Text>
                            <View style={styles.headerStatus}>
                                <View style={styles.statusDot} />
                                <Text style={styles.statusText}>Conectado aos seus dados</Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.headerBadge}>
                        <Sparkles size={14} color="#F59E0B" />
                        <Text style={styles.headerBadgeText}>IA</Text>
                    </View>
                </View>

                {/* Chat */}
                <KeyboardAvoidingView
                    style={styles.chatContainer}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={keyExtractor}
                        style={styles.messagesList}
                        contentContainerStyle={styles.messagesContent}
                        showsVerticalScrollIndicator={false}
                        ListHeaderComponent={
                            messages.length === 1 ? (
                                <QuickActions onSelect={handleSend} disabled={isProcessing} />
                            ) : null
                        }
                    />

                    {messages.length <= 3 && messages.length > 1 && (
                        <QuickActions onSelect={handleSend} disabled={isProcessing} />
                    )}

                    <ChatInput
                        onSend={handleSend}
                        isLoading={isProcessing}
                        placeholder="Pergunte sobre seus dados..."
                    />
                </KeyboardAvoidingView>
            </SafeAreaView>
        </PageWrapper>
    );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
    container: { flex: 1 },
    gradient: { flex: 1 },
    safeArea: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: '#1E293B',
    },
    headerContent: { flexDirection: 'row', alignItems: 'center' },
    headerIcon: {
        width: 48, height: 48, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    headerText: { justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
    headerStatus: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 6 },
    statusText: { fontSize: 12, color: '#10B981', fontWeight: '500' },
    headerBadge: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 4,
    },
    headerBadgeText: { fontSize: 12, fontWeight: '600', color: '#F59E0B' },
    chatContainer: { flex: 1 },
    messagesList: { flex: 1 },
    messagesContent: { paddingVertical: 16 },
});
