// Step 5 helpers: give a sentence its grammar labels, from spaCy's analysis.
// A sentence can have many labels ("mit+Dativ", "weil-Nebensatz", "Präteritum").
// Each preposition phrase is also cut out into slots (preposition, article,
// adjectives, noun), the start of a "map" the engine can fill later.

import { readFileSync } from "node:fs";

const CASES = { Nom: "Nominativ", Acc: "Akkusativ", Dat: "Dativ", Gen: "Genitiv" };
// The cases each preposition takes (standard German). If the parser says
// another case, or the preposition is not in this list, the phrase is not
// trusted: a wrong label teaches wrong German.
const DAT = ["Dat"], ACC = ["Acc"], GEN = ["Gen"], WECHSEL = ["Acc", "Dat"];
export const PREP_CASES = {
  mit: DAT, aus: DAT, bei: DAT, nach: DAT, seit: DAT, von: DAT, zu: DAT, gegenüber: DAT, ab: DAT, außer: DAT,
  entgegen: DAT, gemäß: DAT, samt: DAT, zufolge: DAT, dank: ["Dat", "Gen"],
  durch: ACC, für: ACC, gegen: ACC, ohne: ACC, um: ACC, bis: ACC, wider: ACC, pro: ACC,
  an: WECHSEL, auf: WECHSEL, hinter: WECHSEL, in: WECHSEL, neben: WECHSEL, über: WECHSEL, unter: WECHSEL,
  vor: WECHSEL, zwischen: WECHSEL,
  statt: GEN, anstatt: GEN, trotz: GEN, während: GEN, wegen: GEN, innerhalb: GEN, außerhalb: GEN,
  aufgrund: GEN, oberhalb: GEN, unterhalb: GEN, mithilfe: GEN, laut: ["Gen", "Dat"],
};
const OLD_SPELLING = { daß: "dass" };
const MODALS = new Set(["können", "müssen", "dürfen", "sollen", "wollen", "mögen", "möchten"]);
// Verbs with "sein" in the Perfekt (gehen → ist gegangen), from Wiktionary:
// built by scripts/build-sein-verbs.mjs.
const SEIN_VERBS = new Set(readFileSync(new URL("../sein-verbs.txt", import.meta.url), "utf8").split("\n").filter(Boolean));

/** Labels and phrases for one analysed sentence ({ text, words, commas, tokens }). */
export function labelSentence(s) {
  const toks = s.tokens;
  const labels = new Set();
  const phrases = [];
  const childrenOf = (t) => toks.filter((c) => c.head === t.i && c.i !== t.i);

  for (const t of toks) {
    // Prepositions: "mit" + Dativ, "in" + Akkusativ or Dativ…
    if (t.tag === "APPR" || t.tag === "APPRART") {
      const p = phrase(t, toks, childrenOf);
      if (p) {
        phrases.push(p);
        labels.add(p.ok ? `${p.prep}+${CASES[p.case]}` : `${p.prep}+?`);
      }
    }
    // Nebensätze: weil, dass, wenn, als, ob…
    if (t.tag === "KOUS") {
      const word = t.text.toLowerCase();
      labels.add(`${OLD_SPELLING[word] ?? word}-Nebensatz`);
    }
    if (t.tag === "PRELS") labels.add("Relativsatz");
    // A modal verb with its infinitive ("Ich kann schwimmen"), not "Ich mag Mathe".
    if (MODALS.has(t.lemma) && t.tag.endsWith("FIN") && childrenOf(t).some((c) => c.tag.endsWith("INF"))) labels.add("Modalverb");
    if (t.morph.Mood === "Imp") labels.add("Imperativ");
    if (t.dep === "oa" && t.morph.Case === "Acc") labels.add("Akkusativ-Objekt");
    if (t.dep === "da" && t.morph.Case === "Dat") labels.add("Dativ-Objekt");

    const finite = t.tag === "VVFIN" || t.tag === "VMFIN" || t.tag === "VAFIN";
    // haben/sein with a participle ("hat gesagt", "ist gegangen"), or undefined.
    const participle = t.lemma === "haben" || t.lemma === "sein" ? childrenOf(t).find((c) => c.dep === "oc" && c.tag === "VVPP") : undefined;
    // The parser did not know the verb: its "dictionary form" is the word itself,
    // capitalised ("Lass es mich wissen" → lemma "Lass", guessed Präteritum). No tense then.
    if (finite && t.lemma === t.text && /^[A-ZÄÖÜ]/.test(t.lemma)) continue;

    // Konjunktiv (Mood=Sub) first: "hätte" and "käme" look like Präteritum to the tense.
    if (finite && t.morph.Mood === "Sub") {
      if (t.morph.Tense === "Pres") {
        // er sei, er habe, sie solle. With ich/du/wir… it looks like the normal
        // present ("dass ich komme"), so only er/sie/es forms count.
        // The parser is not sure about the person, so check the subject too,
        // and the form (er komme, er habe, er sei). "Bitte sei leise" has no subject.
        const subject = childrenOf(t).find((c) => c.dep === "sb");
        const thirdPerson = subject && !["ich", "du", "wir", "ihr"].includes(subject.text.toLowerCase());
        if (thirdPerson && t.morph.Number === "Sing" && (/e$/.test(t.text) || t.text === "sei")) labels.add("Konjunktiv-I");
      } else if (participle) labels.add("Konjunktiv-II-Vergangenheit"); // hätte gesagt, wäre gegangen
      else labels.add("Konjunktiv-II"); // hätte, wäre, könnte, würde, käme
      continue;
    }

    // Tenses. haben/sein + Partizip = Perfekt (present) or Plusquamperfekt (past).
    // But sein + participle of a "haben" verb is a state, not a tense:
    // "Die Tür ist geöffnet" (öffnen → hat geöffnet). Only sein verbs count.
    if (t.tag === "VAFIN" && participle && t.lemma === "sein" && !SEIN_VERBS.has(participle.lemma)) {
      labels.add("Zustand-sein+Partizip");
    } else if (t.tag === "VAFIN" && (t.lemma === "haben" || t.lemma === "sein")) {
      if (participle && t.morph.Tense === "Past") labels.add("Plusquamperfekt");
      else if (participle) labels.add("Perfekt").add(`Perfekt-${t.lemma}`);
      else if (t.morph.Tense === "Past") labels.add("Präteritum").add("Präteritum-sein/haben/Modal");
      else if (t.morph.Tense) labels.add("Präsens");
    } else if (finite) {
      if (t.morph.Tense === "Past") {
        labels.add("Präteritum");
        // By the verb itself: the parser sometimes tags "sollte" as a full verb.
        if (MODALS.has(t.lemma) || t.lemma === "haben" || t.lemma === "sein") labels.add("Präteritum-sein/haben/Modal");
        else if (t.tag === "VVFIN") labels.add(isRegularPast(t.text, t.lemma) ? "Präteritum-regelmäßig" : "Präteritum-unregelmäßig");
      }
      if (t.morph.Tense === "Pres") labels.add("Präsens");
    }
  }
  if (/\?[«»"”“']*$/.test(s.text)) labels.add("Frage");
  // A Nebensatz first: "Wenn ich Zeit habe, komme ich."
  if (toks.find((t) => t.pos !== "PUNCT")?.tag === "KOUS") labels.add("Nebensatz-vorne");

  const length = s.words <= 8 && s.commas === 0 ? "short" : s.words <= 15 ? "medium" : "long";
  return { labels: [...labels].sort(), length, phrases };
}

/**
 * Regular Präteritum: the stem of the verb + -te (machen → machte, arbeiten → arbeitete).
 * Irregular ones change the stem (gehen → ging, denken → dachte, bringen → brachte).
 */
export function isRegularPast(form, lemma) {
  const stem = lemma.toLowerCase().replace(/e?n$/, "");
  const f = form.toLowerCase();
  return stem.length > 0 && f.startsWith(stem) && /^e?te(st|n|t)?$/.test(f.slice(stem.length));
}

/**
 * A preposition and the words that belong to it, as slots:
 * "mit seiner schönen Tochter" → mit | Possessiv seiner | Adjektiv schönen | Nomen Tochter.
 * ok = the case is clear and right for the preposition, and the phrase is a
 * simple one (only article, adjectives, noun), so it can become a map.
 */
function phrase(prep, toks, childrenOf) {
  const lemma = prep.lemma.toLowerCase();
  const head = childrenOf(prep).find((c) => ["NOUN", "PROPN", "PRON"].includes(c.pos) && c.i > prep.i);
  if (!head) return null; // "mit" as an adverb or the parser found no noun

  const slots = [{ role: prep.tag === "APPRART" ? "prepart" : "prep", text: prep.text, lemma, ...morphOf(prep) }];
  let simple = true;
  for (let i = prep.i + 1; i <= head.i; i++) {
    const t = toks[i];
    const role = roleOf(t);
    const belongs = t.i === head.i || (t.head === head.i && t.dep === "nk");
    if (!role || !belongs) simple = false;
    slots.push({ role: role ?? t.pos, text: t.text, lemma: t.lemma, ...morphOf(t) });
  }

  // The case: from the noun, or from the contraction itself ("zum" knows it is Dativ).
  const kase = head.morph.Case ?? prep.morph.Case;
  const ok = simple && !!PREP_CASES[lemma]?.includes(kase);
  return {
    prep: lemma,
    case: kase ?? null,
    ok,
    pattern: slots.map((s) => ROLE_NAMES[s.role] ?? s.role).join(" + "),
    text: slots.map((s) => s.text).join(" "),
    from: prep.i,
    to: head.i,
    slots,
  };
}

const ROLE_NAMES = {
  prep: "Präposition", prepart: "Präposition+Artikel", def: "bestimmter Artikel", indef: "unbestimmter Artikel",
  poss: "Possessiv", dem: "Demonstrativ", quant: "kein/jeder/alle", adj: "Adjektiv", num: "Zahl", noun: "Nomen",
  name: "Name", pron: "Pronomen",
};

function roleOf(t) {
  if (t.tag === "ART") return t.morph.Definite === "Ind" ? "indef" : "def";
  if (t.tag === "PPOSAT") return "poss";
  if (t.tag === "PDAT") return "dem";
  if (t.tag === "PIAT" || t.tag === "PIDAT") return "quant";
  if (t.tag === "ADJA") return "adj";
  if (t.tag === "CARD") return "num";
  if (t.pos === "NOUN") return "noun";
  if (t.pos === "PROPN") return "name";
  if (t.pos === "PRON") return "pron";
  return null;
}

function morphOf(t) {
  const m = {};
  if (t.morph.Case) m.case = t.morph.Case;
  if (t.morph.Gender) m.gender = t.morph.Gender;
  if (t.morph.Number) m.number = t.morph.Number;
  return m;
}
