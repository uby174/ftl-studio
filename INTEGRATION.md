# Integrating FTL Studio into Maestro OS

FTL Studio is the executable form of the **Funnel-Tree Prompt Architecture (FTPA)**:
one sentence in → compiled film plan → canon stills → chained first frames →
Veo clips → graded, finished film. This guide is for embedding it as a Maestro OS
capability.

## The module

`ftl-studio.mjs` is dual-mode and dependency-free (Node 18+, ffmpeg optional):

- **CLI**: `node ftl-studio.mjs "seed sentence" --shots 4`
- **Library**: importing it is side-effect-free.

```js
import { makeFilm, loadKeys } from './ftl-studio.mjs';

const result = await makeFilm(loadKeys(), {
  seed: 'an old lighthouse keeper repairing the great lamp as a storm closes in',
  shots: 4,                       // 1-6
  name: 'lighthouse',             // project folder name (default: slug of seed)
  outRoot: '/maestro/media/films',// where projects live (default: <pkg>/films)
  skipVideo: false,               // true = compile + stills only (cheap preview)
  onlyShot: null,                 // regenerate a single shot's video
  redoStills: false,              // force stills regeneration
  onEvent: (e) => bus.emit('ftl', e), // {stage:'compile'|'plan'|'still'|'video'|'assemble'|'done', detail}
});
// result: { dir, plan, clips: [...paths], film: path|null, errors: [...] }
```

### Config

`loadKeys()` reads `keys.json` next to the module, falling back to env vars —
in Maestro OS prefer injecting env vars from your secret store:

| Key | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | the compiler brain (Claude) |
| `GOOGLE_API_KEY` | stills (Gemini image) + video (Veo) — needs a paid AI Studio project |

Or construct config directly: `{ anthropic, google, models: { compiler:
'claude-opus-5', image: 'gemini-2.5-flash-image', video:
'veo-3.1-generate-preview' } }`. Model IDs are config, not code — when Google
renames models, change config only (`node ftl-studio.mjs models` lists what a
key can access).

## The contract Maestro should rely on

1. **Everything is a file; resume is free.** A project folder is the state:
   `plan.json`, `character.png`, `set.png`, `shotN_frame.png`, `shotN.mp4`,
   `film.mp4`. Re-calling `makeFilm` with the same name skips existing files.
   **Re-roll = delete a file + re-call.** Maestro's UI can expose this directly:
   show each artifact with a "regenerate" button that deletes it and re-runs.
2. **Human gates are stills.** The cheap approval points are `character.png`,
   `set.png` and each `shotN_frame.png` — run with `skipVideo: true`, let the
   user approve/re-roll images, then run again with video. Never gate on video.
3. **Partial failure is normal, not fatal.** `makeFilm` resolves (never rejects)
   for per-shot problems: quota exhaustion, policy filtering, flaky image
   composits land in `result.errors` while other shots continue. It throws only
   for setup errors (missing keys/seed, compiler refusal or API failure).
4. **Known runtime errors worth surfacing verbatim** (they appear inside
   `result.errors` strings):
   - `policy-filtered` — Veo declined a shot; re-run retries it.
   - `exceeded your current quota` / `spending cap` — Google billing gate;
     resume after reset/raise. Nothing already generated is lost.
5. **Pacing/geometry rules already enforced:** shots are 4/6/8 s (Veo's grid;
   1080p only at 8 s — the module auto-negotiates resolution), frames chain to
   lock set geometry, motion prompts start mid-action, and the finishing pass
   (ffmpeg: unified grade, grain, 0.3 s dissolves, loudness-normalized audio,
   fades) produces `film.mp4`. Without ffmpeg you still get per-shot clips.

## Suggested Maestro OS wiring

```
Maestro job "make-film"
  ├─ phase 1: makeFilm({skipVideo:true})      → present stills for approval
  ├─ phase 2 (on approval): makeFilm({})      → clips + film.mp4
  ├─ on errors[]: show per-shot retry buttons  (delete file → re-call)
  └─ archive: persist the project folder; plan.json is the reproducible recipe
```

Concurrency: one `makeFilm` per project folder at a time (file-based state).
Different projects run in parallel freely. Veo long-polls ~40-90 s per clip;
budget ~2-6 min per 4-shot film after stills.

## Costs (order of magnitude)

- Compile: one Claude call (~cents)
- Stills: 2 canon + 1 per shot (~cents each)
- Video: the real spend — Veo preview is priced per second of output; a 4-shot
  film is ~24-32 s of video. Gate video generation behind the stills approval.

## The architecture behind it (for extending)

The compiler system prompt inside `ftl-studio.mjs` encodes the whole doctrine —
funnel decomposition, face-lock, quality laws (FTL-1Q), causality/traces
(FTL-1W), sync/chaining (FTL-1S), director's rules (shot grammar, prop
through-line, screen direction), and Google's official Veo prompt format.
`ARCHITECTURE.md` documents the language; the HTML tools (`funnel-tree.html`,
`compiler.html`, `flow-format.html`) are interactive references for humans.
To specialize output for a Maestro vertical (ads, product demos, brand films),
extend the `COMPILER_SYSTEM` string — everything downstream adapts.
