// Step 3, measure: count words, characters and commas in each sentence.
//
// Run: node scripts/pipeline/3-measure.mjs <output folder>
// Reads 2-sentences.jsonl, writes 3-measured.jsonl (same lines + "words", "chars", "commas").
// Line by line, so it also works for very big files.

import { createReadStream, createWriteStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";

const dir = process.argv[2];
const input = join(dir ?? "", "2-sentences.jsonl");
if (!dir || !existsSync(input)) fail(`needs ${input}: run step 2 first`);

const out = createWriteStream(join(dir, "3-measured.jsonl"));
let n = 0, words = 0, commas = 0;
for await (const line of createInterface({ input: createReadStream(input) })) {
  if (!line) continue;
  const s = JSON.parse(line);
  n++;
  if (typeof s.id !== "number" || typeof s.text !== "string" || !s.text) fail(`line ${n} has no id or text`);
  s.words = (s.text.match(/[\p{L}\d]+(?:['’-][\p{L}\d]+)*/gu) ?? []).length;
  s.chars = s.text.length;
  s.commas = (s.text.match(/,/g) ?? []).length;
  words += s.words;
  commas += s.commas;
  out.write(JSON.stringify(s) + "\n");
}
out.end();
if (n === 0) fail("2-sentences.jsonl is empty");
console.log(`3 measure: ${n} sentences, on average ${(words / n).toFixed(1)} words and ${(commas / n).toFixed(1)} commas`);

function fail(msg) {
  console.error(`3 measure: ${msg}`);
  process.exit(1);
}
