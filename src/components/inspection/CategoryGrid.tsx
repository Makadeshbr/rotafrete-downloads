// src/components/inspection/CategoryGrid.tsx
// ============================================
// ROTAFRETE - Grid de Categorias de Inspeção
// ============================================
// Exibe as categorias de inspeção em formato
// de grid, com progresso e status de cada uma.
// ============================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  Circle,
  Disc,
  Lightbulb,
  Eye,
  ShieldCheck,
  Droplet,
  FileText,
  Check,
  Clock,
} from 'lucide-react-native';
import { CATEGORIAS_INSPECAO } from '@/constants/inspection';
import type { CategoriaInspecao, ItemInspecao } from '@/types/inspection';

// ============================================
// TIPOS
// ============================================

interface CategoriaComProgresso {
  categoria: CategoriaInspecao;
  itensEnviados: number;
  totalItens: number;
  completa: boolean;
}

interface CategoryGridProps {
  /** Dados das categorias com progresso */
  categorias: CategoriaComProgresso[];
  /** Callback ao pressionar uma categoria */
  onCategoriaPress: (categoria: CategoriaInspecao) => void;
  /** Se está em modo de apenas visualização (desabilita press) */
  readOnly?: boolean;
  /** Número de colunas do grid */
  numColumns?: number;
}

interface CategoryCardProps {
  categoria: CategoriaComProgresso;
  onPress: () => void;
  readOnly?: boolean;
  cardWidth: number;
}

// ============================================
// MAPA DE ÍCONES
// ============================================

const CATEGORY_ICONS: Record<CategoriaInspecao, React.ComponentType<any>> = {
  PNEUS: Circle,
  FREIOS: Disc,
  ILUMINACAO: Lightbulb,
  VISIBILIDADE: Eye,
  SEGURANCA: ShieldCheck,
  FLUIDOS: Droplet,
  DOCUMENTACAO: FileText,
};

// ============================================
// COMPONENTE: CARD DE CATEGORIA
// ============================================

/**
 * Card individual de uma categoria.
 */
function CategoryCard({
  categoria,
  onPress,
  readOnly = false,
  cardWidth,
}: CategoryCardProps): React.ReactElement {
  const config = CATEGORIAS_INSPECAO[categoria.categoria];
  const Icon = CATEGORY_ICONS[categoria.categoria];
  const progresso = categoria.totalItens > 0
    ? Math.round((categoria.itensEnviados / categoria.totalItens) * 100)
    : 0;

  // Determina status visual
  const isComplete = categoria.completa;
  const hasProgress = categoria.itensEnviados > 0;

  // Cores baseadas no status
  const backgroundColor = isComplete
    ? '#052E16' // Verde escuro
    : hasProgress
    ? '#1E293B' // Slate
    : '#0F172A'; // Mais escuro

  const borderColor = isComplete
    ? '#22C55E' // Verde
    : hasProgress
    ? config.cor
    : '#334155'; // Cinza

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={readOnly}
      activeOpacity={0.7}
      style={[
        styles.card,
        {
          width: cardWidth,
          backgroundColor,
          borderColor,
        },
      ]}
    >
      {/* Ícone da categoria */}
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: `${config.cor}20` },
        ]}
      >
        <Icon
          size={24}
          color={isComplete ? '#22C55E' : config.cor}
          strokeWidth={2}
        />
      </View>

      {/* Nome da categoria */}
      <Text style={styles.categoryName} numberOfLines={1}>
        {config.nome}
      </Text>

      {/* Progresso */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          {categoria.itensEnviados}/{categoria.totalItens}
        </Text>

        {/* Indicador de status */}
        {isComplete ? (
          <View style={styles.statusComplete}>
            <Check size={12} color="#22C55E" strokeWidth={3} />
          </View>
        ) : hasProgress ? (
          <View style={styles.statusInProgress}>
            <Clock size={12} color="#F59E0B" strokeWidth={2} />
          </View>
        ) : (
          <View style={styles.statusPending}>
            <Clock size={12} color="#64748B" strokeWidth={2} />
          </View>
        )}
      </View>

      {/* Barra de progresso */}
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${progresso}%`,
              backgroundColor: isComplete ? '#22C55E' : config.cor,
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

// ============================================
// COMPONENTE: GRID DE CATEGORIAS
// ============================================

/**
 * Grid que exibe todas as categorias de inspeção.
 * 
 * @example
 * ```tsx
 * <CategoryGrid
 *   categorias={categoriasComProgresso}
 *   onCategoriaPress={(cat) => navigation.navigate('Camera', { categoria: cat })}
 * />
 * ```
 */
export function CategoryGrid({
  categorias,
  onCategoriaPress,
  readOnly = false,
  numColumns = 2,
}: CategoryGridProps): React.ReactElement {
  const screenWidth = Dimensions.get('window').width;
  const padding = 16;
  const gap = 12;
  const cardWidth = (screenWidth - padding * 2 - gap * (numColumns - 1)) / numColumns;

  // Agrupa categorias em linhas
  const rows: CategoriaComProgresso[][] = [];
  for (let i = 0; i < categorias.length; i += numColumns) {
    rows.push(categorias.slice(i, i + numColumns));
  }

  return (
    <View style={styles.container}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((categoria) => (
            <CategoryCard
              key={categoria.categoria}
              categoria={categoria}
              onPress={() => onCategoriaPress(categoria.categoria)}
              readOnly={readOnly}
              cardWidth={cardWidth}
            />
          ))}
          {/* Preenche espaço vazio na última linha */}
          {row.length < numColumns &&
            Array.from({ length: numColumns - row.length }).map((_, i) => (
              <View key={`empty-${i}`} style={{ width: cardWidth }} />
            ))}
        </View>
      ))}
    </View>
  );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  progressText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  statusComplete: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#052E16',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusInProgress: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#422006',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusPending: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});

export default CategoryGrid;
