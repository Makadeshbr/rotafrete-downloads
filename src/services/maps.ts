// src/services/maps.ts
// ============================================
// ROTAFRETE - Serviço Google Maps
// ============================================

import axios from 'axios';
import { CIDADE_BASE } from '@/constants';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// Interface para resultado da Distance Matrix API
interface DistanceMatrixResponse {
  status: string;
  origin_addresses: string[];
  destination_addresses: string[];
  rows: Array<{
    elements: Array<{
      status: string;
      distance: {
        text: string;
        value: number; // metros
      };
      duration: {
        text: string;
        value: number; // segundos
      };
    }>;
  }>;
}

// Interface para resultado do Places Autocomplete
interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface PlacesAutocompleteResponse {
  status: string;
  predictions: PlacePrediction[];
}

// ============================================
// SERVIÇO DE MAPAS
// ============================================

export const mapsService = {
  /**
   * Calcula a distância entre a cidade base (Avaré) e uma cidade de destino
   * Usa a Google Distance Matrix API
   */
  async calcularDistancia(cidadeDestino: string): Promise<{
    distanciaKm: number;
    duracaoMinutos: number;
    origemFormatada: string;
    destinoFormatado: string;
  }> {
    const origem = `${CIDADE_BASE.nome}, ${CIDADE_BASE.estado}, Brasil`;
    const destino = `${cidadeDestino}, Brasil`;

    try {
      const response = await axios.get<DistanceMatrixResponse>(
        'https://maps.googleapis.com/maps/api/distancematrix/json',
        {
          params: {
            origins: origem,
            destinations: destino,
            mode: 'driving',
            language: 'pt-BR',
            key: GOOGLE_MAPS_API_KEY,
          },
        }
      );

      if (response.data.status !== 'OK') {
        throw new Error(`Erro na API: ${response.data.status}`);
      }

      const element = response.data.rows[0]?.elements[0];

      if (!element || element.status !== 'OK') {
        throw new Error('Não foi possível calcular a rota para este destino');
      }

      return {
        distanciaKm: Math.round(element.distance.value / 1000),
        duracaoMinutos: Math.round(element.duration.value / 60),
        origemFormatada: response.data.origin_addresses[0],
        destinoFormatado: response.data.destination_addresses[0],
      };
    } catch (error) {
      console.error('[Maps] Erro ao calcular distância:', error);
      throw error;
    }
  },

  /**
   * Busca sugestões de cidades para autocomplete
   * Usa a Google Places Autocomplete API
   */
  async buscarCidades(input: string): Promise<Array<{
    id: string;
    nome: string;
    descricao: string;
  }>> {
    if (!input || input.length < 3) {
      return [];
    }

    try {
      const response = await axios.get<PlacesAutocompleteResponse>(
        'https://maps.googleapis.com/maps/api/place/autocomplete/json',
        {
          params: {
            input,
            types: '(cities)',
            components: 'country:br', // Apenas Brasil
            language: 'pt-BR',
            key: GOOGLE_MAPS_API_KEY,
          },
        }
      );

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        console.warn('[Maps] Status da API:', response.data.status);
        return [];
      }

      return response.data.predictions.map((pred) => ({
        id: pred.place_id,
        nome: pred.structured_formatting.main_text,
        descricao: pred.structured_formatting.secondary_text,
      }));
    } catch (error) {
      console.error('[Maps] Erro ao buscar cidades:', error);
      return [];
    }
  },

  /**
   * Calcula distância estimada usando coordenadas (fallback offline)
   * Fórmula de Haversine - menos preciso mas funciona offline
   */
  calcularDistanciaOffline(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Raio da Terra em km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
      Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distancia = R * c;

    // Adiciona 30% para aproximar distância rodoviária
    return Math.round(distancia * 1.3);
  },

  toRad(deg: number): number {
    return deg * (Math.PI / 180);
  },
};

// ============================================
// CIDADES FREQUENTES (Cache offline)
// ============================================

// Distâncias pré-calculadas de Avaré para cidades frequentes
export const DISTANCIAS_CACHE: Record<string, number> = {
  // Região de Avaré
  'Itaí': 30,
  'Cerqueira César': 25,
  'Taquarituba': 50,
  'Itapetininga': 85,
  'Botucatu': 95,
  'Piraju': 75,
  'Arandu': 25,
  'Paranapanema': 45,
  'Tejupá': 35,
  'Fartura': 55,
  'Bernardino de Campos': 60,
  'Santa Cruz do Rio Pardo': 65,
  'Óleo': 40,
  'Manduri': 35,
  'Águas de Santa Bárbara': 20,
  'Iaras': 25,

  // Cidades maiores
  'São Paulo': 270,
  'Campinas': 230,
  'Sorocaba': 150,
  'Bauru': 140,
  'Marília': 150,
  'Ourinhos': 100,
  'Assis': 130,
  'Ribeirão Preto': 280,
  'São José do Rio Preto': 350,
  'Presidente Prudente': 250,
  'Araraquara': 220,
  'São Carlos': 200,
  'Limeira': 190,
  'Piracicaba': 180,
  'Jundiaí': 240,
  'Santos': 300,
  'São José dos Campos': 310,
  'Guarulhos': 280,
  'Osasco': 270,
  'Santo André': 275,
  'São Bernardo do Campo': 275,

  // Capitais próximas
  'Curitiba': 380,
  'Londrina': 280,
  'Maringá': 320,
  'Belo Horizonte': 650,
  'Rio de Janeiro': 550,
  'Goiânia': 580,
  'Brasília': 850,

  // Interior SP - Região
  'Lençóis Paulista': 80,
  'Agudos': 100,
  'Pederneiras': 95,
  'Jaú': 110,
  'Itatinga': 55,
  'Bofete': 70,
  'Anhembi': 60,
  'Conchas': 75,
  'Laranjal Paulista': 100,
  'Tatuí': 115,
  'Itapeva': 130,
  'Apiaí': 180,
  'Registro': 280,
  'Itu': 170,
  'Salto': 180,
  'Indaiatuba': 200,
  'Americana': 195,
  'Sumaré': 210,
  'Hortolândia': 215,
  'Valinhos': 220,
  'Vinhedo': 225,
};

/**
 * Busca cidades no cache local
 * Retorna lista de cidades que correspondem à busca
 */
export function buscarCidadesCache(query: string): Array<{
  id: string;
  nome: string;
  descricao: string;
  distancia: number;
}> {
  if (!query || query.length < 2) return [];

  const queryNormalizada = query
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const resultados: Array<{
    id: string;
    nome: string;
    descricao: string;
    distancia: number;
  }> = [];

  for (const [cidade, distancia] of Object.entries(DISTANCIAS_CACHE)) {
    const cidadeNormalizada = cidade
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    if (cidadeNormalizada.includes(queryNormalizada)) {
      resultados.push({
        id: cidade.toLowerCase().replace(/\s+/g, '-'),
        nome: cidade,
        descricao: 'SP, Brasil',
        distancia,
      });
    }
  }

  // Ordena por distância mais próxima
  return resultados.sort((a, b) => a.distancia - b.distancia).slice(0, 10);
}

/**
 * Tenta buscar distância do cache antes de chamar a API
 */
export function getDistanciaCache(cidade: string): number | null {
  const cidadeNormalizada = cidade
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  for (const [key, value] of Object.entries(DISTANCIAS_CACHE)) {
    const keyNormalizada = key
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    if (cidadeNormalizada.includes(keyNormalizada) || keyNormalizada.includes(cidadeNormalizada)) {
      return value;
    }
  }

  return null;
}

export default mapsService;
