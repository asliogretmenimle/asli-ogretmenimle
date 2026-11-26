import { createClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../cms/config'

/** Yalnızca panelde kullanılır (site ziyaretçileri bu modülü indirmez) */
export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY || 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'ao-admin-auth' },
})
