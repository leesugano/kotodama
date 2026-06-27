export interface PrompterSettings {
  /** Scroll speed in px/s */
  speed: number
  /** Prompter font size in px */
  fontSize: number
  /** Horizontal mirroring (physical teleprompter rigs with a mirror) */
  mirrorX: boolean
  /** Vertical mirroring */
  mirrorY: boolean
  /** Countdown seconds before the scroll starts (0 turns it off) */
  countdown: number
  /** Horizontal eye line to keep the gaze near the camera */
  eyeLine: boolean
  /** Vertical position of the eye line as % of the screen height */
  eyeLinePosition: number
  /** Side margin of the text as % of the screen width */
  margin: number
  /** Camera self-view behind the text */
  camera: boolean
  /** Voice tracking: speech recognition drives the scroll */
  voice: boolean
  /** BCP-47 tag for speech recognition; empty string follows the browser.
   * Named speechLang in storage so legacy voiceLang values (always 'en-US')
   * are dropped and existing users get the automatic default. */
  speechLang: string
  /** Reader line-height multiplier */
  lineHeight: number
  /** Reader column max width in px */
  columnWidth: number
  /** Reader font family */
  fontFamily: 'sans' | 'serif'
  /** Words per minute used for the editor duration estimate */
  wpm: number
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
export const LINE_HEIGHT_MIN = 1.2
export const LINE_HEIGHT_MAX = 2
export const COLUMN_WIDTH_MIN = 600
export const COLUMN_WIDTH_MAX = 1100
export const WPM_MIN = 80
export const WPM_MAX = 260

/** Named speed presets: labels come from i18n (preset.calm etc.) */
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
  camera: false,
  voice: false,
  speechLang: '',
  lineHeight: 1.45,
  columnWidth: 900,
  fontFamily: 'sans',
  wpm: 140,
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
export function clampLineHeight(value: number): number {
  return clamp(LINE_HEIGHT_MIN, LINE_HEIGHT_MAX, value)
}
export function clampColumnWidth(value: number): number {
  return clamp(COLUMN_WIDTH_MIN, COLUMN_WIDTH_MAX, value)
}
export function clampWpm(value: number): number {
  return Math.round(clamp(WPM_MIN, WPM_MAX, value))
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
      camera: parsed.camera === true,
      voice: parsed.voice === true,
      speechLang:
        typeof parsed.speechLang === 'string' ? parsed.speechLang : '',
      lineHeight: clampLineHeight(
        numberOr(DEFAULT_SETTINGS.lineHeight, parsed.lineHeight),
      ),
      columnWidth: clampColumnWidth(
        numberOr(DEFAULT_SETTINGS.columnWidth, parsed.columnWidth),
      ),
      fontFamily: parsed.fontFamily === 'serif' ? 'serif' : 'sans',
      wpm: clampWpm(numberOr(DEFAULT_SETTINGS.wpm, parsed.wpm)),
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
    // storage unavailable (private mode): continue without persisting
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
    // storage unavailable: continue without persisting
  }
}
