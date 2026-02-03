# 🚛 RotaFrete

**App de controle de ganhos para motoristas de transportadora**

Demo oficial do [Aether Platform](https://aether-admin-coral.vercel.app) - Backend-as-a-Service

![React Native](https://img.shields.io/badge/React_Native-0.76-61DAFB?style=flat-square&logo=react)
![Expo](https://img.shields.io/badge/Expo-52-000020?style=flat-square&logo=expo)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=flat-square&logo=typescript)
![Aether](https://img.shields.io/badge/Aether-Platform-FF6B00?style=flat-square)

---

## 📦 Download APK - Versão v4.6.0

**[⬇️ Baixar RotaFrete v4.6.0 (APK Standalone - 93 MB)](https://github.com/Makadeshbr/rotafrete-downloads/raw/main/rotafrete-v4.6.0-standalone.apk)**

### 📲 Como Instalar

1. Baixe o arquivo APK usando o link acima
2. No seu dispositivo Android, vá em **Configurações > Segurança**
3. Habilite **"Instalar apps de fontes desconhecidas"**
4. Abra o arquivo APK baixado e toque em **Instalar**

> ✅ **APK Standalone** - Não precisa do Expo Go
> ✅ **Android 7.0+** (API 24) ou superior

---

## ✨ Features

### 📊 Controle de Rotas
- Registro diário de KM rodados
- Cálculo automático do frete baseado na tabela oficial
- Diferenciação por turno (manhã/tarde) e tipo de dia (semana/domingo/feriado)
- Suporte a 4 tipos de veículo: Passeio, Utilitário, Van e VUC

### 🗺️ Prévia de Rota
- Integração com Google Maps Distance Matrix API
- Cálculo de distância antes de aceitar a corrida
- Estimativa de ganhos por cenário (dia/turno)
- Cache de cidades frequentes

### 📅 Histórico e Relatórios
- Resumo semanal (sexta a quinta - ciclo de pagamento)
- Estatísticas de desempenho
- Média diária, total de KM, dias trabalhados
- Navegação entre semanas

### 🔧 Manutenção do Veículo
- Diagrama interativo do veículo
- Controle de status por componente (OK/Atenção/Urgente)
- Alertas visuais para itens críticos

### 👤 Perfil Completo
- Informações do motorista
- Dados do veículo (tipo, placa, modelo)
- Preferências (turno, notificações)

---

## 🚀 Como Executar

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Expo CLI (`npm install -g expo-cli`)
- Android Studio ou Genymotion (para emulador)

### Instalação

```bash
# Clone o projeto ou extraia o ZIP
cd rotafrete

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npx expo start
```

### Executando no Emulador

1. **Genymotion** (recomendado):
   - Abra o Genymotion
   - Inicie o device Samsung Galaxy S24 (Android 15)
   - No terminal do Expo, pressione `a` para abrir no Android

2. **Android Studio**:
   - Abra o AVD Manager
   - Inicie um emulador
   - No terminal do Expo, pressione `a`

---

## 🔧 Configuração

### Variáveis de Ambiente (.env)

```env
# Aether Platform
EXPO_PUBLIC_AETHER_API_URL=https://api-plataforma-production-a92f.up.railway.app
EXPO_PUBLIC_AETHER_PROJECT_ID=c8b14d97-6623-427a-b8a4-3894fb7dc894
EXPO_PUBLIC_AETHER_API_KEY=pk_1e54794cbb41fa4e748c58ba.5e712b95a4b978cb9717ac4319c8e5bc90388812490cfca7c7a181afb96d1a6f

# Google Maps
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBSIb8dplnpJRYACe-W9v_3HtpSCYArVP4

# Configuração Base
EXPO_PUBLIC_CIDADE_BASE=Avaré
EXPO_PUBLIC_ESTADO_BASE=SP
```

---

## 📁 Estrutura do Projeto

```
rotafrete/
├── app/                      # Rotas (Expo Router)
│   ├── (auth)/              # Telas de autenticação
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/              # Telas principais (tabs)
│   │   ├── _layout.tsx
│   │   ├── index.tsx        # Home (registro de rotas)
│   │   ├── preview.tsx      # Prévia de rota
│   │   ├── history.tsx      # Histórico semanal
│   │   ├── maintenance.tsx  # Manutenção veículo
│   │   └── profile.tsx      # Perfil
│   ├── _layout.tsx          # Layout raiz
│   └── index.tsx            # Redirect
├── src/
│   ├── components/          # Componentes reutilizáveis
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       └── Input.tsx
│   ├── constants/           # Constantes e tabelas
│   │   ├── index.ts
│   │   └── pricing.ts       # Tabela de preços
│   ├── hooks/               # Custom hooks
│   ├── services/            # Serviços de API
│   │   ├── aether.ts        # Cliente Aether
│   │   └── maps.ts          # Google Maps
│   ├── store/               # Estado global (Zustand)
│   │   ├── useAuthStore.ts
│   │   └── useRotasStore.ts
│   ├── types/               # TypeScript types
│   └── utils/               # Utilitários
├── assets/                   # Imagens e ícones
├── app.json                  # Configuração Expo
├── tailwind.config.js        # Configuração Tailwind
└── package.json
```

---

## 🎨 Design System

### Cores da Marca

| Cor | Hex | Uso |
|-----|-----|-----|
| Brand Primary | `#FF6B00` | Botões, destaques |
| Brand Dark | `#EA580C` | Gradientes |
| Background | `#0F172A` | Fundo principal |
| Surface | `#1E293B` | Cards |
| Border | `#334155` | Bordas |

### Cores de Veículos

| Tipo | Cor |
|------|-----|
| Passeio | `#3B82F6` (Azul) |
| Utilitário | `#22C55E` (Verde) |
| Van | `#A855F7` (Roxo) |
| VUC | `#F59E0B` (Amarelo) |

### Tipografia

- **Display**: Poppins (títulos)
- **Body**: Inter (texto)
- **Mono**: JetBrains Mono (código)

### Tamanhos de Fonte (Acessíveis)

- Mínimo: 14px
- Padrão: 16px
- Títulos: 18-24px
- Grande display: 32-42px

---

## 🔌 Integração com Aether

O app utiliza o **Aether Platform** como backend:

### Autenticação (Tenant Auth)
```typescript
// Login
const response = await authService.login(email, password);

// Registro
await authService.register({ email, password, name, data });

// Perfil
const user = await authService.getProfile();
```

### Collections (Data API)
```typescript
// Listar rotas
const { data } = await dataService.list<Rota>('rotas', {
  filter: { motoristaId },
  sort: { field: 'data', order: 'DESC' }
});

// Criar rota
const rota = await dataService.create<Rota>('rotas', rotaData);
```

### Collections Utilizadas

| Collection | Descrição |
|------------|-----------|
| `rotas` | Registros diários de KM e frete |
| `abastecimentos` | Gastos com combustível |
| `pedagios` | Gastos com pedágio |
| `manutencoes` | Histórico de manutenção |

---

## 📱 Screenshots

*Em breve*

---

## 🧪 Testes

```bash
# Rodar linter
npm run lint

# Formatar código
npm run format
```

---

## 📦 Build

### APK para Teste

```bash
# Usando EAS Build
npx eas build -p android --profile preview

# Build local (requer Android Studio)
npx expo run:android --variant release
```

### Publicar na Play Store

```bash
npx eas build -p android --profile production
npx eas submit -p android
```

---

## 🤝 Contribuição

Este é um projeto demo do Aether Platform. Para contribuir:

1. Fork o repositório
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Add nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

---

## 📄 Licença

Projeto demo - Uso livre para aprendizado.

---

## 👨‍💻 Desenvolvido por

**Allan F. Souza**  
Utilizando [Aether Platform](https://aether-admin-coral.vercel.app) + Claude AI

---

<p align="center">
  <img src="https://img.shields.io/badge/Powered%20by-Aether%20Platform-FF6B00?style=for-the-badge" alt="Powered by Aether" />
</p>
