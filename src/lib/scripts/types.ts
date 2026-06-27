export interface Script {
  id: string
  title: string
  content: string
  /** true once the user renamed manually; autosave stops deriving the title */
  customTitle?: boolean
  createdAt: number
  updatedAt: number
}

/**
 * All script storage goes through this interface.
 * v1: IndexedDB. v2: Cloudflare D1 (sync) without refactoring the app.
 */
export interface ScriptRepository {
  get(id: string): Promise<Script | null>
  list(): Promise<Script[]>
  save(script: Script): Promise<void>
  saveMany(scripts: Script[]): Promise<void>
  remove(id: string): Promise<void>
}
