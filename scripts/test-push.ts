// scripts/test-push.ts
// Test push notification sending directly

const API_URL = 'https://api-plataforma-production-a92f.up.railway.app';
const API_KEY = 'pk_7e495666b3d21b43b33ddcd2.be0d23b68e6823813e9f0db81c0202dbabceb85fb941de384cb9dd19e0b18704';
const PROJECT_ID = 'c8b14d97-6623-427a-b8a4-3894fb7dc894';

// User ID do motorista (from the logs: 8ab96e6f-c5e9-4814-96c1-c23e0b1dcbb5)
const USER_ID = '8ab96e6f-c5e9-4814-96c1-c23e0b1dcbb5';

async function testPush() {
    console.log('🔔 Testing push notification...\n');

    // 1. First, check if user has registered devices
    console.log('1. Checking registered devices...');
    try {
        const devicesRes = await fetch(
            `${API_URL}/v1/projects/${PROJECT_ID}/push/devices?userId=${USER_ID}`,
            {
                headers: { 'X-API-Key': API_KEY },
            }
        );
        const devices = await devicesRes.json();
        console.log('Devices:', JSON.stringify(devices, null, 2));
    } catch (e) {
        console.log('Could not fetch devices:', e);
    }

    // 2. Send a test notification directly
    console.log('\n2. Sending test notification...');
    try {
        const sendRes = await fetch(
            `${API_URL}/v1/projects/${PROJECT_ID}/push/send`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY,
                },
                body: JSON.stringify({
                    userId: USER_ID,
                    title: '🧪 Teste de Notificação',
                    body: 'Se você está vendo isso, o push está funcionando!',
                    data: {
                        screen: '/(tabs)/maintenance',
                        test: true,
                    },
                    priority: 'high',
                }),
            }
        );

        const result = await sendRes.json();
        console.log('Send result:', JSON.stringify(result, null, 2));

        if (sendRes.ok) {
            console.log('\n✅ Push sent successfully!');
        } else {
            console.log('\n❌ Push failed:', result);
        }
    } catch (e) {
        console.error('❌ Error sending push:', e);
    }

    // 3. Check triggers
    console.log('\n3. Checking triggers...');
    try {
        const triggersRes = await fetch(
            `${API_URL}/v1/projects/${PROJECT_ID}/push/triggers`,
            {
                headers: { 'X-API-Key': API_KEY },
            }
        );
        const triggers = await triggersRes.json();
        console.log('Triggers:', JSON.stringify(triggers.data, null, 2));
    } catch (e) {
        console.log('Could not fetch triggers:', e);
    }
}

testPush();
