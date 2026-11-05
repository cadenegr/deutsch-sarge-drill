// A review sheet for German teachers: do the baseline sentences really show
// their grammar rule? 4 sentences per rule, as a CSV for Excel/LibreOffice
// (German Excel: ";" between columns, UTF-8 with BOM). The choice is fixed
// (a hash of the text), so two teachers get the same sheet.
//
// Make the sheet:   node scripts/make-review-sheet.mjs
//                   → temp/review/pruefliste.csv
// Count a filled one: node scripts/make-review-sheet.mjs <filled.csv>
//                   → how many "ja" per rule, and in total

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const PER_RULE = 4;
const OUTPUT = "temp/review/pruefliste.csv";

// Short German names for the teachers (the map's titles are in English).
const NAMES = {
  "1.7": "Dativ mit bestimmtem Artikel (dem, der, den)",
  "1.8": "Dativ mit einem / einer / keinem",
  "1.9": "Dativ Plural: den + Nomen mit -n",
  "1.10": "Possessivartikel (mein, dein, sein …)",
  "2.6": "Relativpronomen",
  "3.1": "Präposition mit Akkusativ (durch, für, gegen, ohne, um, bis)",
  "3.2": "Präposition mit Dativ (aus, bei, mit, nach, seit, von, zu)",
  "3.3": "Wechselpräposition (in, an, auf … + Akk. oder Dat.)",
  "3.4": "Präposition + Artikel verschmolzen (im, zum, ins …)",
  "3.8": "Präposition mit Genitiv (wegen, trotz, während, statt)",
  "5.4": "Modalverb + Infinitiv",
  "5.7": "Imperativ",
  "5.9": "Verb mit Dativobjekt",
  "5.10": "Verb mit Dativ- und Akkusativobjekt",
  "6.1": "Perfekt mit haben",
  "6.2": "Perfekt mit sein",
  "6.4": "Präteritum von sein, haben, Modalverben",
  "6.5": "Präteritum, regelmäßige Verben",
  "6.6": "Präteritum, unregelmäßige Verben",
  "6.7": "Plusquamperfekt",
  "7.2": "Konjunktiv II Gegenwart (hätte, wäre, würde, könnte …)",
  "7.3": "Konjunktiv II Vergangenheit (hätte gemacht, wäre gegangen)",
  "8.3": "Frage (W-Frage oder Ja/Nein-Frage)",
  "8.7": "Nebensatz: Verb am Ende (weil, dass, wenn, ob …)",
  "8.8": "Nebensatz am Anfang: Verb, Komma, Verb",
  "8.14": "Relativsatz: Verb am Ende",
  "9.3": "als / wenn",
};

const csvCell = (v) => `"${String(v).replace(/"/g, '""')}"`;

if (process.argv[2]) count(process.argv[2]);
else make();

function make() {
  const b = JSON.parse(readFileSync("src/data/baseline.json", "utf8"));
  const hash = (t) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 0x01000193) >>> 0;
    return h;
  };
  const rows = [];
  const used = new Set();
  b.rules.forEach((rule, i) => {
    if (!NAMES[rule.id]) throw new Error(`no German name for rule ${rule.id}: add it to NAMES`);
    const picks = b.sentences
      .filter((s) => s.rules.includes(i) && s.words <= 12 && !used.has(s.src))
      .sort((x, y) => hash(x.text + rule.id) - hash(y.text + rule.id))
      .slice(0, PER_RULE);
    for (const s of picks) {
      used.add(s.src);
      rows.push([rule.id, NAMES[rule.id], s.text, s.src]);
    }
  });
  // Mix the rows, so a teacher does not see one rule four times in a row.
  rows.sort((x, y) => hash(x[2]) - hash(y[2]));
  const header = ["Nr", "Regel", "Name der Regel", "Satz", "Zeigt der Satz diese Regel? (ja / nein)", "Kommentar", "Tatoeba-Nr"];
  const lines = [header, ...rows.map((r, n) => [n + 1, r[0], r[1], r[2], "", "", r[3]])].map((r) => r.map(csvCell).join(";"));
  mkdirSync("temp/review", { recursive: true });
  writeFileSync(OUTPUT, "﻿" + lines.join("\r\n") + "\r\n");
  console.log(`${rows.length} sentences, ${b.rules.length} rules → ${OUTPUT}`);
}

function count(file) {
  const rows = readFileSync(file, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter(Boolean).slice(1).map(parseRow);
  const byRule = new Map();
  let yes = 0, answered = 0;
  for (const r of rows) {
    const answer = (r[4] ?? "").trim().toLowerCase();
    if (!answer) continue;
    const ok = answer.startsWith("j") || answer === "yes" || answer === "x";
    const c = byRule.get(r[1]) ?? { yes: 0, n: 0, no: [] };
    c.n++;
    if (ok) c.yes++;
    else c.no.push(`${r[3]}${r[5] ? `  (${r[5]})` : ""}`);
    byRule.set(r[1], c);
    answered++;
    if (ok) yes++;
  }
  if (answered === 0) {
    console.error("no answers found in the column \"Zeigt der Satz diese Regel?\"");
    process.exit(1);
  }
  for (const [rule, c] of [...byRule].sort()) {
    console.log(`${rule.padEnd(5)} ${c.yes}/${c.n}`);
    for (const s of c.no) console.log(`        no: ${s}`);
  }
  console.log(`\ntotal: ${yes} of ${answered} correct (${Math.round((100 * yes) / answered)}%)`);
}

// One CSV row with ";" and quotes (as written above, or as Excel saves it).
function parseRow(line) {
  const sep = line.includes(";") ? ";" : ",";
  const cells = [];
  let cur = "", quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { cells.push(cur); cur = ""; }
    else cur += ch;
  }
  cells.push(cur);
  return cells;
}
