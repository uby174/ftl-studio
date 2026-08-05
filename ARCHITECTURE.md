# FTPA — Funnel-Tree Prompt Architecture

**A reusable diverge-then-converge system for authoring world-class video-model prompts.**

> **Toolchain:** `funnel-tree.html` — interactive walkthrough of the architecture (Stages 1-7).
> `compiler.html` — **the FTL compiler app**: describe a film in plain words, it compiles a
> complete FTL program (auto via your Anthropic API key, or manual via any chatbot) and
> emits paste-ready per-shot runs.
Target dialect: **Google Veo 3** (dense cinematic paragraphs + native audio cues). Works for any seed sentence; produces multi-shot sequences with hard continuity.

---

## The Shape

```
                    ┌─────────────────────────┐
                    │   STAGE 0 · SEED        │      one plain sentence
                    └───────────┬─────────────┘
              ┌────────┬────────┼────────┬────────┐
              ▼        ▼        ▼        ▼        ▼
        ┌─────────────────────────────────────────────┐
        │   STAGE 1 · SCATTER   (semantic nodes)      │   the sentence splits
        └─────────────────────────────────────────────┘
      ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
      ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼
   ┌────────────────────────────────────────────────────┐
   │   STAGE 2 · EXPAND   (6 lenses per node — widest)  │   maximum detail
   └────────────────────────────────────────────────────┘
           ▼        ▼        ▼        ▼        ▼
        ┌─────────────────────────────────────────┐
        │   STAGE 3 · CONVERGE  (merge + resolve) │        conflicts die here
        └───────────────────┬─────────────────────┘
                            ▼
                ┌───────────────────────┐
                │  STAGE 4 · COMPILE    │                  Veo 3 grammar
                │  (shot prompts 1..N)  │
                └───────────────────────┘
```

The funnel widens (scatter → expand) to mine every visual fact the seed implies, then narrows (converge → compile) to a prompt with **zero contradictions and zero vagueness** — the two things that make video models hallucinate.

---

## Stage 0 · SEED

One plain sentence. No craft required — the funnel does the craft.

> **Example seed:** *"a howdy cowboy Yoda from Star Wars"*

---

## Stage 1 · SCATTER — split the seed into semantic nodes

Every seed decomposes into nodes of five types. Tag each word/phrase:

| Node type | Question it answers | In the example |
|---|---|---|
| **IDENTITY** | *Who/what is the subject?* | Yoda |
| **ARCHETYPE** | *What role/costume is layered on?* | cowboy |
| **MODIFIER** | *What mood/state/gesture?* | "howdy" (greeting energy) |
| **WORLD** | *Which universe's rules apply?* | Star Wars |
| **DERIVED** | *What did the seed imply but not say?* | action, setting, era — must be invented |

**Rule:** if the seed names no ACTION or SETTING, you must derive them in Stage 1 (a subject doing nothing in nowhere is an un-promptable shot). Derived nodes are first-class branches.

---

## Stage 2 · EXPAND — six lenses per node (widest point)

Each node is interrogated through six lenses. This is where amateur prompts stop at "Yoda in a cowboy hat" and the funnel keeps digging:

1. **FORM** — anatomy, silhouette, scale, proportions
2. **MATERIAL** — skin, fabric, texture, wear, age
3. **MOTION** — how it moves, weight, tempo, gesture vocabulary
4. **LIGHT** — how light behaves on it / around it
5. **SOUND** — dialogue, SFX, ambience *(Veo 3 renders audio — never skip)*
6. **PHYSICS** — what forces act on it (dust, wind, cloth-sim, recoil)

Not every lens fires for every node — but you must *check* all six. An unchecked lens is where the model improvises against you.

---

## Stage 3 · CONVERGE — merge branches, kill conflicts

Branches recombine under a strict **precedence law**:

> **IDENTITY > ARCHETYPE > MODIFIER > WORLD-style > DERIVED**

When two branches disagree, the higher-precedence node wins and the loser is *adapted, not deleted*:

| Conflict | Resolution (precedence applied) |
|---|---|
| Cowboy = human proportions vs. Yoda = 66 cm, huge ears | Yoda wins → cowboy wardrobe is *tailored down*: child-sized duster, hat brim notched for ears |
| Cowboy = leather boots vs. Yoda = three-toed clawed feet | Yoda wins → boots become open-toed leather wraps |
| Western dust-plains vs. Star Wars universe | WORLD adapts SETTING → frontier town on a Tatooine-like desert world, twin suns, moisture vaporators as windmills |
| "Howdy" = fast friendly wave vs. Yoda = slow, deliberate, 900 years old | IDENTITY wins → a slow two-finger hat-brim tip, gravelly drawled "Howdy… hmm." |

Output of this stage: the **Character Bible Paragraph** and the **World Paragraph** — two locked blocks of prose that are now *frozen* (used verbatim in every shot for continuity).

---

## Stage 4 · COMPILE — Veo 3 grammar, multi-shot

### The Veo 3 slot order (one paragraph per shot)

```
[SHOT TYPE + LENS] → [CHARACTER BIBLE ¶ verbatim] → [ACTION this shot]
→ [WORLD ¶ verbatim/trimmed] → [CAMERA MOVE] → [LIGHTING] 
→ [AUDIO: dialogue "…", SFX, ambience] → [STYLE + film stock]
```

### Multi-shot continuity law

- The **Character Bible ¶ is pasted verbatim** into every shot prompt. Never paraphrase it — paraphrase is how faces drift between shots.
- Only **ACTION, SHOT TYPE, CAMERA** vary per shot.
- Each shot names one **continuity anchor** carried from the previous shot (a prop, a light source, a sound) so the sequence cuts together.
- Sequence = 3–5 shots, each 5–8 s.

---

## Worked Example — full funnel run on the seed

### Frozen blocks (from Stage 3)

**CHARACTER BIBLE ¶** —
*Yoda, the small elderly green-skinned alien Jedi Master, 66 cm tall, with large pointed drooping ears, wispy white hair, deep wrinkles, and heavy-lidded knowing eyes, dressed as a frontier cowboy: a child-scale weathered brown leather duster over his cream Jedi under-robes, a sun-bleached tan cowboy hat with the brim notched around his ears, a hand-tooled gun-belt holstering his lightsaber like a six-shooter, and open-toed leather boot-wraps over three-toed feet. He moves slowly and deliberately, with the weight of 900 years, cane in left hand.*

**WORLD ¶** —
*A sun-scorched frontier main street on a Tatooine-like desert world: sand-drifted wooden boardwalks, a saloon with swinging doors, moisture vaporators turning like windmills, twin suns hanging low, heat-haze shimmering, fine dust rolling through in the wind. Star Wars universe, lived-in used-future western.*

### Shot 1 — The Entrance (8 s)
> Slow dolly-in, 35 mm anamorphic, low angle. **[CHARACTER BIBLE ¶]** He pushes through the saloon's swinging doors and pauses in the doorway, silhouetted, then steps into the light. **[WORLD ¶]** Camera dollies in from street level toward the doors. Golden-hour twin-sun backlight, long double shadows, volumetric dust in the light shafts. Audio: creak of the swinging doors, spurs-like jingle of his belt, wind, distant dewback lowing; the saloon piano stops mid-note. Gritty spaghetti-western film grain, Kodak 2383 warmth, Star Wars production design.

### Shot 2 — The Howdy (6 s)
> Medium close-up, 50 mm, eye-level with the tiny Jedi. **[CHARACTER BIBLE ¶]** He looks up from under the hat brim, raises two clawed green fingers to the notched brim, tips it slowly, and drawls in his gravelly inverted syntax: **"Howdy, hmm… partners, you are."** A faint smile creases the wrinkles. **[WORLD ¶ — trimmed: saloon interior, dusty light shafts]** Camera locked off, shallow depth of field. Key light from the doorway behind (continuity anchor: doorway light from Shot 1). Audio: his gravelly voice, leather creak of the hat, hushed saloon murmur dying out. Same film stock.

### Shot 3 — The Force Draw (7 s)
> Wide shot, 24 mm, dust at boot level. **[CHARACTER BIBLE ¶]** A mug slides down the bar; without looking he raises his right hand and the mug floats gently through the air into his grip — the lightsaber-holster glinting (continuity anchor: gun-belt from Shot 2). He sips. **[WORLD ¶ — trimmed]** Slow lateral tracking shot right. Warm interior tungsten vs. hard white doorway light. Audio: low Force hum, wooden slide of the mug, one piano note resuming, wind outside. Same film stock.

---

## FTL-1F — Fractal Zones (go inside the scene)

The funnel is recursive: **every region of the frame is its own sub-funnel.**
The set decomposes into addressable zones (`saloon/right-wall`), zones decompose
into objects (`saloon/right-wall/wanted-poster`), and any node accepts user
insertions (`saloon/right-wall/photo [USER]: a framed photo of Captain America`).

Each zone carries:
- `set{}` — its appearance
- `bg{}` — a quiet secondary action always alive there (real film direction:
  every part of the frame is directed, not just the hero)
- `vis(1,3)` — which shots it is on camera
- `[USER]` — a deliberate must-include insertion

**LOD compiler law** (why the tree can be infinite but the prompt can't):
video models have a detail budget, not infinite attention. The tree stores
everything; the compiler emits only zones visible in the rendered shot, with
deeper paths = physically smaller details, and all zones marked *living
background* — fully rendered but never stealing focus, light, or sound
priority from the SHOT action.

## FTL-1Q — Cinema-Grade Quality Laws

Reverse-engineered from what video models render *best* when left to their own
defaults (small precise gestures, macro texture, motivated window light). The
`LOOK { }` block freezes the film's photographic DNA (dof, grain, palette,
light-source, camera-speed), and five laws bind every shot:

1. **One small, precise physical action per shot** — hands, faces, and props do
   the acting. Small exact motion renders masterfully; big motion breaks.
2. **Motivated light only** — every `lit()` names the physical source in the
   scene (window, doorway, lamp, suns). Never abstract "cinematic lighting."
3. **Shallow depth of field by default** — one sharp subject plane, creamy falloff.
4. **Slow or locked camera** — the subject supplies the motion.
5. **Every surface carries age** — wear, dust, patina, scratches, skin texture.

Plus a coverage rule: **every sequence contains at least one INSERT shot** — an
extreme close-up of hands or a material detail on a macro lens, the film's most
tactile moment. (The Yoda sequence's Shot 4 "Insert — The Brim" demonstrates it.)

## FTL-1W — World-Model Causality Laws (from DeepMind's Genie prompt guide)

Genie 3 — a world model, not a video model — prompts environments and
characters as *causal systems*. Four laws adopted into FTL (rules 16–19):

1. **TRACES** — characters mark the world. $BIBLE ends with a traces sentence:
   the marks the subject's presence leaves behind (boot prints in dust, rag
   arcs on glass, a shine worn into a gripped rail). Movement leaves evidence.
2. **REACTIVE WORLD** — $WORLD ends with a reactivity sentence: surfaces and
   air respond to contact and weather (dust stirs at steps, flames answer
   drafts). Nothing is a painted backdrop.
3. **SPLIT DELIVERY** — $BIBLE and $WORLD are self-contained deliverables,
   mapped 1:1 to tools with separate character/environment inputs (Genie's
   two columns, Flow's ingredient slots). Center the character in any
   reference image.
4. **VOICE** — short, declarative, action-oriented sentences render better
   than dense clause chains (Google's own phrasing: "Short declarative
   statements work well").

Causality is also a realism multiplier for ordinary video models: a beat like
"his boots leave faint damp prints" forces the model to simulate consequence,
which reads as physical truth.

## FTL-1D — DIRECT mode (vibe-directing inside the language)

The director's voice is a first-class layer. `DIRECT::` lines are live on-set
notes patched over everything at the highest *delivery* priority:

```
DIRECT:: SHOT 2 <- "warmer, more amber light on his face during the greeting"
DIRECT:: yoda   <- "even slower hat tip — hold the smile one beat longer"
DIRECT:: FILM   <- "more dust in every light shaft"
```

Three laws keep vibe-directing safe:
1. A directive bends **HOW** something is delivered (pacing, temperature,
   intensity, camera feel, emphasis, sound balance) — never **WHO** ($BIBLE),
   **WHERE** ($WORLD), or a RESOLVE. Canon survives every note.
2. On conflict with canon, canon wins and the directive's *intent* is honored
   as closely as possible.
3. Later directives override earlier ones on the same target — iterate freely.

This is the re-roll workflow: generation came out flat → add one DIRECT line →
re-run. You never rewrite the prompt; you direct it. (Works pasted into any
model or tool — including OpenArt's Director — because it's part of the prompt,
not a platform feature.)

## FTL-1S — SYNC Protocol (cross-shot synchronization)

**The hard limit:** text reduces drift but cannot lock a face or a set across
independent generations — every clip invents its own actor. Field-tested fix:

**Text side (in the language):**
- Rule 7 hardened: every RENDER is ONE SINGLE UNBROKEN TAKE — no internal cuts,
  scene changes, or montage. If a clip cuts mid-take, re-roll it.
- $BIBLE carries a **face-lock**: 4-6 distinctive, invariant facial anchors
  (scar, broken nose, brow shape) + "THE SAME MAN in every shot" + "ALWAYS
  wears, in every shot, all of: …" wardrobe phrasing.
- LOOK carries a **time-lock** ("LOCKED at dusk … never daytime") and a
  **set-lock** ("ONE lighthouse, identical in every shot").

**Image side (in the tool — Flow/Veo):**
1. Generate SHOT 1 only; re-roll until the character and set are right. Canon.
2. Export a clean frame of the character from that take.
3. Feed it as an Ingredient / character reference (or use Scenebuilder
   Extend / Jump-to on the canon clip) for every later shot, with the shot's
   FTL text as the prompt.
4. Tightest continuity: use the previous clip's last frame as the next clip's
   start frame.

## FTL-1P — Production Pipeline target (stills-first)

**The ceiling of text-to-video:** a text prompt makes the model *re-imagine*
every visual fact on every generation — new face, new lens, new room each run.
Past a point, no prompt engineering fixes that. World-class AI film is made
**stills-first**, and FTL-1P is the compile target for it:

```
FTL program ──compile──▶  PHASE A  ingredient stills (character sheet, set)
                          PHASE B  per shot: first-frame STILL → approve →
                                   short MOTION prompt (image-to-video)
                          PHASE C  assemble takes in an editor
```

Rules of the target:
1. **Ingredients are canon.** Re-roll the character portrait and the set still
   until loved — then never regenerate them; every later image references them.
2. **Approve photographs, not videos.** Each shot's first frame is iterated as
   a cheap still before anything moves.
3. **Motion prompts are short** (~60 words): only what moves, the camera, and
   the audio. The approved still already carries all visual truth.
4. **Re-roll clips, never stills.** If a clip drifts from its start frame, the
   clip is the problem.
5. Over-literalization guard: describe flaws and background life defensively
   ("fully intact", "a hairline seam — nothing broken", "gulls OUTSIDE the
   glass") — models render damage and interiors eagerly.

`lighthouse-production.html` is the reference implementation of this target.

## Reusable Template (run any seed through this)

```
SEED: "________________________________"

SCATTER
  IDENTITY : ______        ARCHETYPE: ______
  MODIFIER : ______        WORLD    : ______
  DERIVED  : action=______ setting=______

EXPAND  (per node, check all 6: FORM · MATERIAL · MOTION · LIGHT · SOUND · PHYSICS)

CONVERGE
  precedence: IDENTITY > ARCHETYPE > MODIFIER > WORLD > DERIVED
  conflicts found: ______ → resolutions: ______
  → CHARACTER BIBLE ¶ (freeze)
  → WORLD ¶ (freeze)

COMPILE  (per shot: type/lens → BIBLE ¶ verbatim → action → WORLD ¶ → camera
          → light → AUDIO → style; 1 continuity anchor from previous shot)
```
