// Configuratie bestand - Update deze waardes
const CONFIG = {
    // Alpha Vantage API (gratis)
    ALPHA_VANTAGE_API_KEY: 'YOUR_ALPHA_VANTAGE_API_KEY', // Vervang met jouw key
    
    // Endpoints
    API_BASE_URL: 'https://www.alphavantage.co/query',
    
    // Refresh interval (milliseconden)
    REFRESH_INTERVAL: 60000, // 60 seconden
    
    // Fallback data (wordt gebruikt als API faalt)
    FALLBACK_DATA: {
        eurusd: 1.1395,
        gold: 4021.62,
        brent: 86.04,
        stoxx: 5090.45,
        vstoxx: 21.55,
        ecb_rate: 2.25,
        bund_10y: 3.11
    }
};

// Gelijkheid testen
console.log('📊 Configuratie geladen:', CONFIG);
