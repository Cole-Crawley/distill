// User-configurable app settings: API key, theme, text size, reduced motion.
// Distill has no backend/account system, so these live in localStorage —
// same place the AI response cache already lives (see ai-adapter.ts).

export type ThemeSetting = 'light' | 'dark' | 'system'
export type TextSizeSetting = 'small' | 'medium' | 'large'
export type ReducedMotionSetting = 'system' | 'on' | 'off'

export interface Settings {
  apiKey: string
  theme: ThemeSetting
  textSize: TextSizeSetting
  reducedMotion: ReducedMotionSetting
}

export const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  theme: 'system',
  textSize: 'medium',
  reducedMotion: 'system',
}

const STORAGE_KEY = 'distill:settings'

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

// A user-supplied key (via Settings) always wins; VITE_ANTHROPIC_API_KEY is
// a dev-time convenience fallback (e.g. for benchmarking, see benchmark/) so
// a real deployed instance doesn't strictly require one to be baked in.
export function resolveApiKey(settings: Pick<Settings, 'apiKey'>): string | undefined {
  return settings.apiKey.trim() || import.meta.env.VITE_ANTHROPIC_API_KEY
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function prefersDarkMode(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function effectiveIsDark(theme: ThemeSetting): boolean {
  return theme === 'dark' || (theme === 'system' && prefersDarkMode())
}

export function effectiveReducedMotion(setting: ReducedMotionSetting): boolean {
  return setting === 'on' || (setting === 'system' && prefersReducedMotion())
}

const TEXT_SCALE: Record<TextSizeSetting, string> = {
  small: '0.9375',
  medium: '1',
  large: '1.125',
}

export function textScaleValue(size: TextSizeSetting): string {
  return TEXT_SCALE[size]
}

// Applies the visual side effects of settings directly to the document —
// shared between the pre-paint bootstrap script (index.html, avoids a
// flash of the wrong theme) and the SettingsProvider (keeps things in sync
// after the user changes a setting at runtime).
export function applySettingsToDocument(settings: Settings): void {
  const root = document.documentElement
  root.classList.toggle('dark', effectiveIsDark(settings.theme))
  root.classList.toggle('motion-reduce', effectiveReducedMotion(settings.reducedMotion))
  root.style.setProperty('--text-scale', textScaleValue(settings.textSize))
}
