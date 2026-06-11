import { IndexedDBScriptRepository } from './indexeddb-repository'
import type { ScriptRepository } from './types'

let instance: ScriptRepository | null = null

/** Implementação atual: IndexedDB. Chamar apenas no client. */
export function getScriptRepository(): ScriptRepository {
  if (!instance) {
    instance = new IndexedDBScriptRepository()
  }
  return instance
}
