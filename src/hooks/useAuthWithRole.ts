// src/hooks/useAuthWithRole.ts
// ============================================
// ROTAFRETE - Hook de Autenticação com Roles
// ============================================
// Estende o useAuth do Aether SDK para incluir
// verificação de role (motorista vs admin).
// ============================================
// O admin é identificado pela role no metadata
// do usuário ou por uma lista de emails de admin.
// ============================================

import { useEffect, useState, useCallback } from 'react';
import { useAuth, getDb } from '@aether-baas/react-native';
import { createLogger } from '@/utils/logger';
import type { UserRole } from '@/types/inspection';

// ============================================
// CONFIGURAÇÃO
// ============================================

const logger = createLogger('AuthWithRole');

/**
 * Lista de emails que são administradores.
 * Em produção, isso deveria vir de uma config ou do backend.
 */
const ADMIN_EMAILS: string[] = [
  // Adicione emails de administradores aqui
  // Exemplo: 'admin@rotafrete.com.br'
];

/**
 * Collection onde ficam os usuários do tenant.
 */
const COLLECTION_USERS = 'motoristas';

// ============================================
// TIPOS
// ============================================

interface AuthWithRoleState {
  /** Se está carregando dados de autenticação */
  isLoading: boolean;
  /** Se o usuário está autenticado */
  isAuthenticated: boolean;
  /** Role do usuário (motorista ou admin) */
  role: UserRole | null;
  /** Dados do usuário */
  user: {
    id: string;
    email: string;
    name: string;
    metadata?: Record<string, any>;
  } | null;
  /** Erro de autenticação */
  error: string | null;
}

interface AuthWithRoleActions {
  /** Faz login e retorna a role do usuário */
  signIn: (email: string, password: string) => Promise<UserRole>;
  /** Faz logout */
  signOut: () => Promise<void>;
  /** Verifica se o usuário é admin */
  isAdmin: () => boolean;
  /** Verifica se o usuário é motorista */
  isMotorista: () => boolean;
  /** Atualiza a role do usuário (apenas admin pode fazer isso) */
  updateUserRole: (userId: string, newRole: UserRole) => Promise<void>;
  /** Recarrega dados do usuário */
  refreshUser: () => Promise<void>;
}

type UseAuthWithRoleReturn = AuthWithRoleState & AuthWithRoleActions;

// ============================================
// HOOK
// ============================================

/**
 * Hook que estende o useAuth do Aether com suporte a roles.
 * 
 * @example
 * ```tsx
 * function App() {
 *   const { isLoading, isAuthenticated, role, signIn } = useAuthWithRole();
 * 
 *   if (isLoading) return <Loading />;
 * 
 *   if (!isAuthenticated) return <LoginScreen />;
 * 
 *   if (role === 'admin') return <AdminDashboard />;
 * 
 *   return <DriverApp />;
 * }
 * ```
 */
export function useAuthWithRole(): UseAuthWithRoleReturn {
  const auth = useAuth();

  const [state, setState] = useState<AuthWithRoleState>({
    isLoading: true,
    isAuthenticated: false,
    role: null,
    user: null,
    error: null,
  });

  /**
   * Determina a role do usuário baseado em:
   * 1. Lista de emails de admin (ADMIN_EMAILS)
   * 2. Campo role no metadata do usuário
   * 3. Campo role no documento tenant_users
   */
  const determinarRole = useCallback(async (userId: string, email: string): Promise<UserRole> => {
    // 1. Verifica se está na lista de emails de admin
    if (ADMIN_EMAILS.includes(email.toLowerCase())) {
      logger.debug('Usuário é admin por email', { email });
      return 'admin';
    }

    // 2. Busca dados do usuário no banco
    try {
      const db = getDb();
      const userDoc = await db.collection(COLLECTION_USERS).get(userId);

      if (userDoc && (userDoc as any).role === 'admin') {
        logger.debug('Usuário é admin por role no DB', { userId });
        return 'admin';
      }

      // 3. Verifica metadata do auth
      if (auth.user?.metadata?.role === 'admin') {
        logger.debug('Usuário é admin por metadata', { userId });
        return 'admin';
      }
    } catch (error: any) {
      // Verifica mensagens de erro comuns para 404 (inglês ou português)
      const msg = error?.message?.toLowerCase() || '';
      if (
        msg.includes('not found') ||
        msg.includes('não encontrado') ||
        error?.code === 'not-found'
      ) {
        logger.debug('Doc de usuário não encontrado no banco, assumindo papel padrão (motorista)', { userId });
      } else {
        logger.warn('Erro ao buscar role do usuário:', error);
      }
    }

    // Default: motorista
    return 'motorista';
  }, [auth.user]);

  /**
   * Carrega dados do usuário quando autenticado.
   */
  const carregarDadosUsuario = useCallback(async () => {
    if (!auth.user) {
      setState({
        isLoading: false,
        isAuthenticated: false,
        role: null,
        user: null,
        error: null,
      });
      return;
    }

    try {
      const role = await determinarRole(auth.user.id, auth.user.email || '');

      setState({
        isLoading: false,
        isAuthenticated: true,
        role,
        user: {
          id: auth.user.id,
          email: auth.user.email || '',
          name: auth.user.name || auth.user.email || 'Usuário',
          metadata: auth.user.metadata,
        },
        error: null,
      });

      logger.info('Usuário autenticado', {
        userId: auth.user.id,
        role,
      });
    } catch (error) {
      logger.error('Erro ao carregar dados do usuário', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Erro ao carregar dados do usuário',
      }));
    }
  }, [auth.user, determinarRole]);

  // Efeito para carregar dados quando auth muda
  useEffect(() => {
    if (!auth.isLoading) {
      carregarDadosUsuario();
    }
  }, [auth.isLoading, auth.user, carregarDadosUsuario]);

  /**
   * Faz login e retorna a role do usuário.
   */
  const signIn = useCallback(async (email: string, password: string): Promise<UserRole> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      await auth.signIn({ email, password });

      // Aguarda um pouco para o auth.user ser populado
      await new Promise(resolve => setTimeout(resolve, 500));

      const role = await determinarRole(auth.user?.id || '', email);

      setState(prev => ({
        ...prev,
        isLoading: false,
        isAuthenticated: true,
        role,
      }));

      logger.info('Login realizado', { email, role });

      return role;
    } catch (error: any) {
      const errorMessage = error.message || 'Erro ao fazer login';
      logger.error('Erro no login', error);

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      throw error;
    }
  }, [auth, determinarRole]);

  /**
   * Faz logout.
   */
  const signOut = useCallback(async () => {
    try {
      await auth.signOut();

      setState({
        isLoading: false,
        isAuthenticated: false,
        role: null,
        user: null,
        error: null,
      });

      logger.info('Logout realizado');
    } catch (error) {
      logger.error('Erro no logout', error);
      throw error;
    }
  }, [auth]);

  /**
   * Verifica se o usuário é admin.
   */
  const isAdmin = useCallback((): boolean => {
    return state.role === 'admin';
  }, [state.role]);

  /**
   * Verifica se o usuário é motorista.
   */
  const isMotorista = useCallback((): boolean => {
    return state.role === 'motorista';
  }, [state.role]);

  /**
   * Atualiza a role de um usuário (apenas admin pode).
   */
  const updateUserRole = useCallback(async (userId: string, newRole: UserRole) => {
    if (state.role !== 'admin') {
      throw new Error('Apenas administradores podem alterar roles');
    }

    try {
      const db = getDb();
      await db.collection(COLLECTION_USERS).update(userId, { role: newRole });

      logger.info('Role atualizada', { userId, newRole });
    } catch (error) {
      logger.error('Erro ao atualizar role', error);
      throw error;
    }
  }, [state.role]);

  /**
   * Recarrega dados do usuário.
   */
  const refreshUser = useCallback(async () => {
    await carregarDadosUsuario();
  }, [carregarDadosUsuario]);

  return {
    ...state,
    signIn,
    signOut,
    isAdmin,
    isMotorista,
    updateUserRole,
    refreshUser,
  };
}

// ============================================
// COMPONENTES AUXILIARES
// ============================================

/**
 * Props para componentes de proteção de rota.
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Role necessária para acessar */
  requiredRole?: UserRole;
  /** Componente a exibir se não autorizado */
  fallback?: React.ReactNode;
  /** Componente a exibir enquanto carrega */
  loadingComponent?: React.ReactNode;
}

/**
 * Componente que protege rotas baseado em autenticação e role.
 * 
 * @example
 * ```tsx
 * <ProtectedRoute requiredRole="admin">
 *   <AdminDashboard />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({
  children,
  requiredRole,
  fallback,
  loadingComponent,
}: ProtectedRouteProps): React.ReactNode {
  const { isLoading, isAuthenticated, role } = useAuthWithRole();

  if (isLoading) {
    return loadingComponent || null;
  }

  if (!isAuthenticated) {
    return fallback || null;
  }

  if (requiredRole && role !== requiredRole) {
    return fallback || null;
  }

  return children;
}

// ============================================
// CONFIGURAÇÃO DE ADMINS
// ============================================

/**
 * Função para adicionar um email à lista de admins.
 * Deve ser chamada na inicialização do app com emails de admins.
 * 
 * @example
 * ```typescript
 * // Em app.config.ts ou similar
 * addAdminEmail('admin@rotafrete.com.br');
 * addAdminEmail('gerente@rotafrete.com.br');
 * ```
 */
export function addAdminEmail(email: string): void {
  const normalizedEmail = email.toLowerCase().trim();
  if (!ADMIN_EMAILS.includes(normalizedEmail)) {
    ADMIN_EMAILS.push(normalizedEmail);
    logger.debug('Email de admin adicionado', { email: normalizedEmail });
  }
}

/**
 * Função para definir a lista completa de emails de admin.
 * Substitui a lista existente.
 */
export function setAdminEmails(emails: string[]): void {
  ADMIN_EMAILS.length = 0;
  emails.forEach(email => {
    ADMIN_EMAILS.push(email.toLowerCase().trim());
  });
  logger.debug('Lista de admins atualizada', { count: ADMIN_EMAILS.length });
}

/**
 * Retorna a lista atual de emails de admin.
 * Útil para debugging.
 */
export function getAdminEmails(): string[] {
  return [...ADMIN_EMAILS];
}

export default useAuthWithRole;
