/**
 * Theme handling for Kotodama's light surfaces (landing, editor, sign-in).
 * The prompter is always dark and does not use this module.
 *
 * Stored preference is 'light' | 'dark' | null (null = follow the OS until the
 * user flips the toggle once). Mirrors the SSR-safe localStorage conventions in
 * settings.ts.
 */

export type ThemePreference = 'light' | 'dark'
export type ThemeStored = ThemePreference | null

const THEME_KEY = 'kotodama:theme'

/** Mobile status-bar color per effective theme. */
export const THEME_COLORS: Record<ThemePreference, string> = {
  light: '#ffffff',
  dark: '#1c1c1e',
}

/** Pure: normalize any stored string into a valid preference or null. */
export function parseStoredTheme(raw: string | null): ThemeStored {
  return raw === 'light' || raw === 'dark' ? raw : null
}

/** Pure: the effective theme given a stored preference and the OS signal. */
export function resolveTheme(
  stored: ThemeStored,
  systemDark: boolean,
): ThemePreference {
  if (stored) return stored
  return systemDark ? 'dark' : 'light'
}

export function loadThemePreference(): ThemeStored {
  if (typeof window === 'undefined') return null
  try {
    return parseStoredTheme(window.localStorage.getItem(THEME_KEY))
  } catch {
    return null
  }
}

export function saveThemePreference(preference: ThemePreference): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(THEME_KEY, preference)
  } catch {
    // storage unavailable (private mode): continue without persisting
  }
}

export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** Apply the effective theme to <html> and the mobile status-bar meta. */
export function applyTheme(effective: ThemePreference): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', effective === 'dark')
  let meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', THEME_COLORS[effective])
}

/** The current effective theme (preference if set, else the OS). */
export function currentTheme(): ThemePreference {
  return resolveTheme(loadThemePreference(), systemPrefersDark())
}
