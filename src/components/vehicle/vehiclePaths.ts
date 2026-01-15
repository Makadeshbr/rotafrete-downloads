// src/components/vehicle/vehiclePaths.ts
// ============================================
// ROTAFRETE - Paths SVG do Veículo Isométrico
// ============================================
// Definições vetoriais para renderização 3D isométrica
// do veículo de entrega com partes interativas
// ============================================

import { ParteVeiculo } from '@/constants';

// ============================================
// DIMENSÕES DO CANVAS SVG
// ============================================

export const SVG_VIEWBOX = {
    width: 320,
    height: 280,
};

// ============================================
// CORES DO VEÍCULO
// ============================================

export const VEHICLE_COLORS = {
    // Corpo principal
    bodyMain: '#1E293B',
    bodyLight: '#334155',
    bodyDark: '#0F172A',
    bodyShadow: '#020617',

    // Detalhes metálicos
    chrome: '#94A3B8',
    chromeDark: '#64748B',

    // Vidros
    glass: '#3B82F6',
    glassReflection: '#60A5FA',

    // Rodas
    wheelRubber: '#1E1E1E',
    wheelRim: '#64748B',
    wheelCenter: '#475569',

    // Luzes
    headlight: '#FBBF24',
    headlightGlow: '#FCD34D',
    taillight: '#EF4444',
    taillightGlow: '#FCA5A5',
};

// ============================================
// PATHS SVG DO VEÍCULO ISOMÉTRICO (UTILITÁRIO/VAN)
// ============================================

// Caminho do corpo principal da van (vista isométrica)
export const VEHICLE_BODY_PATH = `
  M 60 180
  L 60 100
  Q 60 80 80 70
  L 240 70
  Q 260 80 260 100
  L 260 180
  Q 260 190 250 195
  L 70 195
  Q 60 190 60 180
  Z
`;

// Teto do veículo (parte superior 3D)
export const VEHICLE_ROOF_PATH = `
  M 70 70
  L 70 40
  Q 80 30 100 30
  L 220 30
  Q 240 30 250 40
  L 250 70
  L 70 70
  Z
`;

// Face lateral direita (efeito 3D)
export const VEHICLE_SIDE_RIGHT_PATH = `
  M 260 100
  L 280 90
  L 280 170
  L 260 180
  Z
`;

// Face superior (topo 3D)
export const VEHICLE_TOP_PATH = `
  M 70 30
  L 90 15
  L 270 15
  L 250 30
  Z
`;

// Cabine (frente do veículo)
export const VEHICLE_CABIN_PATH = `
  M 60 100
  L 60 70
  Q 60 55 75 50
  L 110 50
  Q 120 55 120 70
  L 120 100
  Z
`;

// Janela da cabine
export const VEHICLE_WINDOW_PATH = `
  M 70 95
  L 70 65
  Q 70 58 78 55
  L 105 55
  Q 112 58 112 65
  L 112 95
  Q 112 98 108 98
  L 75 98
  Q 70 98 70 95
  Z
`;

// Para-choque frontal
export const VEHICLE_BUMPER_FRONT_PATH = `
  M 55 102
  L 55 95
  Q 55 92 60 92
  L 125 92
  Q 130 92 130 95
  L 130 102
  Q 130 105 125 105
  L 60 105
  Q 55 105 55 102
  Z
`;

// Para-choque traseiro
export const VEHICLE_BUMPER_REAR_PATH = `
  M 55 195
  L 55 188
  L 265 188
  L 265 195
  Q 265 200 260 200
  L 60 200
  Q 55 200 55 195
  Z
`;

// ============================================
// POSIÇÕES DAS PARTES DO VEÍCULO NO SVG
// ============================================

export interface PartPosition {
    x: number;
    y: number;
    size: number;
    labelOffset: { x: number; y: number };
    icon: 'wheel' | 'engine' | 'brake' | 'light' | 'suspension' | 'generic';
}

export const PART_POSITIONS: Record<ParteVeiculo, PartPosition> = {
    // Motor (frente, centro-esquerda)
    MOTOR: { x: 90, y: 75, size: 32, labelOffset: { x: 0, y: -25 }, icon: 'engine' },

    // Óleo (próximo ao motor)
    OLEO: { x: 90, y: 110, size: 22, labelOffset: { x: -30, y: 0 }, icon: 'generic' },

    // Filtros (próximo ao motor)
    FILTROS: { x: 55, y: 85, size: 20, labelOffset: { x: -25, y: 0 }, icon: 'generic' },

    // Bateria (lado esquerdo do motor)
    BATERIA: { x: 55, y: 55, size: 22, labelOffset: { x: -30, y: 0 }, icon: 'generic' },

    // Correia (próximo ao motor)
    CORREIA: { x: 125, y: 75, size: 20, labelOffset: { x: 25, y: 0 }, icon: 'generic' },

    // Freios (centro do veículo)
    FREIOS: { x: 160, y: 130, size: 28, labelOffset: { x: 0, y: -20 }, icon: 'brake' },

    // Pneu Dianteiro Esquerdo
    PNEU_DIANTEIRO_E: { x: 45, y: 130, size: 36, labelOffset: { x: -35, y: 0 }, icon: 'wheel' },

    // Pneu Dianteiro Direito
    PNEU_DIANTEIRO_D: { x: 275, y: 120, size: 36, labelOffset: { x: 30, y: 0 }, icon: 'wheel' },

    // Pneu Traseiro Esquerdo
    PNEU_TRASEIRO_E: { x: 45, y: 200, size: 36, labelOffset: { x: -35, y: 0 }, icon: 'wheel' },

    // Pneu Traseiro Direito
    PNEU_TRASEIRO_D: { x: 275, y: 190, size: 36, labelOffset: { x: 30, y: 0 }, icon: 'wheel' },

    // Suspensão (centro-baixo)
    SUSPENSAO: { x: 160, y: 165, size: 26, labelOffset: { x: 0, y: 20 }, icon: 'suspension' },

    // Embreagem (centro)
    EMBREAGEM: { x: 200, y: 130, size: 24, labelOffset: { x: 25, y: 0 }, icon: 'generic' },

    // Faróis (frente)
    FAROL: { x: 90, y: 50, size: 24, labelOffset: { x: 0, y: -20 }, icon: 'light' },

    // Lanternas (traseira)
    LANTERNA: { x: 250, y: 195, size: 24, labelOffset: { x: 0, y: 20 }, icon: 'light' },
};

// ============================================
// GRADIENTES SVG
// ============================================

export const GRADIENTS = {
    bodyGradient: {
        id: 'bodyGradient',
        colors: [
            { offset: '0%', color: VEHICLE_COLORS.bodyLight },
            { offset: '50%', color: VEHICLE_COLORS.bodyMain },
            { offset: '100%', color: VEHICLE_COLORS.bodyDark },
        ],
    },
    glassGradient: {
        id: 'glassGradient',
        colors: [
            { offset: '0%', color: VEHICLE_COLORS.glassReflection },
            { offset: '100%', color: VEHICLE_COLORS.glass },
        ],
    },
    shadowGradient: {
        id: 'shadowGradient',
        colors: [
            { offset: '0%', color: 'rgba(0,0,0,0.4)' },
            { offset: '100%', color: 'rgba(0,0,0,0)' },
        ],
    },
};
