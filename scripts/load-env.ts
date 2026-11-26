/** Vite'ın tarayıcıya verdiği .env değişkenlerini derleme betiklerine de yükler (Vercel'de zaten ortamda bulunur) */
import { existsSync } from 'node:fs'

for (const f of ['.env', '.env.local', '.env.production', '.env.production.local']) {
  if (existsSync(f)) {
    try {
      process.loadEnvFile(f)
    } catch {
      /* okunamadı: geç */
    }
  }
}
