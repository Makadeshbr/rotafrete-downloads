// rotafrete/functions/README.md
// ============================================
// ROTAFRETE - Aether Functions
// ============================================

# Aether Functions - RotaFrete

## Functions Disponíveis

### 1. `calculate-freight`
Calcula valor do frete baseado em km, veículo, turno e paradas.

**Payload:**
```json
{
  "km": 150,
  "vehicleType": "VAN",
  "shift": "AM",
  "date": "2026-01-03",
  "stops": 25
}
```

**Response:**
```json
{
  "valorKm": 427.18,
  "valorParadas": 8.75,
  "valorTotal": 435.93,
  "faixaKm": "151-200",
  "tipoDia": "SEMANA",
  "breakdown": { ... }
}
```

---

## Deploy

```bash
# Login no Aether CLI
aether-cli login

# Deploy de uma function
aether-cli function deploy calculate-freight ./functions/calculate-freight.ts

# Listar functions
aether-cli function list

# Testar function
aether-cli function invoke calculate-freight --data '{"km": 150, "vehicleType": "VAN", "shift": "AM", "date": "2026-01-03"}'
```

## Uso no App

```tsx
import { useFunction } from '@aether-baas/react-native';

function MyComponent() {
  const { invoke, isLoading } = useFunction('calculate-freight');
  
  const handleCalculate = async () => {
    const result = await invoke({
      km: 150,
      vehicleType: 'VAN',
      shift: 'AM',
      date: '2026-01-03',
      stops: 25
    });
    
    console.log(result.valorTotal); // 435.93
  };
}
```
