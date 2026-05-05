/**
 * 把 vite build 出的 dist/ 同步到 server/public/。
 * 單 service 部署架構下，server/start.mjs 會從 server/public 提供前端靜態檔。
 */

import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const dist = resolve(root, 'dist')
const target = resolve(root, 'server', 'public')

if (!existsSync(dist)) {
  console.error(`[copy-dist] dist 不存在於 ${dist}；請先執行 vite build`)
  process.exit(1)
}

rmSync(target, { recursive: true, force: true })
mkdirSync(target, { recursive: true })
cpSync(dist, target, { recursive: true })
console.log(`[copy-dist] ${dist} → ${target}`)
