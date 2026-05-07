import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.\n' +
    'Copy boldflow-dashboard/.env.example → .env and fill in your values.'
  )
}

// Guard against createClient(undefined, undefined) crash in production
export const supabase = createClient(url ?? '', key ?? '', {
  auth: { persistSession: true },
})
