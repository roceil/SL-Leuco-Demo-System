# 單 service 部署：前後端同 Node 程序
# Zeabur 偵測到 Dockerfile 會略過 framework auto-detect，
# 不會把 Vue 專案當成靜態 SPA 用 Caddy 服務。

FROM node:22-alpine AS builder

WORKDIR /app

# 安裝 pnpm
RUN corepack enable && corepack prepare pnpm@10 --activate

# 先複製 package 設定，利用 layer cache
COPY package.json pnpm-lock.yaml ./

# Vite build 需要 devDependencies（vue-tsc / @vitejs/plugin-vue 等）
RUN pnpm install --frozen-lockfile=false

# 複製其餘原始碼
COPY . .

# Build 前端 → server/public
RUN pnpm build

# -------- 執行階段 --------
FROM node:22-alpine

WORKDIR /app

# 只搬 runtime 需要的東西：server 與 build 過的前端
COPY --from=builder /app/server ./server

# Zeabur 會透過 PORT env 注入；DATA_DIR 預設為 /data（請在 service 設定 + 掛 volume）
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server/start.mjs"]
