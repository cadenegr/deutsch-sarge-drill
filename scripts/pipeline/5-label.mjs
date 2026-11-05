// Step 5, label: grammar labels for each sentence, and its preposition phrases as slots.
//
// Run: node scripts/pipeline/5-label.mjs <output folder>
// Reads 4-analysed.jsonl, writes:
//   5-labelled.jsonl  every sentence + "labels" (detailed tags), "rules" (numbers
//                     from docs/grammar-map.md), "length", "phrases" (without the
//                     word-by-word analysis, which stays in 4-analysed.jsonl)
//   5-summary.md      what the text contains, for a person to read
// Line by line, so it also works for very big files.

import { createReadStream, createWriteStream, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";
import { labelSentence } from "./lib/label.mjs";
import { rulesOf, parseGrammarMap, byNumber } from "./lib/rules.mjs";

const dir = process.argv[2];
const input = join(dir ?? "", "4-analysed.jsonl");
if (!dir || !existsSync(input)) fail(`needs ${input}: run step 4 first`);

const out = createWriteStream(join(dir, "5-labelled.jsonl"));
const labelCounts = new Map();
const lengthCounts = new Map();
const mit = []; // { pattern, text, ok, sentence: { text, words } }
const ruleCounts = new Map();
const ruleExample = new Map(); // rule → shortest sentence that shows it
const add = (m, k) => m.set(k, (m.get(k) ?? 0) + 1);
let n = 0;
for await (const line of createInterface({ input: createReadStream(input) })) {
  if (!line) continue;
  const s = JSON.parse(line);
  n++;
  if (!Array.isArray(s.tokens) || s.tokens.length === 0) fail(`line ${n} has no tokens`);
  const r = labelSentence(s);
  const { tokens, ...rest } = s;
  const labelled = { ...rest, ...r, rules: rulesOf(r) };
  if (!out.write(JSON.stringify(labelled) + "\n")) await new Promise((ok) => out.once("drain", ok));

  r.labels.forEach((l) => add(labelCounts, l));
  for (const id of labelled.rules) {
    add(ruleCounts, id);
    // A whole sentence (capital letter first), not a piece of speech split off.
    const whole = s.words >= 3 && /^[»«"„“(]?[A-ZÄÖÜ]/.test(s.text);
    if (whole && (ruleExample.get(id)?.words ?? Infinity) > s.words) ruleExample.set(id, { text: s.text, words: s.words });
  }
  add(lengthCounts, r.length);
  for (const p of r.phrases) {
    if (p.prep === "mit") mit.push({ pattern: p.pattern, text: p.text, ok: p.ok, sentence: { text: s.text, words: s.words } });
  }
}
await new Promise((ok) => out.end(ok));
if (n === 0) fail("4-analysed.jsonl is empty");

// --- Summary ---
const sorted = (m) => [...m].sort((a, b) => b[1] - a[1]);
const mitOk = mit.filter((p) => p.ok);
const patterns = sorted(mitOk.reduce((m, p) => add(m, p.pattern), new Map()));
const exampleOf = (pattern) => mitOk.filter((p) => p.pattern === pattern).sort((a, b) => a.sentence.words - b.sentence.words)[0];
const short = [...new Set(mitOk.map((p) => p.sentence))].sort((a, b) => a.words - b.words).slice(0, 25);

const mapRules = parseGrammarMap(readFileSync("docs/grammar-map.md", "utf8"));
const md = [
  `# What this text contains`,
  ``,
  `${n} sentences: ${sorted(lengthCounts).map(([k, c]) => `${c} ${k}`).join(", ")}.`,
  ``,
  `## Rules from docs/grammar-map.md`,
  ``,
  `| # | Rule | Sentences | Shortest example |`,
  `|---|---|---|---|`,
  ...mapRules.map((r) => `| ${r.id}${r.star ? " ★" : ""} | ${r.title} | ${ruleCounts.get(r.id) ?? "no finder yet"} | ${ruleExample.get(r.id)?.text ?? ""} |`),
  ``,
  `## Most common tags`,
  ``,
  `| Label | Sentences |`,
  `|---|---|`,
  ...sorted(labelCounts).slice(0, 30).map(([l, c]) => `| ${l} | ${c} |`),
  ``,
  `## mit + Dativ`,
  ``,
  `${mit.length} phrases with "mit": ${mitOk.length} clear (Dativ, simple shape), ${mit.length - mitOk.length} left out (the parser found no Dativ, or the phrase is complicated).`,
  ``,
  `| Shape | Count | Shortest example |`,
  `|---|---|---|`,
  ...patterns.map(([pat, c]) => {
    const e = exampleOf(pat);
    return `| ${pat} | ${c} | ${e.sentence.text.replace(e.text, `**${e.text}**`)} |`;
  }),
  ``,
  `## The 25 shortest sentences with mit + Dativ (good drill material)`,
  ``,
  ...short.map((s) => `- ${s.text}`),
  ``,
].join("\n");
writeFileSync(join(dir, "5-summary.md"), md);

console.log(`5 label:   ${ruleCounts.size} grammar map rules found (${[...ruleCounts.keys()].sort(byNumber).join(", ")})`);
console.log(`           ${labelCounts.size} different tags; ${mit.length} mit phrases, ${mitOk.length} clear mit+Dativ in ${patterns.length} shapes`);
console.log(`           summary: ${join(dir, "5-summary.md")}`);

function fail(msg) {
  console.error(`5 label: ${msg}`);
  process.exit(1);
}
