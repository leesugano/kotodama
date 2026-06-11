import { env } from 'cloudflare:workers'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../../db/schema'

/* Vars e secrets opcionais chegam fora do tipo gerado pelo wrangler */
interface AuthEnv {
  DB: D1Database
  BETTER_AUTH_URL?: string
  BETTER_AUTH_SECRET?: string
  GITHUB_CLIENT_ID?: string
  GITHUB_CLIENT_SECRET?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
}

const authEnv = env as unknown as AuthEnv

/* Providers sociais entram só quando as credenciais existem no ambiente */
function socialProviders() {
  const providers: Record<string, { clientId: string; clientSecret: string }> =
    {}
  if (authEnv.GITHUB_CLIENT_ID && authEnv.GITHUB_CLIENT_SECRET) {
    providers.github = {
      clientId: authEnv.GITHUB_CLIENT_ID,
      clientSecret: authEnv.GITHUB_CLIENT_SECRET,
    }
  }
  if (authEnv.GOOGLE_CLIENT_ID && authEnv.GOOGLE_CLIENT_SECRET) {
    providers.google = {
      clientId: authEnv.GOOGLE_CLIENT_ID,
      clientSecret: authEnv.GOOGLE_CLIENT_SECRET,
    }
  }
  return providers
}

export const auth = betterAuth({
  baseURL: authEnv.BETTER_AUTH_URL,
  secret: authEnv.BETTER_AUTH_SECRET,
  database: drizzleAdapter(drizzle(authEnv.DB, { schema }), {
    provider: 'sqlite',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: socialProviders(),
})

export const enabledSocialProviders = Object.keys(socialProviders())
