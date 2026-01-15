// src/services/freight-service.ts
// ============================================
// ROTAFRETE - Enterprise Freight Service
// ============================================
// Pattern: Cloud-First with Local Fallback
// 
// Benefits:
// - Centralized pricing (update without app deploy)
// - Audit trail on backend
// - Works offline (local fallback)
// - Response caching
// ============================================

import { getAetherClient } from '@aether-baas/react-native';
import {
    calcularFreteCompleto,
    type TipoVeiculo,
    type Turno,
    type FaixaKm,
    type TipoDia
} from '@/constants/pricing';

// ============================================
// TYPES
// ============================================

export interface FreightParams {
    /** Quilômetros rodados */
    km: number;
    /** Tipo do veículo */
    vehicleType: TipoVeiculo;
    /** Turno (AM/PM) */
    shift: Turno;
    /** Data no formato YYYY-MM-DD */
    date: string;
    /** Quantidade de paradas */
    stops: number;
}

export interface FreightResult {
    /** Valor base por KM */
    valorKm: number;
    /** Valor adicional por paradas */
    valorParadas: number;
    /** Valor total (KM + Paradas) */
    valorTotal: number;
    /** Faixa de KM utilizada */
    faixaKm: FaixaKm;
    /** Tipo do dia (SEMANA, SABADO, DOMINGO, FERIADO) */
    tipoDia: TipoDia;
    /** Detalhamento do cálculo de paradas */
    detalhamentoParadas: {
        faixa: string;
        quantidade: number;
        valorPorParada: number;
        subtotal: number;
    }[];
    /** Fonte do cálculo */
    source: 'cloud' | 'local' | 'cache';
    /** Timestamp do cálculo */
    calculatedAt: string;
}

interface CacheEntry {
    result: FreightResult;
    expires: number;
}

// ============================================
// FREIGHT SERVICE
// ============================================

class FreightService {
    private cache = new Map<string, CacheEntry>();
    private TTL = 5 * 60 * 1000; // 5 minutos
    private FUNCTION_NAME = 'calculate-freight';

    /**
     * Calcula o frete usando Cloud Function com fallback local
     * 
     * @example
     * ```typescript
     * const result = await freightService.calculate({
     *   km: 150,
     *   vehicleType: 'PASSEIO',
     *   shift: 'AM',
     *   date: '2026-01-04',
     *   stops: 30
     * });
     * console.log(result.valorTotal); // R$ 262.58
     * console.log(result.source); // 'cloud' | 'local' | 'cache'
     * ```
     */
    async calculate(params: FreightParams): Promise<FreightResult> {
        const cacheKey = this.getCacheKey(params);

        // 1. Verifica cache
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return { ...cached, source: 'cache' };
        }

        // 2. Tenta Cloud Function
        try {
            const result = await this.calculateCloud(params);
            this.setCache(cacheKey, result);
            return result;
        } catch (error) {
            // 3. Fallback para cálculo local
            console.warn('[FreightService] Cloud unavailable, using local fallback:', error);
            return this.calculateLocal(params);
        }
    }

    /**
     * Força cálculo via Cloud (ignora cache)
     */
    async calculateFromCloud(params: FreightParams): Promise<FreightResult> {
        return this.calculateCloud(params);
    }

    /**
     * Calcula localmente (sem API)
     */
    calculateSync(params: FreightParams): FreightResult {
        return this.calculateLocal(params);
    }

    /**
     * Limpa o cache de cálculos
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * Remove entradas expiradas do cache
     */
    pruneCache(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now >= entry.expires) {
                this.cache.delete(key);
            }
        }
    }

    // ============================================
    // PRIVATE METHODS
    // ============================================

    private async calculateCloud(params: FreightParams): Promise<FreightResult> {
        // [SDK 3.4.0] Fixed: Use getAetherClient() from react-native SDK
        // This ensures the current authenticated user context is passed to the function
        const client = getAetherClient();

        const { data, error } = await client.functions.invoke<{
            valorKm: number;
            valorParadas: number;
            valorTotal: number;
            faixaKm: FaixaKm;
            tipoDia: TipoDia;
            detalhamentoParadas: FreightResult['detalhamentoParadas'];
        }>(this.FUNCTION_NAME, {
            km: params.km,
            vehicleType: params.vehicleType,
            shift: params.shift,
            date: params.date,
            stops: params.stops,
        });

        if (error) {
            throw new Error(error || 'Erro ao calcular frete na nuvem');
        }

        if (!data) {
            throw new Error('Retorno vazio do cálculo de frete');
        }

        return {
            ...data,
            source: 'cloud',
            calculatedAt: new Date().toISOString(),
        };
    }

    private calculateLocal(params: FreightParams): FreightResult {
        // [FIX] Adiciona hora fixa (12:00) para evitar problemas de timezone
        // onde 'YYYY-MM-DD' é interpretado como UTC 00:00 e vira dia anterior
        // em fusos horários ocidentais (ex: Brasil -03:00)
        const date = new Date(params.date + 'T12:00:00');

        const result = calcularFreteCompleto(
            params.km,
            params.vehicleType,
            params.shift,
            date,
            params.stops
        );

        return {
            valorKm: result.valorKm,
            valorParadas: result.valorParadas,
            valorTotal: result.valorTotal,
            faixaKm: result.faixaKm,
            tipoDia: result.tipoDia,
            detalhamentoParadas: result.detalhamentoParadas,
            source: 'local',
            calculatedAt: new Date().toISOString(),
        };
    }

    private getCacheKey(params: FreightParams): string {
        return `${params.vehicleType}:${params.km}:${params.shift}:${params.date}:${params.stops}`;
    }

    private getFromCache(key: string): FreightResult | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() >= entry.expires) {
            this.cache.delete(key);
            return null;
        }

        return entry.result;
    }

    private setCache(key: string, result: FreightResult): void {
        this.cache.set(key, {
            result,
            expires: Date.now() + this.TTL,
        });
    }
}

// Singleton instance
export const freightService = new FreightService();

// Export class for testing
export { FreightService };
