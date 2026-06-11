export interface PrompterSettings {
  /** Velocidade do scroll em px/s */
  speed: number
  /** Tamanho da fonte do prompter em px */
  fontSize: number
  /** Espelhamento horizontal (teleprompter físico com espelho) */
  mirrorX: boolean
  /** Espelhamento vertical */
  mirrorY: boolean
}

export const SPEED_MIN = 10
export const SPEED_MAX = 200
export const SPEED_STEP = 5
export const FONT_MIN = 24
export const FONT_MAX = 96
export const FONT_STEP = 4

export const DEFAULT_SETTINGS: PrompterSettings = {
  speed: 60,
  fontSize: 48,
  mirrorX: false,
  mirrorY: false,
}

const SETTINGS_KEY = 'kotodama:settings'
const CURRENT_SCRIPT_KEY = 'kotodama:current-script-id'

export function clampSpeed(value: number): number {
  return Math.min(SPEED_MAX, Math.max(SPEED_MIN, value))
}

export function clampFontSize(value: number): number {
  return Math.min(FONT_MAX, Math.max(FONT_MIN, value))
}

export function loadSettings(): PrompterSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<PrompterSettings>
    return {
      speed: clampSpeed(Number(parsed.speed) || DEFAULT_SETTINGS.speed),
      fontSize: clampFontSize(
        Number(parsed.fontSize) || DEFAULT_SETTINGS.fontSize,
      ),
      mirrorX: parsed.mirrorX === true,
      mirrorY: parsed.mirrorY === true,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: PrompterSettings): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // storage indisponível (modo privado): segue sem persistir
  }
}

export function loadCurrentScriptId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(CURRENT_SCRIPT_KEY)
  } catch {
    return null
  }
}

export function saveCurrentScriptId(id: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CURRENT_SCRIPT_KEY, id)
  } catch {
    // storage indisponível: segue sem persistir
  }
}
