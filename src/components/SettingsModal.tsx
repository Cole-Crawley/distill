import { useState } from 'react'
import { Eye, EyeOff, X } from 'lucide-react'
import { useSettings } from '../hooks/useSettings'
import type { ReducedMotionSetting, TextSizeSetting, ThemeSetting } from '../lib/settings'

interface SettingsModalProps {
  onClose: () => void
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="inline-flex rounded border border-border-warm bg-cream p-0.5">
      {options.map(option => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={[
            'rounded-sm px-3 py-1 font-body text-sm transition-colors duration-150',
            option.value === value
              ? 'bg-forest text-cream'
              : 'text-stone-muted hover:text-stone-ink',
          ].join(' ')}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex flex-col gap-0.5">
        <p className="font-body text-sm text-stone-ink">{label}</p>
        {description && <p className="font-body text-xs text-stone-muted">{description}</p>}
      </div>
      {children}
    </div>
  )
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useSettings()
  const [apiKeyDraft, setApiKeyDraft] = useState(settings.apiKey)
  const [showApiKey, setShowApiKey] = useState(false)
  const [saved, setSaved] = useState(false)

  function handleSaveApiKey() {
    updateSettings({ apiKey: apiKeyDraft.trim() })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-ink/40 p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded border border-border-warm bg-cream shadow-warm"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border-warm px-6 py-4">
          <h2 className="font-display text-lg leading-snug text-stone-ink">Settings</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-stone-muted hover:text-stone-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto px-6 py-6">
          <div className="flex flex-col gap-2">
            <p className="font-mono text-xs uppercase tracking-wide text-stone-muted">Claude API key</p>
            <p className="font-body text-xs text-stone-muted">
              Needed for "Clarify with AI" and document analysis. Your key stays on this device and is
              only ever sent directly to Anthropic's API, never anywhere else.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKeyDraft}
                  onChange={event => setApiKeyDraft(event.target.value)}
                  placeholder="sk-ant-..."
                  className="h-10 w-full rounded border border-border-warm bg-cream px-3 pr-10 font-mono text-sm text-stone-ink focus:border-forest focus:outline-none focus:ring-0"
                />
                <button
                  onClick={() => setShowApiKey(prev => !prev)}
                  aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-muted hover:text-stone-ink"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
                onClick={handleSaveApiKey}
                className="rounded bg-forest px-4 font-body text-sm font-medium text-cream transition-colors duration-150 hover:bg-forest-dark"
              >
                {saved ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>

          <div className="flex flex-col divide-y divide-border-warm border-t border-border-warm">
            <SettingRow label="Theme" description="Light, dark, or match your system.">
              <SegmentedControl<ThemeSetting>
                value={settings.theme}
                onChange={theme => updateSettings({ theme })}
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'system', label: 'System' },
                ]}
              />
            </SettingRow>

            <SettingRow label="Text size" description="Scales text across the whole app.">
              <SegmentedControl<TextSizeSetting>
                value={settings.textSize}
                onChange={textSize => updateSettings({ textSize })}
                options={[
                  { value: 'small', label: 'Small' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'large', label: 'Large' },
                ]}
              />
            </SettingRow>

            <SettingRow label="Reduce motion" description="Turns off animations, regardless of your system setting.">
              <SegmentedControl<ReducedMotionSetting>
                value={settings.reducedMotion}
                onChange={reducedMotion => updateSettings({ reducedMotion })}
                options={[
                  { value: 'system', label: 'System' },
                  { value: 'on', label: 'On' },
                  { value: 'off', label: 'Off' },
                ]}
              />
            </SettingRow>
          </div>
        </div>
      </div>
    </div>
  )
}
