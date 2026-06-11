# Kotodama

> Professional teleprompter for the web. Paste your text, press play, record.

Kotodama is an open source teleprompter that runs entirely in the browser. No app to install, no required account, no ad covering your text. Works on mobile and desktop.

**Production:** https://kotodama.leesugano.com

## Why it exists

Content creators, teachers and professionals who record video need a simple teleprompter. The current options are paid apps, slow ad-ridden websites or tools that do not work offline. Kotodama solves this with one rule: from first visit to text scrolling on screen in under 30 seconds.

## Features

- **Voice tracking**: turn on the mic and the script follows your voice. Speech recognition (Web Speech API) matches what you say against the script and scrolls to keep you on the right line. The language follows the browser language automatically, with 50+ languages available for manual override. Misread or skipped words are forgiven by a fuzzy lookahead matcher.
- **Camera self-view**: put your own camera behind the text. The front camera becomes the prompter background (mirrored, under a dark scrim) so you can check your framing while you read.
- **Editor with auto-save**: paste or type the script; it is saved automatically on the device while you write, with word count and estimated duration (140 wpm).
- **Smooth, precise scrolling**: `requestAnimationFrame` with delta time. Speed in px/s is framerate-independent; it is the same on 60Hz and 120Hz screens.
- **Real-time speed**: from 10 to 200 px/s, adjustable while scrolling with no position jump.
- **Adjustable font**: from 24 to 96px, persisted across sessions.
- **Mirroring**: horizontal, vertical or both, for physical teleprompter rigs with a mirror.
- **Saved scripts**: local list with create, rename, duplicate and delete. All in IndexedDB, zero network.
- **Wake lock**: the screen stays on while reading on mobile (with a silent fallback).
- **Offline PWA**: installs as an app and works 100% offline after the first visit (service worker + self-hosted font).
- **Countdown**: configurable 3-2-1 (0 to 10s) before the scroll starts; a tap cancels it.
- **Eye line**: optional horizontal guide to keep the gaze near the camera, with adjustable position.
- **Speed presets**: calm, natural and fast, plus fine adjustment in px/s.
- **Side margins**: adjustable text width for different framings.
- **Section breaks**: a line with `---` in the script becomes a visual separator in the prompter.
- **i18n**: English by default, with complete PT-BR and JA dictionaries.
- **Optional account**: authentication with Better Auth (email and password, with GitHub and Google support). Foundation for script sync across devices (in development).

### Keyboard shortcuts

| Key | Action |
|---|---|
| Space | Play / pause |
| ↑ / ↓ | Speed + / - |
| + / - | Font + / - |
| V | Voice tracking |
| C | Camera self-view |
| M | Mirror horizontally |
| R | Back to start |
| F | Fullscreen |
| Esc | Exit prompter |

### Mobile gestures

| Gesture | Action |
|---|---|
| Tap | Play / pause |
| Pinch | Font size |
| Two fingers vertically | Speed |
| Touch | Show controls |

## How voice tracking works

1. The script is tokenized (lowercased, no punctuation or diacritics; CJK text is split per character so Japanese and Chinese work without word boundaries).
2. While you speak, the Web Speech API emits interim transcripts. Each utterance is re-matched in full from a stable baseline, so words the engine revises mid-stream ("brow" becoming "brown") are never lost.
3. A greedy fuzzy matcher (prefixes and single-letter slips count) advances a cursor through the script inside a small lookahead window — misrecognized or skipped words never get the prompter stuck.
4. The scroll eases toward the position that puts the last matched word on the reading line (the eye line, when enabled).
5. The recognition language defaults to the browser language (the API cannot detect the spoken language); a manual override lives in the prompter settings. If the engine fails repeatedly (offline, no speech service), a notice appears instead of failing silently.

Voice tracking uses the browser's speech recognition engine (Chrome, Edge and Safari; not available in Firefox). Audio is processed by the browser/OS engine, not by Kotodama servers — Kotodama has none.

## Stack

| Layer | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) + React + TypeScript |
| Runtime and deploy | [Cloudflare Workers](https://workers.cloudflare.com) (static assets + SSR) |
| Styling | Tailwind CSS v4 with custom design tokens |
| Lint and format | [Biome](https://biomejs.dev) |
| Authentication | [Better Auth](https://better-auth.com) + Cloudflare D1 + Drizzle ORM |
| Scripts | IndexedDB behind the `ScriptRepository` interface |
| Preferences | localStorage |

### Architecture decisions

- **Client-heavy**: the Worker serves the assets and the SSR shell; all prompter logic runs on the client.
- **Abstracted storage**: all script access goes through the `ScriptRepository` interface (`src/lib/scripts/types.ts`). v1 uses IndexedDB; D1 sync lands without refactoring the app.
- **Local-first and private**: scripts never leave the device. The account is optional and currently stores only user and session.

## Running locally

Prerequisites: Node 20+ and a (free) Cloudflare account for D1.

```bash
git clone https://github.com/leesugano/kotodama.git
cd kotodama
npm install

# local Better Auth secret
cp .dev.vars.example .dev.vars
# fill in BETTER_AUTH_SECRET (generate with: openssl rand -base64 32)

# local D1 database (users and sessions)
npx wrangler d1 migrations apply kotodama --local

npm run dev
```

The app runs at `http://localhost:3000`.

### Scripts

```bash
npm run dev        # dev server with Vite
npm run lint       # biome check
npm run format     # biome check --write
npm run test       # vitest
npm run build      # production build
npm run deploy     # build + wrangler deploy
npm run cf-typegen # regenerate binding types
```

## Deploying to Cloudflare Workers

1. Authenticate Wrangler: `npx wrangler login` (or export `CLOUDFLARE_API_TOKEN`).
2. Create the D1 database and set `database_id` in `wrangler.jsonc`:

```bash
npx wrangler d1 create kotodama
npx wrangler d1 migrations apply kotodama --remote
```

3. Configure the secret and the public URL:

```bash
npx wrangler secret put BETTER_AUTH_SECRET
# edit BETTER_AUTH_URL in wrangler.jsonc with your domain
```

4. Deploy:

```bash
npm run deploy
```

### Social login (optional)

GitHub and Google login are enabled automatically when the credentials exist in the environment. Create the OAuth apps in the respective consoles with callback `https://YOUR_DOMAIN/api/auth/callback/github` (or `google`) and configure:

```bash
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

For local development, use the same keys in `.dev.vars`.

## Project structure

```
src/
  routes/
    index.tsx          # landing page
    editor.tsx         # editor with script list
    prompter.tsx       # prompter screen (fullscreen, rAF, voice, camera)
    sign-in.tsx        # sign in and account creation
    api/auth/$.ts      # Better Auth handler
  components/
    Logo.tsx           # brand mark (same artwork as favicon and PWA icons)
    InstallPrompt.tsx  # discreet PWA install prompt
  lib/
    scripts/           # ScriptRepository + IndexedDB implementation
    auth/              # Better Auth instance (server) and React client
    settings.ts        # prompter preferences (localStorage)
    i18n.ts            # UI strings (EN default, PT-BR/JA dictionaries)
    text.ts            # word count, duration, titles
    voice.ts           # voice tracking: tokenizer, matcher, language list
  db/schema.ts         # Drizzle schema (Better Auth tables)
  hooks/
    useWakeLock.ts     # wake lock with silent fallback
    useVoiceTracking.ts# Web Speech API lifecycle (continuous recognition)
    useCamera.ts       # front camera self-view stream
public/
  sw.js                # service worker (offline after the first visit)
  manifest.json        # PWA manifest
migrations/            # D1 SQL migrations
```

## Roadmap

- [x] Phase 1: editor + prompter with play/pause, speed and font
- [x] Phase 2: mirroring, mobile gestures, wake lock, saved scripts, landing, authentication
- [x] Phase 3: full PWA (offline), 3-2-1 countdown, eye line, presets, margins, sections, i18n
- [x] Phase 4: design system QA, Lighthouse 90+ (Performance 100 / A11y 95)
- [x] Custom domain: kotodama.leesugano.com
- [x] Voice tracking (speech recognition drives the scroll) and camera self-view
- [ ] v2: script sync via D1, remote control (phone controls the desktop), share by link

## Contributing

Contributions are welcome.

1. Open an issue describing the problem or proposal before large PRs.
2. Fork, branch from `main`, small descriptive commits in English.
3. Run `npm run lint` and `npm run build` before opening the PR.
4. Follow the project design system: tokens in `src/styles.css`, no colors outside the palette, sentence case in the UI.

## License

[MIT](./LICENSE). Made by Lee Sugano, open to everyone.
