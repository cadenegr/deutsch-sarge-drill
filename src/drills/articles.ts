// Drill 1: the definite article in Nominativ, Akkusativ and Dativ.
// Every exercise is one noun dropped into one sentence pattern, so a short
// list of each gives hundreds of exercises, like a multiplication table.

import {
  BLOCK_SIZE,
  capitalize,
  pick,
  shuffle,
  type Exercise,
  type Gender,
  type Noun,
  type Order,
  type Translate,
} from "./exercise";

export type Case = "Nominativ" | "Akkusativ" | "Dativ";

// Why the noun is in its case: it is the subject, the object of a verb, or
// it follows a preposition that always takes that case.
export type Reason = "subject" | "verb" | "preposition";

export interface Pattern {
  before: string;
  after: string;
  case: Case;
  reason: Reason;
  word?: string;
}

export interface ArticleExercise extends Exercise {
  pattern: Pattern;
}

export const ARTICLES: Record<Case, Record<Gender, string>> = {
  Nominativ: { m: "der", f: "die", n: "das" },
  Akkusativ: { m: "den", f: "die", n: "das" },
  Dativ: { m: "dem", f: "der", n: "dem" },
};

// Only nouns that keep their form in these three cases in the singular
// (no "den Kollegen"), so the article is the whole lesson.
export const NOUNS: Required<Noun>[] = [
  { word: "Tisch", gender: "m", en: "table", es: "mesa" },
  { word: "Bahnhof", gender: "m", en: "station", es: "estación" },
  { word: "Hund", gender: "m", en: "dog", es: "perro" },
  { word: "Schlüssel", gender: "m", en: "key", es: "llave" },
  { word: "Kaffee", gender: "m", en: "coffee", es: "café" },
  { word: "Park", gender: "m", en: "park", es: "parque" },
  { word: "Laden", gender: "m", en: "shop", es: "tienda" },
  { word: "Wohnung", gender: "f", en: "flat", es: "piso" },
  { word: "Straße", gender: "f", en: "street", es: "calle" },
  { word: "Arbeit", gender: "f", en: "work", es: "trabajo" },
  { word: "Katze", gender: "f", en: "cat", es: "gato" },
  { word: "Tür", gender: "f", en: "door", es: "puerta" },
  { word: "Stadt", gender: "f", en: "city", es: "ciudad" },
  { word: "Rechnung", gender: "f", en: "bill", es: "factura" },
  { word: "Auto", gender: "n", en: "car", es: "coche" },
  { word: "Buch", gender: "n", en: "book", es: "libro" },
  { word: "Fenster", gender: "n", en: "window", es: "ventana" },
  { word: "Fahrrad", gender: "n", en: "bike", es: "bicicleta" },
  { word: "Büro", gender: "n", en: "office", es: "oficina" },
  { word: "Handy", gender: "n", en: "phone", es: "móvil" },
  { word: "Geld", gender: "n", en: "money", es: "dinero" },
];

// Patterns that read naturally with any noun above, and none where the
// article melts into the preposition (vom, zum, im).
export const PATTERNS: Pattern[] = [
  { before: "Wo ist", after: "?", case: "Nominativ", reason: "subject" },
  { before: "", after: "ist neu.", case: "Nominativ", reason: "subject" },
  { before: "Ich sehe", after: ".", case: "Akkusativ", reason: "verb", word: "sehen" },
  { before: "Ich brauche", after: ".", case: "Akkusativ", reason: "verb", word: "brauchen" },
  { before: "Das ist für", after: ".", case: "Akkusativ", reason: "preposition", word: "für" },
  { before: "Ich gehe nicht ohne", after: ".", case: "Akkusativ", reason: "preposition", word: "ohne" },
  { before: "Was hast du gegen", after: "?", case: "Akkusativ", reason: "preposition", word: "gegen" },
  { before: "Was machst du mit", after: "?", case: "Dativ", reason: "preposition", word: "mit" },
  { before: "Ich bin zufrieden mit", after: ".", case: "Dativ", reason: "preposition", word: "mit" },
  { before: "Das kommt aus", after: ".", case: "Dativ", reason: "preposition", word: "aus" },
];

export function makeExercise(random: () => number = Math.random): ArticleExercise {
  return exerciseOf(pick(NOUNS, random), pick(PATTERNS, random));
}

function exerciseOf(noun: Noun, pattern: Pattern): ArticleExercise {
  const article = ARTICLES[pattern.case][noun.gender];
  const answer = pattern.before === "" ? capitalize(article) : article;
  const text = [pattern.before, "{blank}", "{noun}"].filter(Boolean).join(" ") + (pattern.after.length > 1 ? " " : "") + pattern.after;
  return { noun, pattern, text, answer, explain: (t) => explain(noun, pattern, answer, t) };
}

function explain(noun: Noun, pattern: Pattern, answer: string, t: Translate): string[] {
  const gender = t(`gender.${noun.gender}`);
  const why =
    pattern.reason === "subject"
      ? t("explain.subject")
      : t(pattern.reason === "verb" ? "explain.verb" : "explain.preposition", { word: pattern.word ?? "", case: pattern.case });
  return [
    why,
    t("explain.gender", { noun: noun.word, gender, article: ARTICLES.Nominativ[noun.gender] }),
    t("explain.rule", { gender, case: pattern.case, answer: answer.toLowerCase() }),
  ];
}

// The word that decides the case; the subject sentences share one block.
export function trigger(pattern: Pattern): string {
  return pattern.word ?? pattern.case;
}

export function makeDrill(order: Order, length: number, random: () => number = Math.random): ArticleExercise[] {
  if (order === "mixed") return Array.from({ length }, () => makeExercise(random));

  const triggers = shuffle([...new Set(PATTERNS.map(trigger))], random);
  const drill: ArticleExercise[] = [];
  for (let i = 0; drill.length < length; i++) {
    const word = triggers[i % triggers.length];
    const patterns = PATTERNS.filter((p) => trigger(p) === word);
    const size = Math.min(BLOCK_SIZE, length - drill.length);
    for (const noun of blockNouns(size, random)) drill.push(exerciseOf(noun, pick(patterns, random)));
  }
  return drill;
}

// One der, one die and one das noun in every block, so the three articles
// for the same case are seen side by side; the rest are any other nouns.
function blockNouns(size: number, random: () => number): Noun[] {
  const shuffled = shuffle(NOUNS, random);
  const picked = (["m", "f", "n"] as Gender[]).map((g) => shuffled.find((n) => n.gender === g)!).slice(0, size);
  const rest = shuffled.filter((n) => !picked.includes(n)).slice(0, size - picked.length);
  return shuffle([...picked, ...rest], random);
}
