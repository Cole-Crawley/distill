import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { applySettingsToDocument, loadSettings, saveSettings, type Settings } from '../lib/settings'

interface SettingsContextValue {
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => loadSettings())

  useEffect(() => {
    applySettingsToDocument(settings)
    saveSettings(settings)
  }, [settings])

  // Keeps 'system' theme/reduced-motion in sync if the OS preference
  // changes while the app is already open (e.g. the user's OS switches to
  // dark mode at sunset), without needing a page reload.
  useEffect(() => {
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const reapply = () => applySettingsToDocument(settings)
    darkQuery.addEventListener('change', reapply)
    motionQuery.addEventListener('change', reapply)
    return () => {
      darkQuery.removeEventListener('change', reapply)
      motionQuery.removeEventListener('change', reapply)
    }
  }, [settings])

  function updateSettings(patch: Partial<Settings>) {
    setSettings(prev => ({ ...prev, ...patch }))
  }

  return <SettingsContext.Provider value={{ settings, updateSettings }}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings must be used within a SettingsProvider')
  return context
}
