import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import Button from './Button'

// The "install this as an app" banner: catches Chrome's beforeinstallprompt event and shows our own banner instead of the browser's default one. Chromium-only; Safari/Firefox never fire this event.

const DISMISSED_KEY = 'distill:install-prompt-dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isRunningStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
}

export default function InstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === 'true')

  useEffect(() => {
    if (isRunningStandalone()) return // already installed and running as an app — nothing to prompt

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setDeferredEvent(event as BeforeInstallPromptEvent)
    }

    function handleAppInstalled() {
      setDeferredEvent(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  async function handleInstall() {
    if (!deferredEvent) return
    await deferredEvent.prompt()
    await deferredEvent.userChoice // resolves once the user accepts or dismisses the native dialog
    setDeferredEvent(null)
  }

  function handleDismiss() {
    setDismissed(true)
    localStorage.setItem(DISMISSED_KEY, 'true')
  }

  if (!deferredEvent || dismissed) return null

  return (
    <div className="fixed bottom-4 right-4 z-40 flex w-72 items-start gap-3 rounded border border-border-warm bg-surface p-4 shadow-warm">
      <Download className="mt-0.5 h-5 w-5 shrink-0 text-forest" />
      <div className="flex flex-1 flex-col gap-2">
        <div>
          <p className="font-body text-sm font-medium text-stone-ink">Install Distill</p>
          <p className="font-body text-xs text-stone-muted">Use it like an app, and study offline.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleInstall}>
            Install
          </Button>
          <button
            onClick={handleDismiss}
            className="font-body text-xs text-stone-muted hover:text-stone-ink"
          >
            Not now
          </button>
        </div>
      </div>
      <button onClick={handleDismiss} aria-label="Dismiss" className="text-stone-muted hover:text-stone-ink">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
