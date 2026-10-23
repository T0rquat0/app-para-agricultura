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
import { CommissionScreen } from "./screens/commission-screen"
import { CommissionReportScreen } from "./screens/commission-report-screen"
import { ProposalsScreen } from "./screens/proposals-screen"
import { ProposalFormScreen } from "./screens/proposal-form-screen"
import { ProposalDocumentScreen } from "./screens/proposal-document-screen"
import { SplashScreen } from "./splash-screen"
import { AuthGate } from "./auth-gate"
import { TAB_SCREENS, TabBar } from "./tab-bar"
import { currentPeriod } from "@/lib/calculations"

export function PainelApp() {
  const [screen, setScreen] = useState<Screen>("home")
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [currentProposalId, setCurrentProposalId] = useState<string | null>(null)
  const [period, setPeriodState] = useState<string>(currentPeriod())
  const [activeTab, setActiveTab] = useState<Tab>("areas")
  const [dark, setDark] = useState(true)
  const [showSplash, setShowSplash] = useState(false)

  // Splash apenas no "cold start" (uma vez por sessao), para nao atrapalhar a navegacao
  // DEV: trava de sessao desativada temporariamente p/ a splash aparecer em todo reload.
  useEffect(() => {
    setShowSplash(true)
  }, [])

  const dismissSplash = useCallback(() => {
    setShowSplash(false)
    try {
      window.sessionStorage.setItem("ags-splash-shown", "1")
    } catch {
      /* ignore */
    }
  }, [])

  // Tema: escuro por padrao (o claro fica como opcao para usar no sol)
  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("ags-theme") : null
    setDark(saved ? saved === "dark" : true)
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
  const goCommission = useCallback(() => {
    // Recalcula o mes atual toda vez que a aba e aberta — nao confia no valor salvo
    // em memoria, que pode estar desatualizado se o PWA ficou em segundo plano
    // (celular "fechado" nem sempre mata o processo) ou se o usuario navegou para
    // outro mes com as setinhas e nao voltou.
    setPeriodState(currentPeriod())
    setScreen("commission")
  }, [])
  const setPeriod = useCallback((p: string) => setPeriodState(p), [])
  const setTab = useCallback((t: Tab) => setActiveTab(t), [])
  const goReport = useCallback((s: Screen) => setScreen(s), [])
  const toggleDark = useCallback(() => setDark((d) => !d), [])
  const goProposals = useCallback(() => setScreen("proposals"), [])
  const openProposal = useCallback((id: string | null) => {
    setCurrentProposalId(id)
    setScreen("proposalForm")
  }, [])

  const withTabs = TAB_SCREENS.includes(screen)

  return (
    <NavContext.Provider
      value={{
        screen,
        currentProjectId,
        currentProposalId,
        currentPeriod: period,
        activeTab,
        dark,
        navigate,
        openProject,
        goHome,
        goNewProject,
        goInvestments,
        goCommission,
        goProposals,
        openProposal,
        setPeriod,
        setTab,
        goReport,
        toggleDark,
      }}
    >
      {showSplash && <SplashScreen onDone={dismissSplash} />}
      <AuthGate>
        <div
          className="min-h-dvh w-full bg-background lg:bg-[#050607]"
          style={{ ["--tabbar" as string]: withTabs ? "calc(64px + env(safe-area-inset-bottom))" : "0px" }}
        >
          <div
            className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-background lg:my-6 lg:min-h-[calc(100dvh-3rem)] lg:rounded-3xl lg:ring-1 lg:ring-border"
            style={{ paddingBottom: withTabs ? "var(--tabbar)" : "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
          >
            {screen === "home" && <HomeScreen />}
            {screen === "newProject" && <NewProjectScreen />}
            {screen === "project" && <ProjectScreen />}
            {screen === "reportClient" && <ReportClientScreen />}
            {screen === "reportExpenses" && <ReportExpensesScreen />}
            {screen === "investments" && <InvestmentsScreen />}
            {screen === "investmentsReport" && <InvestmentsReportScreen />}
            {screen === "commission" && <CommissionScreen />}
            {screen === "commissionReport" && <CommissionReportScreen />}
            {screen === "proposals" && <ProposalsScreen />}
            {screen === "proposalForm" && <ProposalFormScreen />}
            {screen === "proposalDocument" && <ProposalDocumentScreen />}
            {withTabs && <TabBar />}
          </div>
        </div>
      </AuthGate>
    </NavContext.Provider>
  )
}
