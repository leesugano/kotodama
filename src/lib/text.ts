import { getLocale, t } from './i18n'

export const DEFAULT_WPM = 140

export type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'emphasis'; text: string }
  | { kind: 'pause' }
  | { kind: 'breath' }

/** Normalizes pasted/imported text: nbsp, line endings, trailing spaces, blank runs. */
export function cleanText(raw: string): string {
  return raw
    .replace(/ /g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
}

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

/** Playback clock as m:ss (minutes uncapped). Invalid input becomes 0:00. */
export function formatClock(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds)
    ? Math.max(0, Math.floor(totalSeconds))
    : 0
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
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

const MARKER_RE = /\[(pause|breath)\]|\*\*([^*]+?)\*\*/gi

export function parseMarkers(text: string): Segment[] {
  const segments: Segment[] = []
  let last = 0
  for (const m of text.matchAll(MARKER_RE)) {
    const i = m.index ?? 0
    if (i > last) segments.push({ kind: 'text', text: text.slice(last, i) })
    if (m[1]) {
      segments.push({
        kind: m[1].toLowerCase() === 'pause' ? 'pause' : 'breath',
      })
    } else if (m[2]) {
      segments.push({ kind: 'emphasis', text: m[2] })
    }
    last = i + m[0].length
  }
  if (last < text.length)
    segments.push({ kind: 'text', text: text.slice(last) })
  return segments
}
