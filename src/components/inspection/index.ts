// src/components/inspection/index.ts
// ============================================
// ROTAFRETE - Exportações de Componentes de Inspeção
// ============================================

// Componentes de status
export { StatusBadge } from './StatusBadge';
export { ProgressRing, ProgressRingWithCount } from './ProgressRing';

// Componentes de layout
export { CategoryGrid } from './CategoryGrid';

// Componentes de itens e cards
export { ItemPhotoCard } from './ItemPhotoCard';
export { InspectionCard } from './InspectionCard';
export { DeadlineTimer } from './DeadlineTimer';

// Re-exporta tipos úteis
export type { StatusAvaliacao, CategoriaInspecao } from '@/types/inspection';
