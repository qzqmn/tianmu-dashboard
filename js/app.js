// ===== Config =====
const WORKER_URL = 'https://tianmu-worker.qzqmn.workers.dev/api/data';
const WORKER_BASE = 'https://tianmu-worker.qzqmn.workers.dev';
const REFRESH_INTERVAL = 60000; // 1 minute

// Binance API fallback for crypto (used when CoinGecko is rate-limited)
const BINANCE_API = 'https://api.binance.com/api/v3/ticker/24hr';
const CRYPTO_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'MATICUSDT'];
const SYMBOL_MAP = {
  BTCUSDT: { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' },
  ETHUSDT: { id: 'ethereum', symbol: 'eth', name: 'Ethereum' },
  SOLUSDT: { id: 'solana', symbol: 'sol', name: 'Solana' },
  BNBUSDT: { id: 'binancecoin', symbol: 'bnb', name: 'BNB' },
  XRPUSDT: { id: 'ripple', symbol: 'xrp', name: 'XRP' },
  ADAUSDT: { id: 'cardano', symbol: 'ada', name: 'Cardano' },
  DOGEUSDT: { id: 'dogecoin', symbol: 'doge', name: 'Dogecoin' },
  MATICUSDT: { id: 'polygon', symbol: 'matic', name: 'Polygon' },
};

// Fetch crypto from Binance (fallback when CoinGecko fails)
async function fetchCryptoFromBinance() {
  try {
    // Binance requires URL-encoded JSON array for multiple symbols
    const encoded = encodeURIComponent(JSON.stringify(CRYPTO_SYMBOLS));
    const res = await fetch(`${BINANCE_API}?symbols=${encoded}`);
    if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Not an array');
    return data.map(ticker => {
      const info = SYMBOL_MAP[ticker.symbol] || { id: ticker.symbol.toLowerCase(), symbol: ticker.symbol.toLowerCase().replace('usdt', ''), name: ticker.symbol };
      const price = parseFloat(ticker.lastPrice);
      const volume = parseFloat(ticker.quoteVolume);
      const change = parseFloat(ticker.priceChangePercent);
      return {
        id: info.id,
        symbol: info.symbol,
        name: info.name,
        current_price: price,
        market_cap: null,
        price_change_percentage_24h: change,
        total_volume: volume,
        high_24h: parseFloat(ticker.highPrice),
        low_24h: parseFloat(ticker.lowPrice),
        image: null,
      };
    });
  } catch (err) {
    console.error('[crypto] Binance fallback failed:', err);
    return null;
  }
}

// ===== State =====
let currentTab = 'world';
let cryptoSortBy = 'volume';
let cachedData = null;

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initCryptoSort();
    initStockSearch();
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
            renderNews(cachedData.news);
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

// ===== Stock Search =====
function initStockSearch() {
    const input = document.getElementById('stock-input');
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') searchStock();
        });
    }
}

async function searchStock() {
    const input = document.getElementById('stock-input');
    const resultDiv = document.getElementById('stock-search-result');
    if (!input || !resultDiv) return;
    
    const symbol = input.value.trim().toUpperCase();
    if (!symbol) return;
    
    resultDiv.style.display = 'none';
    resultDiv.innerHTML = `
        <div style="text-align:center;padding:10px;">
            <div class="spinner"></div>
        </div>
    `;
    resultDiv.style.display = 'flex';
    
    try {
        const res = await fetch(`${WORKER_BASE}/api/stock?symbol=${encodeURIComponent(symbol)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        
        if (json.error || !json.quote?.price) {
            resultDiv.innerHTML = `
                <div style="flex:1">
                    <div class="stock-sym">${symbol}</div>
                    <div class="stock-name" style="color:var(--text-dim)">找不到該股票</div>
                </div>
                <button class="stock-search-close" onclick="closeStockSearch()">✕</button>
            `;
            return;
        }
        
        const q = json.quote;
        const change = parseFloat(q.changePercent || 0);
        const changeClass = change >= 0 ? 'up' : 'down';
        const changeSign = change >= 0 ? '+' : '';
        const changeStr = q.changePercent != null ? `${changeSign}${change.toFixed(2)}%` : '--';
        
        resultDiv.innerHTML = `
            <div style="flex:1">
                <div class="stock-sym">${q.symbol}</div>
                <div class="stock-name">${q.name || q.symbol}</div>
            </div>
            <div style="text-align:right">
                <div class="stock-price">$${formatNumber(q.price)}</div>
                <div class="stock-change ${changeClass}">${changeStr}</div>
            </div>
            <button class="stock-search-close" onclick="closeStockSearch()">✕</button>
        `;
    } catch (err) {
        console.error('[stock search] error:', err);
        resultDiv.innerHTML = `
            <div style="flex:1">
                <div class="stock-sym" style="color:var(--down)">查詢失敗</div>
                <div class="stock-name" style="color:var(--text-dim)">${err.message}</div>
            </div>
            <button class="stock-search-close" onclick="closeStockSearch()">✕</button>
        `;
    }
}

function closeStockSearch() {
    const resultDiv = document.getElementById('stock-search-result');
    const input = document.getElementById('stock-input');
    if (resultDiv) resultDiv.style.display = 'none';
    if (input) input.value = '';
}

// ===== Fetch All Data =====
async function fetchAllData() {
    showLoading();
    try {
        const response = await fetch(WORKER_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        
        // Fallback: if crypto is empty, try Binance API directly
        if (!json.crypto || json.crypto.length === 0) {
            console.log('[fetch] CoinGecko empty, trying Binance fallback...');
            const binanceData = await fetchCryptoFromBinance();
            if (binanceData && binanceData.length > 0) {
                json.crypto = binanceData;
                console.log('[fetch] Binance fallback OK');
            }
        }
        
        cachedData = json;
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
    renderPortfolio(data.portfolio);
    
    // Update last update time for all tabs
    if (data.lastUpdate) {
        const time = new Date(data.lastUpdate).toLocaleTimeString('zh-Hant', { hour: '2-digit', minute: '2-digit' });
        document.querySelectorAll('.update-time').forEach(el => el.textContent = `更新 ${time}`);
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
    if (!tbody) return;
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:20px;">加密貨幣數據載入中，請稍候...</td></tr>';
        return;
    }
    
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
        const changeClass = change >= 0 ? 'up' : 'down';
        const changeSign = change >= 0 ? '+' : '';
        const priceStr = stockData.price ? '$' + formatNumber(stockData.price) : '--';
        
        return `
            <div class="stock-item">
                <div class="stock-item-left">
                    <span class="stock-name">${stock.name}</span>
                    <span class="stock-symbol">${stock.symbol}</span>
                </div>
                <div class="stock-item-right">
                    <span class="stock-price">${priceStr}</span>
                    <span class="stock-change ${changeClass}">${changeSign}${change.toFixed(2)}%</span>
                </div>
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
    
    const categoryMap = {
        'world': 'international',
        'hk': 'hongKong',
        'tech': 'tech',
        'crypto': 'crypto',
        'business': 'business',
    };
    
    const categoryKey = categoryMap[currentTab] || 'international';
    const news = newsData[categoryKey];
    
    if (!news || !news.items || news.items.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);padding:20px 0;text-align:center;">暫無新聞</p>';
        return;
    }
    
    container.innerHTML = `
        <ul class="news-list">
            ${news.items.slice(0, 20).map(item => `
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

function renderPortfolio(portfolio) {
    if (!portfolio || !portfolio.length) {
        document.getElementById('portfolio-tbody').innerHTML = '<tr><td colspan="6" class="loading">暫無數據</td></tr>';
        return;
    }
    
    // Calculate totals
    let totalValue = 0, totalCost = 0;
    portfolio.forEach(h => {
        if (h.marketValue !== null) totalValue += h.marketValue;
        totalCost += h.costValue || 0;
    });
    const totalPnL = totalValue - totalCost;
    const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
    
    // Update summary
    document.getElementById('total-value').textContent = 'HKD $' + totalValue.toLocaleString('zh-HK', {minimumFractionDigits: 0, maximumFractionDigits: 0});
    document.getElementById('total-cost').textContent = 'HKD $' + totalCost.toLocaleString('zh-HK', {minimumFractionDigits: 0, maximumFractionDigits: 0});
    
    const pnlEl = document.getElementById('total-pnl');
    const pnlSign = totalPnL >= 0 ? '+' : '';
    const pnlClass = totalPnL >= 0 ? 'profit' : 'loss';
    pnlEl.textContent = pnlSign + 'HKD $' + Math.abs(totalPnL).toLocaleString('zh-HK', {minimumFractionDigits: 0, maximumFractionDigits: 0}) + ' (' + pnlSign + totalPnLPercent.toFixed(1) + '%)';
    pnlEl.className = 'value ' + pnlClass;
    
    // Build table rows
    const tbody = document.getElementById('portfolio-tbody');
    tbody.innerHTML = portfolio.map(h => {
        const pl = h.profitLoss || 0;
        const plPct = h.profitLossPercent || 0;
        const plSign = pl >= 0 ? '+' : '';
        const plClass = pl >= 0 ? 'profit-text' : 'loss-text';
        const currency = h.currency === 'USD' ? '$' : 'HKD ';
        
        return `<tr>
            <td class="stock-name">${h.name}<br><span class="symbol">${h.symbol}</span></td>
            <td class="shares">${h.shares.toLocaleString()}</td>
            <td class="cost">${currency}${h.costPrice.toFixed(2)}</td>
            <td class="price">${h.currentPrice !== null ? currency + h.currentPrice.toFixed(2) : '--'}</td>
            <td class="value">${h.marketValue !== null ? currency + h.marketValue.toLocaleString('zh-HK', {minimumFractionDigits: 0}) : '--'}</td>
            <td class="pnl ${plClass}">${plSign}${currency}${Math.abs(pl).toFixed(0)}<br><span class="pct">(${plSign}${plPct.toFixed(1)}%)</span></td>
        </tr>`;
    }).join('');
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
