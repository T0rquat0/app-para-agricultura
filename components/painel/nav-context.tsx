"use client"

import { createContext, useContext } from "react"

export type Screen =
  | "home"
  | "newProject"
  | "project"
  | "reportClient"
  | "reportExpenses"
  | "investments"
  | "investmentsReport"

export type Tab = "areas" | "services" | "expenses" | "timeline"

export interface NavState {
  screen: Screen
  currentProjectId: string | null
  activeTab: Tab
  dark: boolean
  navigate: (screen: Screen) => void
  openProject: (id: string) => void
  goHome: () => void
  goNewProject: () => void
  goInvestments: () => void
  setTab: (tab: Tab) => void
  goReport: (screen: Screen) => void
  toggleDark: () => void
}

export const NavContext = createContext<NavState | null>(null)

export function useNav(): NavState {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error("useNav deve ser usado dentro de <PainelApp>")
  return ctx
}
