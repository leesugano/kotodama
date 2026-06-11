export const DEFAULT_WPM = 140

export function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

/** Duração estimada de leitura em segundos. */
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

/** Data de modificação amigável para a lista de roteiros. */
export function formatModifiedDate(
  timestamp: number,
  now: number = Date.now(),
): string {
  const diffMs = now - timestamp
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return days === 1 ? 'ontem' : `há ${days} dias`
  return new Date(timestamp).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}

/** Título derivado da primeira linha não vazia do roteiro. */
export function deriveTitle(content: string): string {
  const firstLine = content
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0)
  if (!firstLine) return 'Sem título'
  return firstLine.length > 80 ? `${firstLine.slice(0, 80)}...` : firstLine
}
