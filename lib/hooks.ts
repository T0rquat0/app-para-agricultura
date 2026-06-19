"use client"

// Hooks SWR sobre a camada de dados. Quando o backend mudar,
// estes hooks continuam iguais — so o storage.ts muda.

import useSWR, { useSWRConfig } from "swr"
import { getFinancialOverview, getIndex, getInvestments, getProject, getVehicles } from "./storage"
import type { ProjectSummary } from "./types"

export function useIndex() {
  const { data, isLoading } = useSWR("index", () => getIndex())
  const list = (data || []).slice() as ProjectSummary[]
  list.sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt || 0).getTime() -
      new Date(a.updatedAt || a.createdAt || 0).getTime(),
  )
  return { index: list, isLoading }
}

export function useProject(id: string | null) {
  const { data, isLoading } = useSWR(id ? `project:${id}` : null, () => getProject(id as string))
  return { project: data || null, isLoading }
}

export function useInvestments() {
  const { data, isLoading } = useSWR("investments", () => getInvestments())
  return { investments: data || [], isLoading }
}

export function useVehicles() {
  const { data } = useSWR("vehicles", () => getVehicles())
  return { vehicles: data || [] }
}

export function useFinancialOverview() {
  const { data, isLoading } = useSWR("financial-overview", () => getFinancialOverview())
  return { overview: data, isLoading }
}

// Revalida tudo apos uma escrita (mantem todas as telas em sincronia).
export function useRefresh() {
  const { mutate } = useSWRConfig()
  return () => mutate(() => true, undefined, { revalidate: true })
}
