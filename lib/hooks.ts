"use client"

// Hooks SWR sobre a camada de dados. Quando o backend mudar,
// estes hooks continuam iguais — so o storage.ts muda.

import useSWR, { useSWRConfig } from "swr"
import {
  getCommissionConfig,
  getCommissionEntries,
  getFinancialOverview,
  getIndex,
  getInvestments,
  getProject,
  getVehicles,
} from "./storage"
import type { CommissionConfig, ProjectSummary } from "./types"

const DEFAULT_COMMISSION_CONFIG: CommissionConfig = { percent: 10, fixedSalary: 2000 }

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

export function useCommissionEntries() {
  const { data, isLoading } = useSWR("commission-entries", () => getCommissionEntries())
  return { entries: data || [], isLoading }
}

export function useCommissionConfig() {
  const { data, isLoading } = useSWR("commission-config", () => getCommissionConfig())
  return { config: data || DEFAULT_COMMISSION_CONFIG, isLoading }
}

// Revalida tudo apos uma escrita (mantem todas as telas em sincronia).
export function useRefresh() {
  const { mutate } = useSWRConfig()
  return () => mutate(() => true, undefined, { revalidate: true })
}
