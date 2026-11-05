// Step 1+2 for Tatoeba: the export already has one sentence per line, so
// reading and splitting are one step. Every sentence keeps its Tatoeba
// number: the licence (CC BY 2.0 FR) asks to credit each sentence.
//
// Source: https://downloads.tatoeba.org/exports/per_language/deu/deu_sentences.tsv.bz2
// (unpacked as .cache/tatoeba/deu_sentences.tsv: id <tab> deu <tab> sentence)
//
// Run: node scripts/pipeline/1-read-tatoeba.mjs <deu_sentences.tsv> <output folder>
// Writes 2-sentences.jsonl: one {"id","src","text"} per line, like step 2.

import { createReadStream, createWriteStream, existsSync, mkdirSync } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";
import { isSentence } from "./lib/split.mjs";

// Old spelling (before 1996): the baseline teaches today's German.
const OLD_SPELLING = /\b(daß|muß|mußt|mußte|mußten|wußte|wußten|läßt|laß|bißchen|Faß|Schloß|Kuß|Schluß|Fluß|Haß|Thür|Theil)\b/;

const [file, dir] = process.argv.slice(2);
if (!file || !dir) fail("usage: node scripts/pipeline/1-read-tatoeba.mjs <deu_sentences.tsv> <output folder>");
if (!existsSync(file)) fail(`no such file: ${file}`);
mkdirSync(dir, { recursive: true });

const out = createWriteStream(join(dir, "2-sentences.jsonl"));
const seen = new Set();
let id = 0, lines = 0, bad = 0, old = 0, dupes = 0;
for await (const line of createInterface({ input: createReadStream(file) })) {
  lines++;
  const [num, lang, raw] = line.split("\t");
  const text = raw?.replace(/\s+/g, " ").trim();
  if (lang !== "deu" || !/^\d+$/.test(num) || !text || !isSentence(text)) { bad++; continue; }
  if (OLD_SPELLING.test(text)) { old++; continue; }
  if (seen.has(text)) { dupes++; continue; }
  seen.add(text);
  out.write(JSON.stringify({ id: id++, src: `tatoeba:${num}`, text }) + "\n");
}
out.end();
if (id === 0) fail("no sentences found: is this the Tatoeba deu_sentences.tsv file?");
console.log(`1 read:    ${lines} lines → ${id} sentences (${bad} not a full sentence, ${old} old spelling, ${dupes} duplicates)`);

function fail(msg) {
  console.error(`1 read: ${msg}`);
  process.exit(1);
}
