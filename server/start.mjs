/**
 * 簡易 JSON 資料庫 server（純 Node，零相依）+ 前端靜態服務
 *
 * 路由：
 *   GET  /api                 列出所有 collection
 *   GET  /api/<collection>    讀整張表（陣列）
 *   PUT  /api/<collection>    覆寫整張表（傳整個陣列）
 *   GET  /                    回 server/public/index.html
 *   GET  /<file>              回 server/public/<file>
 *   GET  /<spa-route>         回 server/public/index.html（SPA fallback）
 *
 * 啟動行為：
 *   - 啟動時把 server/data/<module>/*.json 合併成 runtime db.json
 *   - 既有 db.json 缺新集合時自動補上（不覆蓋既有資料）
 *   - 寫入直接覆寫 runtime db.json
 *
 * 環境變數：
 *   PORT       預設 3001
 *   HOST       預設 0.0.0.0
 *   DATA_DIR   Zeabur 部署時設成 /data 並掛 volume；不設就用 server/ 同目錄
 *   PUBLIC_DIR 前端 build 產物位置；不設就用 server/public/
 */

import { createServer } from 'node:http'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, extname, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sourceDataDir = resolve(__dirname, 'data')
const dataDir = process.env.DATA_DIR || __dirname
const runtimeDb = resolve(dataDir, 'db.json')
const publicDir = resolve(__dirname, process.env.PUBLIC_DIR || 'public')

// -------- 資料層 --------

function bundleData() {
  if (!existsSync(sourceDataDir)) {
    throw new Error(
      `找不到 ${sourceDataDir}；請先執行 \`pnpm seed:db\` 產生資料`
    )
  }
  const combined = {}
  const stack = [sourceDataDir]
  while (stack.length) {
    const current = stack.pop()
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = resolve(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(fullPath)
        continue
      }
      if (!entry.name.endsWith('.json')) continue
      const collection = entry.name.replace(/\.json$/, '')
      if (combined[collection]) {
        throw new Error(`偵測到重複集合 "${collection}"（${fullPath}）`)
      }
      combined[collection] = JSON.parse(readFileSync(fullPath, 'utf-8'))
    }
  }
  return combined
}

mkdirSync(dataDir, { recursive: true })

let db
if (existsSync(runtimeDb)) {
  db = JSON.parse(readFileSync(runtimeDb, 'utf-8'))
  console.log(`[start] loaded existing ${runtimeDb}`)

  // 防呆：volume 上既有 db.json 可能是舊版本，缺新加入的 collection
  const baseline = bundleData()
  const missing = Object.keys(baseline).filter((k) => !(k in db))
  if (missing.length > 0) {
    for (const k of missing) db[k] = baseline[k]
    writeFileSync(runtimeDb, JSON.stringify(db, null, 2), 'utf-8')
    console.log(`[start] merged ${missing.length} missing collections: ${missing.join(', ')}`)
  }
} else {
  db = bundleData()
  writeFileSync(runtimeDb, JSON.stringify(db, null, 2), 'utf-8')
  console.log(
    `[start] bundled ${Object.keys(db).length} collections from ${sourceDataDir} → ${runtimeDb}`
  )
}

let writeQueue = Promise.resolve()
function persist() {
  writeQueue = writeQueue.then(
    () =>
      new Promise((res, rej) => {
        try {
          writeFileSync(runtimeDb, JSON.stringify(db, null, 2), 'utf-8')
          res()
        } catch (err) {
          rej(err)
        }
      })
  )
  return writeQueue
}

// -------- 共用工具 --------

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept')
}

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

// -------- API handler --------

async function handleApi(req, res, pathname) {
  // pathname 已剝去 /api 前綴；可能是 '' 或 '/<col>'
  const collection = pathname.replace(/^\/+|\/+$/g, '')

  if (!collection) {
    if (req.method !== 'GET') {
      return sendJson(res, 405, { error: 'Method Not Allowed' })
    }
    return sendJson(res, 200, {
      collections: Object.fromEntries(
        Object.entries(db).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])
      ),
    })
  }

  if (req.method === 'GET') {
    if (!(collection in db)) return sendJson(res, 404, { error: 'Not found' })
    return sendJson(res, 200, db[collection])
  }

  if (req.method === 'PUT') {
    let body = ''
    req.setEncoding('utf-8')
    for await (const chunk of req) body += chunk
    let data
    try {
      data = JSON.parse(body)
    } catch {
      return sendJson(res, 400, { error: 'Invalid JSON' })
    }
    db[collection] = data
    persist().catch((err) => console.error('[persist]', err))
    return sendJson(res, 200, { ok: true, count: Array.isArray(data) ? data.length : null })
  }

  sendJson(res, 405, { error: 'Method Not Allowed' })
}

// -------- 靜態檔 + SPA fallback --------

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':   'font/ttf',
  '.txt':   'text/plain; charset=utf-8',
  '.map':   'application/json; charset=utf-8',
}

function safeJoin(root, urlPath) {
  // 將 URL 路徑接到 root 並避免 path traversal
  const decoded = decodeURIComponent(urlPath)
  const normalized = normalize(decoded).replace(/^([/\\])+/, '')
  const full = resolve(root, normalized)
  if (!full.startsWith(root + sep) && full !== root) return null
  return full
}

function serveFile(res, filePath, statusOverride) {
  try {
    const buf = readFileSync(filePath)
    const ext = extname(filePath).toLowerCase()
    const ct = MIME[ext] ?? 'application/octet-stream'
    res.statusCode = statusOverride ?? 200
    res.setHeader('Content-Type', ct)
    // 對 hashed assets 設長快取（檔名變即失效）
    if (/\/assets\/.+-[A-Za-z0-9_-]{8,}\.[a-z]+$/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    }
    res.end(buf)
    return true
  } catch {
    return false
  }
}

function serveStaticOrSpa(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendJson(res, 405, { error: 'Method Not Allowed' })
  }

  if (!existsSync(publicDir)) {
    return sendJson(res, 503, {
      error: 'Frontend not built',
      hint: '請於專案根目錄執行 `pnpm build` 將前端產物複製到 server/public/',
    })
  }

  // 嘗試對應的實體檔
  const candidate = safeJoin(publicDir, pathname)
  if (candidate && existsSync(candidate)) {
    const stat = statSync(candidate)
    if (stat.isFile()) {
      if (serveFile(res, candidate)) return
    }
  }

  // SPA fallback → index.html
  const indexFile = resolve(publicDir, 'index.html')
  if (existsSync(indexFile)) {
    if (serveFile(res, indexFile)) return
  }

  sendJson(res, 404, { error: 'Not found' })
}

// -------- HTTP server --------

const server = createServer(async (req, res) => {
  setCors(res)

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  const pathname = url.pathname

  // /api 路由（含 /api 與 /api/<col>）
  if (pathname === '/api' || pathname.startsWith('/api/')) {
    return handleApi(req, res, pathname.slice(4)) // 剝去 '/api'
  }

  // 其它都當作前端靜態 / SPA fallback
  return serveStaticOrSpa(req, res, pathname)
})

const port = Number(process.env.PORT) || 3001
const host = process.env.HOST || '0.0.0.0'

server.listen(port, host, () => {
  console.log(`[start] listening on http://${host}:${port}`)
  console.log(`[start] db=${runtimeDb}`)
  console.log(`[start] public=${publicDir}${existsSync(publicDir) ? '' : ' (not present — frontend not built)'}`)
  console.log(`[start] collections=${Object.keys(db).join(', ')}`)
})
