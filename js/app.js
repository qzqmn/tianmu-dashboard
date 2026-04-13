// ===== Config =====
const WORKER_URL = 'https://tianmu-worker.qzqmn.workers.dev/api/data';
const REFRESH_INTERVAL = 60000; // 1 minute

// ===== State =====
let currentTab = 'world';
let cryptoSortBy = 'volume';

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initCryptoSort();
    fetchAllData();
    
    // Auto refresh weather & forex every minute
    setInterval(() => {
        fetchWeather();
        fetchForex();
    }, REFRESH_INTERVAL);
});

// ===== Tab Handling =====
function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTab = btn.dataset.tab;
            fetchNews();
        });
    });
}

// ===== Crypto Sort =====
function initCryptoSort() {
    document.getElementById('crypto-sort').addEventListener('change', (e) => {
        cryptoSortBy = e.target.value;
        fetchCrypto();
    });
}

// ===== Fetch All Data =====
async function fetchAllData() {
    showLoadingOverlay();
    try {
        const [weather, crypto, forex, stocks, news] = await Promise.all([
            fetchWeather(),
            fetchCrypto(),
            fetchForex(),
            fetchStocks(),
            fetchNews()
        ]);
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        hideLoadingOverlay();
    }
}

function retryAll() {
    document.getElementById('error-modal').style.display = 'none';
    fetchAllData();
}

// ===== Fetch Functions =====
async function fetchWeather() {
    try {
        const data = await fetchData('weather');
        renderWeather(data);
    } catch (error) {
        console.error('Weather fetch error:', error);
        renderWeatherError();
    }
}

async function fetchCrypto() {
    try {
        const data = await fetchData('crypto');
        renderCrypto(data);
    } catch (error) {
        console.error('Crypto fetch error:', error);
        renderCryptoError();
    }
}

async function fetchForex() {
    try {
        const data = await fetchData('forex');
        renderForex(data);
    } catch (error) {
        console.error('Forex fetch error:', error);
        renderForexError();
    }
}

async function fetchStocks() {
    try {
        const data = await fetchData('stocks');
        renderStocks(data);
    } catch (error) {
        console.error('Stocks fetch error:', error);
        renderStocksError();
    }
}

async function fetchNews() {
    try {
        const data = await fetchData(`news?category=${currentTab}`);
        renderNews(data);
    } catch (error) {
        console.error('News fetch error:', error);
        renderNewsError();
    }
}

// ===== Generic Fetch =====
async function fetchData(type) {
    const url = `${WORKER_URL}?type=${type}`;
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    
    return response.json();
}

// ===== Render Functions =====

// Weather
function renderWeather(data) {
    const container = document.getElementById('weather-data');
    const cities = ['hong_kong', 'tokyo', 'bangkok'];
    const cityNames = { hong_kong: '香港', tokyo: '東京', bangkok: '曼谷' };
    
    container.innerHTML = cities.map(city => {
        const d = data[city] || {};
        return `
            <div class="weather-item">
                <div class="city">${cityNames[city]}</div>
                <div class="temp">${d.temp || '--'}°C</div>
                <div class="condition">${d.condition || 'N/A'}</div>
                <div class="details">
                    💧 ${d.humidity || '--'}% | 🌬️ ${d.wind || '--'} km/h
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('weather-time').textContent = `更新: ${formatTime()}`;
}

function renderWeatherError() {
    document.getElementById('weather-data').innerHTML = `
        <div class="weather-item">
            <p style="color: var(--danger);">❌ 無法載入天氣數據</p>
        </div>
    `;
}

// Crypto
function renderCrypto(data) {
    const tbody = document.getElementById('crypto-data');
    const coins = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'MATIC'];
    
    // Sort data
    let sortedData = [...(data || [])];
    if (cryptoSortBy === 'volume') {
        sortedData.sort((a, b) => (b.volume_24h || 0) - (a.volume_24h || 0));
    } else {
        sortedData.sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0));
    }
    
    tbody.innerHTML = sortedData.map(coin => {
        const change = parseFloat(coin.change_24h || 0);
        const changeClass = change >= 0 ? 'change-up' : 'change-down';
        const changeSign = change >= 0 ? '+' : '';
        
        return `
            <tr>
                <td><strong>${coin.symbol}</strong></td>
                <td>$${formatNumber(coin.price)}</td>
                <td class="${changeClass}">${changeSign}${change.toFixed(2)}%</td>
            </tr>
        `;
    }).join('');
}

function renderCryptoError() {
    document.getElementById('crypto-data').innerHTML = `
        <tr><td colspan="3" style="text-align: center; color: var(--danger);">❌ 無法載入加密貨幣數據</td></tr>
    `;
}

// Forex
function renderForex(data) {
    const container = document.getElementById('forex-data');
    const pairs = ['USD/HKD', 'HKD/CNY', 'HKD/JPY', 'HKD/THB', 'HKD/TWD'];
    
    container.innerHTML = pairs.map(pair => {
        const d = data[pair] || {};
        const change = parseFloat(d.change || 0);
        const changeClass = change >= 0 ? 'change-up' : 'change-down';
        const changeSign = change >= 0 ? '+' : '';
        
        return `
            <div class="forex-item">
                <span class="forex-pair">${pair}</span>
                <span class="forex-rate">${d.rate || '--'}</span>
                <span class="forex-change ${changeClass}">${changeSign}${(d.change || 0)}%</span>
            </div>
        `;
    }).join('');
    
    document.getElementById('forex-time').textContent = `更新: ${formatTime()}`;
}

function renderForexError() {
    document.getElementById('forex-data').innerHTML = `
        <div class="forex-item" style="color: var(--danger);">❌ 無法載入匯率數據</div>
    `;
}

// Stocks
function renderStocks(data) {
    const container = document.getElementById('stock-data');
    
    const usStocks = ['TSLA', 'NVDA'];
    const hkStocks = ['1810.HK', '0700.HK', '3690.HK', '3416'];
    const indices = ['DJI', 'IXIC', 'HSI'];
    
    const getStockHtml = (symbol, stockData) => {
        const change = parseFloat(stockData?.change || 0);
        const changeClass = change >= 0 ? 'change-up' : 'change-down';
        const changeSign = change >= 0 ? '+' : '';
        return `
            <div class="stock-item">
                <span class="stock-name">${symbol}</span>
                <span class="stock-price">${stockData?.price || '--'}</span>
                <span class="stock-change ${changeClass}">${changeSign}${change.toFixed(2)}%</span>
            </div>
        `;
    };
    
    container.innerHTML = `
        <div class="stock-section">
            <h3>美股</h3>
            <div class="stock-list">
                ${usStocks.map(s => getStockHtml(s, data[s])).join('')}
            </div>
        </div>
        <div class="stock-section">
            <h3>港股</h3>
            <div class="stock-list">
                ${hkStocks.map(s => getStockHtml(s, data[s])).join('')}
            </div>
        </div>
        <div class="stock-section">
            <h3>指數</h3>
            <div class="stock-list">
                ${indices.map(s => getStockHtml(s, data[s])).join('')}
            </div>
        </div>
    `;
}

function renderStocksError() {
    document.getElementById('stock-data').innerHTML = `
        <div class="stock-item" style="color: var(--danger); grid-column: 1/-1;">❌ 無法載入股票數據</div>
    `;
}

// News
function renderNews(data) {
    const container = document.getElementById('news-data');
    const articles = data?.articles || [];
    
    if (articles.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">暫無新聞</p>';
        return;
    }
    
    container.innerHTML = `
        <ul class="news-list">
            ${articles.slice(0, 10).map(article => `
                <li>
                    <a href="${article.url}" target="_blank" rel="noopener">
                        <div class="news-title">${article.title}</div>
                        ${article.source ? `<div class="news-meta">${article.source} | ${article.time || ''}</div>` : ''}
                    </a>
                </li>
            `).join('')}
        </ul>
    `;
}

function renderNewsError() {
    document.getElementById('news-data').innerHTML = '<p style="color: var(--danger);">❌ 無法載入新聞</p>';
}

// ===== Utilities =====

function showLoadingOverlay() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoadingOverlay() {
    document.getElementById('loading-overlay').style.display = 'none';
}

function showError(message) {
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-modal').style.display = 'flex';
}

function formatTime() {
    return new Date().toLocaleTimeString('zh-Hant', { hour: '2-digit', minute: '2-digit' });
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
