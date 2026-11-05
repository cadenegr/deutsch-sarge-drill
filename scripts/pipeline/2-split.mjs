// Step 2, split: paragraphs → sentences.
//
// Run: node scripts/pipeline/2-split.mjs <output folder>
// Reads 1-text.txt, writes 2-sentences.jsonl: one {"id","para","text"} per line.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { splitSentences, isSentence } from "./lib/split.mjs";

const dir = process.argv[2];
const input = join(dir ?? "", "1-text.txt");
if (!dir || !existsSync(input)) fail(`needs ${input}: run step 1 first`);

const paragraphs = readFileSync(input, "utf8").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
if (paragraphs.length === 0) fail("1-text.txt is empty");

const out = [];
let dropped = 0;
paragraphs.forEach((p, para) => {
  for (const text of splitSentences(p)) {
    if (isSentence(text)) out.push({ id: out.length, para, text });
    else dropped++;
  }
});
if (out.length === 0) fail("no sentences found");

writeFileSync(join(dir, "2-sentences.jsonl"), out.map((s) => JSON.stringify(s)).join("\n") + "\n");
console.log(`2 split:   ${out.length} sentences (${dropped} pieces dropped: headings, titles, page numbers)`);

function fail(msg) {
  console.error(`2 split: ${msg}`);
  process.exit(1);
}
