/**
 * Utilitário para retry com exponential backoff
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 1000,
    backoff = 2
): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        if (retries === 0) throw error;

        // Log apenas para debug
        if (__DEV__) {
            console.log(`[Retry] Tentativa falhou. Retentando em ${delay}ms... (Restam: ${retries})`, error);
        }

        await new Promise(resolve => setTimeout(resolve, delay));

        return withRetry(fn, retries - 1, delay * backoff, backoff);
    }
}
