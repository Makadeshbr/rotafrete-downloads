# 🔒 Regras de Segurança Aether - RotaFrete

Regras de segurança compatíveis com Firebase V2 para o painel Aether.

---

## 📋 Regras do Banco (Database)

Copie e cole na aba **"Regras do Banco"**:

```javascript
rules_version = '2';
service cloud.database {

    // ===============================================
    // FUNÇÕES AUXILIARES (devem ficar no nível global)
    // ===============================================
    
    function isAuthenticated() {
        return auth != null;
    }
    
    function isAdmin() {
        return auth != null && auth.role == 'admin';
    }
    
    function isOwnerByMotoristaId() {
        return auth != null && resource.data.motoristaId == auth.uid;
    }
    
    function isOwnerByUserId() {
        return auth != null && resource.data.userId == auth.uid;
    }

    // ===============================================
    // INSPEÇÕES VEICULARES
    // ===============================================
    
    match /inspecoes_veiculares/{docId} {
        allow read, list: if auth != null
            && (auth.role == 'admin' || resource.data.motoristaId == auth.uid);
            
        allow create: if auth != null
            && request.data.motoristaId == auth.uid;
            
        allow update: if auth != null
            && (auth.role == 'admin' || resource.data.motoristaId == auth.uid);
            
        allow delete: if auth != null && auth.role == 'admin';
    }

    // ===============================================
    // ITENS DE INSPEÇÃO (Regras Explícitas - Enterprise)
    // ===============================================
    
    match /itens_inspecao/{docId} {
        // [FIX] Leitura direta (Get) garantida pelo dono
        allow read: if auth != null
            && (auth.role == 'admin' || resource.data.motoristaId == auth.uid);
            
        // [FIX] Listagem requer filtro ou admin
        allow list: if auth != null
            && (auth.role == 'admin' || resource.data.motoristaId == auth.uid);
            
        allow create: if auth != null
            && request.data.motoristaId == auth.uid;
            
        allow update: if auth != null
            && (auth.role == 'admin' || resource.data.motoristaId == auth.uid);
            
        allow delete: if auth != null && auth.role == 'admin';
    }

    // ===============================================
    // OUTRAS COLEÇÕES (Rotas, Despesas, etc) - Fallback
    // ===============================================
    
    match /{collection}/{docId} {
        allow read, list: if auth != null
            && (auth.role == 'admin' || resource.data.motoristaId == auth.uid);
        allow create: if auth != null && request.data.motoristaId == auth.uid;
        allow update: if auth != null && (auth.role == 'admin' || resource.data.motoristaId == auth.uid);
        allow delete: if auth != null && auth.role == 'admin';
    }

    // ===============================================
    // COLEÇÃO MOTORISTAS (perfis de usuário)
    // ===============================================
    // Usa userId em vez de motoristaId
    
    match /motoristas/{docId} {
        allow read, list: if auth != null
            && (auth.role == 'admin' || resource.data.userId == auth.uid);
        
        allow create: if auth != null
            && request.data.userId == auth.uid;
        
        allow update: if auth != null
            && (auth.role == 'admin' || resource.data.userId == auth.uid);
        
        allow delete: if auth != null && auth.role == 'admin';
    }

    // ===============================================
    // CONFIG GLOBAL DE INSPEÇÃO (leitura pública)
    // ===============================================
    
    match /config_inspecao_global/{docId} {
        allow read, list: if auth != null;
        allow create, update, delete: if auth != null && auth.role == 'admin';
    }

}
```

---

## 📦 Regras de Storage

Copie e cole na aba **"Regras de Storage"**:

```javascript
rules_version = '2';
service cloud.storage {

    // [FIX] Permite acesso TOTAL ao Admin do Projeto (Dashboard)
    // Isso evita o erro "Nenhuma regra corresponde" ao navegar na raiz
    match /{allPaths=**} {
        allow read, write: if auth != null && auth.role == 'admin';
    }

    // Pasta do usuário - avatares (públicos para leitura)
    match /users/{userId}/{allPaths=**} {
        allow read: if true;
        allow write: if auth != null
            && auth.uid == userId;
    }

    // Pasta de inspeções - fotos de veículos
    match /inspecoes/{motoristaId}/{allPaths=**} {
        allow read: if auth != null
            && (auth.role == 'admin' || auth.uid == motoristaId);
        
        allow write: if auth != null
            && auth.uid == motoristaId;
    }

    // Pasta motoristas - documentos e fotos
    match /motoristas/{motoristaId}/{allPaths=**} {
        allow read: if auth != null
            && (auth.role == 'admin' || auth.uid == motoristaId);
        
        allow write: if auth != null
            && auth.uid == motoristaId;
    }

}
```

---

## 🔑 Referência de Variáveis

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `auth` | Usuário autenticado atual | `auth != null` |
| `auth.uid` | ID do usuário (igual a request.auth.uid) | `auth.uid == 'abc123'` |
| `auth.role` | Role do metadata do usuário | `auth.role == 'admin'` |
| `auth.email` | Email do usuário | `auth.email` |
| `resource.data` | Dados do documento existente | `resource.data.motoristaId` |
| `request.data` | Dados sendo enviados (create/update) | `request.data.motoristaId` |

---

## ✅ Checklist

- [ ] Copiar regras do banco
- [ ] Clicar em "Publicar" na aba banco
- [ ] Copiar regras de storage
- [ ] Clicar em "Publicar" na aba storage
- [ ] Testar com Simulador: `read` em `/motoristas/user123` com Auth UID: `user123`
