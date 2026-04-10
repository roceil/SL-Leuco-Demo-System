/**
 * 極簡 API 工具
 * Dev：直接存取 /api/（db.json via vite-plugin-simple-db）
 * Production：從靜態 /db.json 讀取，寫入更新記憶體快取（session 內有效）
 */

// 記憶體快取：production 時由 /db.json 初始化，之後的 PUT 只更新此快取
let memoryDb: Record<string, unknown> | null = null

async function getDb(): Promise<Record<string, unknown>> {
  if (memoryDb !== null) return memoryDb
  const res = await fetch('/db.json')
  if (!res.ok) throw new Error(`[DB] 無法載入 db.json: ${res.status}`)
  memoryDb = await res.json()
  return memoryDb!
}

/** 從 db.json 讀取指定 collection */
export async function apiGet<T>(collection: string): Promise<T> {
  if (import.meta.env.DEV) {
    const res = await fetch(`/api/${collection}`)
    if (!res.ok) throw new Error(`[DB] 讀取失敗 (${collection}): ${res.status}`)
    return res.json()
  }

  const db = await getDb()
  return (db[collection] ?? null) as T
}

/** 將資料寫入 db.json（fire-and-forget，不影響主流程） */
export function apiPut<T>(collection: string, data: T): void {
  if (import.meta.env.DEV) {
    fetch(`/api/${collection}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch((err) => console.warn(`[DB] 寫入失敗 (${collection}):`, err))
    return
  }

  // Production：只更新記憶體快取
  getDb()
    .then((db) => {
      db[collection] = data
    })
    .catch((err) => console.warn(`[DB] 寫入失敗 (${collection}):`, err))
}
