# Kotodama

> Teleprompter profissional na web. Cola o texto, aperta play, grava.

Kotodama é um teleprompter open source que roda inteiro no navegador. Sem instalar app, sem conta obrigatória, sem anúncio cobrindo o texto. Funciona no celular e no desktop.

**Produção:** https://kotodama.leesugano.workers.dev

## Por que existe

Criadores de conteúdo, professores e profissionais que gravam vídeo precisam de um teleprompter simples. As opções atuais são apps pagos, sites lentos cheios de anúncios ou ferramentas que não funcionam offline. O Kotodama resolve isso com uma regra: do primeiro acesso ao texto rolando na tela em menos de 30 segundos.

## Funcionalidades

- **Editor com auto-save**: cole ou digite o roteiro; ele é salvo automaticamente no dispositivo enquanto você escreve, com contador de palavras e duração estimada (140 wpm).
- **Scroll suave e preciso**: rolagem via `requestAnimationFrame` com delta time. A velocidade em px/s independe do framerate; fica igual em telas de 60Hz e 120Hz.
- **Velocidade em tempo real**: de 10 a 200 px/s, ajustável durante a rolagem sem salto de posição.
- **Fonte ajustável**: de 24 a 96px, persiste entre sessões.
- **Espelhamento**: horizontal, vertical ou ambos, para teleprompter físico com espelho.
- **Roteiros salvos**: lista local com criar, renomear, duplicar e excluir. Tudo em IndexedDB, zero rede.
- **Wake lock**: a tela não apaga durante a leitura no celular (com fallback silencioso).
- **PWA offline**: instala como app e funciona 100% offline depois da primeira visita (service worker + fonte self-hosted).
- **Contagem regressiva**: 3-2-1 configurável (0 a 10s) antes do scroll começar; um toque cancela.
- **Linha-guia**: linha horizontal opcional para manter o olhar perto da câmera, com posição ajustável.
- **Presets de velocidade**: calmo, natural e rápido, além do ajuste fino em px/s.
- **Margens laterais**: largura do texto ajustável para enquadramentos diferentes.
- **Quebras de seção**: uma linha com `---` no roteiro vira um separador visual no prompter.
- **i18n preparado**: PT-BR padrão com dicionários EN e JA prontos na estrutura.
- **Conta opcional**: autenticação com Better Auth (email e senha, com suporte a GitHub e Google). Serve de base para o sync de roteiros entre dispositivos (em desenvolvimento).

### Atalhos de teclado

| Tecla | Ação |
|---|---|
| Espaço | Play / pause |
| ↑ / ↓ | Velocidade + / - |
| + / - | Fonte + / - |
| M | Espelhar horizontal |
| R | Voltar ao início |
| F | Fullscreen |
| Esc | Sair do prompter |

### Gestos no celular

| Gesto | Ação |
|---|---|
| Tap | Play / pause |
| Pinch | Tamanho da fonte |
| Dois dedos na vertical | Velocidade |
| Toque | Mostrar controles |

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) + React + TypeScript |
| Runtime e deploy | [Cloudflare Workers](https://workers.cloudflare.com) (assets estáticos + SSR) |
| Estilo | Tailwind CSS v4 com design tokens próprios |
| Lint e format | [Biome](https://biomejs.dev) |
| Autenticação | [Better Auth](https://better-auth.com) + Cloudflare D1 + Drizzle ORM |
| Roteiros | IndexedDB atrás da interface `ScriptRepository` |
| Preferências | localStorage |

### Decisões de arquitetura

- **Client-heavy**: o Worker serve os assets e a shell SSR; toda a lógica do prompter roda no client.
- **Storage abstraído**: todo acesso a roteiros passa pela interface `ScriptRepository` (`src/lib/scripts/types.ts`). A v1 usa IndexedDB; o sync via D1 entra sem refatorar o app.
- **Local-first e privado**: os roteiros nunca saem do dispositivo. A conta é opcional e hoje guarda apenas usuário e sessão.

## Rodando localmente

Pré-requisitos: Node 20+ e uma conta Cloudflare (gratuita) para o D1.

```bash
git clone https://github.com/leesugano/kotodama.git
cd kotodama
npm install

# secret local do Better Auth
cp .dev.vars.example .dev.vars
# preencha BETTER_AUTH_SECRET (gere com: openssl rand -base64 32)

# banco local do D1 (usuários e sessões)
npx wrangler d1 migrations apply kotodama --local

npm run dev
```

O app sobe em `http://localhost:3000`.

### Scripts

```bash
npm run dev        # dev server com Vite
npm run lint       # biome check
npm run format     # biome check --write
npm run test       # vitest
npm run build      # build de produção
npm run deploy     # build + wrangler deploy
npm run cf-typegen # regenera tipos dos bindings
```

## Deploy no Cloudflare Workers

1. Autentique o Wrangler: `npx wrangler login` (ou exporte `CLOUDFLARE_API_TOKEN`).
2. Crie o banco D1 e ajuste o `database_id` no `wrangler.jsonc`:

```bash
npx wrangler d1 create kotodama
npx wrangler d1 migrations apply kotodama --remote
```

3. Configure o secret e a URL pública:

```bash
npx wrangler secret put BETTER_AUTH_SECRET
# edite BETTER_AUTH_URL em wrangler.jsonc com o seu domínio
```

4. Deploy:

```bash
npm run deploy
```

### Login social (opcional)

O login com GitHub e Google é ativado automaticamente quando as credenciais existem no ambiente. Crie os OAuth apps nos respectivos consoles com callback `https://SEU_DOMINIO/api/auth/callback/github` (ou `google`) e configure:

```bash
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

Para desenvolvimento local, use as mesmas chaves no `.dev.vars`.

## Estrutura do projeto

```
src/
  routes/
    index.tsx          # landing page
    editor.tsx         # editor com lista de roteiros
    prompter.tsx       # tela do prompter (fullscreen, rAF)
    entrar.tsx         # login e criação de conta
    api/auth/$.ts      # handler do Better Auth
  components/
    Logo.tsx           # marca (mesma arte do favicon e dos ícones PWA)
    InstallPrompt.tsx  # convite discreto de instalação do PWA
  lib/
    scripts/           # ScriptRepository + implementação IndexedDB
    auth/              # instância Better Auth (server) e client React
    settings.ts        # preferências do prompter (localStorage)
    i18n.ts            # strings da UI (PT-BR padrão, EN/JA prontos)
    text.ts            # contagem de palavras, duração, títulos
  db/schema.ts         # schema Drizzle (tabelas do Better Auth)
  hooks/useWakeLock.ts # wake lock com fallback silencioso
public/
  sw.js                # service worker (offline após a primeira visita)
  manifest.json        # manifest do PWA
migrations/            # migrações SQL do D1
```

## Roadmap

- [x] Fase 1: editor + prompter com play/pause, velocidade e fonte
- [x] Fase 2: espelhamento, gestos mobile, wake lock, roteiros salvos, landing, autenticação
- [x] Fase 3: PWA completo (offline), countdown 3-2-1, eye-line, presets, margens, seções, i18n
- [x] Fase 4: QA do design system, Lighthouse 90+ (Performance 100 / A11y 95)
- [ ] Domínio próprio
- [ ] v2: sync de roteiros via D1, controle remoto (celular controla o desktop), compartilhar por link

## Contribuindo

Contribuições são bem-vindas.

1. Abra uma issue descrevendo o problema ou a proposta antes de PRs grandes.
2. Fork, branch a partir de `main`, commits pequenos e descritivos em inglês.
3. Rode `npm run lint` e `npm run build` antes de abrir o PR.
4. Siga o design system do projeto: tokens em `src/styles.css`, sem cores fora da paleta, sentence case na UI.

## Licença

[MIT](./LICENSE). Feito por Lee Sugano, aberto para todos.
