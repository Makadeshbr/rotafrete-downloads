// scripts/setup-rules.ts
// ============================================
// ROTAFRETE - Script para configurar regras no Aether
// ============================================
// Execute com: npx ts-node scripts/setup-rules.ts
// ============================================

const API_URL = process.env.EXPO_PUBLIC_AETHER_API_URL || 'https://api-plataforma-production-a92f.up.railway.app';
const PROJECT_ID = process.env.EXPO_PUBLIC_AETHER_PROJECT_ID || 'c8b14d97-6623-427a-b8a4-3894fb7dc894';

// Regras de database - wildcard que permite qualquer collection
// Usuário autenticado pode ler/escrever documentos onde userId == auth.uid
const DATABASE_RULES = `
// Regra Wildcard para todas as collections
match /database/* {
  // Usuários autenticados podem listar, ler e escrever seus próprios dados
  allow read, list: if auth != null && (
    resource.data.motoristaId == auth.uid ||
    resource.data.userId == auth.uid
  );
  
  // Criar: userId/motoristaId no documento deve ser do usuário autenticado
  allow create: if auth != null && (
    request.data.motoristaId == auth.uid ||
    request.data.userId == auth.uid
  );
  
  // Atualizar e deletar: só o dono do documento
  allow update, delete: if auth != null && (
    resource.data.motoristaId == auth.uid ||
    resource.data.userId == auth.uid
  );
}
`;

// Regras específicas para storage (opcional)
const STORAGE_RULES = `
// Regra para bucket default
match /storage/default/* {
  // Usuários autenticados podem ler qualquer arquivo
  allow read: if auth != null;
  
  // Usuários autenticados podem fazer upload na pasta do seu ID
  allow write: if auth != null && path.startsWith("/users/" + auth.uid);
}
`;

async function setupRules() {
    console.log('🔧 Configurando regras do Aether para RotaFrete...\n');
    console.log(`API: ${API_URL}`);
    console.log(`Project: ${PROJECT_ID}\n`);

    // Para configurar regras, precisamos de autenticação de admin
    // Por enquanto, vamos apenas mostrar as regras que precisam ser configuradas

    console.log('📋 REGRAS DE DATABASE (copie para o painel Aether):');
    console.log('='.repeat(60));
    console.log(DATABASE_RULES);
    console.log('='.repeat(60));

    console.log('\n📋 REGRAS DE STORAGE (opcional):');
    console.log('='.repeat(60));
    console.log(STORAGE_RULES);
    console.log('='.repeat(60));

    console.log('\n📌 COMO CONFIGURAR:');
    console.log('1. Acesse o painel Aether: https://aether-admin-coral.vercel.app/');
    console.log('2. Vá em Segurança > Database Rules');
    console.log('3. Selecione "Wildcard (*)" como alvo');
    console.log('4. Cole as regras acima');
    console.log('5. Clique em Salvar');
    console.log('\nOU use a API diretamente (requer token de admin):');
    console.log(`
PUT ${API_URL}/v1/projects/${PROJECT_ID}/rules/database/*
Headers:
  Authorization: Bearer <ADMIN_TOKEN>
  Content-Type: application/json
Body:
  {
    "source": "<REGRAS_ACIMA>",
    "enabled": true
  }
`);
}

setupRules();
