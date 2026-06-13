import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { t } from '../lib/i18n'
import {
  applyTheme,
  currentTheme,
  loadThemePreference,
  saveThemePreference,
  systemPrefersDark,
  type ThemePreference,
} from '../lib/theme'

/**
 * Two-state Light/Dark toggle. Shows the effective theme and flips to the
 * opposite on click. Until the user clicks once (no stored preference), it
 * tracks the OS theme live.
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  // Start from a stable value so SSR and the first client render match;
  // the effect re-syncs to the real effective theme after mount.
  const [theme, setTheme] = useState<ThemePreference>('light')

  useEffect(() => {
    setTheme(currentTheme())
  }, [])

  // Follow the OS only while there is no explicit preference.
  useEffect(() => {
    if (loadThemePreference() !== null) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (loadThemePreference() !== null) return
      const next = systemPrefersDark() ? 'dark' : 'light'
      setTheme(next)
      applyTheme(next)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const toggle = () => {
    const next: ThemePreference = theme === 'dark' ? 'light' : 'dark'
    saveThemePreference(next)
    applyTheme(next)
    setTheme(next)
  }

  const label = theme === 'dark' ? t('theme.toLight') : t('theme.toDark')

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`rounded-btn p-2 text-secondary transition-colors duration-[140ms] hover:text-primary ${className}`}
    >
      {theme === 'dark' ? (
        <Sun size={18} strokeWidth={1.5} aria-hidden />
      ) : (
        <Moon size={18} strokeWidth={1.5} aria-hidden />
      )}
    </button>
  )
}
