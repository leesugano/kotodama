import type { Script } from './scripts/types'
import { cleanText } from './text'

export interface NewScriptInput {
  title: string
  content: string
}

const BACKUP_SCHEMA = 1

export function scriptToTxt(script: { content: string }): string {
  return script.content
}

export function txtToScript(filename: string, text: string): NewScriptInput {
  const title = filename.replace(/\.[^.]+$/, '').trim() || 'Untitled'
  return { title, content: cleanText(text) }
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

export function filenameForBackup(date: Date): string {
  const y = date.getUTCFullYear()
  const m = pad(date.getUTCMonth() + 1)
  const d = pad(date.getUTCDate())
  return `kotodama-backup-${y}-${m}-${d}.json`
}

export function exportBackup(scripts: Script[]): string {
  return JSON.stringify(
    { schema: BACKUP_SCHEMA, exportedAt: new Date().toISOString(), scripts },
    null,
    2,
  )
}

function isScript(v: unknown): v is Script {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.title === 'string' &&
    typeof o.content === 'string' &&
    typeof o.createdAt === 'number' &&
    typeof o.updatedAt === 'number'
  )
}

export function parseBackup(
  text: string,
): { ok: true; scripts: Script[] } | { ok: false; error: string } {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'invalid-json' }
  }
  if (typeof data !== 'object' || data === null)
    return { ok: false, error: 'invalid-shape' }
  const o = data as Record<string, unknown>
  if (o.schema !== BACKUP_SCHEMA)
    return { ok: false, error: 'unsupported-schema' }
  if (!Array.isArray(o.scripts) || !o.scripts.every(isScript)) {
    return { ok: false, error: 'invalid-scripts' }
  }
  return { ok: true, scripts: o.scripts as Script[] }
}

export function mergeBackup(
  existing: Script[],
  incoming: Script[],
): { toSave: Script[]; updated: number; added: number } {
  const byId = new Map(existing.map((s) => [s.id, s]))
  const toSave: Script[] = []
  let updated = 0
  let added = 0
  for (const inc of incoming) {
    const cur = byId.get(inc.id)
    if (!cur) {
      toSave.push(inc)
      added++
    } else if (inc.updatedAt > cur.updatedAt) {
      toSave.push(inc)
      updated++
    }
  }
  return { toSave, updated, added }
}

/** Triggers a client-side download. Browser only. */
export function downloadText(
  filename: string,
  text: string,
  type = 'text/plain',
): void {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Extracts raw text from a .docx file. Browser only; mammoth is loaded on demand. */
export async function docxToText(file: File): Promise<string> {
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}
