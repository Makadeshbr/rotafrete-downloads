// app/index.tsx
// ============================================
// ROTAFRETE - Redirecionador Principal
// ============================================

import { Redirect } from 'expo-router';

// [CRITICO] Registra handler de background para Android (Headless JS)
// Deve ser importado o mais cedo possível
import '@/services/background-notifications';

export default function Index() {
  // Redireciona para as tabs (o _layout.tsx cuida da autenticação)
  return <Redirect href="/(tabs)" />;
}
