"use client"

import { Fragment, useRef, useState } from "react"
import { FileUp } from "lucide-react"
import { lerKml, semRepetidos, type PoligonoKml } from "@/lib/geo"
import { addTalhao, updateTalhao } from "@/lib/storage"
import { fmtHa, genId } from "@/lib/format"
import type { Project } from "@/lib/types"
import { cn } from "@/lib/utils"
import { ModalSheet } from "./modal-sheet"
import { GhostButton, PrimaryButton } from "./buttons"
import { GeoThumb } from "./geo-thumb"
import { Select, TextInput } from "./fields"

interface Linha extends PoligonoKml {
  usar: boolean
  destino: string // "novo" ou id da matricula existente
}

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim()

// Importa um ou varios KML: cada poligono vira uma matricula nova ou vai para uma ja cadastrada.
export function KmlImportModal({ project, onClose, onSaved }: { project: Project; onClose: () => void; onSaved: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [linhas, setLinhas] = useState<Linha[] | null>(null)
  const [erros, setErros] = useState<string[]>([])
  const [salvando, setSalvando] = useState(false)
  const talhoes = project.talhoes || []

  // Casa pelo nome: "MATRICULA 2 - LIMITE AREA" encontra a matricula "Matricula 2" ou "Ipoeira 2 Parte 1".
  function sugerirDestino(nome: string, usados: Set<string>): string {
    const n = norm(nome)
    const alvo = talhoes.find((t) => {
      if (usados.has(t.id)) return false
      const tn = norm(`${t.name} ${t.identifier || ""}`)
      return tn.length > 0 && (n.includes(tn) || tn.includes(n))
    })
    return alvo ? alvo.id : "novo"
  }

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(e.target.files || [])
    e.target.value = ""
    if (!arquivos.length) return
    const lidos: PoligonoKml[] = []
    const falhas: string[] = []
    for (const f of arquivos) {
      if (/\.kmz$/i.test(f.name)) {
        falhas.push(`${f.name}: arquivo KMZ (compactado). Abra no Google Earth e salve como KML.`)
        continue
      }
      try {
        const achados = lerKml(await f.text(), f.name)
        if (!achados.length) falhas.push(`${f.name}: nenhum polígono encontrado (só linhas ou pontos).`)
        lidos.push(...achados)
      } catch (err) {
        falhas.push(err instanceof Error ? err.message : `${f.name}: não foi possível ler`)
      }
    }
    const usados = new Set<string>()
    const novas = semRepetidos(lidos).map((p) => {
      const destino = sugerirDestino(p.nome, usados)
      if (destino !== "novo") usados.add(destino)
      return { ...p, usar: true, destino }
    })
    setErros(falhas)
    setLinhas(novas)
  }

  const muda = (i: number, patch: Partial<Linha>) => setLinhas((ls) => ls && ls.map((l, j) => (j === i ? { ...l, ...patch } : l)))

  async function salvar() {
    if (!linhas) return
    const escolhidas = linhas.filter((l) => l.usar)
    if (!escolhidas.length) return
    setSalvando(true)
    try {
      for (const l of escolhidas) {
        const hectares = Math.round(l.hectares * 10) / 10
        const existente = talhoes.find((t) => t.id === l.destino)
        if (existente) {
          await updateTalhao(project.id, { ...existente, geometry: l.geometry, targetHectares: existente.targetHectares ?? hectares })
        } else {
          await addTalhao(project.id, {
            id: genId("t"),
            name: l.nome.trim() || "Matrícula",
            identifier: "",
            targetHectares: hectares,
            geometry: l.geometry,
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

  const total = linhas?.filter((l) => l.usar).reduce((s, l) => s + l.hectares, 0) ?? 0

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

      {!linhas ? (
        <>
          <p className="-mt-2 mb-4 text-[14px] leading-relaxed text-muted-foreground">
            Escolha os arquivos KML das matrículas, pode ser vários de uma vez. Cada área vira uma matrícula no mapa, com os hectares
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
          {linhas.length === 0 ? (
            <p className="mb-4 text-[14px] text-muted-foreground">Nenhuma área encontrada nesses arquivos.</p>
          ) : (
            <>
              <p className="-mt-2 mb-3 text-[13px] text-muted-foreground">
                {linhas.length} {linhas.length === 1 ? "área encontrada" : "áreas encontradas"}. Desmarque o que não é matrícula (sede, lago, APP).
              </p>
              <ul className="divide-y divide-border overflow-hidden rounded-[18px] border border-border bg-card">
                {linhas.map((l, i) => (
                  <Fragment key={i}>
                  {(i === 0 || linhas[i - 1].arquivo !== l.arquivo) && (
                    <li className="truncate bg-raised px-3.5 py-2 text-[12.5px] font-semibold text-muted-foreground">{l.arquivo}</li>
                  )}
                  <li className={cn("flex items-start gap-3 px-3 py-2.5", !l.usar && "opacity-50")}>
                    <label className="flex shrink-0 cursor-pointer items-center gap-2 pt-1.5">
                      <input
                        type="checkbox"
                        checked={l.usar}
                        onChange={(e) => muda(i, { usar: e.target.checked })}
                        className="h-5 w-5 accent-[var(--primary)]"
                        aria-label={`Importar ${l.nome}`}
                      />
                      <GeoThumb formas={[{ geometry: l.geometry, pct: 0 }]} className="h-9 w-9 text-foreground" />
                    </label>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {l.destino === "novo" ? (
                          <TextInput value={l.nome} onChange={(e) => muda(i, { nome: e.target.value })} aria-label="Nome da matrícula" disabled={!l.usar} className="min-h-10 py-1.5" />
                        ) : (
                          <span className="min-w-0 flex-1 truncate py-2 text-[15px] font-semibold">{talhoes.find((t) => t.id === l.destino)?.name}</span>
                        )}
                        <span className="num shrink-0 text-[14px] font-bold">{fmtHa(l.hectares)} ha</span>
                      </div>
                      <Select value={l.destino} onChange={(e) => muda(i, { destino: e.target.value })} disabled={!l.usar} aria-label="Matrícula de destino" className="mt-1.5 min-h-9 py-1 text-[14px] text-muted-foreground">
                        <option value="novo">Criar matrícula nova</option>
                        {talhoes.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.geometry ? "Substituir contorno: " : "Usar em: "}
                            {t.name}
                            {t.identifier ? ` · ${t.identifier}` : ""}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </li>
                  </Fragment>
                ))}
              </ul>
              <p className="num mt-3 px-1 text-[13px] text-muted-foreground">
                Selecionadas: <span className="font-semibold text-foreground">{fmtHa(total)} ha</span>
                {project.totalHectares ? ` · contratado ${fmtHa(project.totalHectares)} ha` : ""}
              </p>
            </>
          )}
          <PrimaryButton className="mt-4 w-full" onClick={salvar} disabled={salvando || !linhas.some((l) => l.usar)}>
            {salvando ? "Salvando…" : "Salvar no mapa"}
          </PrimaryButton>
          <GhostButton className="mt-1.5 w-full" onClick={() => fileRef.current?.click()}>Escolher outros arquivos</GhostButton>
        </>
      )}
    </ModalSheet>
  )
}
