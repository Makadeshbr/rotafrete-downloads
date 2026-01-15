/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Cores da Marca (Laranja Base + Variações)
        brand: {
          50: "#FFF7ED",
          100: "#FFEDD5",
          200: "#FED7AA",
          300: "#FDBA74",
          400: "#FB923C",
          500: "#FF6B00", // Laranja Aether Principal
          600: "#EA580C",
          700: "#C2410C",
          800: "#9A3412",
          900: "#7C2D12",
        },
        // Neon Accents (Para harmonizar com Lottie)
        neon: {
          blue: "#3B82F6",   // Azul Elétrico
          purple: "#8B5CF6", // Roxo Vibrante
          pink: "#EC4899",   // Rosa Neon
          cyan: "#06B6D4",   // Ciano Brilhante
          lime: "#84CC16",   // Verde Ácido
        },
        // Background Profundo (Dark Blue-Grey)
        dark: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B", // Surface Default
          850: "#162032", // Surface Darker
          900: "#0F172A", // Background App
          950: "#020617", // Deep Background
        },
        // Status Colors (Refinados)
        success: { DEFAULT: "#10B981", light: "#34D399" },
        warning: { DEFAULT: "#F59E0B", light: "#FBBF24" },
        danger: { DEFAULT: "#EF4444", light: "#F87171" },

        // Cores Veiculares (Sincronizadas com Lottie)
        vehicle: {
          passeio: "#3B82F6",    // Azul
          utilitario: "#22C55E", // Verde
          van: "#A855F7",        // Roxo
          vuc: "#F59E0B",        // Laranja/Amarelo
        },
      },
      fontFamily: {
        // Fontes modernas
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Poppins", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        // Tamanhos acessíveis para motoristas mais velhos
        "2xs": ["10px", { lineHeight: "14px" }],
        xs: ["12px", { lineHeight: "16px" }],
        sm: ["14px", { lineHeight: "20px" }],
        base: ["16px", { lineHeight: "24px" }],
        lg: ["18px", { lineHeight: "28px" }],
        xl: ["20px", { lineHeight: "28px" }],
        "2xl": ["24px", { lineHeight: "32px" }],
        "3xl": ["30px", { lineHeight: "36px" }],
        "4xl": ["36px", { lineHeight: "40px" }],
        "5xl": ["48px", { lineHeight: "1" }],
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        // Glow Effects (Multi-color)
        "glow-brand": "0 0 20px rgba(255, 107, 0, 0.3)",
        "glow-brand-lg": "0 0 40px rgba(255, 107, 0, 0.5)",
        "glow-blue": "0 0 20px rgba(59, 130, 246, 0.4)",
        "glow-purple": "0 0 20px rgba(139, 92, 246, 0.4)",
        "glow-success": "0 0 20px rgba(16, 185, 129, 0.4)",

        // Card Shadows
        card: "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.15)",
        "card-hover": "0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2)",
        "inner-light": "inset 0 1px 0 0 rgba(255, 255, 255, 0.05)",
      },
    },
  },
  plugins: [],
};
