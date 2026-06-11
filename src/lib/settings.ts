export interface PrompterSettings {
  /** Velocidade do scroll em px/s */
  speed: number
  /** Tamanho da fonte do prompter em px */
  fontSize: number
  /** Espelhamento horizontal (teleprompter físico com espelho) */
  mirrorX: boolean
  /** Espelhamento vertical */
  mirrorY: boolean
  /** Segundos de contagem regressiva antes do scroll iniciar (0 desliga) */
  countdown: number
  /** Linha-guia horizontal para manter o olhar perto da câmera */
  eyeLine: boolean
  /** Posição vertical da linha-guia em % da altura da tela */
  eyeLinePosition: number
  /** Margem lateral do texto em % da largura da tela */
  margin: number
}

export const SPEED_MIN = 10
export const SPEED_MAX = 200
export const SPEED_STEP = 5
export const FONT_MIN = 24
export const FONT_MAX = 96
export const FONT_STEP = 4
export const COUNTDOWN_MIN = 0
export const COUNTDOWN_MAX = 10
export const EYELINE_MIN = 15
export const EYELINE_MAX = 85
export const MARGIN_MIN = 0
export const MARGIN_MAX = 25

/** Presets nomeados de velocidade: nomes vêm do i18n (preset.calm etc.) */
export const SPEED_PRESETS = [
  { id: 'calm', speed: 40 },
  { id: 'natural', speed: 60 },
  { id: 'fast', speed: 90 },
] as const

export const DEFAULT_SETTINGS: PrompterSettings = {
  speed: 60,
  fontSize: 48,
  mirrorX: false,
  mirrorY: false,
  countdown: 3,
  eyeLine: false,
  eyeLinePosition: 33,
  margin: 7,
}

const SETTINGS_KEY = 'kotodama:settings'
const CURRENT_SCRIPT_KEY = 'kotodama:current-script-id'

function clamp(min: number, max: number, value: number): number {
  return Math.min(max, Math.max(min, value))
}

export function clampSpeed(value: number): number {
  return clamp(SPEED_MIN, SPEED_MAX, value)
}

export function clampFontSize(value: number): number {
  return clamp(FONT_MIN, FONT_MAX, value)
}

export function clampCountdown(value: number): number {
  return clamp(COUNTDOWN_MIN, COUNTDOWN_MAX, value)
}

export function clampEyeLinePosition(value: number): number {
  return clamp(EYELINE_MIN, EYELINE_MAX, value)
}

export function clampMargin(value: number): number {
  return clamp(MARGIN_MIN, MARGIN_MAX, value)
}

function numberOr(fallback: number, value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function loadSettings(): PrompterSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<PrompterSettings>
    return {
      speed: clampSpeed(numberOr(DEFAULT_SETTINGS.speed, parsed.speed)),
      fontSize: clampFontSize(
        numberOr(DEFAULT_SETTINGS.fontSize, parsed.fontSize),
      ),
      mirrorX: parsed.mirrorX === true,
      mirrorY: parsed.mirrorY === true,
      countdown: clampCountdown(
        numberOr(DEFAULT_SETTINGS.countdown, parsed.countdown),
      ),
      eyeLine: parsed.eyeLine === true,
      eyeLinePosition: clampEyeLinePosition(
        numberOr(DEFAULT_SETTINGS.eyeLinePosition, parsed.eyeLinePosition),
      ),
      margin: clampMargin(numberOr(DEFAULT_SETTINGS.margin, parsed.margin)),
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
