# Kotodama

Teleprompter profissional na web. Cola o texto, aperta play, grava. Sem conta, sem app, sem anúncio.

URL de produção: https://kotodama.leesugano.workers.dev

## Stack

- TanStack Start + React + TypeScript
- Cloudflare Workers (assets estáticos + SSR)
- Tailwind CSS v4 com tokens do Design System Lee Sugano
- Biome (lint e format)
- IndexedDB (roteiros) + localStorage (preferências), atrás da interface `ScriptRepository`

## Comandos

```bash
npm install        # dependências
npm run dev        # dev server em http://localhost:3000
npm run lint       # biome check
npm run format     # biome check --write
npm run build      # build de produção
npm run deploy     # build + wrangler deploy
```

## Estrutura

- `src/routes/index.tsx`: editor de roteiro (página inicial)
- `src/routes/prompter.tsx`: tela do prompter (fullscreen, scroll via requestAnimationFrame)
- `src/lib/scripts/`: tipos, interface `ScriptRepository` e implementação IndexedDB
- `src/lib/settings.ts`: preferências do prompter em localStorage
- `src/lib/text.ts`: contagem de palavras e duração estimada (140 wpm)
- `src/styles.css`: tokens do design system (paleta `--ls-*`, movimento, radii)

## Atalhos do prompter

| Tecla | Ação |
|---|---|
| Espaço | Play / pause |
| ↑ / ↓ | Velocidade + / - |
| + / - | Fonte + / - |
| R | Voltar ao início |
| F | Fullscreen |
| Esc | Sair do prompter |

## Roadmap

- Fase 1 (feita): scaffold, editor, prompter com play/pause, velocidade e fonte, deploy no Workers
- Fase 2: espelhamento, gestos mobile, wake lock, lista de roteiros salvos
- Fase 3: PWA completo (offline), countdown, eye-line, polish
- Fase 4: QA, Lighthouse, domínio
