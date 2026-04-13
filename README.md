# Tianmu Dashboard

天幕 Dashboard 前端

## 訪問

- **Dashboard**: https://qzqmn.github.io/tianmu-dashboard
- **Worker API**: https://tianmu-worker.qzqmn.workers.dev/api/data

## 部署

GitHub Pages 自動部署，連接到 `tianmu-worker` Cloudflare Worker 作為後端 API。

## Cron

Worker 每 15 分鐘自動刷新一次數據 (`*/15 * * * *`)
