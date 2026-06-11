import { Download, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { t } from '../lib/i18n'

const DISMISSED_KEY = 'kotodama:install-dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Discreet PWA install prompt: shows up as a pill in the bottom corner when
 * the browser fires beforeinstallprompt. It never blocks anything and, once
 * dismissed, does not come back.
 */
export function InstallPrompt() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISSED_KEY)) return
    } catch {
      // storage unavailable: show it anyway
    }
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (!installEvent) return null

  const dismiss = () => {
    setInstallEvent(null)
    try {
      window.localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // no storage: dismiss for this session only
    }
  }

  const install = async () => {
    await installEvent.prompt()
    setInstallEvent(null)
  }

  return (
    <div className="fade-overlay fixed right-4 bottom-24 z-50 flex items-center gap-1 rounded-card border border-ls-line bg-ls-white px-2 py-1.5 shadow-lg">
      <button
        type="button"
        onClick={install}
        className="flex items-center gap-2 rounded-btn px-2 py-1.5 text-sm text-ls-gray-900 transition-colors duration-[140ms] hover:text-ls-blue"
      >
        <Download size={16} strokeWidth={1.5} aria-hidden />
        {t('install.cta')}
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t('install.dismiss')}
        className="rounded-btn p-1.5 text-ls-gray-500 transition-colors duration-[140ms] hover:text-ls-gray-900"
      >
        <X size={14} strokeWidth={1.5} aria-hidden />
      </button>
    </div>
  )
}
