// Mantem o banco do Supabase acordado: o plano gratis pausa o projeto depois de ~7 dias sem uso.
// A Vercel chama este endereco uma vez por dia (ver "crons" no vercel.json). Ele so pergunta
// a hora ao banco (funcao keepalive() do supabase/01_schema.sql): nao le nem grava dado nenhum.

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  // Com CRON_SECRET configurada na Vercel, so o agendador da propria Vercel consegue chamar.
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, erro: "não autorizado" }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return Response.json({ ok: false, erro: "banco não configurado" }, { status: 500 })

  const inicio = Date.now()
  try {
    const r = await fetch(`${url}/rest/v1/rpc/keepalive`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: "{}",
      cache: "no-store",
    })
    return Response.json({ ok: r.ok, supabase: r.status, ms: Date.now() - inicio }, { status: r.ok ? 200 : 502 })
  } catch (e) {
    return Response.json({ ok: false, erro: String((e as Error)?.message || e), ms: Date.now() - inicio }, { status: 502 })
  }
}
