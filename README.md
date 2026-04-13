# 天幕 Dashboard

即時數據面板，展示天氣、加密貨幣、匯率、股票和新聞。

## 功能

### 🌤️ 天氣面板
- 香港、東京、曼谷三城市天氣
- 顯示溫度、天氣狀況、濕度、風速
- 每分鐘自動刷新

### 💰 加密貨幣面板
- BTC, ETH, SOL, BNB, XRP, ADA, DOGE, MATIC
- 實時價格和 24h 變化
- 可按交易量或交易額排序

### 💱 匯率面板
- USD/HKD, HKD/CNY, HKD/JPY, HKD/THB, HKD/TWD
- 即時匯率和 24h 變化

### 📈 股票面板
- 美股：Tesla (TSLA), Nvidia (NVDA)
- 港股：小米(1810.HK), 騰訊(0700.HK), 美團(3690.HK), 3416
- 指數：道瓊斯、納斯達克、恒生

### 📰 新聞面板
- 6 個分類：國際時事、國際財經、香港時事、香港財經、科技趨勢、OpenClaw
- Tab 切換顯示

## 技術棧

- HTML5 + CSS3 + JavaScript (原生)
- 深色主題
- 響應式設計
- 無需構建

## 配置

### Worker URL

在 `js/app.js` 中更新 Worker URL：

```javascript
const WORKER_URL = 'YOUR_WORKER_URL/api/data';
```

### 部署到 GitHub Pages

1. 創建 GitHub 倉庫
2. 上傳所有文件
3. 前往 Settings → Pages
4. 選擇 `main` branch 和 `/ (root)` folder
5. 點擊 Save

等待幾分鐘後，你的 Dashboard 就會在 `https://你的用戶名.github.io/倉庫名/` 上線。

## 項目結構

```
dashboard/
├── index.html      # 主頁面
├── css/
│   └── style.css   # 樣式表
├── js/
│   └── app.js      # JavaScript
└── README.md       # 說明文檔
```

## API 格式

前端期望 Worker 返回以下 JSON 格式：

### 天氣 (type=weather)
```json
{
  "hong_kong": { "temp": 25, "condition": "晴", "humidity": 70, "wind": 15 },
  "tokyo": { "temp": 20, "condition": "多雲", "humidity": 55, "wind": 10 },
  "bangkok": { "temp": 32, "condition": "雨", "humidity": 85, "wind": 8 }
}
```

### 加密貨幣 (type=crypto)
```json
[
  { "symbol": "BTC", "price": 45000, "change_24h": 2.5, "volume_24h": 30000000000, "market_cap": 880000000000 }
]
```

### 匯率 (type=forex)
```json
{
  "USD/HKD": { "rate": 7.82, "change": 0.01 },
  "HKD/CNY": { "rate": 0.91, "change": -0.02 }
}
```

### 股票 (type=stocks)
```json
{
  "TSLA": { "price": 250.50, "change": -1.2 },
  "DJI": { "price": 38500, "change": 0.5 }
}
```

### 新聞 (type=news&category=world)
```json
{
  "articles": [
    { "title": "新聞標題", "url": "https://...", "source": "媒體名", "time": "2小時前" }
  ]
}
```

## License

MIT
