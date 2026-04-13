// ===== Config =====
const WORKER_URL = 'https://tianmu-worker.qzqmn.workers.dev/api/data';
const REFRESH_INTERVAL = 60000; // 1 minute

// ===== State =====
let currentTab = 'international';
let cryptoSortBy = 'volume';
let cachedData = null;

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initCryptoSort();
    fetchAllData();
    
    // Auto refresh every minute
    setInterval(fetchAllData, REFRESH_INTERVAL);
});

// ===== Tab Handling =====
function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTab = btn.dataset.tab;
            renderNews(cachedData);
        });
    });
}

// ===== Crypto Sort =====
function initCryptoSort() {
    const sortSelect = document.getElementById('crypto-sort');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            cryptoSortBy = e.target.value;
            renderCrypto(cachedData);
        });
    }
}

// ===== Fetch All Data =====
async function fetchAllData() {
    showLoading();
    try {
        const response = await fetch(WORKER_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        cachedData = await response.json();
        renderAll(cachedData);
    } catch (error) {
        console.error('Error fetching data:', error);
        showError('無法載入數據，請稍後再試');
    } finally {
        hideLoading();
    }
}

function retryAll() {
    fetchAllData();
}

// ===== Render All =====
function renderAll(data) {
    if (!data) return;
    renderWeather(data.weather);
    renderCrypto(data.crypto);
    renderForex(data.forex);
    renderStocks(data.stocks);
    renderNews(data.news);
    
    // Update last update time
    if (data.lastUpdate) {
        const time = new Date(data.lastUpdate).toLocaleTimeString('zh-Hant', { hour: '2-digit', minute: '2-digit' });
        document.querySelectorAll('.update-time').forEach(el => el.textContent = `更新: ${time}`);
    }
}

// ===== Render Functions =====

// Weather
function renderWeather(data) {
    const container = document.getElementById('weather-data');
    if (!container || !data) return;
    
    const cities = [
        { key: 'hongKong', name: '香港', icon: '🇭🇰' },
        { key: 'toyama', name: '東京', icon: '🇯🇵' },
        { key: 'bangkok', name: '曼谷', icon: '🇹🇭' }
    ];
    
    container.innerHTML = cities.map(city => {
        const d = data[city.key] || {};
        return `
            <div class="weather-item">
                <div class="city">${city.icon} ${city.name}</div>
                <div class="temp">${d.tempC || '--'}°C</div>
                <div class="condition">${d.weatherDesc || 'N/A'}</div>
                <div class="details">
                    💧 ${d.humidity || '--'}% | 🌬️ ${d.windspeedKmph || '--'} km/h
                </div>
            </div>
        `;
    }).join('');
}

// Crypto
function renderCrypto(data) {
    const tbody = document.getElementById('crypto-data');
    if (!tbody || !data) return;
    
    // Sort data
    let sortedData = [...(data || [])];
    if (cryptoSortBy === 'volume') {
        sortedData.sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));
    } else {
        sortedData.sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0));
    }
    
    tbody.innerHTML = sortedData.map(coin => {
        const change = parseFloat(coin.price_change_percentage_24h || 0);
        const changeClass = change >= 0 ? 'change-up' : 'change-down';
        const changeSign = change >= 0 ? '+' : '';
        
        return `
            <tr>
                <td><strong>${coin.symbol?.toUpperCase()}</strong></td>
                <td>$${formatNumber(coin.current_price)}</td>
                <td class="${changeClass}">${changeSign}${change.toFixed(2)}%</td>
            </tr>
        `;
    }).join('');
}

// Forex
function renderForex(data) {
    const container = document.getElementById('forex-data');
    if (!container || !data) return;
    
    const pairs = [
        { key: 'usdToHkd', label: 'USD/HKD' },
        { key: 'CNY', label: 'HKD/CNY' },
        { key: 'JPY', label: 'HKD/JPY' },
        { key: 'THB', label: 'HKD/THB' },
        { key: 'TWD', label: 'HKD/TWD' }
    ];
    
    container.innerHTML = pairs.map(pair => {
        let rate = '--';
        if (pair.key === 'usdToHkd' && data.usdToHkd) {
            rate = data.usdToHkd.toFixed(4);
        } else if (data.hkdRates && data.hkdRates[pair.key]) {
            rate = data.hkdRates[pair.key].toFixed(4);
        }
        
        return `
            <div class="forex-item">
                <span class="forex-pair">${pair.label}</span>
                <span class="forex-rate">${rate}</span>
            </div>
        `;
    }).join('');
}

// Stocks
function renderStocks(data) {
    const container = document.getElementById('stock-data');
    if (!container || !data) return;
    
    const usStocks = [
        { symbol: 'TSLA', name: 'Tesla' },
        { symbol: 'NVDA', name: 'Nvidia' }
    ];
    
    const hkStocks = [
        { symbol: '1810.HK', name: '小米' },
        { symbol: '0700.HK', name: '騰訊' },
        { symbol: '3690.HK', name: '美團' },
        { symbol: '3416.HK', name: '3416' }
    ];
    
    const indices = [
        { symbol: '^DJI', name: '道瓊斯' },
        { symbol: '^IXIC', name: '納斯達克' },
        { symbol: '^HSI', name: '恒生' }
    ];
    
    const getStockHtml = (stock) => {
        const stockData = data.find(s => s.symbol === stock.symbol) || {};
        const change = parseFloat(stockData.changePercent || 0);
        const changeClass = change >= 0 ? 'change-up' : 'change-down';
        const changeSign = change >= 0 ? '+' : '';
        
        return `
            <div class="stock-item">
                <span class="stock-name">${stock.name}</span>
                <span class="stock-price">${stockData.price ? '$' + formatNumber(stockData.price) : '--'}</span>
                <span class="stock-change ${changeClass}">${changeSign}${change.toFixed(2)}%</span>
            </div>
        `;
    };
    
    container.innerHTML = `
        <div class="stock-section">
            <h3>🇺🇸 美股</h3>
            <div class="stock-list">
                ${usStocks.map(s => getStockHtml(s)).join('')}
            </div>
        </div>
        <div class="stock-section">
            <h3>🇭🇰 港股</h3>
            <div class="stock-list">
                ${hkStocks.map(s => getStockHtml(s)).join('')}
            </div>
        </div>
        <div class="stock-section">
            <h3>📊 指數</h3>
            <div class="stock-list">
                ${indices.map(s => getStockHtml(s)).join('')}
            </div>
        </div>
    `;
}

// News
function renderNews(newsData) {
    const container = document.getElementById('news-data');
    if (!container || !newsData) return;
    
    // Map currentTab to news category
    const categoryMap = {
        'international': 'international',
        'intl-business': 'intlBusiness',
        'hong-kong': 'hongKong',
        'hk-business': 'hkBusiness',
        'tech': 'tech',
        'hacker': 'hacker',
        'openclaw': 'openclaw'
    };
    
    const categoryKey = categoryMap[currentTab] || 'international';
    const news = newsData[categoryKey];
    
    if (!news || !news.items || news.items.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">暫無新聞</p>';
        return;
    }
    
    container.innerHTML = `
        <ul class="news-list">
            ${news.items.slice(0, 10).map(item => `
                <li>
                    <a href="${item.link}" target="_blank" rel="noopener">
                        <div class="news-title">${item.title}</div>
                        <div class="news-meta">${item.source || ''} | ${item.pubDate ? new Date(item.pubDate).toLocaleDateString('zh-Hant') : ''}</div>
                    </a>
                </li>
            `).join('')}
        </ul>
    `;
}

// ===== UI Functions =====

function showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'flex';
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'none';
}

function showError(message) {
    const modal = document.getElementById('error-modal');
    const msg = document.getElementById('error-message');
    if (modal && msg) {
        msg.textContent = message;
        modal.style.display = 'flex';
    }
}

function formatNumber(num) {
    if (num === undefined || num === null) return '--';
    const n = parseFloat(num);
    if (isNaN(n)) return '--';
    if (n >= 1000) {
        return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return n.toFixed(2);
}