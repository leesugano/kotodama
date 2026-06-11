import { IndexedDBScriptRepository } from './indexeddb-repository'
import type { ScriptRepository } from './types'

let instance: ScriptRepository | null = null

/** Current implementation: IndexedDB. Call on the client only. */
export function getScriptRepository(): ScriptRepository {
  if (!instance) {
    instance = new IndexedDBScriptRepository()
  }
  return instance
}
