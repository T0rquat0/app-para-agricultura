"use client"

import { useRef, useState } from "react"
import { ChevronDown, FileUp } from "lucide-react"
import { contidosEmOutro, lerKml, semRepetidos, type PoligonoKml } from "@/lib/geo"
import { addTalhao, updateTalhao } from "@/lib/storage"
import { fmtHa, genId } from "@/lib/format"
import type { Project } from "@/lib/types"
import { cn } from "@/lib/utils"
import { ModalSheet } from "./modal-sheet"
import { GhostButton, PrimaryButton } from "./buttons"
import { GeoThumb } from "./geo-thumb"
import { Select, TextInput } from "./fields"

interface Area extends PoligonoKml {
  usar: boolean
  dentroDeOutra: boolean
}

// Um arquivo KML = um grupo. Por padrao vira UMA matricula com todas as areas dentro
// (as "trilhas"); opcionalmente uma matricula por area.
interface Grupo {
  arquivo: string
  nome: string
  areas: Area[]
  destino: string // "novo" ou id de matricula existente
  separar: boolean
  aberto: boolean
}

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim()

export function KmlImportModal({ project, onClose, onSaved }: { project: Project; onClose: () => void; onSaved: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [grupos, setGrupos] = useState<Grupo[] | null>(null)
  const [erros, setErros] = useState<string[]>([])
  const [salvando, setSalvando] = useState(false)
  const talhoes = project.talhoes || []

  // Sugere a matricula ja cadastrada SO quando ela ainda nao tem contorno e o nome bate bem
  // com o do arquivo. Nunca encaixa sozinho num contorno existente (isso apagava o anterior).
  function sugerirDestino(nomeArquivo: string, usados: Set<string>): string {
    const n = norm(nomeArquivo)
    const alvo = talhoes.find((t) => {
      if (usados.has(t.id) || t.geometry?.length) return false
      const tn = norm(`${t.name} ${t.identifier || ""}`)
      return tn.length >= 4 && (n === tn || n.includes(tn) || tn.includes(n))
    })
    return alvo ? alvo.id : "novo"
  }

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(e.target.files || [])
    e.target.value = ""
    if (!arquivos.length) return
    const falhas: string[] = []
    const usados = new Set<string>((grupos || []).map((g) => g.destino).filter((d) => d !== "novo"))
    const novos: Grupo[] = []
    for (const f of arquivos) {
      if (/\.kmz$/i.test(f.name)) {
        falhas.push(`${f.name}: arquivo KMZ (compactado). Abra no Google Earth e salve como KML.`)
        continue
      }
      try {
        const lidas = semRepetidos(lerKml(await f.text(), f.name))
        if (!lidas.length) {
          falhas.push(`${f.name}: nenhum polígono encontrado (só linhas ou pontos).`)
          continue
        }
        const contidas = contidosEmOutro(lidas)
        const nome = f.name.replace(/\.km[lz]$/i, "").replace(/\s*\(\d+\)$/, "").trim()
        const destino = sugerirDestino(nome, usados)
        if (destino !== "novo") usados.add(destino)
        novos.push({
          arquivo: f.name,
          nome,
          destino,
          separar: false,
          aberto: false,
          areas: lidas.map((a, i) => ({ ...a, usar: !contidas[i], dentroDeOutra: contidas[i] })),
        })
      } catch (err) {
        falhas.push(err instanceof Error ? err.message : `${f.name}: não foi possível ler`)
      }
    }
    setErros(falhas)
    setGrupos((atuais) => [...(atuais || []), ...novos])
  }

  const mudaGrupo = (g: number, patch: Partial<Grupo>) => setGrupos((gs) => gs && gs.map((x, i) => (i === g ? { ...x, ...patch } : x)))
  const mudaArea = (g: number, a: number, patch: Partial<Area>) =>
    setGrupos((gs) => gs && gs.map((x, i) => (i === g ? { ...x, areas: x.areas.map((y, j) => (j === a ? { ...y, ...patch } : y)) } : x)))

  async function salvar() {
    if (!grupos) return
    setSalvando(true)
    try {
      for (const g of grupos) {
        const escolhidas = g.areas.filter((a) => a.usar)
        if (!escolhidas.length) continue
        if (g.separar) {
          // Uma matricula por area (jeito antigo)
          for (const a of escolhidas) {
            await addTalhao(project.id, {
              id: genId("t"),
              name: a.nome.trim() || "Matrícula",
              identifier: g.nome,
              targetHectares: Math.round(a.hectares * 10) / 10,
              geometry: a.geometry,
              geometryNames: a.geometry.map(() => a.nome),
              createdAt: new Date().toISOString(),
            })
          }
          continue
        }
        // Uma matricula com todas as areas do arquivo
        const geometry = escolhidas.flatMap((a) => a.geometry)
        const geometryNames = escolhidas.flatMap((a) => a.geometry.map(() => a.nome))
        const hectares = Math.round(escolhidas.reduce((s, a) => s + a.hectares, 0) * 10) / 10
        const existente = talhoes.find((t) => t.id === g.destino)
        if (existente) {
          await updateTalhao(project.id, { ...existente, geometry, geometryNames, targetHectares: existente.targetHectares ?? hectares })
        } else {
          await addTalhao(project.id, {
            id: genId("t"),
            name: g.nome.trim() || "Matrícula",
            identifier: "",
            targetHectares: hectares,
            geometry,
            geometryNames,
            createdAt: new Date().toISOString(),
          })
        }
      }
      onSaved()
      onClose()
    } finally {
      setSalvando(false)
    }
  }

  const algoParaSalvar = grupos?.some((g) => g.areas.some((a) => a.usar)) ?? false

  return (
    <ModalSheet title="Importar KML" onClose={onClose}>
      <input
        ref={fileRef}
        type="file"
        multiple
        accept=".kml,application/vnd.google-earth.kml+xml,application/xml,text/xml"
        className="hidden"
        onChange={escolher}
      />

      {!grupos ? (
        <>
          <p className="-mt-2 mb-4 text-[14px] leading-relaxed text-muted-foreground">
            Escolha os KMLs, pode ser vários de uma vez. Cada arquivo vira uma matrícula no mapa, com as áreas dele dentro e os hectares
            calculados pelo contorno.
          </p>
          <PrimaryButton className="w-full" onClick={() => fileRef.current?.click()}>
            <FileUp className="h-[18px] w-[18px]" /> Escolher arquivos KML
          </PrimaryButton>
          <GhostButton className="mt-1.5 w-full" onClick={onClose}>Cancelar</GhostButton>
        </>
      ) : (
        <>
          {erros.length > 0 && (
            <div role="alert" className="mb-3 rounded-[14px] border border-warning/30 bg-warning/10 px-3.5 py-2.5 text-[13px] text-warning">
              {erros.map((e) => <p key={e}>{e}</p>)}
            </div>
          )}

          <div className="space-y-3">
            {grupos.map((g, gi) => {
              const marcadas = g.areas.filter((a) => a.usar)
              const ha = marcadas.reduce((s, a) => s + a.hectares, 0)
              const existente = talhoes.find((t) => t.id === g.destino)
              return (
                <section key={gi} className="overflow-hidden rounded-[18px] border border-border bg-card">
                  <div className="flex items-start gap-3 p-3.5">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] bg-raised">
                      <GeoThumb formas={marcadas.map((a) => ({ geometry: a.geometry, pct: 0 }))} className="h-12 w-12 text-foreground" />
                    </span>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      {g.destino === "novo" && !g.separar ? (
                        <TextInput value={g.nome} onChange={(e) => mudaGrupo(gi, { nome: e.target.value })} aria-label="Nome da matrícula" className="min-h-10 py-1.5 font-semibold" />
                      ) : (
                        <p className="truncate pt-1 text-[15px] font-semibold">{g.separar ? g.arquivo : existente?.name}</p>
                      )}
                      <p className="num text-[13px] text-muted-foreground">
                        {marcadas.length} de {g.areas.length} {g.areas.length === 1 ? "área" : "áreas"} ·{" "}
                        <span className="font-semibold text-foreground">{fmtHa(ha)} ha</span>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 px-3.5 pb-3">
                    <Select
                      value={g.separar ? "separar" : g.destino}
                      onChange={(e) =>
                        e.target.value === "separar" ? mudaGrupo(gi, { separar: true }) : mudaGrupo(gi, { separar: false, destino: e.target.value })
                      }
                      aria-label="Onde guardar"
                      className="min-h-10 py-1.5 text-[15px]"
                    >
                      <option value="novo">Matrícula nova com o arquivo todo</option>
                      {talhoes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.geometry?.length ? "Trocar o contorno de: " : "Guardar em: "}
                          {t.name}
                          {t.identifier ? ` · ${t.identifier}` : ""}
                        </option>
                      ))}
                      {g.areas.length > 1 && <option value="separar">Uma matrícula para cada área ({g.areas.length})</option>}
                    </Select>
                    {existente?.geometry?.length && !g.separar ? (
                      <p className="text-[12.5px] text-warning">O contorno atual de {existente.name} será trocado por este.</p>
                    ) : null}
                  </div>

                  {g.areas.length > 1 && (
                    <>
                      <button
                        onClick={() => mudaGrupo(gi, { aberto: !g.aberto })}
                        aria-expanded={g.aberto}
                        className="flex w-full items-center justify-between border-t border-border px-3.5 py-2.5 text-[13.5px] font-semibold text-muted-foreground hover:bg-raised"
                      >
                        {g.aberto ? "Esconder as áreas" : `Ver as ${g.areas.length} áreas do arquivo`}
                        <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", g.aberto && "rotate-180")} />
                      </button>
                      {g.aberto && (
                        <ul className="divide-y divide-border border-t border-border bg-background/40">
                          {g.areas.map((a, ai) => (
                            <li key={ai}>
                              <label className={cn("flex cursor-pointer items-center gap-3 px-3.5 py-2", !a.usar && "opacity-55")}>
                                <input
                                  type="checkbox"
                                  checked={a.usar}
                                  onChange={(e) => mudaArea(gi, ai, { usar: e.target.checked })}
                                  className="h-5 w-5 shrink-0 accent-[var(--primary)]"
                                />
                                <GeoThumb formas={[{ geometry: a.geometry, pct: 0 }]} className="h-8 w-8 shrink-0 text-foreground" />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[14px] font-semibold">{a.nome}</span>
                                  {a.dentroDeOutra && <span className="block text-[12px] text-faint">fica dentro de outra área</span>}
                                </span>
                                <span className="num shrink-0 text-[13.5px] font-semibold">{fmtHa(a.hectares)} ha</span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </section>
              )
            })}
          </div>

          <PrimaryButton className="mt-4 w-full" onClick={salvar} disabled={salvando || !algoParaSalvar}>
            {salvando ? "Salvando…" : "Salvar no mapa"}
          </PrimaryButton>
          <GhostButton className="mt-1.5 w-full" onClick={() => fileRef.current?.click()}>
            Adicionar outro KML
          </GhostButton>
        </>
      )}
    </ModalSheet>
  )
}
