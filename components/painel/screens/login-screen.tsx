"use client"

import { useState, type FormEvent } from "react"
import { getSupabase } from "@/lib/supabase"
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
    <div className="min-h-dvh w-full bg-background lg:bg-[#050607]">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-background lg:my-6 lg:min-h-0 lg:rounded-3xl lg:ring-1 lg:ring-border">
        <div className="relative h-[46dvh] min-h-[300px]">
          {/* Lavouras do Cerrado vistas pelo Landsat (NASA Earth Observatory, dominio publico) */}
          <img src="/satelite-cerrado.webp" alt="Lavouras e pivôs de irrigação no Cerrado vistos por satélite" className="absolute inset-0 h-full w-full object-cover" />
          {/* pelicula neutra sobre a foto, para o texto ler */}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,12,14,0.55)_0%,rgba(10,12,14,0.1)_35%,rgba(10,12,14,0.75)_78%,#0a0c0e_100%)]" /> {/* taste-skill-ignore */}
          <div className="absolute inset-x-5 bottom-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-black/40" aria-hidden="true">
                <span className="h-3 w-3 rotate-45 border-2 border-[#4CC3FF]" />
              </span>
              <span className="text-[22px] font-extrabold tracking-[-0.01em] text-white">AGS GEO</span>
            </div>
            <p className="mt-1.5 text-[15px] text-[#C9D0D6]">Levantamento e geoprocessamento com drone</p>
          </div>
        </div>
        <form onSubmit={signIn} className="flex-1 px-5 pb-10 pt-4">
          <h1 className="mb-1 text-[22px] font-bold">Entrar</h1>
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
            <div role="alert" className="mb-3 rounded-[14px] border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm font-semibold text-destructive">
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
