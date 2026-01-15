// scripts/debug-push.ts
// Debug script to check push configuration

const API_URL = 'https://api-plataforma-production-a92f.up.railway.app';
const API_KEY = 'pk_7e495666b3d21b43b33ddcd2.be0d23b68e6823813e9f0db81c0202dbabceb85fb941de384cb9dd19e0b18704';
const PROJECT_ID = 'c8b14d97-6623-427a-b8a4-3894fb7dc894';
const USER_ID = '8ab96e6f-c5e9-4814-96c1-c23e0b1dcbb5';

async function debugPush() {
    console.log('🔍 Debug Push Configuration\n');
    console.log('Project ID:', PROJECT_ID);
    console.log('User ID:', USER_ID);
    console.log('---');

    // 1. List ALL devices for project
    console.log('\n1. ALL devices in project:');
    try {
        const res = await fetch(
            `${API_URL}/v1/projects/${PROJECT_ID}/push/devices`,
            { headers: { 'X-API-Key': API_KEY } }
        );
        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Devices count:', data.data?.length || 0);
        if (data.data?.length > 0) {
            data.data.forEach((d: any, i: number) => {
                console.log(`\n  Device ${i + 1}:`);
                console.log(`    ID: ${d.id}`);
                console.log(`    UserId: ${d.userId}`);
                console.log(`    Token: ${d.token?.substring(0, 30)}...`);
                console.log(`    Platform: ${d.platform}`);
                console.log(`    Environment: ${d.environment}`);
            });
        }
    } catch (e: any) {
        console.log('Error:', e.message);
    }

    // 2. List devices for specific user
    console.log('\n2. Devices for USER_ID:', USER_ID);
    try {
        const res = await fetch(
            `${API_URL}/v1/projects/${PROJECT_ID}/push/devices?userId=${USER_ID}`,
            { headers: { 'X-API-Key': API_KEY } }
        );
        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Devices:', JSON.stringify(data, null, 2));
    } catch (e: any) {
        console.log('Error:', e.message);
    }

    // 3. List triggers
    console.log('\n3. Push triggers:');
    try {
        const res = await fetch(
            `${API_URL}/v1/projects/${PROJECT_ID}/push/triggers`,
            { headers: { 'X-API-Key': API_KEY } }
        );
        const data = await res.json();
        console.log('Triggers count:', data.data?.length || 0);
        data.data?.forEach((t: any, i: number) => {
            console.log(`\n  Trigger ${i + 1}: ${t.name}`);
            console.log(`    Collection: ${t.collectionName}`);
            console.log(`    Event: ${t.event}`);
            console.log(`    Enabled: ${t.enabled}`);
            console.log(`    TargetUserField: ${t.targetUserField}`);
            console.log(`    Times Triggered: ${t.timesTriggered}`);
        });
    } catch (e: any) {
        console.log('Error:', e.message);
    }

    // 4. Try sending with Expo Push Token directly
    console.log('\n4. Sending push via Expo token directly:');
    const EXPO_TOKEN = 'ExponentPushToken[m4pasXP1yCO7y3tBlYv7vx]';
    try {
        const res = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: EXPO_TOKEN,
                title: '🧪 Teste Direto Expo',
                body: 'Se você viu isso, Expo Push funciona!',
                sound: 'default',
                priority: 'high',
            }),
        });
        const data = await res.json();
        console.log('Expo response:', JSON.stringify(data, null, 2));
    } catch (e: any) {
        console.log('Error:', e.message);
    }
}

debugPush();
