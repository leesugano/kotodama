import { getLocale, t } from './i18n'

export const DEFAULT_WPM = 140

export function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

/** Estimated reading duration in seconds. */
export function estimateSeconds(
  words: number,
  wpm: number = DEFAULT_WPM,
): number {
  if (words <= 0) return 0
  return Math.round((words / wpm) * 60)
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds}s`
  return `${minutes}min ${seconds.toString().padStart(2, '0')}s`
}

/** Friendly modification date for the script list. */
export function formatModifiedDate(
  timestamp: number,
  now: number = Date.now(),
): string {
  const diffMs = now - timestamp
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return t('time.now')
  if (minutes < 60) return t('time.minutesAgo', { n: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('time.hoursAgo', { n: hours })
  const days = Math.floor(hours / 24)
  if (days < 7) {
    return days === 1 ? t('time.yesterday') : t('time.daysAgo', { n: days })
  }
  return new Date(timestamp).toLocaleDateString(getLocale(), {
    day: '2-digit',
    month: 'short',
  })
}

/** Title derived from the first non-empty line of the script. */
export function deriveTitle(content: string): string {
  const firstLine = content
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0)
  if (!firstLine) return t('editor.untitled')
  return firstLine.length > 80 ? `${firstLine.slice(0, 80)}...` : firstLine
}
