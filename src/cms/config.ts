/** Supabase bağlantısı (bkz. docs/yonetim-paneli.md). .env / Vercel değişkenleri varsayılanları ezer. */

type Env = Record<string, string | undefined>
const viteEnv: Env = ((import.meta as unknown as { env?: Env }).env ?? {}) as Env
const nodeEnv: Env = ((globalThis as unknown as { process?: { env?: Env } }).process?.env ?? {}) as Env

export const SUPABASE_URL = (viteEnv.VITE_SUPABASE_URL || nodeEnv.VITE_SUPABASE_URL || 'https://swwfgmgxqqmynmjpchxv.supabase.co').replace(/\/+$/, '')
// Publishable anahtar tarayıcıda açık olacak şekilde tasarlanmıştır (erişimi RLS politikaları sınırlar);
// ortam değişkeni verilmezse bu kullanılır, böylece Vercel ayarına bağlı kalmadan çalışır.
const DEFAULT_PUBLISHABLE_KEY = 'sb_publishable_OhOWn-lo3T5hQQ1vKs0fYA_XVPYkD6Z'
export const SUPABASE_ANON_KEY = viteEnv.VITE_SUPABASE_ANON_KEY || nodeEnv.VITE_SUPABASE_ANON_KEY || DEFAULT_PUBLISHABLE_KEY

/** Anahtar yoksa site koddaki içerikle aynen çalışır */
export const cmsEnabled = !!SUPABASE_ANON_KEY

export const ADMIN_PATH = '/yonetim'
