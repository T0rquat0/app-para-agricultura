"use client"

import { useCallback, useEffect, useState } from "react"
import { NavContext, type Screen, type Tab } from "./nav-context"
import { HomeScreen } from "./screens/home-screen"
import { NewProjectScreen } from "./screens/new-project-screen"
import { ProjectScreen } from "./screens/project-screen"
import { ReportClientScreen } from "./screens/report-client-screen"
import { ReportExpensesScreen } from "./screens/report-expenses-screen"
import { InvestmentsScreen } from "./screens/investments-screen"
import { InvestmentsReportScreen } from "./screens/investments-report-screen"

export function PainelApp() {
  const [screen, setScreen] = useState<Screen>("home")
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>("areas")
  const [dark, setDark] = useState(false)

  // Tema (preferencia do sistema na primeira carga)
  useEffect(() => {
    const prefersDark =
      typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("ags-theme") : null
    setDark(saved ? saved === "dark" : prefersDark)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", dark)
    try {
      window.localStorage.setItem("ags-theme", dark ? "dark" : "light")
    } catch {
      /* ignore */
    }
  }, [dark])

  const navigate = useCallback((s: Screen) => setScreen(s), [])
  const openProject = useCallback((id: string) => {
    setCurrentProjectId(id)
    setActiveTab("areas")
    setScreen("project")
  }, [])
  const goHome = useCallback(() => {
    setScreen("home")
    setCurrentProjectId(null)
  }, [])
  const goNewProject = useCallback(() => setScreen("newProject"), [])
  const goInvestments = useCallback(() => setScreen("investments"), [])
  const setTab = useCallback((t: Tab) => setActiveTab(t), [])
  const goReport = useCallback((s: Screen) => setScreen(s), [])
  const toggleDark = useCallback(() => setDark((d) => !d), [])

  return (
    <NavContext.Provider
      value={{
        screen,
        currentProjectId,
        activeTab,
        dark,
        navigate,
        openProject,
        goHome,
        goNewProject,
        goInvestments,
        setTab,
        goReport,
        toggleDark,
      }}
    >
      <div className="min-h-dvh w-full bg-background lg:bg-muted">
        <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-background shadow-none lg:my-6 lg:min-h-0 lg:rounded-3xl lg:shadow-xl lg:ring-1 lg:ring-border">
          {screen === "home" && <HomeScreen />}
          {screen === "newProject" && <NewProjectScreen />}
          {screen === "project" && <ProjectScreen />}
          {screen === "reportClient" && <ReportClientScreen />}
          {screen === "reportExpenses" && <ReportExpensesScreen />}
          {screen === "investments" && <InvestmentsScreen />}
          {screen === "investmentsReport" && <InvestmentsReportScreen />}
        </div>
      </div>
    </NavContext.Provider>
  )
}
