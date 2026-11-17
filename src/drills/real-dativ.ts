// Drill 5: real sentences for grammar map rule 3.2 (aus, bei, mit, nach,
// seit, von, zu, gegenüber always take the Dativ). The sentences come from
// the baseline (Tatoeba, see src/baseline.ts); this drill blanks the article
// after the preposition: "Wir sind mit ___ Zug abgefahren." → dem.
// Only phrases of the form preposition + der/die/das-article + noun, and
// only where the article fits the Dativ table, so a tagging error never
// becomes a wrong answer.

import { find, type Phrase, type Sentence } from "../baseline";
import { ARTICLES } from "./articles";
import { BLOCK_SIZE, DEFINITE, pick, shuffle, type Exercise, type Gender, type Order, type Translate } from "./exercise";
import { NOUNS } from "./nouns";

export const PREPOSITIONS = ["aus", "bei", "mit", "nach", "seit", "von", "zu", "gegenüber"];

export interface RealExercise extends Exercise {
  preposition: string;
  plural: boolean;
}

const GENDERS: Record<string, Gender> = { Masc: "m", Fem: "f", Neut: "n" };

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

// The exercise for one sentence, or undefined if it has no phrase this
// drill can use.
export function exerciseOf(sentence: Sentence): RealExercise | undefined {
  for (const phrase of sentence.phrases) {
    const exercise = fromPhrase(sentence, phrase);
    if (exercise) return exercise;
  }
  return undefined;
}

function fromPhrase(sentence: Sentence, phrase: Phrase): RealExercise | undefined {
  const [prep, article, noun] = phrase.slots;
  const preposition = prep?.[1].toLowerCase();
  if (phrase.slots.length !== 3 || !PREPOSITIONS.includes(preposition) || article[0] !== "def" || noun[0] !== "noun") return undefined;

  const plural = noun[5] === "Plur";
  const known = NOUNS.find((n) => n.word === noun[2]);
  const gender = known?.gender ?? GENDERS[noun[4]];
  if (!gender) return undefined;
  const answer = plural ? "den" : ARTICLES.Dativ[gender];
  if (article[1] !== answer) return undefined;

  // The text must read "prep article noun" where the phrase starts.
  const words = `${prep[1]} ${article[1]} ${noun[1]}`;
  if (sentence.text.slice(phrase.at, phrase.at + words.length) !== words) return undefined;
  const before = sentence.text.slice(0, phrase.at);
  const after = sentence.text.slice(phrase.at + words.length);

  return {
    noun: { word: noun[2], gender, en: known?.en ?? "", es: known?.es },
    shown: escapeHtml(noun[1]),
    text: `${escapeHtml(before)}${escapeHtml(prep[1])} {blank} {noun}${escapeHtml(after)}`,
    answer,
    color: plural ? "p" : gender,
    nounColor: plural ? "p" : gender,
    tatoeba: sentence.src,
    preposition,
    plural,
    explain: (t) => explain(preposition, noun[2], gender, plural, answer, t),
  };
}

function explain(preposition: string, lemma: string, gender: Gender, plural: boolean, answer: string, t: Translate): string[] {
  const why = t("explain.preposition", { word: preposition, case: "Dativ" });
  if (plural) return [why, t("real.plural", { noun: lemma })];
  const genderName = t(`gender.${gender}`);
  return [
    why,
    t("explain.gender", { noun: lemma, gender: genderName, article: DEFINITE[gender] }),
    t("explain.rule", { gender: genderName, case: "Dativ", answer }),
  ];
}

// Every usable baseline sentence, one exercise each.
export const EXERCISES: RealExercise[] = find({ rules: ["3.2"] })
  .map(exerciseOf)
  .filter((e): e is RealExercise => e !== undefined);

// "blocks": 5 in a row with the same preposition (mit, mit, mit…), then the
// next one. "mixed": any order.
export function makeDrill(order: Order, length: number, random: () => number = Math.random): RealExercise[] {
  if (order === "mixed") return shuffle(EXERCISES, random).slice(0, length);

  const byPrep = PREPOSITIONS.map((p) => shuffle(EXERCISES.filter((e) => e.preposition === p), random)).filter(
    (list) => list.length >= BLOCK_SIZE,
  );
  const drill: RealExercise[] = [];
  for (const list of shuffle(byPrep, random)) {
    drill.push(...list.slice(0, Math.min(BLOCK_SIZE, length - drill.length)));
    if (drill.length >= length) break;
  }
  while (drill.length < length) drill.push(pick(EXERCISES, random));
  return drill;
}
