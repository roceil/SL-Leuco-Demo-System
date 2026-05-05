/**
 * 從根目錄的 db.json 拆成 server/data/<module>/<collection>.json
 *
 * 使用方式：
 *   pnpm seed:db                # 從 ./db.json 拆出
 *   pnpm seed:db --from <path>  # 自訂來源
 *
 * 規則：
 *   - **檔名 = collection 名稱**（含 rbac_ 等 prefix），folder 只是給人看的分組
 *   - 為了讓未來真實後端能直接對應 server/data 結構，請保持這個檔名規則
 *   - server/start.mjs 啟動時會把 server/data/**\/*.json 合併寫成 runtime db.json
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

const fromIdx = process.argv.indexOf('--from')
const sourcePath =
  fromIdx >= 0 && process.argv[fromIdx + 1]
    ? resolve(process.argv[fromIdx + 1])
    : resolve(projectRoot, 'db.json')

const layout: Record<string, string[]> = {
  orders: ['orders'],
  ships: ['ships', 'schedules'],
  routes: ['ports', 'route_segments'],
  tickets: ['ticket_types', 'ticket_price_history', 'whitelist'],
  rbac: [
    'rbac_organizations',
    'rbac_permission_groups',
    'rbac_roles',
    'rbac_accounts',
  ],
  audit: ['audit_logs', 'login_records', 'account_locks'],
}

const sourceDb = JSON.parse(readFileSync(sourcePath, 'utf-8')) as Record<
  string,
  unknown[]
>

// 反向索引：collection -> module
const collectionToModule = new Map<string, string>()
for (const [moduleName, collections] of Object.entries(layout)) {
  for (const c of collections) collectionToModule.set(c, moduleName)
}

// 找出沒在 layout 裡的孤兒集合（會放到 misc/）
for (const key of Object.keys(sourceDb)) {
  if (!collectionToModule.has(key)) collectionToModule.set(key, 'misc')
}

const dataDir = resolve(projectRoot, 'server', 'data')
rmSync(dataDir, { recursive: true, force: true })

let totalCollections = 0
let totalRecords = 0
const summary: string[] = []

for (const [collection, records] of Object.entries(sourceDb)) {
  const moduleName = collectionToModule.get(collection)!
  const moduleDir = resolve(dataDir, moduleName)
  mkdirSync(moduleDir, { recursive: true })

  const filePath = resolve(moduleDir, `${collection}.json`)
  writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf-8')

  const len = Array.isArray(records) ? records.length : 0
  totalCollections++
  totalRecords += len
  summary.push(`  - ${moduleName}/${collection}.json: ${len} 筆`)
}

// 重新合併會在啟動時做，移除舊的 runtime db
const runtimeDb = resolve(projectRoot, 'server', 'db.json')
rmSync(runtimeDb, { force: true })

console.log(
  `✓ 從 ${sourcePath} 拆出 ${totalCollections} 個集合（共 ${totalRecords} 筆）`
)
console.log(summary.join('\n'))
console.log(`  → ${dataDir}`)
console.log('  （已移除 server/db.json；下次啟動 server 會重新合併）')
