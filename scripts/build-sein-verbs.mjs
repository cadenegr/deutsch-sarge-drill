// Builds scripts/pipeline/sein-verbs.txt: the verbs that make their Perfekt
// with "sein" (gehen → ist gegangen), one per line. The pipeline needs it to
// tell "Er ist gegangen" (Perfekt, 6.2) from "Die Tür ist geöffnet" (a state,
// sein + participle of a "haben" verb).
//
// Source: Wiktionary verbs extracted by kaikki.org (CC BY-SA), the same file
// as build-verbs.mjs: .cache/verbs.jsonl, from
// https://kaikki.org/dictionary/German/pos-verb/kaikki.org-dictionary-German-by-pos-verb.jsonl
// A verb is in the list if Wiktionary gives "sein" as (one of) its
// auxiliaries: "passieren" (haben or sein) is in, "öffnen" (haben) is not.
//
// Run: node scripts/build-sein-verbs.mjs

import { createReadStream, existsSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

const INPUT = ".cache/verbs.jsonl";
const OUTPUT = "scripts/pipeline/sein-verbs.txt";
if (!existsSync(INPUT)) {
  console.error(`needs ${INPUT}: see the download link at the top of this script`);
  process.exit(1);
}

const sein = new Set();
let verbs = 0;
for await (const line of createInterface({ input: createReadStream(INPUT) })) {
  if (!line) continue;
  const v = JSON.parse(line);
  if (v.lang_code !== "de" || v.pos !== "verb" || !/^[a-zäöüß]+$/.test(v.word)) continue;
  verbs++;
  const aux = (v.forms ?? []).filter((f) => f.tags?.includes("auxiliary")).map((f) => f.form);
  if (aux.some((a) => /\bsein\b/.test(a))) sein.add(v.word);
}
if (sein.size < 100) {
  console.error(`only ${sein.size} sein verbs found: is ${INPUT} the kaikki German verbs file?`);
  process.exit(1);
}
writeFileSync(OUTPUT, [...sein].sort((a, b) => a.localeCompare(b, "de")).join("\n") + "\n");
console.log(`${verbs} verbs → ${sein.size} make their Perfekt with sein → ${OUTPUT}`);
