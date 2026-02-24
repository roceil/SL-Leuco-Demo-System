/**
 * 極簡 API 工具
 * 直接存取 /api/（db.json via vite-plugin-simple-db）
 */

const DB_URL = '/api'

/** 從 db.json 讀取指定 collection */
export async function apiGet<T>(collection: string): Promise<T> {
  const res = await fetch(`${DB_URL}/${collection}`)
  if (!res.ok) throw new Error(`[DB] 讀取失敗 (${collection}): ${res.status}`)
  return res.json()
}

/** 將資料寫入 db.json（fire-and-forget，不影響主流程） */
export function apiPut<T>(collection: string, data: T): void {
  fetch(`${DB_URL}/${collection}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).catch((err) => console.warn(`[DB] 寫入失敗 (${collection}):`, err))
}
