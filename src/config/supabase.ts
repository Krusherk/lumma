import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  cover_url: string
  category: string
  published: boolean
  created_at: string
  updated_at: string
}
