# SL-Leuco Demo Server

純 Node、零相依的小型 JSON 資料 server，把 `server/data/` 下的模組化 JSON 啟成 collection 級 REST。

## 資料結構

```
server/
├── data/                                ← 來源資料，commit 進 repo
│   ├── orders/
│   │   └── orders.json
│   ├── ships/
│   │   ├── ships.json
│   │   └── schedules.json
│   ├── routes/
│   │   ├── ports.json
│   │   └── route_segments.json
│   ├── tickets/
│   │   ├── ticket_types.json
│   │   ├── ticket_price_history.json
│   │   └── whitelist.json
│   ├── rbac/
│   │   ├── rbac_organizations.json
│   │   ├── rbac_permission_groups.json
│   │   ├── rbac_roles.json
│   │   └── rbac_accounts.json
│   └── audit/
│       ├── audit_logs.json
│       ├── login_records.json
│       └── account_locks.json
├── db.json                              ← 啟動時 bundle 出來的 runtime 檔（gitignore）
├── start.mjs                            ← Node http server，提供 GET/PUT
├── package.json                         ← 沒有 dependency
├── zbpack.json                          ← Zeabur 部署設定
└── README.md
```

> **檔名 = collection 名稱**（含 `rbac_` / `audit_` 等 prefix）；資料夾只是給人看的分組。
> 例如 `data/rbac/rbac_roles.json` 會被服務在 `GET /rbac_roles`。

## REST 合約

```
GET  /                  列出所有 collection 與筆數
GET  /<collection>      讀整張表（陣列）
PUT  /<collection>      用 body（陣列）覆寫整張表
```

只支援 collection 級的 GET / PUT — 為了讓未來真正的後端能直接照這個合約做。

## 本地開發

```bash
# 從專案根目錄
pnpm install
pnpm seed:db          # 從根目錄 ./db.json 拆出 server/data/**/*.json
pnpm dev:full         # 同時啟動 vite (5173) + server (3001)
```

或只起 server：

```bash
pnpm dev:server
```

第一次啟動 server 時，`start.mjs` 會把 `data/**/*.json` 合併寫成 `server/db.json`；之後所有寫入都進到 `db.json`，不會反向改 `data/`。

想還原成 baseline：刪掉 `server/db.json` 後重啟（`pnpm dev:server`），就會從 `data/` 重新合併。

## 部署到 Zeabur

把 `server/` 子資料夾**作為獨立 service** 部署：

1. Zeabur Dashboard → New Service → Git Repository → 選同一個 repo
2. **Root Directory** 設為 `server`（這是關鍵，否則會把 Vite app 也一起 build）
3. Service Variables：
   - `PORT` — Zeabur 會自動注入
   - `DATA_DIR=/data` — 告訴 `start.mjs` 把 db.json 放到 volume
4. **Volumes**：在這個 service 掛一個 volume，mount path = `/data`，至少 1 GB
5. 部署後 Zeabur 會給你一個域名（例如 `sl-leuco-demo-server.zeabur.app`）

> 第一次啟動時 `start.mjs` 會把 `data/**/*.json` 合併寫進 `/data/db.json`；之後的寫入都落在 volume，redeploy 不會掉。
> 想還原成 seed：刪除 volume 或進 console 移除 `/data/db.json`，重啟 service 就會從 `data/` 重新 bundle。

## 前端部署設定

前端那一個 service（root directory 設 `/`）需要在 build-time 設：

```
VITE_API_BASE_URL=https://<上面那個 server 的 zeabur 域名>
```

留空時前端會走相對路徑 `/api`，僅本地開發 + Vite proxy 用。
