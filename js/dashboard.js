// Dashboard Controller
class Dashboard {
    constructor() {
        this.elements = {};
        this.data = null;
        this.initializeElements();
        this.setupEventListeners();
        this.loadData();
        this.startAutoRefresh();
    }

    initializeElements() {
        // Alle DOM elementen ophalen
        const ids = [
            'timestamp', 'status-dot', 'footer-timestamp',
            'ecb-rate', 'ecb-change',
            'bund-10y', 'bund-change',
            'eurusd', 'eurusd-change',
            'stoxx', 'stoxx-change',
            'vstoxx', 'vstoxx-change',
            'brent', 'brent-change',
            'gold', 'gold-change',
            'ecb-rate-detail', 'fed-rate', 'boe-rate', 'boj-rate', 'pboc-rate',
            'hicp', 'core-inflation', 'inflation-swap',
            'pmi-manufacturing', 'pmi-services', 'gdp-growth'
        ];

        ids.forEach(id => {
            this.elements[id] = document.getElementById(id);
        });
    }

    setupEventListeners() {
        // Refresh knop
        document.querySelector('.btn-refresh')?.addEventListener('click', () => {
            this.refreshData();
        });

        // Keyboard shortcut (R voor refresh)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.refreshData();
            }
        });
    }

    async loadData() {
        this.setStatus('loading');
        
        try {
            this.data = await marketAPI.fetchAllMarketData();
            this.updateDashboard();
            this.setStatus('success');
            console.log('✅ Dashboard bijgewerkt om:', new Date().toLocaleTimeString());
        } catch (error) {
            console.error('❌ Fout bij laden data:', error);
            this.setStatus('error');
            // Toon fallback data
            if (this.data) {
                this.updateDashboard();
            }
        }
    }

    updateDashboard() {
        if (!this.data) return;

        const data = this.data;
        const timestamp = new Date(data.timestamp).toLocaleString('nl-NL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Update timestamps
        this.updateElement('timestamp', timestamp);
        this.updateElement('footer-timestamp', timestamp);

        // Update marktdata
        this.updateMarketCard('ecb-rate', data.ecb_rate, '%');
        this.updateMarketCard('bund-10y', data.bund_10y, '%');
        this.updateMarketCard('eurusd', data.eurusd, '');
        this.updateMarketCard('stoxx', data.stoxx, '');
        this.updateMarketCard('vstoxx', data.vstoxx, '');
        this.updateMarketCard('brent', data.brent, '');
        this.updateMarketCard('gold', data.gold, '');

        // Update centrale banken
        this.updateElement('ecb-rate-detail', `${data.ecb_rate}%`);
        // Voor andere banken gebruiken we fallback of mock data
        this.updateElement('fed-rate', '4.25%');
        this.updateElement('boe-rate', '3.75%');
        this.updateElement('boj-rate', '-0.10%');
        this.updateElement('pboc-rate', '3.45%');

        // Update inflatie
        this.updateElement('hicp', '2.8%');
        this.updateElement('core-inflation', '2.9%');
        this.updateElement('inflation-swap', '2.1%');

        // Update groei
        this.updateElement('pmi-manufacturing', '51.3');
        this.updateElement('pmi-services', '48.9');
        this.updateElement('gdp-growth', '0.8%');
    }

    updateMarketCard(id, value, suffix = '') {
        const element = this.elements[id];
        if (element) {
            const formatted = typeof value === 'number' ? 
                value.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : 
                value;
            element.textContent = `${formatted}${suffix}`;
        }

        // Update change indicator
        const changeId = id.replace('-rate', '-change').replace('-10y', '-change');
        const changeElement = this.elements[changeId];
        if (changeElement && this.data) {
            // Simuleer change (in productie zou je echte changes moeten berekenen)
            const change = (Math.random() * 0.5 - 0.25);
            const changeText = change > 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`;
            changeElement.textContent = changeText;
            changeElement.className = 'card-change ' + (change > 0 ? 'positive' : 'negative');
        }
    }

    updateElement(id, value) {
        const element = this.elements[id];
        if (element) {
            element.textContent = value || '--';
        }
    }

    setStatus(status) {
        const dot = this.elements['status-dot'];
        if (!dot) return;

        dot.className = 'status-dot';
        if (status === 'loading') {
            dot.classList.add('loading');
        } else if (status === 'error') {
            dot.classList.add('error');
        }
    }

    refreshData() {
        console.log('🔄 Handmatige refresh...');
        this.loadData();
    }

    startAutoRefresh() {
        setInterval(() => {
            console.log('🔄 Automatische refresh...');
            this.loadData();
        }, CONFIG.REFRESH_INTERVAL);
    }
}

// Initialize dashboard wanneer DOM geladen is
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
});
