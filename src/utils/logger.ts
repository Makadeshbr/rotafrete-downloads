// src/utils/logger.ts
// ============================================
// ROTAFRETE - Sistema de Logging Centralizado
// ============================================
// Fornece logging estruturado e consistente
// em todo o aplicativo.
// ============================================
// Em produção, os logs de erro são enviados
// para um serviço de monitoramento (Sentry).
// ============================================

/**
 * Níveis de log suportados.
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Interface do logger.
 */
interface Logger {
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, error?: unknown) => void;
}

/**
 * Configuração do logger.
 */
interface LoggerConfig {
  /** Nome do módulo para identificação */
  moduleName: string;
  /** Se está em modo desenvolvimento */
  isDev: boolean;
  /** Nível mínimo de log (em produção, ignora debug) */
  minLevel: LogLevel;
}

/**
 * Mapa de prioridade dos níveis de log.
 */
const LOG_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Emojis para cada nível de log (visual em dev).
 */
const LOG_EMOJI: Record<LogLevel, string> = {
  debug: '🔍',
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
};

/**
 * Cores ANSI para console (Node.js).
 */
const LOG_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // Ciano
  info: '\x1b[32m',  // Verde
  warn: '\x1b[33m',  // Amarelo
  error: '\x1b[31m', // Vermelho
};

const RESET_COLOR = '\x1b[0m';

/**
 * Serializa um erro de forma que todas as propriedades sejam capturadas.
 * Objetos Error têm propriedades não-enumeráveis (message, stack) que
 * JSON.stringify ignora. Esta função extrai tudo corretamente.
 * 
 * [ENTERPRISE] Essencial para debugging - erros vazios {} são inúteis.
 * 
 * @param error - Qualquer valor que possa ser um erro
 * @returns Objeto serializado com todas as informações do erro
 */
function serializeError(error: unknown): unknown {
  // Se não é objeto, retorna como está
  if (error === null || typeof error !== 'object') {
    return error;
  }

  // Se é um Error nativo do JavaScript
  if (error instanceof Error) {
    const serialized: Record<string, unknown> = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };

    // Captura propriedades adicionais (ex: AxiosError tem response, code, etc)
    // Isso é crucial para erros de rede/HTTP
    for (const key of Object.getOwnPropertyNames(error)) {
      if (!(key in serialized)) {
        serialized[key] = (error as any)[key];
      }
    }

    // Se tem causa encadeada (Error.cause do ES2022)
    if ('cause' in error && error.cause) {
      serialized.cause = serializeError(error.cause);
    }

    return serialized;
  }

  // Se é objeto genérico com message (duck typing)
  if ('message' in error) {
    return {
      ...(error as object),
      message: (error as { message: unknown }).message,
    };
  }

  // Retorna o objeto como está
  return error;
}

/**
 * Formata dados para exibição no log.
 * Evita logs enormes truncando objetos grandes.
 */
function formatData(data: unknown): string {
  if (data === undefined || data === null) {
    return '';
  }

  try {
    // [FIX] Serializa erros antes de stringify
    const processedData = serializeError(data);
    const str = JSON.stringify(processedData, null, 2);
    // Trunca se muito grande (mais de 1000 caracteres)
    if (str.length > 1000) {
      return str.substring(0, 1000) + '... [truncated]';
    }
    return str;
  } catch {
    return String(data);
  }
}

/**
 * Sanitiza dados sensíveis antes de logar.
 * Remove senhas, tokens, etc.
 */
function sanitizeData(data: unknown): unknown {
  // [FIX] Primeiro serializa erros, depois sanitiza
  const serialized = serializeError(data);

  if (typeof serialized !== 'object' || serialized === null) {
    return serialized;
  }

  const sensitiveKeys = [
    'password',
    'senha',
    'token',
    'apiKey',
    'api_key',
    'secret',
    'authorization',
    'cookie',
    'creditCard',
    'cvv',
  ];

  const sanitized = { ...serialized } as Record<string, unknown>;

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Verifica se está em ambiente de desenvolvimento.
 */
function isDevelopment(): boolean {
  // React Native / Expo
  if (typeof __DEV__ !== 'undefined') {
    return __DEV__;
  }
  // Node.js
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV !== 'production';
  }
  return false;
}

/**
 * Envia erro para serviço de monitoramento (Sentry).
 * Placeholder - implementar com Sentry real em produção.
 */
function reportToMonitoring(
  moduleName: string,
  message: string,
  error?: unknown
): void {
  // TODO: Implementar integração com Sentry
  // Sentry.captureException(error, {
  //   tags: { module: moduleName },
  //   extra: { message },
  // });

  // Por enquanto, apenas loga no console em produção
  if (!isDevelopment()) {
    console.error(`[${moduleName}] ${message}`, error);
  }
}

/**
 * Cria um logger para um módulo específico.
 *
 * @param moduleName - Nome do módulo (ex: 'AuthStore', 'InspectionService')
 * @returns Logger configurado para o módulo
 *
 * @example
 * ```typescript
 * const logger = createLogger('AuthStore');
 *
 * logger.debug('Iniciando login', { email });
 * logger.info('Login realizado com sucesso');
 * logger.warn('Token expirando em breve');
 * logger.error('Falha no login', error);
 * ```
 */
export function createLogger(moduleName: string): Logger {
  const config: LoggerConfig = {
    moduleName,
    isDev: isDevelopment(),
    minLevel: isDevelopment() ? 'debug' : 'warn',
  };

  /**
   * Função interna de log.
   */
  const log = (level: LogLevel, message: string, data?: unknown): void => {
    // Verifica nível mínimo
    if (LOG_PRIORITY[level] < LOG_PRIORITY[config.minLevel]) {
      return;
    }

    const timestamp = new Date().toISOString();
    const emoji = LOG_EMOJI[level];
    const sanitizedData = data ? sanitizeData(data) : undefined;

    if (config.isDev) {
      // Log formatado para desenvolvimento
      const prefix = `${emoji} [${config.moduleName}]`;
      const formattedData = sanitizedData ? formatData(sanitizedData) : '';

      switch (level) {
        case 'debug':
          console.log(prefix, message, formattedData);
          break;
        case 'info':
          console.info(prefix, message, formattedData);
          break;
        case 'warn':
          console.warn(prefix, message, formattedData);
          break;
        case 'error':
          console.error(prefix, message, formattedData);
          break;
      }
    } else {
      // Em produção, log estruturado
      const logEntry: Record<string, unknown> = {
        timestamp,
        level,
        module: config.moduleName,
        message,
      };

      if (sanitizedData) {
        logEntry.data = sanitizedData;
      }

      // Para erros em produção, envia para monitoramento
      if (level === 'error') {
        reportToMonitoring(config.moduleName, message, data);
      }

      // Log mínimo em produção (apenas warn e error)
      if (level === 'warn') {
        console.warn(JSON.stringify(logEntry));
      } else if (level === 'error') {
        console.error(JSON.stringify(logEntry));
      }
    }
  };

  return {
    debug: (message: string, data?: unknown) => log('debug', message, data),
    info: (message: string, data?: unknown) => log('info', message, data),
    warn: (message: string, data?: unknown) => log('warn', message, data),
    error: (message: string, error?: unknown) => log('error', message, error),
  };
}

// ============================================
// LOGGERS PRÉ-CONFIGURADOS
// ============================================

/**
 * Loggers pré-configurados para módulos principais.
 * Use estes ou crie novos com createLogger().
 */
export const loggers = {
  auth: createLogger('Auth'),
  rotas: createLogger('Rotas'),
  despesas: createLogger('Despesas'),
  inspection: createLogger('Inspection'),
  admin: createLogger('Admin'),
  storage: createLogger('Storage'),
  push: createLogger('PushNotifications'),
  network: createLogger('Network'),
};

// ============================================
// HELPERS ADICIONAIS
// ============================================

/**
 * Wrapper para operações que podem falhar.
 * Loga automaticamente erros e retorna valor padrão.
 *
 * @example
 * ```typescript
 * const resultado = await withErrorLogging(
 *   () => fetchData(),
 *   'Erro ao buscar dados',
 *   'DefaultValue'
 * );
 * ```
 */
export async function withErrorLogging<T>(
  operation: () => Promise<T>,
  errorMessage: string,
  defaultValue: T,
  logger: Logger = loggers.auth
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error(errorMessage, error);
    return defaultValue;
  }
}

/**
 * Timer para medir performance de operações.
 *
 * @example
 * ```typescript
 * const timer = startTimer('buscarDados');
 * await buscarDados();
 * timer.end(); // Loga: "buscarDados completed in 123ms"
 * ```
 */
export function startTimer(operationName: string, logger: Logger = loggers.auth) {
  const startTime = Date.now();

  return {
    end: () => {
      const duration = Date.now() - startTime;
      logger.debug(`${operationName} completed in ${duration}ms`);
      return duration;
    },
  };
}

export default createLogger;
