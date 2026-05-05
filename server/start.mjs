/**
 * 簡易 JSON 資料庫 server（純 Node，零相依）
 *
 * - 啟動時把 server/data/<module>/*.json 合併成 runtime db.json
 * - 提供 collection 級 REST：
 *     GET  /<collection>         讀整張表（陣列）
 *     PUT  /<collection>         覆寫整張表（傳整個陣列）
 *     GET  /                     列出所有 collection
 * - 寫入時直接覆寫 runtime db.json，跨重啟保留
 *
 * 環境變數：
 *   PORT      預設 3001
 *   HOST      預設 0.0.0.0
 *   DATA_DIR  Zeabur 部署時設成 /data 並掛 volume；不設就用 server/ 同目錄
 */

import { createServer } from 'node:http'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sourceDataDir = resolve(__dirname, 'data')
const dataDir = process.env.DATA_DIR || __dirname
const runtimeDb = resolve(dataDir, 'db.json')

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
} else {
  db = bundleData()
  writeFileSync(runtimeDb, JSON.stringify(db, null, 2), 'utf-8')
  console.log(
    `[start] bundled ${Object.keys(db).length} collections from ${sourceDataDir} → ${runtimeDb}`
  )
}

let writeQueue = Promise.resolve()
function persist() {
  // 序列化寫入避免並行 race
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

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept')
}

function send(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

const server = createServer(async (req, res) => {
  setCors(res)

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  const collection = url.pathname.replace(/^\/+|\/+$/g, '')

  // 根路徑：列集合
  if (!collection) {
    if (req.method !== 'GET') {
      return send(res, 405, { error: 'Method Not Allowed' })
    }
    return send(res, 200, {
      collections: Object.fromEntries(
        Object.entries(db).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])
      ),
    })
  }

  if (req.method === 'GET') {
    if (!(collection in db)) return send(res, 404, { error: 'Not found' })
    return send(res, 200, db[collection])
  }

  if (req.method === 'PUT') {
    let body = ''
    req.setEncoding('utf-8')
    for await (const chunk of req) body += chunk
    let data
    try {
      data = JSON.parse(body)
    } catch {
      return send(res, 400, { error: 'Invalid JSON' })
    }
    db[collection] = data
    persist().catch((err) => console.error('[persist]', err))
    return send(res, 200, { ok: true, count: Array.isArray(data) ? data.length : null })
  }

  send(res, 405, { error: 'Method Not Allowed' })
})

const port = Number(process.env.PORT) || 3001
const host = process.env.HOST || '0.0.0.0'

server.listen(port, host, () => {
  console.log(`[start] listening on http://${host}:${port}`)
  console.log(`[start] db=${runtimeDb}`)
  console.log(`[start] collections=${Object.keys(db).join(', ')}`)
})
