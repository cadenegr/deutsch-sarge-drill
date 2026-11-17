// The gap of a sentence for each grammar map rule: which word (or words)
// the learner types, so every baseline sentence can be a drill.
//   "Wir sind mit ___ Zug abgefahren."             3.2  → dem
//   "Gestern ___ (gehen) ich ins Kino."            6.6  → ging
//   "Ich bleibe zu Hause, weil ___ (bin / ich / krank)."  8.7  → ich krank bin
//
// A gap is only made when the answer checks out against the tables of
// German (article endings, contractions, relative pronouns). The parser
// makes mistakes; a wrong gap would teach wrong German, so then there is
// none. Run on step 4's tokens and step 5's labels of the same sentence.
//
// A gap: { r: rule, at, len (where the answer is in the text), a: answer,
// h: hint shown next to the blank, plus what the explanation needs:
// c case, g gender (m f n p), w the word that decides (preposition, verb,
// conjunction), l dictionary form, p participle, n the noun a relative
// clause belongs to, v the conjugated verb, t tense, k variant }.

import { MODALS, SEIN_VERBS, isRegularPast } from "./label.mjs";

const G = { Masc: "m", Fem: "f", Neut: "n" };
const C = { Nom: "Nom", Acc: "Acc", Dat: "Dat", Gen: "Gen" };

export const DEF = {
  Nom: { m: "der", f: "die", n: "das", p: "die" },
  Acc: { m: "den", f: "die", n: "das", p: "die" },
  Dat: { m: "dem", f: "der", n: "dem", p: "den" },
  Gen: { m: "des", f: "der", n: "des", p: "der" },
};
// ein, kein, mein, dein… take these endings.
export const EIN = {
  Nom: { m: "", f: "e", n: "", p: "e" },
  Acc: { m: "en", f: "e", n: "", p: "e" },
  Dat: { m: "em", f: "er", n: "em", p: "en" },
  Gen: { m: "es", f: "er", n: "es", p: "er" },
};
export const REL = {
  Nom: { m: "der", f: "die", n: "das", p: "die" },
  Acc: { m: "den", f: "die", n: "das", p: "die" },
  Dat: { m: "dem", f: "der", n: "dem", p: "denen" },
  Gen: { m: "dessen", f: "deren", n: "dessen", p: "deren" },
};
const POSS = ["mein", "dein", "sein", "ihr", "unser", "euer"];
export const CONTRACTIONS = {
  zum: ["zu", "dem"], zur: ["zu", "der"], im: ["in", "dem"], ins: ["in", "das"], am: ["an", "dem"],
  ans: ["an", "das"], vom: ["von", "dem"], beim: ["bei", "dem"], aufs: ["auf", "das"],
};
const NOM_PRONOUN = { mir: "ich", dir: "du", ihm: "er / es", ihr: "sie", uns: "wir", euch: "ihr", ihnen: "sie / Sie" };
const SUBORDINATORS = ["weil", "dass", "wenn", "ob", "als", "obwohl", "damit", "nachdem", "bevor", "während", "bis", "seit", "seitdem", "sobald", "falls"];
const PREPS = {
  "3.1": ["durch", "für", "gegen", "ohne", "um", "bis"],
  "3.2": ["aus", "bei", "mit", "nach", "seit", "von", "zu", "gegenüber"],
  "3.3": ["in", "an", "auf", "über", "unter", "vor", "hinter", "neben", "zwischen"],
  "3.8": ["wegen", "trotz", "während", "statt", "anstatt"],
};
const MAX_ORDER_WORDS = 5;
const HABEN_SEIN = "haben / sein";

const isFinite = (t) => /^V[VAM]FIN$/.test(t.tag);
const isPunct = (t) => t.pos === "PUNCT";
// The parser did not know the word: its "dictionary form" is the word itself, capitalised.
const unknownVerb = (t) => t.lemma === t.text && /^[A-ZÄÖÜ]/.test(t.lemma);
const genderOf = (morph) => (morph.Number === "Plur" ? "p" : G[morph.Gender]);

/** The article a determiner should have, or undefined if it is not one we check. */
export function expectedDeterminer(role, lemma, kase, gender) {
  if (!DEF[kase] || !gender) return undefined;
  if (role === "def") return DEF[kase][gender];
  const stem = role === "indef" ? "ein" : role === "quant" && lemma.toLowerCase() === "kein" ? "kein" : role === "poss" ? lemma.toLowerCase() : undefined;
  if (!stem || (role === "poss" && !POSS.includes(stem)) || (stem === "ein" && gender === "p")) return undefined;
  const ending = EIN[kase][gender];
  return (stem === "euer" && ending ? "eur" : stem) + ending;
}

/** All gaps of one sentence: { [rule]: gap }. */
export function gapsOf(analysed, labelled) {
  const text = analysed.text;
  const toks = analysed.tokens;
  // Where each token starts in the text.
  const starts = [];
  let cursor = 0;
  for (const t of toks) {
    const at = text.indexOf(t.text, cursor);
    if (at < 0) return {};
    starts.push(at);
    cursor = at + t.text.length;
  }
  const span = (from, to) => ({ at: starts[from], len: starts[to] + toks[to].text.length - starts[from] });
  const word = (i) => span(i, i);
  const childrenOf = (t) => toks.filter((c) => c.head === t.i && c.i !== t.i);
  const participleOf = (t) => childrenOf(t).find((c) => c.dep === "oc" && c.tag === "VVPP");

  const gaps = {};
  const finders = {
    "1.7": () => articleGap((p) => p.case === "Dat", (d) => d.role === "def"),
    "1.8": () => articleGap((p) => p.case === "Dat", (d) => d.role === "indef" || d.role === "quant"),
    "1.9": () => articleGap((p) => p.case === "Dat", (d, g) => d.role === "def" && g === "p"),
    "1.10": () => articleGap(() => true, (d) => d.role === "poss"),
    "3.1": () => articleGap((p) => PREPS["3.1"].includes(p.prep) && p.case === "Acc"),
    "3.2": () => articleGap((p) => PREPS["3.2"].includes(p.prep) && p.case === "Dat"),
    "3.3": () => articleGap((p) => PREPS["3.3"].includes(p.prep) && (p.case === "Acc" || p.case === "Dat")),
    "3.8": () => articleGap((p) => PREPS["3.8"].includes(p.prep) && p.case === "Gen"),
    "3.4": contractionGap,
    "5.4": () => verbGap((t) => MODALS.has(t.lemma) && isFinite(t) && t.morph.Mood !== "Sub" && childrenOf(t).some((c) => c.tag.endsWith("INF"))),
    "5.7": () => verbGap((t) => t.morph.Mood === "Imp"),
    "6.4": () => verbGap((t) => isFinite(t) && t.morph.Tense === "Past" && t.morph.Mood === "Ind" && !participleOf(t) && (MODALS.has(t.lemma) || t.lemma === "haben" || t.lemma === "sein")),
    "6.5": () => verbGap((t) => t.tag === "VVFIN" && t.morph.Tense === "Past" && t.morph.Mood === "Ind" && !MODALS.has(t.lemma) && isRegularPast(t.text, t.lemma)),
    "6.6": () => verbGap((t) => t.tag === "VVFIN" && t.morph.Tense === "Past" && t.morph.Mood === "Ind" && !MODALS.has(t.lemma) && !isRegularPast(t.text, t.lemma)),
    "7.2": () => verbGap((t) => isFinite(t) && t.morph.Mood === "Sub" && t.morph.Tense === "Past" && !participleOf(t)),
    "6.1": perfektHaben,
    "6.2": () => auxGap((t, p) => t.lemma === "sein" && t.morph.Tense === "Pres" && t.morph.Mood === "Ind" && SEIN_VERBS.has(p.lemma)),
    "6.7": () => auxGap((t, p) => t.morph.Tense === "Past" && t.morph.Mood === "Ind" && (t.lemma === "haben" || SEIN_VERBS.has(p.lemma))),
    "7.3": () => auxGap((t, p) => t.morph.Mood === "Sub" && (t.lemma === "haben" || SEIN_VERBS.has(p.lemma))),
    "5.9": dativObject,
    "5.10": dativObject,
    "2.6": relativePronoun,
    "9.3": alsWenn,
    "8.3": question,
    "8.7": () => clauseOrder((t) => t.tag === "KOUS" && SUBORDINATORS.includes(t.text.toLowerCase()), "w"),
    "8.14": () => clauseOrder((t) => t.tag === "PRELS", "rel"),
    "8.8": mainAfterClause,
  };
  for (const rule of labelled.rules ?? []) {
    const gap = finders[rule]?.();
    if (gap) gaps[rule] = { r: rule, ...gap };
  }
  return gaps;

  // --- Articles in preposition phrases ---

  function articleGap(phraseOk, detOk = () => true) {
    for (const p of labelled.phrases ?? []) {
      if (!p.ok || p.slots[0].role !== "prep" || p.slots.length < 3 || !phraseOk(p)) continue;
      const det = p.slots[1];
      const noun = p.slots.at(-1);
      if (noun.role !== "noun") continue;
      const g = noun.number === "Plur" ? "p" : G[noun.gender];
      if (!detOk(det, g)) continue;
      const expected = expectedDeterminer(det.role, det.lemma, p.case, g);
      if (!expected || expected !== det.text.toLowerCase()) continue;
      const i = p.from + 1;
      if (toks[i]?.text !== det.text) continue;
      return { ...word(i), a: det.text, h: det.role === "def" ? "" : det.role === "indef" ? "ein" : det.role === "quant" ? "kein" : det.lemma.toLowerCase(), c: p.case, g, w: p.prep, l: noun.lemma };
    }
    return undefined;
  }

  function contractionGap() {
    for (const p of labelled.phrases ?? []) {
      const first = p.slots[0];
      const noun = p.slots.at(-1);
      if (!p.ok || first.role !== "prepart" || noun.role !== "noun") continue;
      const parts = CONTRACTIONS[first.text.toLowerCase()];
      const g = noun.number === "Plur" ? "p" : G[noun.gender];
      if (!parts || !g || DEF[p.case]?.[g] !== parts[1]) continue;
      return { ...word(p.from), a: first.text, h: `${parts[0]} + ${parts[1]}`, c: p.case, g, w: parts[0], l: noun.lemma };
    }
    return undefined;
  }

  // --- Verbs ---

  function verbGap(test) {
    const t = toks.find((x) => test(x) && !unknownVerb(x) && /^\p{Ll}+$/u.test(x.lemma));
    return t && { ...word(t.i), a: t.text, h: t.lemma, l: t.lemma };
  }

  function perfektHaben() {
    for (const t of toks) {
      if (t.tag !== "VAFIN" || t.lemma !== "haben" || t.morph.Tense !== "Pres" || t.morph.Mood !== "Ind") continue;
      const p = participleOf(t);
      if (p && /^\p{Ll}+$/u.test(p.lemma) && p.lemma !== p.text) return { ...word(p.i), a: p.text, h: p.lemma, l: p.lemma, v: t.text };
    }
    return undefined;
  }

  // haben or sein before a participle: the learner chooses and conjugates.
  function auxGap(test) {
    for (const t of toks) {
      if (t.tag !== "VAFIN" || (t.lemma !== "haben" && t.lemma !== "sein")) continue;
      const p = participleOf(t);
      if (p && test(t, p)) return { ...word(t.i), a: t.text, h: HABEN_SEIN, l: p.lemma, p: p.text, w: t.lemma };
    }
    return undefined;
  }

  // --- Cases of objects and pronouns ---

  function dativObject() {
    for (const t of toks) {
      if (t.dep !== "da" || t.morph.Case !== "Dat") continue;
      const verb = toks[t.head];
      if (!verb || !verb.pos.startsWith("VERB") && !verb.pos.startsWith("AUX")) continue;
      if (t.tag === "PPER") {
        const nom = NOM_PRONOUN[t.text.toLowerCase()];
        if (nom) return { ...word(t.i), a: t.text, h: nom, c: "Dat", w: verb.lemma, k: "pron" };
      }
      if (t.pos === "NOUN") {
        const art = childrenOf(t).find((c) => c.tag === "ART" && c.i < t.i);
        const g = genderOf(t.morph);
        const role = art?.morph.Definite === "Ind" ? "indef" : "def";
        if (art && expectedDeterminer(role, art.lemma, "Dat", g) === art.text.toLowerCase()) {
          return { ...word(art.i), a: art.text, h: role === "indef" ? "ein" : "", c: "Dat", g, w: verb.lemma, l: t.lemma, k: "art" };
        }
      }
    }
    return undefined;
  }

  function relativePronoun() {
    for (const t of toks) {
      if (t.tag !== "PRELS" || !C[t.morph.Case]) continue;
      const verb = toks[t.head];
      const noun = verb?.dep === "rc" ? toks[verb.head] : undefined;
      if (!noun || !["NOUN", "PROPN"].includes(noun.pos)) continue;
      const g = genderOf(noun.morph);
      if (!g || REL[t.morph.Case][g] !== t.text.toLowerCase()) continue;
      return { ...word(t.i), a: t.text, h: "", c: t.morph.Case, g, n: noun.text };
    }
    return undefined;
  }

  function alsWenn() {
    const t = toks.find((x) => x.tag === "KOUS" && ["als", "wenn"].includes(x.text.toLowerCase()));
    const verb = t && toks[t.head];
    if (!verb || !isFinite(verb)) return undefined;
    const past = verb.morph.Tense === "Past";
    // "als" is for one time in the past: a present-tense verb means another als.
    if (t.text.toLowerCase() === "als" && !past) return undefined;
    return { ...word(t.i), a: t.text, h: "als / wenn / wann", w: t.text.toLowerCase(), t: past ? "past" : "pres" };
  }

  // --- Word order: the learner puts the words back in order ---

  function order(from, to, extra) {
    const n = to - from + 1;
    if (n < 2 || n > MAX_ORDER_WORDS) return undefined;
    for (let i = from; i <= to; i++) if (isPunct(toks[i])) return undefined;
    const words = toks.slice(from, to + 1).map((t, i) => (i === 0 && from === 0 && !["NOUN", "PROPN"].includes(t.pos) && t.text !== "Sie" ? t.text.toLowerCase() : t.text));
    const mixed = [...words].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase(), "de"));
    if (mixed.join(" ") === words.join(" ")) mixed.reverse();
    if (mixed.join(" ") === words.join(" ")) return undefined;
    const { at, len } = span(from, to);
    return { at, len, a: text.slice(at, at + len), h: mixed.join(" / "), ...extra };
  }

  // The words after a conjunction or relative pronoun, up to the comma or the end.
  function clauseOrder(starter, k) {
    for (const t of toks) {
      if (!starter(t)) continue;
      let end = t.i + 1;
      while (end < toks.length && !isPunct(toks[end])) end++;
      const last = toks[end - 1];
      if (!last || !isFinite(last) || end - 1 <= t.i) continue;
      return order(t.i + 1, end - 1, { w: t.text.toLowerCase(), v: last.text, k });
    }
    return undefined;
  }

  // "Wenn ich Zeit habe, ___ (ich / komme)." → komme ich
  function mainAfterClause() {
    if (toks.find((t) => !isPunct(t))?.tag !== "KOUS") return undefined;
    const comma = toks.findIndex((t) => t.text === ",");
    if (comma < 0) return undefined;
    let end = comma + 1;
    while (end < toks.length && !isPunct(toks[end])) end++;
    if (end !== toks.length - 1 || !isFinite(toks[comma + 1] ?? {})) return undefined;
    return order(comma + 1, end - 1, { v: toks[comma + 1].text });
  }

  function question() {
    const last = toks.length - 1;
    if (toks[last]?.text !== "?" || toks.slice(0, last).some(isPunct)) return undefined;
    const first = toks[0];
    const w = first.tag.startsWith("PW");
    if (!w && !isFinite(first)) return undefined;
    const verb = w ? toks.find(isFinite) : first;
    if (!verb) return undefined;
    return order(0, last - 1, { k: w ? "w" : "yn", v: verb.text, w: w ? first.text : "" });
  }
}
