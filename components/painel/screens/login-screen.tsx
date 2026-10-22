"use client"

import { useState, type FormEvent } from "react"
import { getSupabase } from "@/lib/supabase"
import { Logo } from "../logo"
import { Field, Hint, TextInput } from "../fields"
import { PrimaryButton } from "../buttons"

// Traduz os erros do Supabase Auth que o usuario pode encontrar.
function loginErrorMessage(message: string): string {
  if (/invalid login credentials/i.test(message)) return "E-mail ou senha incorretos."
  if (/email not confirmed/i.test(message)) return "Esse e-mail ainda não foi confirmado."
  if (/failed to fetch|network/i.test(message)) return "Sem conexão com a internet. Tente de novo quando tiver sinal."
  if (/rate limit|too many/i.test(message)) return "Muitas tentativas seguidas. Espere alguns minutos."
  return "Não foi possível entrar. Tente novamente."
}

export function LoginScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function signIn(e: FormEvent) {
    e.preventDefault()
    const supabase = getSupabase()
    if (!supabase) return
    if (!email.trim() || !password) {
      setError("Informe o e-mail e a senha.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (authError) setError(loginErrorMessage(authError.message))
    } catch (err) {
      setError(loginErrorMessage(err instanceof Error ? err.message : ""))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh w-full bg-background lg:bg-muted">
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-background lg:my-6 lg:min-h-0 lg:rounded-3xl lg:shadow-xl lg:ring-1 lg:ring-border">
        <div className="bg-brand-dark px-5 pb-8 pt-[calc(env(safe-area-inset-top)+28px)] lg:rounded-t-3xl">
          <Logo size={44} />
        </div>
        <form onSubmit={signIn} className="flex-1 px-5 pb-10 pt-8">
          <h1 className="mb-1 text-xl font-extrabold text-foreground">Entrar</h1>
          <Hint className="mb-6">Os dados ficam guardados na nuvem e aparecem em qualquer aparelho em que você entrar.</Hint>
          <Field label="E-mail">
            <TextInput
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoFocus
            />
          </Field>
          <Field label="Senha">
            <TextInput
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error && (
            <div role="alert" className="mb-3 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm font-semibold text-destructive">
              {error}
            </div>
          )}
          <PrimaryButton type="submit" className="mt-2 w-full" disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
          </PrimaryButton>
        </form>
      </div>
    </div>
  )
}
