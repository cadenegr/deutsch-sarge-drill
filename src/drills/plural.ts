// Drill 3: the plural ("der Tag → die ___", answer "Tage").
// The article is always "die"; the lesson is the ending. Many nouns show
// their plural by their ending or gender (-ung → -ungen, die … -e → -n);
// short der and das words have no safe rule and are learned by heart.

import { DEFINITE, type Exercise, type Translate } from "./exercise";
import { NOUNS, type Category, type DataNoun } from "./nouns";

export interface PluralRule {
  id: string;
  // true: the ending or gender gives the plural away. false: learn by heart.
  clue: boolean;
  // "always": no exception among our nouns (a test checks it).
  strength: "always" | "usually";
  applies(noun: DataNoun): boolean;
  // Does this plural follow the rule? (Exceptions are explained as such.)
  follows(noun: DataNoun, plural: string): boolean;
}

// Mutter → Mütter, Haus → Häuser: the last a, o, u or au gets the umlaut.
export function umlaut(word: string): string {
  const i = Math.max(...["a", "o", "u", "A", "O", "U"].map((v) => word.lastIndexOf(v)));
  if (i < 0) return word;
  const plain = word[i];
  // Haus → Häuser: in "au" the a gets it.
  if (plain.toLowerCase() === "u" && word[i - 1]?.toLowerCase() === "a") {
    return word.slice(0, i - 1) + (word[i - 1] === "A" ? "Ä" : "ä") + word.slice(i);
  }
  const marked = { a: "ä", o: "ö", u: "ü", A: "Ä", O: "Ö", U: "Ü" }[plain]!;
  return word.slice(0, i) + marked + word.slice(i + 1);
}

const ends = (noun: DataNoun, pattern: RegExp) => pattern.test(noun.word);
const adds = (...endings: string[]) => (noun: DataNoun, plural: string) =>
  endings.some((ending) => plural === noun.word + ending);

// The first rule that applies to a noun is its rule, so the order matters:
// "-in" (Lehrerin) before the other feminine nouns, and so on.
export const RULES: PluralRule[] = [
  {
    id: "chen",
    clue: true,
    strength: "always",
    applies: (n) => n.gender === "n" && ends(n, /(chen|lein)$/),
    follows: (n, p) => p === n.word,
  },
  { id: "nis", clue: true, strength: "always", applies: (n) => ends(n, /nis$/), follows: adds("se") },
  { id: "weak", clue: true, strength: "always", applies: (n) => n.gender === "m" && !!n.weak, follows: adds("n", "en") },
  {
    id: "latin",
    clue: true,
    strength: "usually",
    applies: (n) => n.gender === "n" && ends(n, /(um|ma)$/) && !ends(n, /[^a]tum$/),
    follows: (n, p) => p === n.word.replace(/(um|a)$/, "en"),
  },
  { id: "ung", clue: true, strength: "always", applies: (n) => n.gender === "f" && ends(n, /ung$/), follows: adds("en") },
  {
    id: "suffix",
    clue: true,
    strength: "always",
    applies: (n) => n.gender === "f" && ends(n, /(heit|keit|schaft|ion|tät)$/),
    follows: adds("en"),
  },
  {
    id: "female",
    clue: true,
    strength: "always",
    applies: (n) => n.gender === "f" && ends(n, /in$/) && isFemaleForm(n.word),
    follows: adds("nen"),
  },
    // One vowel at the end, not "-au" or "-ei" (Frau, Partei are not -s
  // words), and not "-a", which mostly goes to -en (Firma → Firmen).
  { id: "vowel", clue: true, strength: "usually", applies: (n) => ends(n, /[^aeiouäöü][iouy]$/i), follows: adds("s") },
  {
    id: "fUmlaut",
    clue: false,
    strength: "always",
    applies: (n) => n.gender === "f" && n.plurals[0] === umlaut(n.word) + "e",
    follows: () => true,
  },
  { id: "fe", clue: true, strength: "usually", applies: (n) => n.gender === "f" && ends(n, /e$/), follows: adds("n") },
  {
    id: "f",
    clue: true,
    strength: "usually",
    applies: (n) => n.gender === "f",
    follows: (n, p) => adds("en", "n")(n, p) || p === n.word.replace(/a$/, "en"),
  },
  {
    id: "erelen",
    clue: true,
    strength: "usually",
    // An unstressed -er, -el, -en after a consonant: Lehrer, Mantel, Garten
    // (not Spiel, Tier, Papier).
    applies: (n) => ends(n, /[^aeiouäöü](er|el|en)$/),
    follows: (n, p) => p === n.word || p === umlaut(n.word),
  },
  { id: "m", clue: false, strength: "always", applies: (n) => n.gender === "m", follows: () => true },
  { id: "n", clue: false, strength: "always", applies: (n) => n.gender === "n", follows: () => true },
];

// Lehrerin, Freundin, Kollegin: a "der" word plus -in.
const masculine = new Set(NOUNS.filter((n) => n.gender === "m").map((n) => n.word));
function isFemaleForm(word: string): boolean {
  const base = word.slice(0, -2);
  return masculine.has(base) || masculine.has(base + "e") || masculine.has(umlautBack(base));
}
// Ärztin → Arzt
function umlautBack(word: string): string {
  return word.replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u");
}

// Only nouns whose plural is really used (see scripts/build-nouns.mjs).
export const NOUNS_WITH_PLURAL = NOUNS.filter((n) => n.plurals.length > 0);

export function ruleFor(noun: DataNoun): PluralRule {
  return RULES.find((rule) => rule.applies(noun))!;
}

export function makeExercise(noun: DataNoun): Exercise {
  const [answer, ...accepted] = noun.plurals;
  return {
    noun,
    text: `{noun} → <span class="g-p">die</span> {blank}`,
    shown: `${DEFINITE[noun.gender]} ${noun.word}`,
    answer,
    accepted,
    color: "p",
    explain: (t) => explain(noun, t),
  };
}

function explain(noun: DataNoun, t: Translate): string[] {
  const rule = ruleFor(noun);
  const [plural, ...others] = noun.plurals;
  const singular = `${DEFINITE[noun.gender]} ${noun.word}`;
  const lines = [t(`plural.rule.${rule.id}` as Parameters<Translate>[0])];
  lines.push(
    rule.follows(noun, plural)
      ? t("plural.example", { singular, plural })
      : t("plural.exception", { noun: noun.word, singular, plural }),
  );
  if (others.length) lines.push(t("plural.alsoRight", { plurals: others.join(", ") }));
  return lines;
}

const MIN_SIZE = 5;

export const CATEGORIES: Category[] = [
  ...RULES.map((rule) => ({
    id: rule.id,
    name: (t: Translate) => t(`plural.name.${rule.id}` as Parameters<Translate>[0]),
    clue: rule.clue,
    nouns: NOUNS_WITH_PLURAL.filter((noun) => ruleFor(noun) === rule),
  })).filter((c) => c.nouns.length >= MIN_SIZE),
  { id: "all", name: (t) => t("menu.all"), clue: false, nouns: NOUNS_WITH_PLURAL },
];
