// The noun list shared by the noun drills, and what those drills are made
// of: categories (one per rule, plus "learn by heart" ones) that a learner
// goes through word by word, as long as they like.

import nounData from "../data/nouns.json";
import { shuffle, type Exercise, type Noun, type Translate } from "./exercise";

export interface DataNoun extends Noun {
  // The main plural first; empty when no plural is used (see the script).
  plurals: string[];
  weak?: true;
  // What the noun is, for sentences that fit it (see scripts/build-nouns.mjs).
  group?: "person" | "animal" | "food" | "thing" | "place";
  // Akkusativ and Dativ singular, when they differ: Bär → den Bären.
  akk?: string;
  dat?: string;
}

// From Wiktionary, the most common nouns first (see scripts/build-nouns.mjs).
export const NOUNS = nounData as DataNoun[];

export interface Category {
  id: string;
  name(t: Translate): string;
  // true: something in the word gives the answer away (an ending);
  // false: it has to be learned by heart.
  clue: boolean;
  nouns: DataNoun[];
}

// Every word of the category, most common first, shuffled a little so no
// two runs look the same: within each group of 10 (100 for long lists).
// "make" also gets the position in the run, for drills that get harder as
// the run goes on.
export function makeRun<T = Exercise>(
  category: Category,
  make: (noun: DataNoun, index: number) => T,
  random: () => number = Math.random,
): T[] {
  const size = category.nouns.length > 1000 ? 100 : 10;
  const run: T[] = [];
  for (let i = 0; i < category.nouns.length; i += size) {
    for (const noun of shuffle(category.nouns.slice(i, i + size), random)) run.push(make(noun, run.length));
  }
  return run;
}
