import { fileURLToPath, URL } from 'node:url'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

import { defineConfig } from 'vite'
import type { ViteDevServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

/** 簡易 JSON DB：以 db.json 作為資料來源，透過 /api/:collection 存取 */
function simpleDb() {
  const dbPath = resolve('./db.json')

  return {
    name: 'simple-db',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api', (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const collection = (req.url ?? '/').slice(1).split('?')[0]

        if (!collection) {
          next()
          return
        }

        res.setHeader('Content-Type', 'application/json')

        if (req.method === 'GET') {
          try {
            const db = JSON.parse(readFileSync(dbPath, 'utf-8'))
            res.end(JSON.stringify(db[collection] ?? null))
          } catch {
            res.statusCode = 500
            res.end(JSON.stringify({ error: 'DB read error' }))
          }
        } else if (req.method === 'PUT') {
          let body = ''
          req.on('data', (chunk: Buffer) => (body += chunk.toString()))
          req.on('end', () => {
            try {
              const db = JSON.parse(readFileSync(dbPath, 'utf-8'))
              db[collection] = JSON.parse(body)
              writeFileSync(dbPath, JSON.stringify(db, null, 2))
              res.end(JSON.stringify({ ok: true }))
            } catch {
              res.statusCode = 500
              res.end(JSON.stringify({ error: 'DB write error' }))
            }
          })
        } else {
          next()
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
    simpleDb(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
