# Content portability — design

## Problem

Scripts live only in this browser's IndexedDB. There is no way to bring text in,
take it out, or back it up, and the sidebar has no search. For a local-first app
with no account, this means "switch browsers and lose everything", and large
collections become unmanageable. Scripts are also plain text with no way to mark
pauses or emphasis for the reader.

## Decisions (agreed)

- Import supports `.txt` and `.docx`; export per script is `.txt`; full backup /
  restore is a single versioned `.json`.
- `.docx` parsing uses `mammoth`, dynamically imported so it never enters the
  initial bundle.
- Teleprompter markers: `[pause]` and `[breath]` render as dimmed inline chips;
  `**emphasis**` renders heavier. Markers are visual only — never spoken, so the
  voice tokenizer must ignore them.
- Settings stay global (separate decision).

## Design

### A. Import/export module (`src/lib/import-export.ts`)

A new, dependency-light module with pure-ish functions the screens call. Keeps file
parsing and serialization out of the route components.

- `scriptToTxt(script) -> string` and `downloadText(filename, text)`.
- `txtToScript(filename, text) -> NewScriptInput` — title from filename (sans
  extension), content cleaned (see C).
- `docxToText(file: File) -> Promise<string>` — `const mammoth = await
  import('mammoth')`; `mammoth.extractRawText`. Errors surface as a notice.
- `exportBackup(scripts) -> string` — `{ schema: 1, exportedAt, scripts: [...] }`,
  pretty JSON. `filenameForBackup(date) -> "kotodama-backup-YYYY-MM-DD.json"`.
- `parseBackup(text) -> { scripts: Script[] } | error` — validates `schema`, shape,
  required fields; rejects malformed input with a typed error, never throws raw.
- `mergeBackup(existing, incoming) -> { toSave, conflicts }` — match by `id`;
  on conflict keep the newer `updatedAt`; report counts for the confirmation step.

### B. Editor wiring (`editor.tsx`, `scripts/repository.ts`)

- Header/sidebar actions: **Import** (file picker accepting `.txt,.docx`),
  **Export** (current script → `.txt`), **Backup** (all → `.json`),
  **Restore** (pick `.json`).
- Import creates a new script via the repository and selects it.
- Restore parses, runs `mergeBackup` against `repository.list()`, shows an inline
  confirmation ("Restore N scripts? M will be updated.") before saving, then
  refreshes the list. Repository gains a `saveMany` convenience (loops `save`).
- **Search** field at the top of the sidebar filters the already-sorted list by
  title and content substring (case/diacritic-insensitive, reusing `text.ts`
  normalization). Empty result shows a "No matches" line.

### C. Paste / import cleanup (`text.ts`)

`cleanText(raw) -> string`: nbsp → space, CRLF/CR → LF, trim trailing spaces per
line, collapse 3+ blank lines to 1. Applied on import and on the editor's paste
handler (paste is intercepted, cleaned, inserted as plain text). Pure + tested.

### D. Markers (`text.ts`, `prompter.tsx`, `voice.ts`)

- `parseMarkers(text) -> Segment[]` where a segment is text, a `pause`/`breath`
  marker, or an `emphasis` run. Pure, tested. Used by the prompter renderer to emit
  marker chips (`<span class="marker">`, DS-styled, no emoji) and `<strong>`-style
  emphasis (heavier weight via the type tokens).
- The voice tokenizer (`voice.ts` `tokenize`) strips `[pause]`/`[breath]` tokens
  and the `**` emphasis delimiters before tokenizing, so alignment indices match
  the spoken words and markers never shift the cursor.
- A small collapsible help line in the editor documents the three markers.

### Marker grammar

- `[pause]`, `[breath]` — standalone, case-insensitive, bracketed.
- `**emphasis**` — paired asterisks, no nesting. A lone `**` is literal text.

## Files touched

- `src/lib/import-export.ts` — new module + tests.
- `src/lib/text.ts` — `cleanText`, `parseMarkers`, normalization helper + tests.
- `src/lib/voice.ts` — strip markers in `tokenize` + regression test.
- `src/routes/editor.tsx` — import/export/backup/restore actions, search field,
  paste cleanup, marker help.
- `src/lib/scripts/repository.ts` + `indexeddb-repository.ts` — `saveMany`.
- `src/lib/i18n.ts` — new keys (en / pt-BR / ja).
- `package.json` — add `mammoth`.

## Test cases

- `cleanText`: nbsp, CRLF, 4 blank lines → 1, trailing spaces removed.
- `txtToScript`: filename "My talk.txt" → title "My talk", content cleaned.
- `exportBackup` / `parseBackup` round-trips; `parseBackup` rejects wrong schema,
  missing fields, non-JSON.
- `mergeBackup`: new id added; same id newer incoming wins; same id older incoming
  ignored; conflict count correct.
- `parseMarkers`: `[pause]`/`[breath]` chips, `**x**` emphasis, lone `**` literal,
  unmatched bracket literal.
- `tokenize` ignores `[pause]`/`[breath]` and `**` — indices equal the no-marker
  version (regression for voice alignment).

## Out of scope

- No `.pdf` import, no cloud sync, no collaboration or share links.
- No drag-reorder, folders, or tags (search only).
- No rich-text editor; content stays plain text with the marker grammar.
