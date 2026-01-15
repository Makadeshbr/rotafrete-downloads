// src/hooks/useUploadQueue.ts
// ============================================
// ROTAFRETE - Hook de Fila de Upload
// ============================================
// Gerencia uploads de fotos com fila,
// retry automático e suporte offline.
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLogger } from '@/utils/logger';

// ============================================
// LOGGER
// ============================================

const logger = createLogger('UploadQueue');

// ============================================
// TIPOS
// ============================================

export interface UploadItem {
  id: string;
  itemId: string;
  fotoUri: string;
  inspecaoId: string;
  tentativas: number;
  ultimaTentativa?: string;
  erro?: string;
  status: 'pendente' | 'enviando' | 'erro' | 'sucesso';
}

interface UploadQueueState {
  fila: UploadItem[];
  enviando: boolean;
  online: boolean;
  itemAtual: UploadItem | null;
  progresso: number;
}

interface UploadQueueActions {
  adicionarUpload: (item: Omit<UploadItem, 'id' | 'tentativas' | 'status'>) => void;
  removerUpload: (id: string) => void;
  processarFila: () => Promise<void>;
  limparFila: () => void;
  reprocessarErros: () => void;
}

type UseUploadQueueReturn = UploadQueueState & UploadQueueActions;

// ============================================
// CONSTANTES
// ============================================

const STORAGE_KEY = '@rotafrete:upload_queue';
const MAX_TENTATIVAS = 3;
const DELAY_ENTRE_TENTATIVAS = 2000; // 2 segundos

// ============================================
// HOOK
// ============================================

export function useUploadQueue(
  onUpload: (item: UploadItem) => Promise<boolean>
): UseUploadQueueReturn {
  const [fila, setFila] = useState<UploadItem[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [online, setOnline] = useState(true);
  const [itemAtual, setItemAtual] = useState<UploadItem | null>(null);
  const [progresso, setProgresso] = useState(0);

  const processandoRef = useRef(false);
  const filaRef = useRef(fila);

  // Mantém ref atualizada
  useEffect(() => {
    filaRef.current = fila;
  }, [fila]);

  // ─── Carrega fila do storage ─────────────
  useEffect(() => {
    carregarFilaStorage();
    configurarNetworkListener();
    configurarAppStateListener();
  }, []);

  const carregarFilaStorage = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const filaStorage = JSON.parse(data) as UploadItem[];
        // Reseta status de "enviando" para "pendente"
        const filaResetada = filaStorage.map((item) => ({
          ...item,
          status: item.status === 'enviando' ? 'pendente' : item.status,
        })) as UploadItem[];
        setFila(filaResetada);
        logger.debug('Fila carregada do storage', { itens: filaResetada.length });
      }
    } catch (error) {
      logger.error('Erro ao carregar fila do storage', error);
    }
  };

  const salvarFilaStorage = async (novaFila: UploadItem[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(novaFila));
    } catch (error) {
      logger.error('Erro ao salvar fila no storage', error);
    }
  };

  // ─── Network listener ────────────────────
  const configurarNetworkListener = () => {
    NetInfo.addEventListener((state) => {
      const estaOnline = state.isConnected && state.isInternetReachable;
      setOnline(!!estaOnline);

      if (estaOnline && filaRef.current.length > 0) {
        logger.info('Conexão restaurada, processando fila');
        processarFila();
      }
    });
  };

  // ─── AppState listener ───────────────────
  const configurarAppStateListener = () => {
    AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active' && filaRef.current.length > 0) {
        logger.debug('App ativo, verificando fila');
        processarFila();
      }
    });
  };

  // ─── Adiciona item à fila ────────────────
  const adicionarUpload = useCallback(
    (item: Omit<UploadItem, 'id' | 'tentativas' | 'status'>) => {
      const novoItem: UploadItem = {
        ...item,
        id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tentativas: 0,
        status: 'pendente',
      };

      setFila((prev) => {
        const novaFila = [...prev, novoItem];
        salvarFilaStorage(novaFila);
        return novaFila;
      });

      logger.info('Item adicionado à fila', { itemId: item.itemId });

      // Tenta processar imediatamente se online
      if (online) {
        processarFila();
      }
    },
    [online]
  );

  // ─── Remove item da fila ─────────────────
  const removerUpload = useCallback((id: string) => {
    setFila((prev) => {
      const novaFila = prev.filter((item) => item.id !== id);
      salvarFilaStorage(novaFila);
      return novaFila;
    });
  }, []);

  // ─── Processa a fila ─────────────────────
  const processarFila = useCallback(async () => {
    // Evita processamento duplicado
    if (processandoRef.current || !online) {
      return;
    }

    const pendentes = filaRef.current.filter(
      (item) =>
        item.status === 'pendente' ||
        (item.status === 'erro' && item.tentativas < MAX_TENTATIVAS)
    );

    if (pendentes.length === 0) {
      return;
    }

    processandoRef.current = true;
    setEnviando(true);

    logger.info('Processando fila de uploads', { pendentes: pendentes.length });

    for (let i = 0; i < pendentes.length; i++) {
      const item = pendentes[i];

      // Atualiza progresso
      setProgresso(Math.round(((i + 1) / pendentes.length) * 100));
      setItemAtual(item);

      // Atualiza status para "enviando"
      setFila((prev) =>
        prev.map((p) =>
          p.id === item.id ? { ...p, status: 'enviando' as const } : p
        )
      );

      try {
        const sucesso = await onUpload(item);

        if (sucesso) {
          // Remove da fila em caso de sucesso
          setFila((prev) => {
            const novaFila = prev.filter((p) => p.id !== item.id);
            salvarFilaStorage(novaFila);
            return novaFila;
          });

          logger.info('Upload concluído', { itemId: item.itemId });
        } else {
          throw new Error('Upload retornou false');
        }
      } catch (error: any) {
        // Atualiza status para "erro"
        setFila((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? {
                  ...p,
                  status: 'erro' as const,
                  tentativas: p.tentativas + 1,
                  ultimaTentativa: new Date().toISOString(),
                  erro: error.message || 'Erro desconhecido',
                }
              : p
          )
        );

        logger.error('Erro no upload', { itemId: item.itemId, erro: error.message });

        // Delay antes da próxima tentativa
        await new Promise((resolve) => setTimeout(resolve, DELAY_ENTRE_TENTATIVAS));
      }
    }

    setEnviando(false);
    setItemAtual(null);
    setProgresso(0);
    processandoRef.current = false;

    // Salva estado final
    salvarFilaStorage(filaRef.current);
  }, [online, onUpload]);

  // ─── Limpa toda a fila ───────────────────
  const limparFila = useCallback(() => {
    setFila([]);
    AsyncStorage.removeItem(STORAGE_KEY);
    logger.info('Fila limpa');
  }, []);

  // ─── Reprocessa itens com erro ───────────
  const reprocessarErros = useCallback(() => {
    setFila((prev) =>
      prev.map((item) =>
        item.status === 'erro'
          ? { ...item, status: 'pendente' as const, tentativas: 0, erro: undefined }
          : item
      )
    );

    if (online) {
      processarFila();
    }
  }, [online, processarFila]);

  return {
    fila,
    enviando,
    online,
    itemAtual,
    progresso,
    adicionarUpload,
    removerUpload,
    processarFila,
    limparFila,
    reprocessarErros,
  };
}

export default useUploadQueue;
