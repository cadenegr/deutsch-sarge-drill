// Step 6 helpers: a "mit + article + noun" sample → a map for the engine,
// and the engine's numbers → words again.
//
// Cells (each holds a number 0–31):
//   0 article         which word of DATIV_ARTICLES
//   1 2 3 noun        which noun form: 1024·c1 + 32·c2 + c3 (up to 32,768 forms)
//   4 gender/number   0 masculine, 1 feminine, 2 neuter, 3 plural
//   5 noun group      0 none, 1 person, 2 animal, 3 food, 4 thing, 5 place
// Groups:
//   rule   (0, 4)           after "mit": Dativ, the article agrees with the noun
//   words  (1, 2, 3, 4, 5)  every noun form we know, with its gender/number and group
//   text   (0, 1, 2, 3)     find mode only: every "mit + article + noun" line of the texts

export const GN = { m: 0, f: 1, n: 2, pl: 3 };
export const GROUPS = ["", "person", "animal", "food", "thing", "place"];

// Every article word after "mit" (Dativ), and which gender/number it fits.
const SETS = [
  // [masculine/neuter, feminine, plural]
  ["dem", "der", "den"],
  ["einem", "einer", null],
  ["keinem", "keiner", "keinen"],
  ["meinem", "meiner", "meinen"],
  ["deinem", "deiner", "deinen"],
  ["seinem", "seiner", "seinen"],
  ["ihrem", "ihrer", "ihren"],
  ["unserem", "unserer", "unseren"],
  ["eurem", "eurer", "euren"],
  ["diesem", "dieser", "diesen"],
  ["jedem", "jeder", null],
];
export const DATIV_ARTICLES = SETS.flat().filter(Boolean);
/** [article index, gender/number] pairs the Dativ allows. */
export const DATIV_RULE = SETS.flatMap(([mn, f, pl]) => [
  [DATIV_ARTICLES.indexOf(mn), GN.m],
  [DATIV_ARTICLES.indexOf(mn), GN.n],
  [DATIV_ARTICLES.indexOf(f), GN.f],
  ...(pl ? [[DATIV_ARTICLES.indexOf(pl), GN.pl]] : []),
]);

/** The app's rule (src/drills/cases.ts): Kinder → Kindern, but Autos, Frauen stay. */
export const dativePlural = (plural) => (/[ns]$/.test(plural) ? plural : plural + "n");

/** Every Dativ noun form from src/data/nouns.json: { form, noun, gn, group }. */
export function buildLexicon(nouns) {
  const forms = [];
  for (const n of nouns) {
    const group = Math.max(0, GROUPS.indexOf(n.group ?? ""));
    forms.push({ form: n.dat ?? n.word, noun: n.word, gn: GN[n.gender], group });
    if (n.plurals?.[0]) forms.push({ form: dativePlural(n.plurals[0]), noun: n.word, gn: GN.pl, group });
  }
  if (forms.length > 32768) throw new Error("more than 32,768 noun forms: the noun needs a fourth cell");
  return forms;
}

const split = (i) => [i >> 10, (i >> 5) & 31, i & 31];
const join = (a, b, c) => (a << 10) | (b << 5) | c;

/** Finds "mit + article + noun" in a sample sentence. */
export function parseSample(sentence, lexicon) {
  const m = sentence.match(/\b([Mm]it)\s+(\p{L}+)\s+(\p{L}+)/u);
  if (!m) return null;
  const article = DATIV_ARTICLES.indexOf(m[2].toLowerCase());
  const nouns = lexicon.flatMap((f, i) => (f.form === m[3] ? [i] : []));
  if (article < 0 || nouns.length === 0) return null;
  return { before: sentence.slice(0, m.index), after: sentence.slice(m.index + m[0].length), mit: m[1], article, nouns };
}

/**
 * The map text for the engine.
 * open: "article" (the noun stays), "noun" (the article stays), "both", or "none" (exactly the sample).
 * lines: find mode, [{ article, noun }] tuples from the texts; null = create mode.
 * sameGroup: in create mode, only nouns of the sample's group (a bus → other things).
 */
export function buildMap({ lexicon, sample, open, lines, sameGroup = true }) {
  const out = ["# mit + article + noun (deutsch-sarge-drill, scripts/pipeline/6-engine.mjs)", "cells 6"];
  if (open === "noun" || open === "none") out.push(`domain 0 ${sample.article}`);
  if (open === "article" || open === "none") {
    // The sample's noun: fix its three number cells (it may have several forms with the same spelling).
    for (let c = 0; c < 3; c++) out.push(`domain ${c + 1} ${[...new Set(sample.nouns.map((i) => split(i)[c]))].join(" ")}`);
  }
  if (sameGroup && open !== "article" && !lines) {
    const group = lexicon[sample.nouns[0]].group;
    if (group) out.push(`domain 5 ${group}`);
  }
  out.push("group 0 4", ...DATIV_RULE.map(([a, gn]) => `${a} ${gn}`), "end");
  out.push("group 1 2 3 4 5", ...lexicon.map((f, i) => `${split(i).join(" ")} ${f.gn} ${f.group}`), "end");
  if (lines) out.push("group 0 1 2 3", ...lines.map((l) => `${l.article} ${split(l.noun).join(" ")}`), "end");
  return out.join("\n") + "\n";
}

/** The engine's output → [{ article, noun }] (indexes into DATIV_ARTICLES and the lexicon). */
export function readSolutions(stdout) {
  const [head, ...rows] = stdout.trim().split("\n");
  const n = Number(head.match(/^solutions (\d+)$/)?.[1]);
  if (!Number.isInteger(n) || rows.length !== n) throw new Error(`engine output not understood: ${head}`);
  return rows.map((r) => {
    const v = r.split(" ").map(Number);
    if (v.length !== 6) throw new Error(`engine solution has ${v.length} cells, not 6`);
    return { article: v[0], noun: join(v[1], v[2], v[3]) };
  });
}
