// Builds src/data/baseline.json: the labelled sentences the app knows
// without any book, sorted by the rules of docs/grammar-map.md. A book the
// learner reads later adds to these.
//
// Source: Tatoeba (https://tatoeba.org), German sentences, CC BY 2.0 FR.
// Every sentence keeps its Tatoeba number ("src") for the credit.
// First run the pipeline on the export (see README):
//   node scripts/pipeline/run.mjs .cache/tatoeba/tatoeba.tsv
//
// Choice: whole sentences of 3–15 words (drill material, not reading). For
// each grammar map rule up to PER_RULE sentences, in a fixed shuffled order
// (a hash of the text), so a rebuild gives the same result. For variety: at
// most PER_NOUN sentences with the same noun in a preposition phrase ("mit
// dem Bus" only 3 times), and at most PER_FIRST_WORD starting with the same
// word (Tatoeba has very many "Tom …"). A chosen sentence keeps all its
// rules and tags, so the app can also ask for "3.2 and 6.6 together".
//
// Dictionary test: Tatoeba is written by volunteers and has typos ("Tunell").
// Every word of a sentence must appear at least MIN_COUNT times in the
// Leipzig word counts (deu_mixed-typical_2011_1M, CC BY, .cache/words.txt,
// see build-nouns.mjs), or the sentence is left out.
//
// Run: node scripts/build-baseline.mjs

import { createReadStream, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { parseGrammarMap, byNumber } from "./pipeline/lib/rules.mjs";

const INPUT = ".cache/pipeline/tatoeba/5-labelled.jsonl";
const OUTPUT = "src/data/baseline.json";
const MAX_WORDS = 15;
const PER_RULE = 400;
const PER_NOUN = 3;
const PER_FIRST_WORD = 15;
const MIN_COUNT = 2;
const WORDS = ".cache/words.txt";

if (!existsSync(INPUT)) {
  console.error(`needs ${INPUT}: run  node scripts/pipeline/run.mjs .cache/tatoeba/tatoeba.tsv  first`);
  process.exit(1);
}
if (!existsSync(WORDS)) fail(`needs ${WORDS}: the Leipzig word counts (see scripts/build-nouns.mjs)`);
const known = new Set();
for await (const line of createInterface({ input: createReadStream(WORDS) })) {
  const [, word, count] = line.split("\t");
  if (Number(count) >= MIN_COUNT) known.add(word);
}
// A word passes as written, or with the first letter changed ("Raus!" → raus).
const isKnown = (w) => known.has(w) || known.has(w[0].toLowerCase() + w.slice(1)) || known.has(w[0].toUpperCase() + w.slice(1));
const passesDictionary = (text) => (text.match(/\p{L}+(?:-\p{L}+)*/gu) ?? []).every(isKnown);
let typos = 0;

const MAP = parseGrammarMap(readFileSync("docs/grammar-map.md", "utf8"));

const lines = () => createInterface({ input: createReadStream(INPUT) });
const okTags = (s) => s.labels.filter((l) => !l.endsWith("+?"));
const isWhole = (s) => /^[»"„“(]?[A-ZÄÖÜ]/.test(s.text);

// FNV-1a: a fixed "random" order from the text itself.
function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

// Pass 1: what each candidate offers (small, so 700k sentences fit in memory).
const candidates = [];
for await (const line of lines()) {
  if (!line) continue;
  const s = JSON.parse(line);
  if (s.words < 3 || s.words > MAX_WORDS || !isWhole(s) || !Array.isArray(s.rules)) continue;
  if (!passesDictionary(s.text)) { typos++; continue; }
  candidates.push({
    id: s.id,
    h: hash(s.text),
    rules: s.rules,
    nouns: s.phrases.filter((p) => p.ok).map((p) => p.slots.at(-1).lemma.toLowerCase()),
    first: s.text.match(/\p{L}+/u)?.[0].toLowerCase() ?? "",
  });
}
if (candidates.length === 0) fail(`no labelled sentences with rules in ${INPUT}: run step 5 again`);
candidates.sort((a, b) => a.h - b.h || a.id - b.id);

const ruleIds = [...new Set(candidates.flatMap((c) => c.rules))].sort(byNumber);
const unknown = ruleIds.filter((id) => !MAP.some((r) => r.id === id));
if (unknown.length) fail(`rules not in docs/grammar-map.md: ${unknown.join(", ")}`);

const chosen = new Set();
for (const rule of ruleIds) {
  const prepRule = rule.startsWith("1.") || rule.startsWith("3.");
  const perNoun = new Map();
  const perFirst = new Map();
  let taken = 0;
  for (const c of candidates) {
    if (taken >= PER_RULE) break;
    if (!c.rules.includes(rule)) continue;
    if ((perFirst.get(c.first) ?? 0) >= PER_FIRST_WORD) continue;
    if (prepRule && c.nouns.some((n) => (perNoun.get(n) ?? 0) >= PER_NOUN)) continue;
    perFirst.set(c.first, (perFirst.get(c.first) ?? 0) + 1);
    if (prepRule) c.nouns.forEach((n) => perNoun.set(n, (perNoun.get(n) ?? 0) + 1));
    chosen.add(c.id);
    taken++;
  }
}

// Pass 2: write the chosen sentences, compact.
const ruleIndex = new Map(ruleIds.map((id, i) => [id, i]));
const tags = [];
const tagIndex = new Map();
const sentences = [];
let lost = 0;
for await (const line of lines()) {
  if (!line) continue;
  const s = JSON.parse(line);
  if (!chosen.has(s.id)) continue;
  const phrases = [];
  for (const p of s.phrases) {
    if (!p.ok) continue;
    // Where the phrase is in the sentence (the parser's tokens are joined by spaces).
    const at = s.text.search(new RegExp(p.slots.map((x) => escape(x.text)).join("\\s*")));
    if (at < 0) { lost++; continue; }
    phrases.push({
      prep: p.prep,
      case: p.case,
      at,
      // [role, text, lemma, case, gender, number]
      slots: p.slots.map((x) => [x.role, x.text, x.lemma, x.case ?? "", x.gender ?? "", x.number ?? ""]),
    });
  }
  for (const t of okTags(s)) if (!tagIndex.has(t)) tagIndex.set(t, tags.push(t) - 1);
  sentences.push({
    text: s.text,
    src: Number(s.src.replace("tatoeba:", "")),
    words: s.words,
    rules: s.rules.map((id) => ruleIndex.get(id)),
    tags: okTags(s).map((t) => tagIndex.get(t)),
    phrases,
  });
}
sentences.sort((a, b) => a.src - b.src);

const rules = ruleIds.map((id) => MAP.find((r) => r.id === id));
// One sentence per line: readable diffs.
writeFileSync(
  OUTPUT,
  [
    `{"source":${JSON.stringify("Tatoeba (https://tatoeba.org), CC BY 2.0 FR; src = sentence number, https://tatoeba.org/sentences/show/<src>")},`,
    `"rules":[\n${rules.map((r) => JSON.stringify(r)).join(",\n")}\n],`,
    `"tags":${JSON.stringify(tags)},`,
    `"sentences":[\n${sentences.map((s) => JSON.stringify(s)).join(",\n")}\n]}`,
    "",
  ].join("\n"),
);
console.log(`dictionary test: ${typos} sentences left out (a word not in the Leipzig counts)`);
console.log(`${candidates.length} candidates (3–${MAX_WORDS} words) → ${sentences.length} sentences for ${rules.length} grammar map rules → ${OUTPUT}`);
if (lost) console.log(`${lost} phrases not found back in their sentence (left out)`);

function escape(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fail(msg) {
  console.error(`build-baseline: ${msg}`);
  process.exit(1);
}
