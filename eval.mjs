#!/usr/bin/env node
/*
FTL STUDIO — EVALUATION HARNESS

Measures whether the architecture actually does what it claims, instead of
asserting it. Runs the same seeds under different conditions, then scores every
generated frame against that run's own canon with a cross-family vision judge.

  node eval.mjs                          default: 3 seeds x {full, no-canon}
  node eval.mjs --conditions all         adds no-judge, no-chain, no-manifest
  node eval.mjs --seeds 5 --beats 2      more seeds / longer films
  node eval.mjs --score-only             re-score existing runs, generate nothing

CONDITIONS
  full         the complete pipeline
  no-canon     BASELINE — no reference images; every frame generated from text
               alone, the way a naive prompt-per-shot pipeline works
  no-judge     generation without the closed-loop critic (single attempt)
  no-chain     no state chaining between consecutive shots
  no-manifest  the closed-world "In frame:" object list stripped from each brief

METRIC
  Every frame is judged against the run's canon character + canon set on four
  axes (identity, wardrobe, setMatch, manifest), each 0-100. A frame's score is
  its WEAKEST axis — averaging hides a failed face. Reported per condition:
  mean score, mean identity, pass rate at the >=70 floor, and the spread.

Video is never generated here: frames are where identity is decided, and they
cost cents instead of dollars.
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadKeys, makeFilm, auditFrame, slug } from './ftl-studio.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'eval');

const SEEDS = [
  'an old lighthouse keeper repairing the great lamp as a storm closes in',
  'a blacksmith finishing a blade alone in her forge before dawn',
  'a beekeeper opening a hive on a hot afternoon as a swarm rises',
  'a night-shift train signaller holding the line through a snowstorm',
  'a luthier carving the last brace of a violin by window light',
];

const CONDITIONS = {
  full: {},
  'no-canon': { canon: true },
  'no-judge': { judge: true },
  'no-chain': { chain: true },
  'no-manifest': { manifest: true },
};

const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : dflt; };
const has = (name) => process.argv.includes(name);

const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const sd = (a) => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };

async function main() {
  const cfg = loadKeys();
  if (!cfg.anthropic || !cfg.google) { console.error('Both API keys required — see: node ftl-studio.mjs setup'); process.exit(1); }

  const nSeeds = Math.min(SEEDS.length, parseInt(arg('--seeds', '3'), 10));
  const beats = parseInt(arg('--beats', '2'), 10);
  const condNames = arg('--conditions', 'default') === 'all'
    ? Object.keys(CONDITIONS)
    : ['full', 'no-canon'];
  const scoreOnly = has('--score-only');
  const seeds = SEEDS.slice(0, nSeeds);

  fs.mkdirSync(OUT, { recursive: true });
  console.log(`\nFTL EVAL — ${seeds.length} seeds x ${condNames.length} conditions x ~${beats * 2} shots`);
  console.log(`conditions: ${condNames.join(', ')}`);
  console.log(`judge: ${cfg.models.judge} (cross-family)\n`);

  const rows = [];
  for (const cond of condNames) {
    for (const [i, seed] of seeds.entries()) {
      const name = `eval-${slug(seed).slice(0, 22)}-${cond}`;
      const dir = path.join(OUT, name);
      process.stdout.write(`[${cond}] seed ${i + 1}/${seeds.length} … `);

      if (!scoreOnly) {
        try {
          await makeFilm(cfg, {
            seed, beats, name, outRoot: OUT, skipVideo: true,
            // the judge is the measuring instrument; in generation it is a
            // mechanism under test, so no-judge disables it during generation
            // but scoring below always runs it
            ablate: CONDITIONS[cond],
          });
        } catch (e) { console.log(`generation failed: ${e.message.slice(0, 60)}`); continue; }
      }
      if (!fs.existsSync(dir)) { console.log('no run dir — skipped'); continue; }

      const charPath = path.join(dir, 'character.png');
      const setPath = path.join(dir, 'set.png');
      const planPath = path.join(dir, 'plan.json');
      if (!fs.existsSync(charPath) || !fs.existsSync(planPath)) { console.log('incomplete run — skipped'); continue; }
      const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));

      const scores = [];
      for (const s of plan.shots) {
        const f = path.join(dir, `shot${s.n}_frame.png`);
        if (!fs.existsSync(f)) continue;
        const v = await auditFrame(cfg, f, charPath, setPath, s.noCharacter, s.firstFrame);
        if (v.unverified || v.score === null) continue;
        scores.push({ shot: s.n, score: v.score, ...(v.axes || {}) });
      }
      if (!scores.length) { console.log('no scorable frames'); continue; }
      const row = {
        condition: cond, seed, frames: scores.length,
        score: mean(scores.map(x => x.score)),
        identity: mean(scores.filter(x => x.identity != null).map(x => x.identity)),
        wardrobe: mean(scores.filter(x => x.wardrobe != null).map(x => x.wardrobe)),
        setMatch: mean(scores.filter(x => x.setMatch != null).map(x => x.setMatch)),
        manifest: mean(scores.filter(x => x.manifest != null).map(x => x.manifest)),
        passRate: scores.filter(x => x.score >= 70).length / scores.length,
        detail: scores,
      };
      rows.push(row);
      console.log(`score ${row.score.toFixed(1)} · identity ${row.identity.toFixed(1)} · pass ${(row.passRate * 100).toFixed(0)}%`);
    }
  }

  if (!rows.length) { console.error('\nNo results.'); process.exit(1); }

  // aggregate per condition
  const agg = condNames.map(c => {
    const r = rows.filter(x => x.condition === c);
    if (!r.length) return null;
    const s = r.map(x => x.score);
    return {
      condition: c, runs: r.length, frames: r.reduce((a, x) => a + x.frames, 0),
      score: mean(s), scoreSd: sd(s),
      identity: mean(r.map(x => x.identity)),
      wardrobe: mean(r.map(x => x.wardrobe)),
      setMatch: mean(r.map(x => x.setMatch)),
      manifest: mean(r.map(x => x.manifest)),
      passRate: mean(r.map(x => x.passRate)),
    };
  }).filter(Boolean);

  const base = agg.find(a => a.condition === 'full');
  const stamp = new Date().toISOString();
  fs.writeFileSync(path.join(OUT, 'eval-results.json'),
    JSON.stringify({ stamp, judge: cfg.models.judge, image: cfg.models.image, seeds: seeds.length, beats, aggregate: agg, rows }, null, 2));

  const pad = (s, n) => String(s).padEnd(n);
  const num = (v) => v.toFixed(1).padStart(5);
  let md = `# FTL Studio — evaluation results\n\n`;
  md += `Generated ${stamp} · judge \`${cfg.models.judge}\` (cross-family) · image \`${cfg.models.image}\`\n`;
  md += `· ${seeds.length} seeds × ${beats} beats · frames scored on their weakest axis (0-100), pass floor 70.\n\n`;
  md += `| condition | runs | frames | score | ±sd | identity | wardrobe | set | manifest | pass |\n`;
  md += `|---|---|---|---|---|---|---|---|---|---|\n`;
  for (const a of agg) {
    md += `| ${pad(a.condition, 11)} | ${a.runs} | ${a.frames} | **${num(a.score)}** | ${num(a.scoreSd)} | ${num(a.identity)} | ${num(a.wardrobe)} | ${num(a.setMatch)} | ${num(a.manifest)} | ${(a.passRate * 100).toFixed(0)}% |\n`;
  }
  if (base) {
    md += `\n## Deltas vs the full pipeline\n\n| condition | Δ score | Δ identity | reading |\n|---|---|---|---|\n`;
    for (const a of agg.filter(x => x.condition !== 'full')) {
      const d = a.score - base.score, di = a.identity - base.identity;
      const reading = d < -8 ? 'mechanism earns its place'
        : d < -2 ? 'small but real contribution'
        : 'no measurable contribution — candidate for deletion';
      md += `| ${a.condition} | ${d >= 0 ? '+' : ''}${d.toFixed(1)} | ${di >= 0 ? '+' : ''}${di.toFixed(1)} | ${reading} |\n`;
    }
  }
  md += `\n## Method\n\nEach condition runs the identical seeds through the pipeline with one mechanism disabled, generating first frames only (video is not generated: identity is decided at the frame). Every frame is then scored by a cross-family vision judge against that run's own canon character and canon set on four axes — identity, wardrobe, set match, manifest compliance. A frame's score is its **weakest** axis, because an averaged score hides a failed face. \`no-canon\` is the naive baseline: no reference images, every frame generated from text alone.\n\nRaw per-frame scores: \`eval/eval-results.json\`. Reproduce: \`node eval.mjs --conditions all\`.\n`;
  fs.writeFileSync(path.join(HERE, 'EVAL.md'), md);

  console.log('\n' + md.split('## Method')[0]);
  console.log(`Wrote EVAL.md + eval/eval-results.json`);
}

import { pathToFileURL } from 'node:url';
const isCLI = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isCLI) main().catch(e => { console.error(e.stack || e.message); process.exit(1); });
