export interface Script {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}

/**
 * Todo storage de roteiros passa por esta interface.
 * v1: IndexedDB. v2: Cloudflare D1 (sync) sem refatorar o app.
 */
export interface ScriptRepository {
  get(id: string): Promise<Script | null>
  list(): Promise<Script[]>
  save(script: Script): Promise<void>
  remove(id: string): Promise<void>
}
