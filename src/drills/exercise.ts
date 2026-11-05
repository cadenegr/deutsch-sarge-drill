// What every drill hands to the screen: a sentence with one blank and one
// noun ("Ich sehe ___ Hund.", "___ Wohnung", "der Tag → die ___"), the
// answer, and the explanation shown after a wrong answer.

import type { MessageKey } from "../i18n/en";

export type Gender = "m" | "f" | "n";

export interface Noun {
  word: string;
  gender: Gender;
  en: string;
  es?: string;
}

export type Translate = (key: MessageKey, values?: Record<string, string | number>) => string;

export interface Exercise {
  noun: Noun;
  // The sentence, with "{blank}" and "{noun}" where those go.
  text: string;
  // How the noun is written in the sentence, if not just the word: "der Tag".
  shown?: string;
  answer: string;
  // Other answers that are right too: Wörter and Worte.
  accepted?: string[];
  // The answer's color: the noun's gender, or "p" for a plural.
  color?: Gender | "p";
  explain(t: Translate): string[];
}

// "mixed": every exercise is a new random pick.
// "blocks": one rule at a time ("mit", then "aus"; "-ung", then "-chen"),
// with a different noun each time, like a page of the same sum in a math
// book.
export type Order = "mixed" | "blocks";

export const BLOCK_SIZE = 5;

export const DEFINITE: Record<Gender, string> = { m: "der", f: "die", n: "das" };

export function isCorrect(exercise: Exercise, given: string): boolean {
  const typed = given.trim().toLowerCase();
  return [exercise.answer, ...(exercise.accepted ?? [])].some((answer) => answer.toLowerCase() === typed);
}

// Blank and noun are passed in already marked up, so the screen can color
// them.
export function sentence(exercise: Exercise, blank: string, noun: string = exercise.shown ?? exercise.noun.word): string {
  return exercise.text.replace("{blank}", blank).replace("{noun}", noun);
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}
