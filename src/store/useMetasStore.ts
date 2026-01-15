// src/store/useMetasStore.ts
// ============================================
// ROTAFRETE - Store de Metas e Gamificação
// ============================================
// Sistema de metas semanais e conquistas
// para aumentar engajamento do usuário.
// Usa Zustand com persistência via AsyncStorage.
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startOfWeek, endOfWeek, format } from 'date-fns';

// ============================================
// TIPOS
// ============================================

export interface Meta {
  id: string;
  tipo: 'SEMANAL' | 'MENSAL' | 'DIARIA';
  valorAlvo: number;
  valorAtual: number;
  dataInicio: string;
  dataFim: string;
  atingida: boolean;
}

export interface Conquista {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  desbloqueadaEm: string | null;
  progresso: number;
  requisito: number;
}

export interface DadosConquista {
  lucroSemanal: number;
  despesasPercentual: number;
  rotasDoDia: number;
  maiorRota: number;
  diasConsecutivos: number;
  totalRotas: number;
  totalKm: number;
}

interface MetasStore {
  metaSemanal: Meta | null;
  conquistas: Conquista[];
  streakDias: number;
  ultimoDiaTrabalho: string | null;
  userId: string | null; // [NOVO] ID do usuário atual

  setMetaSemanal: (valor: number) => void;
  atualizarProgresso: (lucroAtual: number) => void;
  registrarDiaTrabalho: () => void;
  verificarConquistas: (dados: DadosConquista) => Conquista[];
  getConquistasDesbloqueadas: () => Conquista[];
  getConquistasEmProgresso: () => Conquista[];
  resetarMetaSemanal: () => void;
  inicializarParaUsuario: (userId: string) => void; // [NOVO] Reseta ao trocar de usuário
}

// ============================================
// CONQUISTAS DISPONÍVEIS
// ============================================

const CONQUISTAS_PADRAO: Conquista[] = [
  {
    id: 'maratonista',
    nome: 'Maratonista',
    descricao: 'Trabalhe 7 dias seguidos',
    icone: '🏃',
    desbloqueadaEm: null,
    progresso: 0,
    requisito: 7,
  },
  {
    id: 'semana-ouro',
    nome: 'Semana de Ouro',
    descricao: 'Lucro líquido > R$ 3.000 na semana',
    icone: '💎',
    desbloqueadaEm: null,
    progresso: 0,
    requisito: 3000,
  },
  {
    id: 'meta-batida',
    nome: 'Meta Batida',
    descricao: 'Atingiu sua meta semanal',
    icone: '🎯',
    desbloqueadaEm: null,
    progresso: 0,
    requisito: 1,
  },
  {
    id: 'rota-longa',
    nome: 'Rota Longa',
    descricao: 'Complete uma rota > 300km',
    icone: '🛣️',
    desbloqueadaEm: null,
    progresso: 0,
    requisito: 300,
  },
  {
    id: 'economico',
    nome: 'Econômico',
    descricao: 'Despesas < 15% do bruto na semana',
    icone: '⛽',
    desbloqueadaEm: null,
    progresso: 0,
    requisito: 15,
  },
  {
    id: 'primeira-semana',
    nome: 'Primeira Semana',
    descricao: 'Complete sua primeira semana de uso',
    icone: '🌟',
    desbloqueadaEm: null,
    progresso: 0,
    requisito: 5,
  },
  {
    id: 'centuriao',
    nome: 'Centurião',
    descricao: 'Registre 100 rotas',
    icone: '💯',
    desbloqueadaEm: null,
    progresso: 0,
    requisito: 100,
  },
  {
    id: 'mil-km',
    nome: 'Mil Quilômetros',
    descricao: 'Rode 1.000 km no total',
    icone: '🚀',
    desbloqueadaEm: null,
    progresso: 0,
    requisito: 1000,
  },
  {
    id: 'consistente',
    nome: 'Consistente',
    descricao: 'Trabalhe 30 dias seguidos',
    icone: '🔥',
    desbloqueadaEm: null,
    progresso: 0,
    requisito: 30,
  },
];

// ============================================
// HELPER: Calcula semana de trabalho (Sexta a Quinta)
// ============================================

function calcularSemanaTrabalho(dataReferencia: Date = new Date()) {
  const inicio = startOfWeek(dataReferencia, { weekStartsOn: 5 });
  const fim = endOfWeek(dataReferencia, { weekStartsOn: 5 });
  return { inicio, fim };
}

// ============================================
// STORE
// ============================================

export const useMetasStore = create<MetasStore>()(
  persist(
    (set, get) => ({
      metaSemanal: null,
      conquistas: CONQUISTAS_PADRAO,
      streakDias: 0,
      ultimoDiaTrabalho: null,
      userId: null,

      // ========================================
      // DEFINIR META SEMANAL
      // ========================================
      setMetaSemanal: (valor) => {
        const { inicio, fim } = calcularSemanaTrabalho();

        set({
          metaSemanal: {
            id: `meta-${Date.now()}`,
            tipo: 'SEMANAL',
            valorAlvo: valor,
            valorAtual: 0,
            dataInicio: inicio.toISOString(),
            dataFim: fim.toISOString(),
            atingida: false,
          },
        });

        console.log(
          `[METAS] Meta semanal definida: R$ ${valor.toFixed(2)}`
        );
      },

      // ========================================
      // ATUALIZAR PROGRESSO DA META
      // ========================================
      atualizarProgresso: (lucroAtual) => {
        const { metaSemanal } = get();
        if (!metaSemanal) return;

        const agora = new Date();
        const fimMeta = new Date(metaSemanal.dataFim);

        if (agora > fimMeta) {
          console.log('[METAS] Meta semanal expirada');
          return;
        }

        const atingida = lucroAtual >= metaSemanal.valorAlvo;

        set({
          metaSemanal: {
            ...metaSemanal,
            valorAtual: lucroAtual,
            atingida,
          },
        });

        if (atingida && !metaSemanal.atingida) {
          console.log('[METAS] 🎯 META SEMANAL ATINGIDA!');
        }
      },

      // ========================================
      // REGISTRAR DIA DE TRABALHO (STREAK)
      // ========================================
      registrarDiaTrabalho: () => {
        const { ultimoDiaTrabalho, streakDias } = get();
        const hoje = new Date().toISOString().split('T')[0];

        if (ultimoDiaTrabalho === hoje) {
          return;
        }

        const ontem = new Date();
        ontem.setDate(ontem.getDate() - 1);
        const ontemStr = ontem.toISOString().split('T')[0];

        if (ultimoDiaTrabalho === ontemStr) {
          set({
            streakDias: streakDias + 1,
            ultimoDiaTrabalho: hoje,
          });
          console.log(`[METAS] 🔥 Streak: ${streakDias + 1} dias!`);
        } else {
          set({
            streakDias: 1,
            ultimoDiaTrabalho: hoje,
          });
          console.log('[METAS] Streak reiniciado');
        }
      },

      // ========================================
      // VERIFICAR E DESBLOQUEAR CONQUISTAS
      // ========================================
      verificarConquistas: (dados) => {
        const { conquistas, metaSemanal, streakDias } = get();
        const novasDesbloqueadas: Conquista[] = [];

        const atualizadas = conquistas.map((c) => {
          if (c.desbloqueadaEm) return c;

          let novoProgresso = c.progresso;
          let desbloqueada = false;

          switch (c.id) {
            case 'maratonista':
              novoProgresso = Math.min((streakDias / c.requisito) * 100, 100);
              desbloqueada = streakDias >= c.requisito;
              break;

            case 'consistente':
              novoProgresso = Math.min((streakDias / c.requisito) * 100, 100);
              desbloqueada = streakDias >= c.requisito;
              break;

            case 'semana-ouro':
              novoProgresso = Math.min((dados.lucroSemanal / c.requisito) * 100, 100);
              desbloqueada = dados.lucroSemanal >= c.requisito;
              break;

            case 'meta-batida':
              if (metaSemanal?.atingida) {
                novoProgresso = 100;
                desbloqueada = true;
              }
              break;

            case 'rota-longa':
              novoProgresso = Math.min((dados.maiorRota / c.requisito) * 100, 100);
              desbloqueada = dados.maiorRota >= c.requisito;
              break;

            case 'economico':
              if (dados.lucroSemanal > 0 && dados.despesasPercentual > 0) {
                if (dados.despesasPercentual <= c.requisito) {
                  novoProgresso = 100;
                  desbloqueada = true;
                } else {
                  novoProgresso = Math.min((c.requisito / dados.despesasPercentual) * 100, 99);
                }
              }
              break;

            case 'centuriao':
              novoProgresso = Math.min((dados.totalRotas / c.requisito) * 100, 100);
              desbloqueada = dados.totalRotas >= c.requisito;
              break;

            case 'mil-km':
              novoProgresso = Math.min((dados.totalKm / c.requisito) * 100, 100);
              desbloqueada = dados.totalKm >= c.requisito;
              break;

            case 'primeira-semana':
              novoProgresso = Math.min((dados.totalRotas / c.requisito) * 100, 100);
              desbloqueada = dados.totalRotas >= c.requisito;
              break;
          }

          if (desbloqueada && !c.desbloqueadaEm) {
            const conquistaDesbloqueada: Conquista = {
              ...c,
              progresso: 100,
              desbloqueadaEm: new Date().toISOString(),
            };
            novasDesbloqueadas.push(conquistaDesbloqueada);
            console.log(`[METAS] 🏆 CONQUISTA: ${c.nome} ${c.icone}`);
            return conquistaDesbloqueada;
          }

          return { ...c, progresso: Math.round(novoProgresso) };
        });

        set({ conquistas: atualizadas });
        return novasDesbloqueadas;
      },

      getConquistasDesbloqueadas: () => {
        return get().conquistas.filter((c) => c.desbloqueadaEm !== null);
      },

      getConquistasEmProgresso: () => {
        return get().conquistas.filter(
          (c) => c.desbloqueadaEm === null && c.progresso > 0
        );
      },

      resetarMetaSemanal: () => {
        set({ metaSemanal: null });
      },

      // [NOVO] Inicializa/reseta dados ao trocar de usuário
      inicializarParaUsuario: (novoUserId: string) => {
        const { userId: userIdAtual } = get();

        // Se é o mesmo usuário, não faz nada
        if (userIdAtual === novoUserId) {
          console.log('[METAS] Mesmo usuário, mantendo conquistas');
          return;
        }

        // Usuário diferente: reseta tudo para padrão
        console.log(`[METAS] Novo usuário: ${novoUserId}, resetando conquistas`);
        set({
          userId: novoUserId,
          metaSemanal: null,
          conquistas: CONQUISTAS_PADRAO.map(c => ({ ...c, desbloqueadaEm: null, progresso: 0 })),
          streakDias: 0,
          ultimoDiaTrabalho: null,
        });
      },
    }),
    {
      name: 'rotafrete-metas',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        userId: state.userId,
        metaSemanal: state.metaSemanal,
        conquistas: state.conquistas,
        streakDias: state.streakDias,
        ultimoDiaTrabalho: state.ultimoDiaTrabalho,
      }),
    }
  )
);

export { CONQUISTAS_PADRAO };
