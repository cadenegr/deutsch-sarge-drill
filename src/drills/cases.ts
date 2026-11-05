// Drill 4: one noun in Nominativ, Akkusativ and Dativ, singular and plural,
// one row under the other. The plural rows repeat the singular sentences, so
// "den Lehrer" and "die Lehrer" stand side by side:
//   Morgen frage ich ___ Lehrer.     den
//   Morgen frage ich ___ Lehrer.     die
// Each set builds new sentences from parts (case-patterns.ts): another
// subject, another verb or preposition. A run follows a learning path:
// normal order first, then a time word first, then the noun first, then
// all mixed.

import verbData from "../data/verbs.json";
import { ARTICLES, type Case } from "./articles";
import {
  OBJECT_PATTERNS,
  SUBJECT_PATTERNS,
  SUBJECTS,
  TIMES,
  type Level,
  type ObjectPattern,
  type Person,
  type Subject,
  type SubjectPattern,
} from "./case-patterns";
import { capitalize, pick, type Gender, type Translate } from "./exercise";
import { NOUNS, type Category, type DataNoun } from "./nouns";

export type Group = NonNullable<DataNoun["group"]>;

// From Wiktionary (see scripts/build-verbs.mjs): "einladen" → 1s ["lade", "ein"].
export const VERBS = verbData as Record<string, Record<Person, string[]>>;

// How many sets each step of the learning path lasts; after the last step
// everything is mixed.
export const STEP_LENGTH = 10;

export interface Row {
  case: Case;
  plural: boolean;
  // The sentence, with "{X}" for the blank and the noun, "[word]" for the
  // trigger.
  text: string;
  // The noun as it stands in this row: Tisch, Tische, Tischen.
  noun: string;
  answer: string;
  explain(t: Translate): string[];
}

// One noun, all its rows. The screen shows them together and checks them
// together.
export interface CaseSet {
  noun: DataNoun;
  // The step of the learning path: 1, 2, 3, or 4 for mixed.
  step: number;
  rows: Row[];
}

// den Kindern, den Tischen; no extra -n after -n or -s (den Frauen, den Autos).
export function dativePlural(plural: string): string {
  return /[ns]$/.test(plural) ? plural : plural + "n";
}

// What a row says, before the noun is put in.
interface Sentence {
  case: Case;
  singular: string;
  plural: string;
  why: (t: Translate) => string[];
}

function subjectSentence(pattern: SubjectPattern): Sentence {
  return {
    case: "Nominativ",
    singular: pattern.singular,
    plural: pattern.plural,
    why: (t) => [
      t(pattern.predicate ? "cases.predicate" : "explain.subject"),
      ...(pattern.level > 1 && !pattern.predicate ? [t("cases.subjectLater")] : []),
    ],
  };
}

// "Ich frage {X}." / "Morgen frage ich {X}." / "{X} frage ich."
function objectSentence(pattern: ObjectPattern, subject: Subject, order: Level, time: string): Sentence {
  const [finite, particle] = VERBS[pattern.verb][subject.person];
  const verb = pattern.prep ? finite : `[${finite}]`;
  const phrase = (first: boolean) =>
    pattern.prep ? `[${first ? capitalize(pattern.prep) : pattern.prep}] {X}` : "{X}";
  const parts =
    order === 1
      ? [capitalize(subject.word), verb, pattern.before, phrase(false), pattern.after, particle]
      : order === 2
        ? [time, verb, subject.word, pattern.before, phrase(false), pattern.after, particle]
        : [phrase(true), verb, subject.word, pattern.before, pattern.after, particle];
  const text = parts.filter(Boolean).join(" ") + ".";

  return {
    case: pattern.case,
    singular: text,
    plural: text,
    why: (t) => {
      const reason = pattern.prep
        ? t("explain.preposition", { word: pattern.prep, case: pattern.case })
        : pattern.receiver
          ? t("cases.receiver", { word: pattern.verb })
          : pattern.case === "Dativ"
            ? t("cases.dativeVerb", { word: pattern.verb })
            : t("explain.verb", { word: pattern.verb, case: pattern.case });
      return order === 3 ? [reason, t("cases.objectFirst", { subject: subject.word })] : [reason];
    },
  };
}

function fits<T extends { groups: Group[] }>(patterns: T[], group: Group): T[] {
  return patterns.filter((p) => p.groups.includes(group));
}

// The three sentences of a set: one per case, all at the step's level (or
// any level once the path is done).
function sentences(group: Group, step: number, random: () => number): Sentence[] {
  const level = (step > 3 ? pick([1, 2, 3], random) : step) as Level;
  const subjectPatterns = fits(SUBJECT_PATTERNS, group);
  const atLevel = subjectPatterns.filter((p) => p.level === level);
  const subject = pick(SUBJECTS, random);
  const time = pick(TIMES, random);

  return [
    subjectSentence(pick(atLevel.length ? atLevel : subjectPatterns, random)),
    ...(["Akkusativ", "Dativ"] as const).map((c) =>
      objectSentence(pick(fits(OBJECT_PATTERNS, group).filter((p) => p.case === c), random), subject, level, time),
    ),
  ];
}

export function makeSet(noun: DataNoun & { group: Group }, step = 4, random: () => number = Math.random): CaseSet {
  const rows: Row[] = [];
  const plural = noun.plurals[0];
  const said = sentences(noun.group, step, random);

  for (const usePlural of plural ? [false, true] : [false]) {
    for (const sentence of said) {
      const text = usePlural ? sentence.plural : sentence.singular;
      const article = usePlural ? (sentence.case === "Dativ" ? "den" : "die") : ARTICLES[sentence.case][noun.gender];
      const form = usePlural
        ? sentence.case === "Dativ" ? dativePlural(plural) : plural
        : sentence.case === "Akkusativ" ? (noun.akk ?? noun.word) : sentence.case === "Dativ" ? (noun.dat ?? noun.word) : noun.word;
      // den Bären: say why the noun changed too.
      const weak = !usePlural && form !== noun.word;
      rows.push({
        case: sentence.case,
        plural: usePlural,
        text,
        noun: form,
        answer: text.startsWith("{X}") ? capitalize(article) : article,
        explain: (t) => [
          ...sentence.why(t),
          rule(sentence.case, noun.gender, usePlural, article, form, t),
          ...(weak ? [t("cases.weak", { noun: noun.word, article, form })] : []),
        ],
      });
    }
  }
  return { noun, step, rows };
}

function rule(c: Case, gender: Gender, plural: boolean, article: string, form: string, t: Translate): string {
  if (plural) return t(c === "Dativ" ? "cases.pluralDative" : "cases.plural", { article, noun: form });
  return t("explain.rule", { gender: t(`gender.${gender}`), case: c, answer: article });
}

export function isRowCorrect(row: Row, given: string): boolean {
  return given.trim().toLowerCase() === row.answer.toLowerCase();
}

// The sentence with the blank and the noun put in, and the trigger marked
// (the caller decides how: underlined on screen, plain in tests).
export function rowSentence(row: Row, blank: string, noun: string = row.noun, mark = (word: string) => word): string {
  return row.text.replace("{X}", `${blank} ${noun}`).replace(/\[(.+?)\]/g, (_, word: string) => mark(word));
}

const GROUPED = NOUNS.filter((n): n is DataNoun & { group: Group } => !!n.group);
const GROUPS: Group[] = ["person", "thing", "place", "food", "animal"];

export const CATEGORIES: Category[] = [
  ...GROUPS.map((group) => ({
    id: group,
    name: (t: Translate) => t(`cases.group.${group}`),
    clue: true,
    nouns: GROUPED.filter((n) => n.group === group),
  })),
  { id: "all", name: (t) => t("menu.all"), clue: false, nouns: GROUPED },
];

// The n-th set of a run: steps 1, 2, 3 for STEP_LENGTH sets each, then mixed.
export function makeCaseSet(noun: DataNoun, index = 0): CaseSet {
  return makeSet(noun as DataNoun & { group: Group }, Math.min(4, Math.floor(index / STEP_LENGTH) + 1));
}
