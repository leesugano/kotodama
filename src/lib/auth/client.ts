import { createAuthClient } from 'better-auth/react'

/* baseURL omitido: usa a origin atual, válida em dev e produção */
export const authClient = createAuthClient()
