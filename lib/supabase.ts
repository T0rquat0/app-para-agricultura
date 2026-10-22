// Cliente do Supabase (banco na nuvem).
// Enquanto NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY nao estiverem configuradas
// (na Vercel ou no .env.local), getSupabase() devolve null e o app segue como sempre:
// sem login e com os dados so no aparelho. A chave "anon" pode ficar no app; quem protege
// os dados sao as regras de seguranca (RLS) de supabase/01_schema.sql.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let client: SupabaseClient | null = null

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey)
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured() || typeof window === "undefined") return null
  if (!client) {
    client = createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  }
  return client
}
