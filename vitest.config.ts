import { defineConfig } from 'vitest/config'

/* Config separada do vite.config.ts: o plugin do Cloudflare não roda
   dentro do vitest, e as libs testadas são funções puras sem DOM */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
