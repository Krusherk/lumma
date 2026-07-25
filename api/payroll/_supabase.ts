import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY

if (!url) throw new Error('[lumma] FATAL: VITE_SUPABASE_URL is not set')
if (!key) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[lumma] FATAL: SUPABASE_SERVICE_KEY is not set in production')
  }
  console.warn('[lumma] WARN: SUPABASE_SERVICE_KEY not set — falling back to anon key (dev only)')
}

export const supabase = createClient(url, key || process.env.VITE_SUPABASE_ANON_KEY!)
