"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { Session } from "@supabase/supabase-js"
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase"
import { LoginScreen } from "./screens/login-screen"

interface AuthState {
  // null quando o banco ainda nao esta configurado (app so no aparelho, sem login)
  email: string | null
  signOut: (() => Promise<void>) | null
}

const AuthContext = createContext<AuthState>({ email: null, signOut: null })

export function useAuth(): AuthState {
  return useContext(AuthContext)
}

// Sem banco configurado: deixa passar direto. Com banco: so mostra o app depois do login.
export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [checking, setChecking] = useState(isSupabaseConfigured())

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) {
      setChecking(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!isSupabaseConfigured()) return <>{children}</>
  if (checking) return null
  if (!session) return <LoginScreen />

  const signOut = async () => {
    await getSupabase()?.auth.signOut()
  }
  return (
    <AuthContext.Provider value={{ email: session.user.email ?? null, signOut }}>{children}</AuthContext.Provider>
  )
}
