// Step 6, engine: one sample sentence → all its examples (find) or new ones (create).
//
// The sample's "mit + article + noun" becomes a map (slots + rules, see
// lib/mit-map.mjs); the engine (engine/ in this project: the core copied
// from github.com/cadenegr/skyscrapers, plus the sentence plug-in) solves it.
//   find:   every line of the texts with this shape that also passes the rules
//   create: every correct filling of the slots, also ones in no text
//
// Run: node scripts/pipeline/6-engine.mjs "<sample sentence>" [options]
//   --open article|noun|both|none   which slots may change (default: both)
//   --create                        build new ones instead of finding lines
//   --max N                         most solutions (default 1000)
//   --show N                        how many to print (default 20)
//   --texts a,b                     labelled texts to search (default: tatoeba, grimm)
// Needs the engine built:  make -C engine

import { createReadStream, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { DATIV_ARTICLES, buildLexicon, buildMap, parseSample, readSolutions } from "./lib/mit-map.mjs";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i < 0 ? fallback : args[i + 1];
};
const sentence = args[0];
const open = opt("open", "both");
const create = args.includes("--create");
const max = Number(opt("max", 1000));
const show = Number(opt("show", 20));
const texts = opt("texts", ".cache/pipeline/tatoeba,.cache/pipeline/grimm").split(",");
const engine = process.env.ENGINE ?? "engine/sentence-engine";

if (!sentence || sentence.startsWith("--")) fail('usage: node scripts/pipeline/6-engine.mjs "Ich fahre mit dem Bus." [--open article|noun|both|none] [--create]');
if (!["article", "noun", "both", "none"].includes(open)) fail("--open must be article, noun, both or none");
if (!Number.isInteger(max) || max < 1 || !Number.isInteger(show) || show < 0) fail("--max and --show need whole numbers");
if (!existsSync(engine)) fail(`no engine at ${engine}: run  make -C engine`);

const lexicon = buildLexicon(JSON.parse(readFileSync("src/data/nouns.json", "utf8")));
const sample = parseSample(sentence, lexicon);
if (!sample) fail(`no "mit + article + noun" in the sample that I know: the article must be one of ${DATIV_ARTICLES.join(", ")}, the noun one of the ${lexicon.length} forms in src/data/nouns.json`);

// Find mode: every "mit + article + noun" in the texts becomes a candidate line.
let lines = null;
const examples = new Map(); // "article,noun" → sentences
if (!create) {
  const formIndex = new Map();
  lexicon.forEach((f, i) => formIndex.set(f.form, [...(formIndex.get(f.form) ?? []), i]));
  let seen = 0, unknown = 0;
  for (const dir of texts) {
    const file = join(dir, "5-labelled.jsonl");
    if (!existsSync(file)) fail(`needs ${file}: run the pipeline on that text first`);
    for await (const line of createInterface({ input: createReadStream(file) })) {
      if (!line.includes('"mit"')) continue; // quick skip: most lines have no "mit"
      const s = JSON.parse(line);
      for (const p of s.phrases) {
        if (p.prep !== "mit" || !p.ok || p.slots.length !== 3 || p.slots[2].role !== "noun") continue;
        seen++;
        const article = DATIV_ARTICLES.indexOf(p.slots[1].text.toLowerCase());
        const nouns = formIndex.get(p.slots[2].text);
        if (article < 0 || !nouns) { unknown++; continue; }
        for (const noun of nouns) {
          const key = `${article},${noun}`;
          if (!examples.has(key)) examples.set(key, []);
          examples.get(key).push({ text: s.text, phrase: p.text, src: s.src ?? dir });
        }
      }
    }
  }
  lines = [...examples.keys()].map((k) => {
    const [article, noun] = k.split(",").map(Number);
    return { article, noun };
  });
  console.log(`texts: ${seen} "mit + article + noun" phrases, ${lines.length} different ones the engine can check (${unknown} with a noun not in the word list)`);
}

const map = buildMap({ lexicon, sample, open, lines });
writeFileSync(".cache/pipeline/6-map.txt", map);
const t0 = performance.now();
const run = spawnSync(engine, ["-", String(max)], { input: map, encoding: "utf8", maxBuffer: 1 << 28 });
const ms = Math.round(performance.now() - t0);
if (run.status !== 0) fail(`the engine stopped: ${run.stderr.trim()}`);
const solutions = readSolutions(run.stdout);
console.log(`engine: ${run.stderr.trim()}, in ${ms} ms (map: .cache/pipeline/6-map.txt)\n`);

const phrase = (s) => `${sample.mit} ${DATIV_ARTICLES[s.article]} ${lexicon[s.noun].form}`;
// Spread the shown ones over all solutions, so they are not all the same noun.
const pick = (list) => (list.length <= show ? list : Array.from({ length: show }, (_, i) => list[Math.floor((i * list.length) / show)]));

if (create) {
  console.log(`${solutions.length} correct "${phrase({ article: sample.article, noun: sample.nouns[0] })}" variations (open: ${open}):`);
  for (const s of pick(solutions)) console.log(`  ${sample.before}**${phrase(s)}**${sample.after}`);
} else {
  const found = solutions.flatMap((s) => examples.get(`${s.article},${s.noun}`) ?? []);
  const unique = [...new Map(found.map((e) => [e.text, e])).values()];
  console.log(`${unique.length} sentences found for "${phrase({ article: sample.article, noun: sample.nouns[0] })}" (open: ${open}), in ${solutions.length} different phrases:`);
  for (const e of pick(unique)) console.log(`  ${e.text.replace(e.phrase, `**${e.phrase}**`)}   [${e.src}]`);
}

function fail(msg) {
  console.error(`6 engine: ${msg}`);
  process.exit(1);
}
