// rotafrete/functions/calculate-freight.ts
// ============================================
// ROTAFRETE - Aether Function: Calculate Freight
// ============================================
// Calcula valor do frete baseado em:
// - Quilometragem rodada
// - Tipo de veículo
// - Turno (AM/PM)
// - Data (feriados/domingos)
// - Quantidade de paradas
// ============================================
// Deploy: aether-cli function deploy calculate-freight
// ============================================

type TipoVeiculo = 'PASSEIO' | 'UTILITARIO' | 'VAN' | 'VUC';
type FaixaKm = '0-100' | '101-150' | '151-200' | '201-300' | 'EXCEDENTE';
type Turno = 'AM' | 'PM';
type TipoDia = 'SEMANA' | 'SABADO' | 'DOMINGO' | 'FERIADO';

interface PrecoItem {
    tipoVeiculo: TipoVeiculo;
    faixaKm: FaixaKm;
    kmInicial: number;
    kmFinal: number | null;
    segSabAM: number;
    segSabPM: number;
    domFerAM: number;
    domFerPM: number;
}

interface RequestPayload {
    km: number;
    vehicleType: TipoVeiculo;
    shift: Turno;
    date: string;
    stops?: number;
}

interface ResponseData {
    valorKm: number;
    valorParadas: number;
    valorTotal: number;
    faixaKm: FaixaKm;
    tipoDia: TipoDia;
    breakdown: {
        km: number;
        valorPorKm: number;
        paradas: number;
        valorPorParada: number;
    };
}

// Tabela de preços oficial
const TABELA_PRECOS: PrecoItem[] = [
    // PASSEIO
    { tipoVeiculo: 'PASSEIO', faixaKm: '0-100', kmInicial: 0, kmFinal: 100, segSabAM: 206.84, segSabPM: 163.24, domFerAM: 248.21, domFerPM: 195.88 },
    { tipoVeiculo: 'PASSEIO', faixaKm: '101-150', kmInicial: 101, kmFinal: 150, segSabAM: 241.58, segSabPM: 190.62, domFerAM: 289.89, domFerPM: 228.74 },
    { tipoVeiculo: 'PASSEIO', faixaKm: '151-200', kmInicial: 151, kmFinal: 200, segSabAM: 270.35, segSabPM: 213.51, domFerAM: 324.41, domFerPM: 256.21 },
    { tipoVeiculo: 'PASSEIO', faixaKm: '201-300', kmInicial: 201, kmFinal: 300, segSabAM: 304.26, segSabPM: 240.15, domFerAM: 365.11, domFerPM: 288.18 },
    { tipoVeiculo: 'PASSEIO', faixaKm: 'EXCEDENTE', kmInicial: 301, kmFinal: null, segSabAM: 338.99, segSabPM: 267.43, domFerAM: 406.79, domFerPM: 320.91 },
    // UTILITÁRIO
    { tipoVeiculo: 'UTILITARIO', faixaKm: '0-100', kmInicial: 0, kmFinal: 100, segSabAM: 262.73, segSabPM: 207.10, domFerAM: 315.27, domFerPM: 248.52 },
    { tipoVeiculo: 'UTILITARIO', faixaKm: '101-150', kmInicial: 101, kmFinal: 150, segSabAM: 300.94, segSabPM: 236.94, domFerAM: 361.12, domFerPM: 284.33 },
    { tipoVeiculo: 'UTILITARIO', faixaKm: '151-200', kmInicial: 151, kmFinal: 200, segSabAM: 343.29, segSabPM: 270.64, domFerAM: 411.95, domFerPM: 324.76 },
    { tipoVeiculo: 'UTILITARIO', faixaKm: '201-300', kmInicial: 201, kmFinal: 300, segSabAM: 381.39, segSabPM: 300.48, domFerAM: 457.67, domFerPM: 360.57 },
    { tipoVeiculo: 'UTILITARIO', faixaKm: 'EXCEDENTE', kmInicial: 301, kmFinal: null, segSabAM: 423.85, segSabPM: 334.18, domFerAM: 508.62, domFerPM: 401.01 },
    // VAN
    { tipoVeiculo: 'VAN', faixaKm: '0-100', kmInicial: 0, kmFinal: 100, segSabAM: 328.53, segSabPM: 240.52, domFerAM: 394.24, domFerPM: 288.62 },
    { tipoVeiculo: 'VAN', faixaKm: '101-150', kmInicial: 101, kmFinal: 150, segSabAM: 377.85, segSabPM: 277.22, domFerAM: 453.42, domFerPM: 332.67 },
    { tipoVeiculo: 'VAN', faixaKm: '151-200', kmInicial: 151, kmFinal: 200, segSabAM: 427.18, segSabPM: 313.19, domFerAM: 512.62, domFerPM: 375.83 },
    { tipoVeiculo: 'VAN', faixaKm: '201-300', kmInicial: 201, kmFinal: 300, segSabAM: 477.39, segSabPM: 349.90, domFerAM: 572.87, domFerPM: 419.87 },
    { tipoVeiculo: 'VAN', faixaKm: 'EXCEDENTE', kmInicial: 301, kmFinal: null, segSabAM: 526.71, segSabPM: 385.86, domFerAM: 632.05, domFerPM: 463.03 },
    // VUC
    { tipoVeiculo: 'VUC', faixaKm: '0-100', kmInicial: 0, kmFinal: 100, segSabAM: 502.05, segSabPM: 367.88, domFerAM: 602.46, domFerPM: 441.45 },
    { tipoVeiculo: 'VUC', faixaKm: '101-150', kmInicial: 101, kmFinal: 150, segSabAM: 543.44, segSabPM: 398.12, domFerAM: 652.13, domFerPM: 477.75 },
    { tipoVeiculo: 'VUC', faixaKm: '151-200', kmInicial: 151, kmFinal: 200, segSabAM: 594.53, segSabPM: 436.03, domFerAM: 713.44, domFerPM: 523.24 },
    { tipoVeiculo: 'VUC', faixaKm: '201-300', kmInicial: 201, kmFinal: 300, segSabAM: 612.14, segSabPM: 448.94, domFerAM: 734.57, domFerPM: 538.73 },
    { tipoVeiculo: 'VUC', faixaKm: 'EXCEDENTE', kmInicial: 301, kmFinal: null, segSabAM: 658.82, segSabPM: 482.97, domFerAM: 790.59, domFerPM: 579.57 },
];

const FERIADOS = [
    '2024-01-01', '2024-02-12', '2024-02-13', '2024-03-29', '2024-04-21', '2024-05-01',
    '2024-05-30', '2024-09-07', '2024-10-12', '2024-11-02', '2024-11-15', '2024-11-20', '2024-12-25',
    '2025-01-01', '2025-03-03', '2025-03-04', '2025-04-18', '2025-04-21', '2025-05-01',
    '2025-06-19', '2025-09-07', '2025-10-12', '2025-11-02', '2025-11-15', '2025-11-20', '2025-12-25',
    '2026-01-01', '2026-02-16', '2026-02-17', '2026-04-03', '2026-04-21', '2026-05-01',
    '2026-06-04', '2026-09-07', '2026-10-12', '2026-11-02', '2026-11-15', '2026-11-20', '2026-12-25',
];

function determinarFaixaKm(km: number): FaixaKm {
    if (km <= 100) return '0-100';
    if (km <= 150) return '101-150';
    if (km <= 200) return '151-200';
    if (km <= 300) return '201-300';
    return 'EXCEDENTE';
}

function determinarTipoDia(dateStr: string): TipoDia {
    const date = new Date(dateStr + 'T12:00:00');
    const dayOfWeek = date.getDay();
    const dateOnly = dateStr.split('T')[0];

    if (FERIADOS.includes(dateOnly)) return 'FERIADO';
    if (dayOfWeek === 0) return 'DOMINGO';
    if (dayOfWeek === 6) return 'SABADO';
    return 'SEMANA';
}

function calcularValorKm(km: number, vehicleType: TipoVeiculo, shift: Turno, tipoDia: TipoDia): number {
    const faixaKm = determinarFaixaKm(km);
    const item = TABELA_PRECOS.find(p => p.tipoVeiculo === vehicleType && p.faixaKm === faixaKm);

    if (!item) throw new Error(`Configuração não encontrada: ${vehicleType} - ${faixaKm}`);

    if (tipoDia === 'DOMINGO' || tipoDia === 'FERIADO') {
        return shift === 'AM' ? item.domFerAM : item.domFerPM;
    }
    return shift === 'AM' ? item.segSabAM : item.segSabPM;
}

function calcularValorParadas(stops: number): number {
    if (stops === 0) return 0;

    let total = 0;
    if (stops <= 60) {
        total = Math.min(stops * 0.35, 21.00);
    } else if (stops <= 90) {
        total = 21.00 + ((stops - 60) * 2.00);
    } else {
        total = 21.00 + (30 * 2.00) + ((stops - 90) * 1.04);
    }

    return Number(total.toFixed(2));
}

// ============================================
// HANDLER PRINCIPAL
// ============================================
export default async function handler(payload: RequestPayload): Promise<ResponseData> {
    const { km, vehicleType, shift, date, stops = 0 } = payload;

    // Validação
    if (!km || km < 1 || km > 2000) {
        throw new Error('KM deve estar entre 1 e 2000');
    }
    if (!['PASSEIO', 'UTILITARIO', 'VAN', 'VUC'].includes(vehicleType)) {
        throw new Error('Tipo de veículo inválido');
    }
    if (!['AM', 'PM'].includes(shift)) {
        throw new Error('Turno deve ser AM ou PM');
    }

    // Cálculo
    const tipoDia = determinarTipoDia(date);
    const faixaKm = determinarFaixaKm(km);
    const valorKm = calcularValorKm(km, vehicleType, shift, tipoDia);
    const valorParadas = calcularValorParadas(stops);
    const valorTotal = valorKm + valorParadas;

    return {
        valorKm: Number(valorKm.toFixed(2)),
        valorParadas: Number(valorParadas.toFixed(2)),
        valorTotal: Number(valorTotal.toFixed(2)),
        faixaKm,
        tipoDia,
        breakdown: {
            km,
            valorPorKm: Number((valorKm / km).toFixed(2)),
            paradas: stops,
            valorPorParada: stops ? Number((valorParadas / stops).toFixed(2)) : 0,
        },
    };
}
