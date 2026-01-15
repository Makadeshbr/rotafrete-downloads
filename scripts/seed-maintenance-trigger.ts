// scripts/seed-maintenance-trigger.ts
// Script to create maintenance push trigger for RotaFrete

const API_URL = process.env.AETHER_API_URL || 'https://api-plataforma-production-a92f.up.railway.app';
const API_KEY = 'pk_7e495666b3d21b43b33ddcd2.be0d23b68e6823813e9f0db81c0202dbabceb85fb941de384cb9dd19e0b18704';
const PROJECT_ID = 'c8b14d97-6623-427a-b8a4-3894fb7dc894'; // RotaFrete Project ID

async function createMaintenanceTrigger() {
    console.log('Creating maintenance push trigger...');
    console.log(`API URL: ${API_URL}`);
    console.log(`Project ID: ${PROJECT_ID}`);

    const triggerPayload = {
        name: 'Confirmação de Agendamento',
        description: 'Notifica o motorista quando uma manutenção é agendada',
        collectionName: 'agendamentos_manutencao',
        event: 'create', // Dispara quando criar novo agendamento
        conditions: {
            status: { equals: 'AGENDADA' }, // Quando status = AGENDADA
        },
        targetUserField: 'motoristaId', // Campo que contém o userId para notificar
        titleTemplate: '🔧 Manutenção Agendada!',
        bodyTemplate: 'Sua manutenção de {{parteVeiculo}} foi agendada para {{dataAgendada}}.',
        dataTemplate: {
            screen: '/(tabs)/maintenance',
            agendamentoId: '{{id}}',
        },
        enabled: true,
        priority: 'high',
    };

    try {
        const response = await fetch(
            `${API_URL}/v1/projects/${PROJECT_ID}/push/triggers`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY,
                },
                body: JSON.stringify(triggerPayload),
            }
        );

        if (!response.ok) {
            const error = await response.json();
            console.error('❌ Failed to create trigger:', error);
            process.exit(1);
        }

        const result = await response.json();
        console.log('✅ Trigger created successfully!');
        console.log(JSON.stringify(result.data, null, 2));
    } catch (error) {
        console.error('❌ Request failed:', error);
        process.exit(1);
    }
}

createMaintenanceTrigger();
