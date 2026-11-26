/** Supabase bağlantısı. Anahtar .env dosyasında: VITE_SUPABASE_ANON_KEY (bkz. docs/yonetim-paneli.md) */

type Env = Record<string, string | undefined>
const viteEnv: Env = ((import.meta as unknown as { env?: Env }).env ?? {}) as Env
const nodeEnv: Env = ((globalThis as unknown as { process?: { env?: Env } }).process?.env ?? {}) as Env

export const SUPABASE_URL = (viteEnv.VITE_SUPABASE_URL || nodeEnv.VITE_SUPABASE_URL || 'https://swwfgmgxqqmynmjpchxv.supabase.co').replace(/\/+$/, '')
export const SUPABASE_ANON_KEY = viteEnv.VITE_SUPABASE_ANON_KEY || nodeEnv.VITE_SUPABASE_ANON_KEY || ''

/** Anahtar yoksa site koddaki içerikle aynen çalışır */
export const cmsEnabled = !!SUPABASE_ANON_KEY

export const ADMIN_PATH = '/yonetim'
