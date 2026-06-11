import type { Script, ScriptRepository } from './types'

const DB_NAME = 'kotodama'
const DB_VERSION = 1
const STORE = 'scripts'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('updatedAt', 'updatedAt')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export class IndexedDBScriptRepository implements ScriptRepository {
  private dbPromise: Promise<IDBDatabase> | null = null

  private db(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDatabase()
    }
    return this.dbPromise
  }

  async get(id: string): Promise<Script | null> {
    const db = await this.db()
    const store = db.transaction(STORE, 'readonly').objectStore(STORE)
    const result = await requestToPromise(store.get(id))
    return (result as Script | undefined) ?? null
  }

  async list(): Promise<Script[]> {
    const db = await this.db()
    const store = db.transaction(STORE, 'readonly').objectStore(STORE)
    const all = await requestToPromise(store.getAll())
    return (all as Script[]).sort((a, b) => b.updatedAt - a.updatedAt)
  }

  async save(script: Script): Promise<void> {
    const db = await this.db()
    const store = db.transaction(STORE, 'readwrite').objectStore(STORE)
    await requestToPromise(store.put(script))
  }

  async remove(id: string): Promise<void> {
    const db = await this.db()
    const store = db.transaction(STORE, 'readwrite').objectStore(STORE)
    await requestToPromise(store.delete(id))
  }
}
