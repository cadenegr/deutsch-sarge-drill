// The baseline: sentences the app knows without any book (from Tatoeba,
// built by scripts/build-baseline.mjs), sorted by the rules of
// docs/grammar-map.md. find() grabs the sentences for a rule at once: an
// index of rule → sentences is built once, then a search only walks the
// shortest list.

import data from "./data/baseline.json";

/** [role, text, lemma, case, gender, number], e.g. ["noun", "Tochter", "Tochter", "Dat", "Fem", "Sing"] */
export type Slot = [role: string, text: string, lemma: string, kase: string, gender: string, number: string];

export interface Phrase {
  prep: string; // "mit"
  case: string; // "Dat"
  at: number; // where the phrase starts in the text
  slots: Slot[];
}

export interface Sentence {
  text: string;
  src: number; // Tatoeba sentence number
  words: number;
  rules: number[]; // indexes into RULES
  tags: number[]; // indexes into TAGS
  phrases: Phrase[];
}

/** A rule from docs/grammar-map.md. */
export interface Rule {
  id: string; // "3.2"
  title: string;
  level: string; // "A2", "A2–B1"
  star: boolean; // one of Carlos's weak spots
}

export const RULES: Rule[] = data.rules;
/** Finer tags from the pipeline: "mit+Dativ", "weil-Nebensatz", "Präteritum-unregelmäßig"… */
export const TAGS: string[] = data.tags;
export const SENTENCES = data.sentences as Sentence[];

const byRule = new Map<string, number[]>(RULES.map((r) => [r.id, []]));
const byTag = new Map<string, number[]>(TAGS.map((t) => [t, []]));
SENTENCES.forEach((s, i) => {
  s.rules.forEach((r) => byRule.get(RULES[r].id)!.push(i));
  s.tags.forEach((t) => byTag.get(TAGS[t])!.push(i));
});

export interface Query {
  rules?: string[]; // all must be on the sentence: ["3.2", "6.6"]
  tags?: string[]; // and all of these: ["mit+Dativ"]
  maxWords?: number;
}

/** All baseline sentences that show every rule and tag in the query. */
export function find({ rules = [], tags = [], maxWords = Infinity }: Query): Sentence[] {
  const lists = [...rules.map((r) => byRule.get(r) ?? []), ...tags.map((t) => byTag.get(t) ?? [])];
  if (lists.length === 0) return [];
  lists.sort((a, b) => a.length - b.length);
  const others = lists.slice(1).map((l) => new Set(l));
  return lists[0]
    .filter((i) => others.every((o) => o.has(i)))
    .map((i) => SENTENCES[i])
    .filter((s) => s.words <= maxWords);
}

/** How many baseline sentences each rule has, in map order. */
export function ruleCounts(): [Rule, number][] {
  return RULES.map((r) => [r, byRule.get(r.id)!.length]);
}
