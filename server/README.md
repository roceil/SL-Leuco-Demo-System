# SL-Leuco Demo Server（單 service 架構）

純 Node、零相依的小型 server，**同時** 提供：
- `/api/*` — 模組化 JSON 資料的 collection 級 REST
- `/*`     — 前端 SPA 靜態檔（從 `server/public/` 提供，含 SPA fallback）

整個專案以**單一 service** 部署到 Zeabur，前後端跑在同一個 Node 程序。

## 資料結構

```
server/
├── data/                                ← 來源資料，commit 進 repo
│   ├── orders/
│   ├── ships/
│   ├── routes/
│   ├── tickets/
│   ├── rbac/
│   └── audit/
├── public/                              ← 前端 build 產物（pnpm build 後產生，gitignore）
├── db.json                              ← runtime 檔（gitignore）
├── start.mjs                            ← Node http server（API + 靜態）
└── package.json
```

## REST 合約

```
GET  /api                  列出所有 collection 與筆數
GET  /api/<collection>     讀整張表（陣列）
PUT  /api/<collection>     用 body（陣列）覆寫整張表
```

## 本地開發

兩種模式：

**模式 A：vite dev + 後端 server（熱重載）**
```bash
pnpm install
pnpm seed:db
pnpm dev:full         # 同時啟動 vite (5173) + server (3001)
```
vite proxy `/api` → `:3001/api/*`，前端熱重載。

**模式 B：模擬 production 部署**
```bash
pnpm build            # type-check + vite build + 複製 dist → server/public
pnpm start            # node server/start.mjs，3001 同時提供 /api 與 /
```
打開 `http://localhost:3001/` 直接看前端。

## 部署到 Zeabur（單 service）

1. Zeabur Dashboard → New Service → Git Repository
2. **Root Directory** 留 `/`（預設）
3. Service Variables：
   - `PORT`     — Zeabur 自動注入
   - `DATA_DIR=/data` — 把 db.json 放到 volume
4. **Volumes**：mount path `/data`，1 GB 以上
5. zbpack.json 已含 build / start 指令

> 第一次啟動時 `start.mjs` 會把 `data/**/*.json` 合併寫進 `/data/db.json`；
> 後續啟動若 db.json 缺新加入的 collection，會自動補上。

**不需要設 `VITE_API_BASE_URL`** — 前端走相對路徑 `/api`。
