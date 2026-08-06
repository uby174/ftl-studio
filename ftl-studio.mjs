#!/usr/bin/env node
/*
FTL STUDIO — end-to-end video wrapper for the Funnel-Tree Prompt Architecture.

  seed sentence ──▶ Claude (FTL compiler) ──▶ canon stills (Gemini image)
                ──▶ per-shot first frames ──▶ Veo image-to-video ──▶ clips + film

USAGE
  node ftl-studio.mjs setup                          write keys.json template
  node ftl-studio.mjs models                         list your available Google models
  node ftl-studio.mjs "an old lighthouse keeper..."  make a film (3 beats default)
     --beats N      narrative beats, 1-6 (default 3). Each beat compiles into
                    2 shots of coverage, so N beats => up to 2N clips.
     --shots N      alias for --beats (kept for compatibility)
     --name NAME    project folder name (default: derived from seed)
     --shot N       only generate video for shot N
     --skip-video   compile + stills only (cheap dry run)
     --redo-stills  regenerate stills even if they exist
     --fast         generate clips in parallel (faster, weaker state chaining)
     --no-video-qc  skip post-render video auditing
     --jobs N       parallel clip workers when --fast (default 3)

KEYS (keys.json next to this file, or environment variables)
  ANTHROPIC_API_KEY   console.anthropic.com        — the compiler brain
  GOOGLE_API_KEY      aistudio.google.com/apikey   — stills (Gemini image) + video (Veo)

Everything is resume-safe: existing files are skipped, so re-running continues
where it stopped. Artifacts land in films/<name>/.
*/
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KEYS_PATH = path.join(HERE, 'keys.json');

// ---------- config ----------
export function loadKeys() {
  let k = {};
  if (fs.existsSync(KEYS_PATH)) k = JSON.parse(fs.readFileSync(KEYS_PATH, 'utf8'));
  const cfg = {
    anthropic: k.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || '',
    google: k.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || '',
    models: Object.assign(
      { compiler: 'claude-opus-5', image: 'gemini-2.5-flash-image', video: 'veo-3.1-generate-preview', judge: 'claude-sonnet-5' },
      k.models || {},
    ),
  };
  return cfg;
}

function setup() {
  if (fs.existsSync(KEYS_PATH)) return console.log(`keys.json already exists at ${KEYS_PATH}`);
  fs.writeFileSync(KEYS_PATH, JSON.stringify({
    ANTHROPIC_API_KEY: '',
    GOOGLE_API_KEY: '',
    models: { compiler: 'claude-opus-5', image: 'gemini-2.5-flash-image', video: 'veo-3.1-generate-preview', judge: 'claude-sonnet-5' },
  }, null, 2));
  console.log(`Wrote ${KEYS_PATH} — paste your keys into it.`);
}

const log = (s) => console.log(`\x1b[33m▸\x1b[0m ${s}`);
const ok = (s) => console.log(`\x1b[32m✓\x1b[0m ${s}`);
const warn = (s) => console.warn(`\x1b[35m! ${s}\x1b[0m`);
const die = (s) => { console.error(`\x1b[31m✕ ${s}\x1b[0m`); process.exit(1); };

// Any user-supplied string that reaches a filesystem path or a shell command
// must pass through here. Defends the ffmpeg/ffprobe execSync calls.
export const slug = (s) => String(s || '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'film';

const QC_PASS_FLOOR = 70; // graded judge: below this a frame is never shipped

// ---------- step 1: Claude compiles the film ----------
const COMPILER_SYSTEM = `You are the FTL Studio Compiler for the Funnel-Tree Prompt
Architecture. You turn a plain film description into a stills-first production plan.

Run the funnel internally: scatter the description into semantic nodes, expand each
through form/material/motion/light/sound/physics, converge conflicts (identity always
wins), then emit the plan.

HARD RULES:
- Fully original content only. If the description names copyrighted characters or
  franchises, replace them with visually equivalent original characters.
- characterStill: a photorealistic portrait prompt written as a STRUCTURED SPEC,
  not prose — labeled lines, each carrying sub-branch micro-details:
  SUBJECT: ... / FACE: (face-lock — 4-6 invariant anchors: scar, nose, brow, hair,
  each with its micro-detail) / HANDS: ... / WARDROBE: item-by-item, each with its
  fastenings and wear marks, "wears all of" phrasing / GEAR: each strap and buckle /
  LIGHT: named motivated sources / PALETTE + GRAIN: ...
  The character centered. End with: "Photorealistic. No text, no watermark, no border."
- setStill: a photorealistic location prompt as the same STRUCTURED SPEC:
  CENTERPIECE: the one distinctive object, part by part / SURFACES: each material
  with its age marks / LIGHT-SOURCES: each housing and glow behavior / WEATHER +
  TIME: locked / PALETTE + GRAIN: identical to characterStill.
  End with: "Photorealistic. No text, no watermark, no border."
- Both stills share one photographic DNA: shallow depth of field, fine 35mm film
  grain, motivated light from nameable sources, a locked palette. Bake it into both.
- BEATS AND COVERAGE: the requested count is NARRATIVE BEATS. Each beat compiles
  into 2 shots of real coverage (total shots = 2x beats, max 10). Coverage
  patterns, choose per beat:
  * LOOK / SEE: a shot where he hears or notices something and turns toward it
    (motivated by off-screen sound), then a POV shot of WHAT HE SEES with
    "noCharacter": true (the storm through glass, the dead lamp, the gap in the
    rings). Cut logic humans feel.
  * ACTION / INSERT: a medium of the action, then a macro insert of the hands
    mid-task — the insert starts mid-gesture so the pair cuts on action.
  * ACTION / REACTION: the deed, then his face reacting to the result.
- STAKES: beat 1 must show WHY (the problem, the threat), the final beat must
  show SO WHAT (the result reaching the world). No task without a reason.
- Each shot:
  * seconds: exactly 4, 6, or 8. Prefer 4-6; only payoff shots get 8.
  * "noCharacter": true on POV/environment shots (no person in frame).
  * firstFrame: still-image prompt for the shot's opening frame. Refer to "the man
    from the reference image" / "the room from the reference image". Compose:
    camera angle + height, subject position, what is lit. ~60-80 words.
  * motion: Google's official Veo formula — CAMERA FIRST, then ONE action.
    HUMAN IMPERFECTION LAW: every action with the character includes one human
    friction — a hesitation, an adjusted grip, a breath fogging in the cold, a
    second try, a glance toward the storm, weight visibly carried. Hands are
    cold-stiff, never machine-smooth. Include one causality trace (a mark the
    action leaves). "One continuous take." Audio as separate sentences:
    SFX: ... / Ambient noise: ... — include one OFF-SCREEN sound that motivates
    a look. 60-110 words, short declarative sentences.
  * Phrase all exclusions positively (say what IS there, never "no X" / "don't").

SUB-BRANCH PASS (run after converging, before writing stills): decompose every
canon element into its smallest child details, funnel-style, 2 levels down:
- character: face (each region: brow/scar, nose, beard edge, eye lines), hands
  (knuckles, calluses, nail state), each wardrobe item (its fastenings, its
  specific wear marks, how it hangs), carried gear (each strap, each buckle).
- set: the centerpiece object part by part (its segments, joints, flaws), each
  surface (its material, age marks, how light sits on it), each light source
  (its housing, flame or glow behavior), weather at each boundary.
Bake the resulting micro-details INTO characterStill and setStill prose — the
stills are where sub-branches live. A detail not written down is a detail the
model will invent differently every time.

MULTI-AGE / SECOND CHARACTER (aging stories, flashbacks): the canon character
reference is ONE life stage — the one with the most screen time. A shot showing
another life stage (the same person younger/older) or a second person sets
"altCharacter" to a full structured mini-spec of that person (face, hair, build,
wardrobe item-by-item), REUSED VERBATIM in every shot where they appear, and
anchored to canon by 2-3 inherited features (same eye color, same cowlick, the
scar he will get). Shots with altCharacter set leave the canon man out of frame
unless both appear. altCharacter is "" when unused.

CONSISTENCY LAWS (absolute — these three decide whether the film cuts together):
1. IDENTITY IS REFERENCE-ONLY. firstFrame and motion NEVER name clothing,
   headwear, gloves, hair, face details, or new props — write only "the man from
   the reference image" and let the reference supply identity. Wardrobe exists
   ONLY in characterStill. Props exist ONLY if the story introduced them. A cap,
   hat, or glove invented mid-film is a defect.
2. CLOSED-WORLD MANIFEST. Every firstFrame ENDS with a sentence beginning
   "In frame: " listing EVERY object visible with its current state (e.g.
   "In frame: the keeper kneeling, the unrolled leather tool roll with wick
   scissors and brass oil can, the dead lamp behind, his lit hand-lantern left,
   rain on two window panes."). That list is the whole frame: no unlisted object
   appears, every listed object carries its declared state.
3. WORLD-STATE TIMELINE. Any object that changes during the film (the lamp: dead
   vs lit; a repaired part) has exactly ONE state per shot, stated in every
   firstFrame. The state changes ONLY inside the shot whose action changes it,
   and never reverts.

DIRECTOR'S RULES (these override everything else about composition):
- Every firstFrame is a CANDID FILM STILL, never a portrait: the character is
  mid-action, eyes on his work or his world, NEVER looking at or facing the camera.
- Composition: subject OFF-CENTER (rule of thirds), a foreground element for depth,
  camera height stated (low / eye-level / high / overhead), 16:9 widescreen framing.
- Shot grammar with intent: vary sizes across the film — a wide that establishes,
  a medium that works, one macro insert, a wide or reverse that pays off. State the
  size in every firstFrame.
- Screen direction: pick one facing direction for the character's work (e.g. he
  works facing frame-left) and keep it consistent in every shot description.
- PROP THROUGH-LINE: one physical object carries the story across the shots — seen
  broken or needed, then handled, then used, then changed in the final shot. Name it
  in every shot's firstFrame and motion.
- CAUSALITY: each shot's action visibly changes one thing in the world, and the next
  shot inherits that change. The final shot shows the accumulated result.
- No object may appear that the story did not introduce (tools come from the tool
  roll, light comes from named sources).

OUTPUT: ONLY a JSON object, no markdown fences, exactly this shape:
{"title":"kebab-case-short-title","characterStill":"...","setStill":"...",
 "shots":[{"n":1,"title":"...","seconds":6,"firstFrame":"...","motion":"...","noCharacter":false}]}`;

export async function compileFilm(cfg, seed, nShots) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': cfg.anthropic,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: cfg.models.compiler,
      max_tokens: 16000,
      system: COMPILER_SYSTEM,
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              characterStill: { type: 'string' },
              setStill: { type: 'string' },
              shots: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    n: { type: 'integer' },
                    title: { type: 'string' },
                    seconds: { type: 'integer', enum: [4, 6, 8] },
                    firstFrame: { type: 'string' },
                    motion: { type: 'string' },
                    noCharacter: { type: 'boolean' },
                    altCharacter: { type: 'string' },
                  },
                  required: ['n', 'title', 'seconds', 'firstFrame', 'motion', 'noCharacter', 'altCharacter'],
                  additionalProperties: false,
                },
              },
            },
            required: ['title', 'characterStill', 'setStill', 'shots'],
            additionalProperties: false,
          },
        },
      },
      messages: [{ role: 'user', content: `FILM DESCRIPTION: "${seed}"\nBEATS: ${nShots}\nCompile the production plan.` }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Claude API: ${data?.error?.message || res.status}`);
  if (data.stop_reason === 'refusal') throw new Error('Claude declined this description — rephrase it.');
  let text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim()
    .replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
  const plan = JSON.parse(text);
  if (!plan.shots?.length) throw new Error('Compiler returned no shots.');
  for (const s of plan.shots) if (![4, 6, 8].includes(s.seconds)) s.seconds = 8;
  return plan;
}

// ---------- step 2: Gemini image generation ----------
export async function genImage(cfg, prompt, refPngs = [], tries = 3) {
  // references FIRST, instruction text last — the documented best practice
  const parts = [];
  for (const p of refPngs) parts.push({ inlineData: { mimeType: 'image/png', data: fs.readFileSync(p).toString('base64') } });
  parts.push({ text: prompt });
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.models.image}:generateContent`;
  const gcWide = { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: '16:9' } };
  const gcPlain = { responseModalities: ['TEXT', 'IMAGE'] };
  let useWide = true;
  let lastErr = '';
  for (let attempt = 1; attempt <= tries; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': cfg.google },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: useWide ? gcWide : gcPlain }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error?.message || String(res.status);
      if (useWide && /imageConfig|aspectRatio|aspect_ratio|Unknown name/i.test(msg)) { useWide = false; attempt--; continue; }
      throw new Error(`image API: ${msg}`);
    }
    const img = (data.candidates?.[0]?.content?.parts || []).find(p => p.inlineData?.data);
    if (img) return Buffer.from(img.inlineData.data, 'base64');
    lastErr = data.candidates?.[0]?.finishReason || 'no image';
    if (attempt < tries) { log(`  image attempt ${attempt} returned ${lastErr} — retrying …`); await new Promise(r => setTimeout(r, 2000)); }
  }
  throw new Error(`image model returned no image after ${tries} tries (${lastErr})`);
}

// ---------- step 3a: Gemini Omni image-to-video (Interactions API) ----------
export async function genVideoOmni(cfg, prompt, framePng, seconds, outPath) {
  const base = 'https://generativelanguage.googleapis.com/v1beta';
  const body = {
    model: cfg.models.video,
    input: [
      { type: 'image', data: fs.readFileSync(framePng).toString('base64'), mime_type: 'image/png' },
      { type: 'text', text: `${prompt} Target duration: about ${seconds} seconds. 16:9 widescreen.` },
    ],
    response_format: { type: 'video', delivery: 'uri' },
    generation_config: { video_config: { task: 'image_to_video' } },
  };
  let res = await fetch(`${base}/interactions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': cfg.google },
    body: JSON.stringify(body),
  });
  let data = await res.json();
  if (!res.ok) throw new Error(`Omni request rejected: ${data?.error?.message || res.status}`);

  const t0 = Date.now();
  while (data.status && !['completed', 'failed'].includes(data.status)) {
    await new Promise(r => setTimeout(r, 10000));
    process.stdout.write(`\r  … Omni rendering (${Math.round((Date.now() - t0) / 1000)}s)`);
    const p = await fetch(`${base}/interactions/${data.id}`, { headers: { 'x-goog-api-key': cfg.google } });
    data = await p.json();
    if (Date.now() - t0 > 10 * 60 * 1000) throw new Error('Omni timed out after 10 minutes');
  }
  if (data.status === 'failed') throw new Error(`Omni interaction failed: ${JSON.stringify(data).slice(0, 200)}`);
  const outStep = (data.steps || []).filter(s => s.type === 'model_output').pop();
  const vid = (outStep?.content || []).find(c => c.type === 'video');
  if (!vid) throw new Error(`no video in Omni response (${JSON.stringify(data).slice(0, 200)})`);
  if (vid.data) { fs.writeFileSync(outPath, Buffer.from(vid.data, 'base64')); return; }
  if (!vid.uri) throw new Error('Omni video has neither data nor uri');
  // uri delivery: uri may serve raw media directly, or a file-status JSON to poll
  const fileUrl = vid.uri.startsWith('http') ? vid.uri : `${base}/${vid.uri}`;
  while (true) {
    const r = await fetch(fileUrl, { headers: { 'x-goog-api-key': cfg.google } });
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('json')) { // raw media
      if (!r.ok) throw new Error(`Omni media fetch failed: HTTP ${r.status}`);
      fs.writeFileSync(outPath, Buffer.from(await r.arrayBuffer()));
      return;
    }
    const f = await r.json();
    const state = f.state || f.file?.state;
    if (state === 'FAILED') throw new Error('Omni video file FAILED');
    if (state === 'ACTIVE' || !state) {
      const dl = await fetch(`${fileUrl}:download?alt=media`, { headers: { 'x-goog-api-key': cfg.google } });
      if (!dl.ok) throw new Error(`Omni download failed: HTTP ${dl.status}`);
      fs.writeFileSync(outPath, Buffer.from(await dl.arrayBuffer()));
      return;
    }
    await new Promise(r2 => setTimeout(r2, 5000));
    process.stdout.write(`\r  … Omni file processing (${Math.round((Date.now() - t0) / 1000)}s)`);
    if (Date.now() - t0 > 12 * 60 * 1000) throw new Error('Omni file timed out');
  }
}

// ---------- step 3b: Veo image-to-video ----------
export async function genVideo(cfg, prompt, framePng, seconds, outPath) {
  if (/omni/i.test(cfg.models.video)) return genVideoOmni(cfg, prompt, framePng, seconds, outPath);
  const base = 'https://generativelanguage.googleapis.com/v1beta';
  const imgB64 = fs.readFileSync(framePng).toString('base64');
  const wantRes = seconds >= 8 ? '1080p' : '720p'; // Veo: 1080p only at 8s
  const bodies = [];
  for (const resn of [wantRes, '720p'].filter((v, i, a) => a.indexOf(v) === i)) {
    bodies.push({ instances: [{ prompt, image: { inlineData: { mimeType: 'image/png', data: imgB64 } } }],
      parameters: { aspectRatio: '16:9', resolution: resn, durationSeconds: seconds } });
    bodies.push({ instances: [{ prompt, image: { bytesBase64Encoded: imgB64, mimeType: 'image/png' } }],
      parameters: { aspectRatio: '16:9', resolution: resn, durationSeconds: seconds } });
  }
  let opName = null, lastErr = null;
  for (const body of bodies) {
    const res = await fetch(`${base}/models/${cfg.models.video}:predictLongRunning`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': cfg.google },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok && data.name) { opName = data.name; break; }
    lastErr = data?.error?.message || `HTTP ${res.status}`;
  }
  if (!opName) throw new Error(`Veo request rejected: ${lastErr}`);

  const t0 = Date.now();
  while (true) {
    await new Promise(r => setTimeout(r, 10000));
    const res = await fetch(`${base}/${opName}`, { headers: { 'x-goog-api-key': cfg.google } });
    const op = await res.json();
    if (op.error) throw new Error(`Veo operation: ${op.error.message}`);
    if (op.done) {
      const resp = op.response?.generateVideoResponse || op.response || {};
      if (resp.raiMediaFilteredCount > 0 && !resp.generatedSamples?.length)
        throw new Error(`policy-filtered: ${resp.raiMediaFilteredReasons?.join('; ') || 'no reason given'} — re-run to retry`);
      const uri = resp.generatedSamples?.[0]?.video?.uri;
      if (!uri) throw new Error(`no video in response (${JSON.stringify(op.response).slice(0, 200)})`);
      const vidRes = await fetch(uri.includes('key=') ? uri : uri, { headers: { 'x-goog-api-key': cfg.google } });
      if (!vidRes.ok) throw new Error(`video download failed: HTTP ${vidRes.status}`);
      fs.writeFileSync(outPath, Buffer.from(await vidRes.arrayBuffer()));
      return;
    }
    process.stdout.write(`\r  … Veo rendering (${Math.round((Date.now() - t0) / 1000)}s)`);
    if (Date.now() - t0 > 8 * 60 * 1000) throw new Error('Veo timed out after 8 minutes');
  }
}

// ---------- helpers ----------
async function listModels(cfg) {
  if (!cfg.google) die('GOOGLE_API_KEY missing — run: node ftl-studio.mjs setup');
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200',
    { headers: { 'x-goog-api-key': cfg.google } });
  const data = await res.json();
  if (!res.ok) die(data?.error?.message || `HTTP ${res.status}`);
  const names = (data.models || []).map(m => m.name.replace('models/', ''));
  console.log('\nVIDEO (use as models.video in keys.json):');
  names.filter(n => /veo/i.test(n)).forEach(n => console.log('  ' + n));
  console.log('\nIMAGE (use as models.image):');
  names.filter(n => /image|imagen/i.test(n)).forEach(n => console.log('  ' + n));
}

function haveFfmpeg() { try { execSync('ffmpeg -version', { stdio: 'ignore' }); return true; } catch { return false; } }

// Closed-loop QC. The judge is CROSS-FAMILY on purpose: the generator is a
// Google image model, so the critic is Claude — a same-family critic shares the
// generator's blind spots and inflates its own output (self-preference bias).
// Scores are graded (0-100), never binary, and a judge outage is reported as
// `unverified` instead of being silently swallowed as a pass.
const IDENTITY_RUBRIC = `Score 0-100 for each axis. 100 = indistinguishable from the reference; 0 = a different subject entirely.
- identity: same face — bone structure, nose, brow, scar placement, hairline, beard shape.
- wardrobe: identical clothing. ANY added or removed item (cap, hat, gloves, coat, strap) caps this at 40.
- setMatch: the location's centerpiece object (lamp/lens/machine), materials and light behaviour match the canon room. If the location is not visible, score 100.
- manifest: the frame contains exactly the objects the shot description lists, each in its declared state. An unlisted object present, or a listed object missing or in the wrong state, caps this at 50.`;

export async function auditFrame(cfg, framePath, charPath, setPath, noCharacter, frameDesc = '') {
  const b64 = (p) => fs.readFileSync(p).toString('base64');
  const img = (p) => ({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: b64(p) } });
  try {
    const content = [];
    if (!noCharacter) { content.push({ type: 'text', text: 'REFERENCE A — the canon character of this film:' }); content.push(img(charPath)); }
    content.push({ type: 'text', text: 'REFERENCE B — the canon location of this film:' });
    content.push(img(setPath));
    content.push({ type: 'text', text: 'CANDIDATE — a frame proposed for the film:' });
    content.push(img(framePath));
    content.push({
      type: 'text',
      text: `You are the continuity supervisor on this film. Judge the CANDIDATE against the references.
${IDENTITY_RUBRIC}
${frameDesc ? `The shot description for this frame is: "${frameDesc.slice(0, 700)}"` : ''}
${noCharacter ? 'No person should appear in this candidate; score identity and wardrobe 100 and judge only setMatch and manifest.' : ''}
Reply with ONLY this JSON, at most 4 issues, each under 15 words: {"identity":int,"wardrobe":int,"setMatch":int,"manifest":int,"issues":["concrete visual defect"]}`,
    });
    // Transient judge failures are common enough that one silent retry is worth
    // more than a mis-labelled UNVERIFIED frame.
    let data = null, lastFail = '';
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-api-key': cfg.anthropic, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({
            model: cfg.models.judge, max_tokens: 2000,
            messages: [{ role: 'user', content }],
            // prefill-free structured output: the judge must answer in schema
            output_config: { format: { type: 'json_schema', schema: {
              type: 'object',
              properties: { identity: { type: 'integer' }, wardrobe: { type: 'integer' }, setMatch: { type: 'integer' }, manifest: { type: 'integer' }, issues: { type: 'array', items: { type: 'string' } } },
              required: ['identity', 'wardrobe', 'setMatch', 'manifest', 'issues'],
              additionalProperties: false,
            } } },
          }),
        });
        const j = await res.json();
        if (!res.ok) { lastFail = j?.error?.message || String(res.status); await new Promise(r => setTimeout(r, 1500)); continue; }
        data = j; break;
      } catch (e) { lastFail = e.message; await new Promise(r => setTimeout(r, 1500)); }
    }
    if (!data) { warn(`judge unavailable (${lastFail.slice(0, 70)}) — frame shipped UNVERIFIED`); return { pass: true, unverified: true, score: null, issues: [] }; }
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) { warn('judge returned unparseable output — frame shipped UNVERIFIED'); return { pass: true, unverified: true, score: null, issues: [] }; }
    const v = JSON.parse(m[0]);
    const axes = noCharacter ? ['setMatch', 'manifest'] : ['identity', 'wardrobe', 'setMatch', 'manifest'];
    const vals = axes.map(a => Number.isFinite(v[a]) ? v[a] : 100);
    const score = Math.min(...vals); // weakest axis decides — an averaged score hides a failed face
    return { pass: score >= QC_PASS_FLOOR, unverified: false, score, axes: Object.fromEntries(axes.map((a, i) => [a, vals[i]])), issues: v.issues || [] };
  } catch (e) {
    warn(`judge error (${e.message.slice(0, 60)}) — frame shipped UNVERIFIED`);
    return { pass: true, unverified: true, score: null, issues: [] };
  }
}

// Post-render QC: the most drift-prone step is the video itself, so sample the
// rendered clip and judge those frames too. Without this, drift that appears
// only in motion (a glove changing mid-take) is invisible to the pipeline.
export async function auditClip(cfg, clipPath, charPath, setPath, noCharacter, frameDesc = '', samples = 3) {
  if (!haveFfmpeg()) return { pass: true, unverified: true, score: null, issues: [] };
  const tmp = [];
  try {
    const dur = clipDuration(clipPath);
    for (let i = 0; i < samples; i++) {
      const t = (dur * (i + 1)) / (samples + 1);
      const out = `${clipPath}.qc${i}.png`;
      execSync(`ffmpeg -y -v quiet -ss ${t.toFixed(2)} -i "${clipPath}" -frames:v 1 "${out}"`);
      tmp.push(out);
    }
    let worst = { pass: true, unverified: false, score: 100, issues: [] };
    for (const f of tmp) {
      const v = await auditFrame(cfg, f, charPath, setPath, noCharacter, frameDesc);
      if (v.unverified) return { ...v, issues: [] };
      if (v.score !== null && v.score < (worst.score ?? 101)) worst = v;
    }
    return worst;
  } catch (e) {
    return { pass: true, unverified: true, score: null, issues: [e.message.slice(0, 80)] };
  } finally {
    for (const f of tmp) { try { fs.unlinkSync(f); } catch {} }
  }
}

function clipDuration(f) {
  return parseFloat(execSync(
    `ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${f}"`,
  ).toString().trim());
}

// Post-production: real film editing — HARD CUTS on action (enter each clip
// late, leave early), unified grade + grain, fade in/out, mixed audio.
// Dissolves removed: cross-dissolve between beats is a slideshow tell.
export function finishFilm(dir, clips) {
  const HEAD = 0.35, TAIL = 0.15; // enter mid-action, exit before settle
  const durs = clips.map(clipDuration);
  const inputs = clips.map(c => `-i "${c}"`).join(' ');
  const segs = [];
  const trimmed = [];
  for (let i = 0; i < clips.length; i++) {
    const start = i === 0 ? 0 : HEAD;
    const end = Math.max(start + 1, durs[i] - TAIL);
    trimmed.push(end - start);
    segs.push(
      `[${i}:v]trim=${start}:${end.toFixed(3)},setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=24,setsar=1,format=yuv420p[v${i}]` +
      `;[${i}:a]atrim=${start}:${end.toFixed(3)},asetpts=PTS-STARTPTS,aresample=48000[a${i}]`);
  }
  const norm = segs.join(';');
  const concatIn = clips.map((_, i) => `[v${i}][a${i}]`).join('');
  const vChain = `;${concatIn}concat=n=${clips.length}:v=1:a=1[vc][ac]`;
  const aChain = '';
  const prevV = 'vc', prevA = 'ac';
  const total = trimmed.reduce((a, b) => a + b, 0);
  // Audio continuity: each clip's audio is generated independently, so the room
  // tone jumps at every cut. A low continuous bed — the first clip's ambience,
  // low-passed, looped under the whole film — glues the cuts together the way a
  // production sound mix does. Picture still hard-cuts.
  const bed = `;[0:a]atrim=0:${Math.min(3, durs[0]).toFixed(2)},asetpts=PTS-STARTPTS,aloop=loop=-1:size=2e9,atrim=0:${total.toFixed(3)},` +
    `lowpass=f=900,volume=0.16,afade=t=in:st=0:d=1.2,afade=t=out:st=${(total - 1.4).toFixed(3)}:d=1.4[bed]` +
    `;[${prevA}][bed]amix=inputs=2:duration=first:weights=1 0.55,dynaudnorm=g=7[amixed]`;
  const grade = `;[${prevV}]eq=contrast=1.05:saturation=0.93:brightness=-0.01,noise=alls=5:allf=t,` +
    `fade=t=in:st=0:d=0.6,fade=t=out:st=${(total - 0.8).toFixed(3)}:d=0.8[vout]` +
    `;[amixed]afade=t=in:st=0:d=0.5,afade=t=out:st=${(total - 0.9).toFixed(3)}:d=0.9,loudnorm=I=-16:TP=-1.5[aout]`;
  const fc = norm + vChain + aChain + bed + grade;
  const out = path.join(dir, 'film.mp4');
  execSync(`ffmpeg -y -v error ${inputs} -filter_complex "${fc}" -map "[vout]" -map "[aout]" -c:v libx264 -preset slow -crf 18 -c:a aac -b:a 192k "${out}"`,
    { maxBuffer: 64 * 1024 * 1024 });
}

// ---------- programmatic API (import { makeFilm } from './ftl-studio.mjs') ----------
/**
 * Run the full FTPA pipeline. Resume-safe: existing artifacts are reused.
 * @param {object} cfg      from loadKeys(), or {anthropic, google, models:{compiler,image,video}}
 * @param {object} opts     {seed, shots=3, name, onlyShot=null, skipVideo=false,
 *                           redoStills=false, outRoot=<pkg>/films, onEvent=(e)=>{}}
 * @returns {Promise<{dir, plan, clips: string[], film: string|null, errors: string[]}>}
 */
export async function makeFilm(cfg, opts) {
  const { seed, name = null, onlyShot = null, skipVideo = false, redoStills = false,
    outRoot = path.join(HERE, 'films'), onEvent = null,
    fast = false, jobs = 3, videoQc = true,
    // Ablation switches — used by eval.mjs to measure what each mechanism is
    // actually worth. All false in normal operation.
    ablate = {} } = opts;
  const nShots = Math.min(6, Math.max(1, opts.beats || opts.shots || 3));
  const errors = [];
  const emit = (stage, detail) => { if (onEvent) onEvent({ stage, detail }); };
  if (!seed) throw new Error('makeFilm: opts.seed is required');
  if (!cfg.anthropic) throw new Error('ANTHROPIC_API_KEY missing');
  if (!cfg.google) throw new Error('GOOGLE_API_KEY missing');

  // 1 — compile
  let dir, plan;
  dir = path.join(outRoot, slug(name || seed)); // slug(): shell-safe, path-safe
  fs.mkdirSync(dir, { recursive: true });
  const planPath = path.join(dir, 'plan.json');
  if (fs.existsSync(planPath)) {
    plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
    ok(`plan.json exists — reusing compiled plan (${plan.shots.length} shots)`);
  } else {
    log(`compiling "${seed}" with ${cfg.models.compiler} …`);
    emit('compile', seed);
    plan = await compileFilm(cfg, seed, nShots);
    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
    ok(`compiled: "${plan.title}" — ${plan.shots.length} shots -> ${planPath}`);
  }
  emit('plan', plan);

  // 2 — canon stills
  const charPath = path.join(dir, 'character.png');
  const setPath = path.join(dir, 'set.png');
  for (const [p, promptKey, label] of [[charPath, 'characterStill', 'character'], [setPath, 'setStill', 'set']]) {
    if (fs.existsSync(p) && !redoStills) { ok(`${label}.png exists — canon kept`); continue; }
    log(`generating canon ${label} still …`);
    emit('still', label);
    fs.writeFileSync(p, await genImage(cfg, plan[promptKey]));
    ok(`${label}.png  (not happy? delete it or use --redo-stills and re-run)`);
  }

  // QC ledger — which artifacts passed the judge. Persisted so a resumed run
  // never chains from, or silently ships, an unverified frame.
  const qcPath = path.join(dir, 'qc.json');
  const qc = fs.existsSync(qcPath) ? JSON.parse(fs.readFileSync(qcPath, 'utf8')) : { frames: {}, clips: {} };
  const saveQc = () => fs.writeFileSync(qcPath, JSON.stringify(qc, null, 2));

  // 3 — per shot: first frame then video
  const makeFrame = async (s) => {
    const framePath = path.join(dir, `shot${s.n}_frame.png`);
    if (fs.existsSync(framePath) && !redoStills) return framePath;
    {
      const alt = (s.altCharacter || '').trim();
      log(`shot ${s.n} "${s.title}" — first frame${s.noCharacter ? ' (POV, no character)' : alt ? ' (alt character)' : ''} …`);
      // State chaining. Prefer the LAST FRAME OF THE PREVIOUS CLIP — that is the
      // world after the previous action actually rendered, so the next shot
      // inherits real state rather than a predicted still. Falls back to the
      // previous first frame. Only chains from artifacts that PASSED the judge:
      // chaining off a defective frame propagates the defect through the film.
      const prevN = s.n - 1;
      const prevClipLast = path.join(dir, `shot${prevN}_last.png`);
      const prevFrame = path.join(dir, `shot${prevN}_frame.png`);
      let chainRef = null, chainKind = '';
      if (ablate.chain) { /* ablation: no state chaining */ }
      else if (fs.existsSync(prevClipLast) && qc.clips[prevN]?.pass !== false) { chainRef = prevClipLast; chainKind = 'clip-end'; }
      else if (fs.existsSync(prevFrame) && qc.frames[prevN]?.pass !== false) { chainRef = prevFrame; chainKind = 'frame'; }
      else if (fs.existsSync(prevFrame)) log(`  previous frame failed QC — chaining from canon only`);
      const baseRefs = ablate.canon ? [] : (s.noCharacter || alt) ? [setPath] : [charPath, setPath];
      const refs = [...baseRefs];
      let chainNote = '';
      if (chainRef && !ablate.canon) {
        refs.push(chainRef);
        chainNote = ` The ${refs.length === 3 ? 'third' : 'second'} image is ${chainKind === 'clip-end' ? 'the final frame of the previous shot of this same movie' : 'a frame already filmed from this same movie'}: keep the room, its centerpiece design, its geometry and its state of light EXACTLY as they appear there — this shot happens moments later in the same place.`;
      }
      // ablation: strip the closed-world "In frame:" manifest from the shot brief
      const brief = ablate.manifest ? String(s.firstFrame).replace(/In frame:[\s\S]*$/i, '').trim() : s.firstFrame;
      const framePrompt = (note) => ablate.canon
        // baseline condition: no reference images at all — pure text-to-image,
        // the way a naive pipeline generates each shot independently
        ? `Photorealistic 16:9 widescreen cinematic film still. ${plan.characterStill.slice(0, 400)} Scene: ${plan.setStill.slice(0, 400)} Composition: ${brief}`
        : alt
        ? `The first image is the location of a film. Create one new photorealistic 16:9 widescreen cinematic film still set in this exact location, keeping its design, materials and lighting identical to the reference.${note} The person in this shot: ${alt}. Crucially, render this person exactly as described, identically every time. This is a candid frame from a movie: mid-action, eyes on their world, never looking at the camera, off-center with foreground depth. Full-bleed widescreen, zero black bars or borders. Composition: ${s.firstFrame}`
        : s.noCharacter
        ? `The first image is the room. Create one new photorealistic 16:9 widescreen cinematic film still of this exact room, keeping the lamp design, materials and lighting identical to the reference. The lamp in the reference is the ONLY lamp design in this film — reproduce it exactly.${note} This is a POV frame from a movie — what a person standing in the room sees. Nobody is in frame. Full-bleed widescreen, zero black bars or borders. Composition: ${s.firstFrame}`
        : `The first image is the man. The second image is the room. Create one new photorealistic 16:9 widescreen cinematic film still of this exact man inside this exact room. Crucially, the man's facial features, hair, and unique identity must match the first reference image exactly, and his clothing must match with nothing added or removed. Keep the room's lamp design and lighting identical to the references. The lamp in the room reference is the ONLY lamp design in this film — reproduce it exactly.${note} This is a candid frame from a movie: he is mid-action with his eyes on his work, never looking at the camera, placed off-center with foreground depth. Full-bleed widescreen, zero black bars or borders. Composition: ${s.firstFrame}`;
      // progressive reference fallback: full chain -> canon only -> set only
      const attempts = [[refs, chainNote]];
      if (refs.length > baseRefs.length) attempts.push([baseRefs, '']);
      if (!s.noCharacter && !ablate.canon) attempts.push([[setPath], ' There is only one reference image: the room. Keep it exact.']);
      let best = null; // keep the highest-scoring attempt, never the last one
      for (const [r, note] of attempts) {
        try {
          // closed loop: generate -> cross-family judge -> regenerate with the defect list
          let correction = '';
          for (let tryN = 0; tryN < (ablate.judge ? 1 : 3); tryN++) {
            const buf = await genImage(cfg, framePrompt(note) + correction, r);
            fs.writeFileSync(framePath, buf);
            const verdict = ablate.judge ? { pass: true, unverified: false, score: null, issues: [] }
              : await auditFrame(cfg, framePath, charPath, setPath, s.noCharacter || !!alt, brief);
            if (!best || (verdict.score ?? -1) > (best.verdict.score ?? -1)) best = { buf, verdict, refs: r.length };
            if (verdict.pass) { best = { buf, verdict, refs: r.length }; break; }
            log(`  audit ${verdict.score ?? '?'}/100 reject (${(verdict.issues || []).join('; ').slice(0, 90)}) — regenerating …`);
            correction = ` PREVIOUS ATTEMPT WAS REJECTED for these defects: ${(verdict.issues || []).join('; ')}. Fix exactly these while keeping everything else identical to the references.`;
          }
          if (best?.verdict.pass) break;
        } catch (e) { log(`  frame with ${r.length} refs failed (${e.message.slice(0, 60)}) — reducing references …`); }
      }
      if (!best) {
        console.error(`\x1b[31m✕ shot ${s.n} frame failed on all reference sets\x1b[0m — continuing; re-run to retry`);
        errors.push(`shot ${s.n}: frame generation failed`);
        return null;
      }
      fs.writeFileSync(framePath, best.buf); // the winner, not the last try
      qc.frames[s.n] = { pass: best.verdict.pass, score: best.verdict.score, unverified: !!best.verdict.unverified, issues: best.verdict.issues || [] };
      saveQc();
      const tag = best.verdict.unverified ? ' \x1b[35m(UNVERIFIED — judge unavailable)\x1b[0m'
        : best.verdict.pass ? ` (${best.verdict.score}/100)`
        : ` \x1b[35m(BELOW FLOOR ${best.verdict.score}/100 — kept as best of 3, flagged in qc.json)\x1b[0m`;
      ok(`shot${s.n}_frame.png${tag}${best.refs < refs.length ? ` (${best.refs} refs)` : ''}`);
      if (!best.verdict.pass) errors.push(`shot ${s.n}: frame below QC floor (${best.verdict.score}/100)`);
    }
    return framePath;
  };

  const MOTION_SUFFIX = ` This is a living photograph: micro-motion everywhere (breath, cloth stirring, flame flicker, drifting dust), macro-motion only in the single described action. The action is already underway when the shot begins and is still in motion when it ends — natural continuous human movement with real weight, breath and slight imperfection, no held pose, no freeze. Physical persistence: every object keeps its exact place, shape and state for the whole shot unless this action moves it; light sources hold constant intensity; the same items that are in frame at the start are in frame at the end.`;

  const makeClip = async (s, framePath) => {
    const clipPath = path.join(dir, `shot${s.n}.mp4`);
    if (fs.existsSync(clipPath)) { ok(`shot${s.n}.mp4 exists — skipping`); return clipPath; }
    if (!framePath || !fs.existsSync(framePath)) return null;
    log(`shot ${s.n} "${s.title}" — ${s.seconds}s (${cfg.models.video}) …`);
    emit('video', s);
    // Post-render QC: the clip itself is the most drift-prone artifact, so the
    // rendered result is sampled and judged. A clip that drifts is re-rolled.
    for (let attempt = 0; attempt < (videoQc ? 2 : 1); attempt++) {
      try {
        await genVideo(cfg, s.motion + MOTION_SUFFIX, framePath, s.seconds, clipPath);
        console.log('');
        if (!videoQc) { ok(`shot${s.n}.mp4`); return clipPath; }
        const v = await auditClip(cfg, clipPath, charPath, setPath, s.noCharacter || !!(s.altCharacter || '').trim(), s.firstFrame);
        qc.clips[s.n] = { pass: v.pass, score: v.score, unverified: !!v.unverified, issues: v.issues || [] };
        saveQc();
        if (v.pass || v.unverified || attempt === 1) {
          const tag = v.unverified ? ' \x1b[35m(UNVERIFIED)\x1b[0m' : v.pass ? ` (clip QC ${v.score}/100)` : ` \x1b[35m(clip QC ${v.score}/100 — below floor, kept)\x1b[0m`;
          ok(`shot${s.n}.mp4${tag}`);
          if (!v.pass && !v.unverified) errors.push(`shot ${s.n}: clip below QC floor (${v.score}/100)`);
          return clipPath;
        }
        log(`  clip QC ${v.score}/100 (${(v.issues || []).join('; ').slice(0, 80)}) — re-rolling clip …`);
        fs.unlinkSync(clipPath);
      } catch (e) {
        console.log('');
        console.error(`\x1b[31m✕ shot ${s.n}: ${e.message}\x1b[0m — continuing with remaining shots`);
        errors.push(`shot ${s.n}: ${e.message}`);
        return null;
      }
    }
    return fs.existsSync(clipPath) ? clipPath : null;
  };

  // Freeze the last frame of a clip so the next shot can chain from real state.
  const captureLastFrame = (s, clipPath) => {
    if (!clipPath || !haveFfmpeg()) return;
    const out = path.join(dir, `shot${s.n}_last.png`);
    try {
      const d = clipDuration(clipPath);
      execSync(`ffmpeg -y -v quiet -ss ${Math.max(0, d - 0.25).toFixed(2)} -i "${clipPath}" -frames:v 1 "${out}"`);
    } catch {}
  };

  const shots = plan.shots.filter(s => !onlyShot || String(s.n) === String(onlyShot));
  if (fast && !skipVideo) {
    // --fast: all frames first (chained on frames), then clips in parallel.
    const frames = [];
    for (const s of shots) frames.push([s, await makeFrame(s)]);
    let cursor = 0;
    const worker = async () => { while (cursor < frames.length) { const i = cursor++; const [s, f] = frames[i]; await makeClip(s, f); } };
    await Promise.all(Array.from({ length: Math.max(1, jobs) }, worker));
  } else {
    // default: strict serial so every shot inherits the previous clip's real end state
    for (const s of shots) {
      const framePath = await makeFrame(s);
      if (skipVideo || !framePath) continue;
      const clipPath = await makeClip(s, framePath);
      captureLastFrame(s, clipPath);
    }
  }

  // 4 — assemble + finishing pass (grade, grain, dissolves, fades)
  let filmPath = null;
  const clips = plan.shots.map(s => path.join(dir, `shot${s.n}.mp4`)).filter(f => fs.existsSync(f));
  if (!skipVideo && clips.length > 1 && haveFfmpeg()) {
    emit('assemble', clips.length);
    try {
      finishFilm(dir, clips);
      filmPath = path.join(dir, 'film.mp4');
      ok(`film.mp4 — ${clips.length} shots, graded and finished`);
    } catch (e) {
      console.error(`✕ finishing pass failed (${e.message}) — falling back to plain concat`);
      const listFile = path.join(dir, 'concat.txt');
      fs.writeFileSync(listFile, clips.map(c => `file '${c.replace(/\\/g, '/')}'`).join('\n'));
      try {
        execSync(`ffmpeg -y -v quiet -f concat -safe 0 -i "${listFile}" -c copy "${path.join(dir, 'film.mp4')}"`);
        filmPath = path.join(dir, 'film.mp4');
        ok(`film.mp4 — ${clips.length} shots assembled (plain cut)`);
      } catch { console.error('✕ concat also failed — clips are still in the folder'); }
    }
  }
  emit('done', { dir, filmPath, errors });
  return { dir, plan, clips, film: filmPath, errors };
}

// ---------- CLI ----------
async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args[0] === '--help' || args[0] === '-h') {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].split('/*')[1]);
    return;
  }
  if (args[0] === 'setup') return setup();
  const cfg = loadKeys();
  if (args[0] === 'models') return listModels(cfg);

  const flag = (name, dflt) => { const i = args.indexOf(name); return i > -1 ? args[i + 1] : dflt; };
  const result = await makeFilm(cfg, {
    seed: args[0],
    beats: parseInt(flag('--beats', flag('--shots', '3')), 10),
    name: flag('--name', null),
    onlyShot: flag('--shot', null),
    skipVideo: args.includes('--skip-video'),
    redoStills: args.includes('--redo-stills'),
    fast: args.includes('--fast'),
    videoQc: !args.includes('--no-video-qc'),
    jobs: parseInt(flag('--jobs', '3'), 10),
  });
  console.log(`\n\x1b[32mDone.\x1b[0m Everything is in ${result.dir}`);
  if (result.errors.length) console.log(`\x1b[33mWith ${result.errors.length} issue(s):\x1b[0m ${result.errors.join(' | ')}`);
  console.log('Re-roll anything by deleting its file and re-running the same command.');
}

// run the CLI only when executed directly — importing this file is side-effect-free
import { pathToFileURL } from 'node:url';
const isCLI = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isCLI) main().catch(e => die(e.stack || e.message));
