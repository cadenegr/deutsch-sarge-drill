// Builds src/data/verbs.json: the present tense of the verbs the sentence
// drills use, from Wiktionary (via kaikki.org, CC BY-SA):
//   https://kaikki.org/dictionary/German/pos-verb/kaikki.org-dictionary-German-by-pos-verb.jsonl
// saved as .cache/verbs.jsonl.
//
// A separable verb keeps its two parts: einladen → ["lade", "ein"].
// A test checks that every verb a drill uses is in the file.
//
// Run: node scripts/build-verbs.mjs

import { createReadStream, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

const VERBS = `
  anrufen antworten arbeiten besuchen bestellen bezahlen brauchen danken einladen finden fragen
  füttern geben gehen glauben gratulieren haben helfen kaufen kennen kommen nehmen
  probieren schreiben sehen sein spielen sprechen suchen treffen verkaufen verstehen vertrauen
  wohnen zeigen zuhören
`.trim().split(/\s+/);

const PERSONS = {
  "1s": ["first-person", "singular"],
  "2s": ["second-person", "singular"],
  "3s": ["third-person", "singular"],
  "1p": ["first-person", "plural"],
  "2p": ["second-person", "plural"],
  "3p": ["third-person", "plural"],
};
// Forms with these tags are not the plain present: "frägst" (colloquial),
// "einlade" (only at the end of a subordinate clause).
const NOT_PLAIN = ["colloquial", "subordinate-clause", "dialectal", "archaic", "obsolete", "rare", "nonstandard"];

const wanted = new Set(VERBS);
const verbs = {};
const lines = createInterface({ input: createReadStream(".cache/verbs.jsonl") });

for await (const line of lines) {
  const entry = JSON.parse(line);
  if (!wanted.has(entry.word) || verbs[entry.word]) continue;

  const forms = {};
  for (const [person, tags] of Object.entries(PERSONS)) {
    const form = entry.forms?.find(
      (f) =>
        f.tags?.includes("present") &&
        f.tags.includes("indicative") &&
        tags.every((tag) => f.tags.includes(tag)) &&
        !f.tags.some((tag) => NOT_PLAIN.includes(tag)),
    );
    if (form) forms[person] = form.form.split(" ");
  }
  if (Object.keys(forms).length === Object.keys(PERSONS).length) verbs[entry.word] = forms;
}

const missing = VERBS.filter((verb) => !verbs[verb]);
if (missing.length) throw new Error(`No present tense found for: ${missing.join(", ")}`);

writeFileSync("src/data/verbs.json", JSON.stringify(verbs, null, 1) + "\n");
console.log(`${Object.keys(verbs).length} verbs written to src/data/verbs.json`);
