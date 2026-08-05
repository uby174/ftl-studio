# Contributing to FTPA / FTL Studio

FTPA is an open prompting architecture. Every law in it was learned from a real
failure — which means every law can be improved by yours. Contributions of all
sizes are welcome.

## Ways to contribute

### 1. Share film recipes (easiest)
Made something good? Open a PR adding your project's `plan.json` (and canon
stills if you like) under `films/<your-film>/`. The plan is the reproducible
recipe — sharing it teaches everyone.

### 2. Model adapters (most wanted)
`ftl-studio.mjs` targets Veo via the Gemini API today. The architecture is
model-agnostic — an adapter is one function with the same contract:

```
genVideo(cfg, motionPrompt, firstFramePng, seconds, outPath)
```

Wanted: **Sora**, **Kling**, **Runway**, **Luma**, local models (LTX, Wan).
Keep the stills-first flow intact: the adapter's job is only "animate this
approved frame with this short motion prompt."

### 3. Compiler verticals
The `COMPILER_SYSTEM` prompt inside `ftl-studio.mjs` encodes the director's
doctrine for narrative film. Fork it into verticals: product demos, ads,
music videos, explainer content. A vertical = a modified system prompt +
an example `plan.json` proving it.

### 4. Challenge the laws
`ARCHITECTURE.md` states rules (quality laws, causality laws, sync protocol,
director's rules). If your experiments show a rule is wrong or incomplete,
open an issue with generated evidence — frames or clips comparing rule-on vs
rule-off. Laws only earn their place through results.

### 5. Tooling
The HTML tools (`funnel-tree.html`, `compiler.html`) are dependency-free
single files — improvements welcome as long as they stay that way.

## Ground rules

- **No secrets, ever.** `keys.json` is gitignored; PRs containing API keys are
  closed on sight.
- **Original content only** in committed examples — no copyrighted characters,
  franchises, or likenesses.
- **Zero-dependency core.** `ftl-studio.mjs` stays plain Node 18+ with no
  `node_modules`. Adapters must follow the same rule or live in a clearly
  optional folder.
- **Evidence over opinion.** For prompt/law changes, show output. A before/after
  frame pair beats a paragraph of reasoning.

## Dev loop

```bash
node ftl-studio.mjs setup                       # add your own keys
node ftl-studio.mjs "test scene" --skip-video   # cheap: plan + stills only
node --check ftl-studio.mjs                     # syntax gate
```

`--skip-video` is the cheap iteration mode — you can develop everything except
the final animation step for cents.

## Questions / ideas

Open a Discussion. Rough ideas welcome — this whole architecture came from
iterating on failures in public.
