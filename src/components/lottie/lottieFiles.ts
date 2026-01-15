// src/components/lottie/lottieFiles.ts
// ============================================
// ROTAFRETE - Mapeamento de Arquivos Lottie
// ============================================
// Centraliza os requires dos arquivos Lottie para uso em componentes
// ============================================

// Importa todos os arquivos Lottie
// React Native requer que os arquivos sejam importados estaticamente
export const LOTTIE_FILES = {
    // Veículos
    Passeio: require('@/assets/lottie/Passeio.json'),
    Utilitario: require('@/assets/lottie/Utilitario.json'),
    Van: require('@/assets/lottie/Van.json'),
    VUC: require('@/assets/lottie/VUC.json'),

    // UI/Features
    previaMapa: require('@/assets/lottie/previaMapa.json'),
    ChatIa: require('@/assets/lottie/ChatIa.json'),
    AnimacaoPacotes: require('@/assets/lottie/AnimacaoPacotes.json'),
} as const;

export type LottieFileKey = keyof typeof LOTTIE_FILES;
