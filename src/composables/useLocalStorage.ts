/**
 * 極簡資料層工具
 *
 * 與後端的合約：
 *   GET /api/<collection>  → 整張表（陣列）
 *   PUT /api/<collection>  → 用 body 取代整張表（陣列）
 *
 * 三種部署模式皆可：
 *   1. 本地開發：vite proxy /api → http://localhost:3001（不再 rewrite）
 *   2. 單 service：前端與 API 同 server，請求走相對 /api/...
 *   3. 雙 service：VITE_API_BASE_URL 設成 server 的絕對網址（不含 /api），
 *      程式碼會自動補上 /api 前綴
 */

const RAW_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
const BASE_URL = `${RAW_BASE}/api`

/** 從後端讀取指定 collection */
export async function apiGet<T>(collection: string): Promise<T> {
  const url = `${BASE_URL}/${collection}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`[DB] 讀取失敗 (${collection}): ${res.status}`)
  // 防禦性檢查：production 部署若 VITE_API_BASE_URL 沒設定、或 server 沒啟動，
  // /api/* 可能會被 SPA fallback 攔走拿回 index.html，導致 JSON.parse 出錯。
  // 這裡先確認 Content-Type，給出有用的錯誤訊息。
  const ct = res.headers.get('content-type') ?? ''
  if (!ct.includes('json')) {
    throw new Error(
      `[DB] ${url} 回傳了非 JSON 內容（${ct || '空 content-type'}）；` +
      `若已部署到 Zeabur，請確認前端 build 時 VITE_API_BASE_URL 指向 server service 的網址。`
    )
  }
  return res.json()
}

/** 將整張表寫回後端（fire-and-forget；錯誤僅 warn，不影響主流程） */
export function apiPut<T>(collection: string, data: T): void {
  void fetch(`${BASE_URL}/${collection}`, {  // BASE_URL 已含 /api
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).catch((err) => console.warn(`[DB] 寫入失敗 (${collection}):`, err))
}
