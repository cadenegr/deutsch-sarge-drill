// Drill 2: der, die or das for a noun on its own ("___ Wohnung").
// Many nouns give their gender away by their ending (-ung → die,
// -chen → das), so a run drills every noun with one ending, as long as the
// learner wants. Nouns with no rule have their own run: those have to be
// learned with their article.

import { BLOCK_SIZE, DEFINITE, capitalize, type Exercise, type Gender, type Noun, type Translate } from "./exercise";
import { NOUNS, type Category, type DataNoun } from "./nouns";

export { NOUNS };

export interface Rule {
  id: string;
  gender: Gender;
  // "always": no exception among our nouns (a test checks it).
  // "usually": a few exceptions, which the explanation points out.
  strength: "always" | "usually";
  endings?: string[];
  // Words that end the same by chance, without the ending as a suffix:
  // Sprung comes from springen, not from -ung.
  notEnding?: string[];
  // A rule by meaning instead of ending: days, months and seasons.
  words?: string[];
}

export const RULES: Rule[] = [
  { id: "ung", endings: ["ung"], gender: "f", strength: "always", notEnding: ["sprung", "schwung"] },
  { id: "heit", endings: ["heit", "keit"], gender: "f", strength: "always" },
  { id: "schaft", endings: ["schaft"], gender: "f", strength: "always" },
  { id: "ion", endings: ["ion"], gender: "f", strength: "usually" },
  { id: "tät", endings: ["tät"], gender: "f", strength: "always" },
  { id: "ie", endings: ["ie"], gender: "f", strength: "always" },
  { id: "ik", endings: ["ik"], gender: "f", strength: "usually" },
  { id: "enz", endings: ["enz"], gender: "f", strength: "always" },
  { id: "e", endings: ["e"], gender: "f", strength: "usually" },
  { id: "chen", endings: ["chen"], gender: "n", strength: "always", notEnding: ["kuchen", "knochen"] },
  { id: "ment", endings: ["ment"], gender: "n", strength: "always" },
  { id: "nis", endings: ["nis"], gender: "n", strength: "usually" },
  { id: "ismus", endings: ["ismus"], gender: "m", strength: "always" },
  { id: "or", endings: ["or"], gender: "m", strength: "usually" },
  {
    id: "time",
    gender: "m",
    strength: "always",
    words: [
      "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag",
      "Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August",
      "September", "Oktober", "November", "Dezember",
      "Frühling", "Sommer", "Herbst", "Winter",
    ],
  },
];

export function ruleFor(noun: Noun): Rule | undefined {
  return RULES.find((rule) => fits(rule, noun.word));
}

function fits(rule: Rule, word: string): boolean {
  if (rule.words) return rule.words.includes(word);
  const lower = word.toLowerCase();
  return (
    rule.endings!.some((ending) => lower.endsWith(ending) && lower.length > ending.length + 1) &&
    !rule.notEnding?.some((part) => lower.endsWith(part))
  );
}

export function members(rule: Rule): DataNoun[] {
  // A noun belongs to the first rule that fits it, so "-heit" is not also
  // drilled as an "-e" word, and "Woche" stays an "-e" word.
  return NOUNS.filter((noun) => ruleFor(noun) === rule);
}

export function makeExercise(noun: DataNoun): Exercise {
  const answer = capitalize(DEFINITE[noun.gender]);
  return { noun, text: "{blank} {noun}", answer, explain: (t) => explain(noun, t) };
}

function explain(noun: DataNoun, t: Translate): string[] {
  const article = DEFINITE[noun.gender];
  const gender = t(`gender.${noun.gender}`);
  const rule = ruleFor(noun);

  if (!rule) return [t("gender.noRule", { noun: noun.word, article })];

  const ruleGender = t(`gender.${rule.gender}`);
  const what = rule.words ? t("gender.timeWords") : t("gender.ending", { ending: label(rule) });
  if (rule.gender !== noun.gender) {
    return [t("gender.exception", { what, ruleGender, noun: noun.word, gender, article })];
  }
  return [
    t(rule.strength === "always" ? "gender.always" : "gender.usually", { what, gender, article: DEFINITE[rule.gender] }),
  ];
}

// "-heit / -keit"
export function label(rule: Rule): string {
  return (rule.endings ?? []).map((ending) => `-${ending}`).join(" / ");
}

// What the menu offers: one category per ending rule ("with a clue"),
// the nouns no rule covers ("no clue": learn them by heart), and all words.
export const CATEGORIES: Category[] = [
  ...RULES.map((rule) => ({
    id: rule.id,
    name: (t: Translate) => (rule.words ? t("gender.timeWords") : label(rule)),
    clue: true,
    nouns: members(rule),
  })).filter((c) => c.nouns.length >= BLOCK_SIZE),
  { id: "none", name: (t) => t("gender.menu.common"), clue: false, nouns: NOUNS.filter((noun) => !ruleFor(noun)) },
  { id: "all", name: (t) => t("menu.all"), clue: false, nouns: NOUNS },
];
