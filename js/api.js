// API Service
class MarketAPI {
    constructor() {
        this.apiKey = CONFIG.ALPHA_VANTAGE_API_KEY;
        this.baseUrl = CONFIG.API_BASE_URL;
        this.cache = {};
        this.lastFetch = null;
    }

    // Valuta ophalen
    async getForex(from, to) {
        const url = `${this.baseUrl}?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${this.apiKey}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data['Realtime Currency Exchange Rate']) {
                return parseFloat(data['Realtime Currency Exchange Rate']['5. Exchange Rate']);
            }
            throw new Error('Invalid response');
        } catch (error) {
            console.error(`Error fetching ${from}/${to}:`, error);
            return null;
        }
    }

    // Grondstoffen (via Yahoo Finance proxy)
    async getCommodity(symbol) {
        // Gebruik een gratis proxy voor Yahoo Finance
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.chart && data.chart.result && data.chart.result[0]) {
                const meta = data.chart.result[0].meta;
                return meta.regularMarketPrice || meta.previousClose;
            }
            throw new Error('Invalid response');
        } catch (error) {
            console.error(`Error fetching ${symbol}:`, error);
            return null;
        }
    }

    // Alle marktdata in één keer ophalen
    async fetchAllMarketData() {
        console.log('🔄 Ophalen marktdata...');
        
        const results = {
            timestamp: new Date().toISOString(),
            eurusd: null,
            gold: null,
            brent: null,
            stoxx: null,
            vstoxx: null,
            ecb_rate: CONFIG.FALLBACK_DATA.ecb_rate,
            bund_10y: CONFIG.FALLBACK_DATA.bund_10y
        };

        try {
            // Parallel requests
            const [eurusd, gold, brent, stoxx, vstoxx] = await Promise.all([
                this.getForex('EUR', 'USD'),
                this.getCommodity('GC=F'), // Goud
                this.getCommodity('BZ=F'), // Brent Olie
                this.getCommodity('^STOXX50E'), // Euro Stoxx 50
                this.getCommodity('^VSTOXX') // VSTOXX
            ]);

            results.eurusd = eurusd || CONFIG.FALLBACK_DATA.eurusd;
            results.gold = gold || CONFIG.FALLBACK_DATA.gold;
            results.brent = brent || CONFIG.FALLBACK_DATA.brent;
            results.stoxx = stoxx || CONFIG.FALLBACK_DATA.stoxx;
            results.vstoxx = vstoxx || CONFIG.FALLBACK_DATA.vstoxx;

            console.log('✅ Marktdata succesvol opgehaald:', results);
            return results;
        } catch (error) {
            console.error('❌ Fout bij ophalen marktdata:', error);
            return {
                ...CONFIG.FALLBACK_DATA,
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    }

    // Cache controle
    isCacheValid() {
        if (!this.lastFetch) return false;
        const diff = Date.now() - this.lastFetch;
        return diff < CONFIG.REFRESH_INTERVAL;
    }
}

// Exporteer instantie
const marketAPI = new MarketAPI();
