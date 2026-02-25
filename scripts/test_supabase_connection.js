const fetch = require('node-fetch');

const SUPABASE_URL = 'https://egfnbnluepzzezfriocc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gmZ9u-qIp28q8kgEJoE4cw_TOz_oeMH';

async function testSupabase() {
    console.log('Testing Supabase connection...');
    console.log('URL:', SUPABASE_URL);

    try {
        // Try to fetch the settings or a simple public resource
        const startTime = Date.now();
        const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Content-Type': 'application/json'
            }
        });

        const duration = Date.now() - startTime;
        console.log('Status:', response.status);
        console.log('Status Text:', response.statusText);

        if (response.ok) {
            const data = await response.json();
            console.log('Successfully connected to Supabase!');
            console.log('Connection time:', duration, 'ms');
            console.log('Response content type:', response.headers.get('content-type'));
        } else {
            console.error('Failed to connect. Error detail:');
            const text = await response.text();
            console.error(text);
        }
    } catch (error) {
        console.error('Network Error:', error.message);
        if (error.code) console.error('Error Code:', error.code);
    }
}

testSupabase();
