# Dark Mode — Design

**Date:** 2026-06-13
**Status:** Approved (design), pending implementation plan

## Goal

Add a Dark Mode to Kotodama's light-only UI. The app should follow the
operating-system theme by default and expose a simple Light/Dark switch that,
once used, overrides the OS preference and persists across sessions.

## Scope

Dark Mode applies to the three "light" surfaces:

- `/` — landing
- `/editor` — script editor (incl. sidebar)
- `/sign-in` — authentication

**Out of scope:** the teleprompter (`/prompter`) is intentionally dark already
(`bg-ls-black`). It and every "white-on-color" element (e.g. white text on the
blue button) stay visually unchanged regardless of theme.

## Background: why a token migration is required

The design system in `src/styles.css` already defines semantic tokens
(`--bg-0`, `--bg-1`, `--fg-0`, `--fg-1`, `--line`, `--accent`) — but the
components do **not** use them. They apply the absolute palette directly via
Tailwind classes. Current usage across `*.tsx`:

| Class | Uses | Meaning |
|---|---|---|
| `text-ls-gray-500` | 63 | secondary text |
| `text-ls-gray-900` | 33 | primary text |
| `text-ls-white` | 28 | **literal white** (on blue/black) — must NOT flip |
| `border-ls-line` | 21 | hairline border |
| `bg-ls-white` | 20 | base surface |
| `text-ls-blue` | 14 | accent text |
| `bg-ls-blue` | 10 | accent surface |
| `bg-ls-gray-50` | 9 | raised surface |
| `text-ls-black` / `bg-ls-black` | 9 / 9 | literal black / prompter |

Because `text-ls-white` and `bg-ls-white` carry **different semantic intent**
(content-on-color vs. surface), inverting the base color variables in `.dark`
is not viable — it would turn white-on-blue text dark. The robust approach is
to migrate surface/content usages to semantic utilities and leave literal
on-color values fixed.

## Architecture

### 1. Theme tokens (`src/styles.css`)

Add a `.dark` block that redefines only the **semantic** tokens. The literal
base tokens (`--ls-white`, `--ls-black`, the gray ramp) are unchanged.

```css
.dark {
  --bg-0: var(--ls-gray-900);   /* base surface  → near-black */
  --bg-1: #2c2c2e;              /* raised surface */
  --fg-0: var(--ls-gray-50);    /* primary text  → near-white */
  --fg-1: #98989f;              /* secondary text */
  --line: #38383a;             /* hairline border */
  --accent: #0a84ff;           /* iOS-dark blue, slightly brighter */
  --accent-pressed: #0070e0;
}
```

(Exact dark hues are finalized during implementation against the Lee Sugano
palette; values above are the starting point.)

### 2. Semantic Tailwind utilities (`@theme` in `src/styles.css`)

Expose the semantic tokens as Tailwind color utilities so components reference
intent, not raw color:

```css
@theme inline {
  --color-surface: var(--bg-0);
  --color-surface-raised: var(--bg-1);
  --color-primary: var(--fg-0);
  --color-secondary: var(--fg-1);
  --color-line: var(--line);   /* distinct from the existing --color-ls-line */
  --color-accent: var(--accent);
}
```

Generates the utilities `bg-surface`, `bg-surface-raised`, `text-primary`,
`text-secondary`, `border-line` (from `--color-line`), and
`text-accent` / `bg-accent`. The name `line` is distinct from the existing
`ls-line`, so both coexist without collision.

### 3. Component migration (3 surfaces)

Triage every absolute color class in `index.tsx`, `editor.tsx`, `sign-in.tsx`
into one of two buckets:

- **Themeable (migrate):**
  - `bg-ls-white` → `bg-surface`
  - `bg-ls-gray-50` → `bg-surface-raised`
  - `text-ls-gray-900` / `text-ls-black` (as primary text) → `text-primary`
  - `text-ls-gray-500` → `text-secondary`
  - `border-ls-line` → `border-line`
  - `text-ls-blue` / `bg-ls-blue` → `text-accent` / `bg-accent`
- **Literal (leave as-is):**
  - `text-ls-white` on blue/black buttons and badges
  - any `bg-ls-black` (prompter + overlays)
  - `bg-ls-white/90` backdrop on the landing header → revisit case-by-case so
    the blur surface tracks the theme (`bg-surface/90`)

Migration is mechanical but must be reviewed per-occurrence, not a blind
find/replace — the same class string means different things in different spots.

### 4. Theme logic (`src/lib/theme.ts`)

New module, mirroring the `src/lib/settings.ts` conventions (localStorage,
`load`/`save`, SSR-safe guards).

```ts
export type ThemePreference = 'light' | 'dark'        // explicit choice
export type ThemeStored = ThemePreference | null       // null = follow OS

const THEME_KEY = 'kotodama:theme'

loadThemePreference(): ThemeStored      // null when never chosen
saveThemePreference(p: ThemePreference): void
systemPrefersDark(): boolean            // matchMedia, SSR-safe
resolveTheme(stored: ThemeStored): ThemePreference  // effective theme
applyTheme(effective: ThemePreference): void        // toggles .dark on <html>
```

State model:

- Stored value `null` → effective theme follows `prefers-color-scheme`; a
  `matchMedia` listener re-applies on OS change.
- First toggle click → save explicit `'light'`/`'dark'`; the OS listener result
  is ignored from then on (preference wins).

### 5. Anti-FOUC inline script (`src/routes/__root.tsx`)

A tiny synchronous script injected in `<head>` (before the stylesheet paints)
reads `kotodama:theme`, falls back to `matchMedia('(prefers-color-scheme: dark)')`,
and sets `document.documentElement.classList.toggle('dark', …)`. This prevents a
light flash on dark-preferring devices. Injected via the route `head`/`scripts`
mechanism as a raw inline `<script>` (no React hydration dependency).

### 6. Toggle UI

A small sun/moon icon button (2-state), showing the **effective** theme and
flipping to the opposite on click.

- Landing: in the `<header><nav>` next to "Sign in".
- Editor: in the top `<header>` next to the `<Logo>`.
- Sign-in: discreet button in a corner.

A single shared `ThemeToggle` component in `src/components/ThemeToggle.tsx`
holds the React state (current effective theme), calls `saveThemePreference` +
`applyTheme` on click, and subscribes to the OS `matchMedia` listener while the
stored preference is `null`. Labels/aria come from the existing i18n
(`src/lib/i18n.ts`) — add `theme.toLight` / `theme.toDark` keys (EN + PT-BR + JA).

### 7. PWA `theme-color`

`<meta name="theme-color">` is currently a static `#000000`. Update it to track
the effective theme (dark surface vs. light surface) from the same code path
that applies the `.dark` class, so the mobile status bar matches.

## Data flow

```
OS preference ─┐
               ├─► resolveTheme(stored) ─► applyTheme() ─► <html class="dark">
localStorage ──┘                                        └─► <meta theme-color>
   ▲
   └── ThemeToggle click → saveThemePreference('light'|'dark')
```

## Error handling

- All localStorage / matchMedia access wrapped in the same SSR-safe guards used
  by `settings.ts` (`typeof window === 'undefined'` short-circuits).
- Corrupt/unknown stored value → treat as `null` (follow OS).
- `matchMedia` unsupported → default to light.

## Testing

- Unit (`vitest`) for `lib/theme.ts`: `resolveTheme` truth table
  (null+OS-dark → dark, null+OS-light → light, explicit overrides OS),
  corrupt-value fallback, SSR guards return safe defaults.
- Manual/visual check per surface (landing, editor, sign-in) in both themes,
  plus: no light flash on reload in dark mode, prompter unaffected, white-on-blue
  text intact, OS change reflected only while preference is `null`.

## Out of scope / YAGNI

- No 3-state "System" control in the UI (auto-follow happens until first click).
- No per-element theme overrides beyond the migration table.
- No theming of the prompter.
- No design-token refactor beyond what dark mode needs.
