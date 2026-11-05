import { describe, expect, it } from "vitest";
import { en } from "../i18n/en";
import { isCorrect, sentence, type Translate } from "./exercise";
import { NOUNS, makeRun } from "./nouns";
import { CATEGORIES, NOUNS_WITH_PLURAL, RULES, makeExercise, ruleFor, umlaut } from "./plural";

const t: Translate = (key, values = {}) =>
  en[key].replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));

function noun(word: string) {
  const found = NOUNS.find((n) => n.word === word);
  if (!found) throw new Error(`${word} is not in the word list`);
  return found;
}

describe("plural data", () => {
  it("has the right plural for well-known nouns", () => {
    const known: Record<string, string> = {
      Tag: "Tage", Mann: "Männer", Vater: "Väter", Baum: "Bäume", Platz: "Plätze", Kollege: "Kollegen",
      Frau: "Frauen", Frage: "Fragen", Stadt: "Städte", Nacht: "Nächte", Mutter: "Mütter", Wohnung: "Wohnungen",
      Kind: "Kinder", Haus: "Häuser", Buch: "Bücher", Jahr: "Jahre", Auto: "Autos", Zimmer: "Zimmer",
      Mädchen: "Mädchen", Ergebnis: "Ergebnisse", Thema: "Themen", Museum: "Museen", Firma: "Firmen",
    };
    for (const [word, plural] of Object.entries(known)) expect(noun(word).plurals[0], word).toBe(plural);
  });

  it("keeps a second plural only where both are right", () => {
    expect(noun("Wort").plurals).toEqual(["Wörter", "Worte"]);
    expect(noun("Jahr").plurals).toEqual(["Jahre"]);
    expect(noun("Tag").plurals).toEqual(["Tage"]);
  });

  it("puts the umlaut on the last a, o, u or au", () => {
    expect(["Vater", "Haus", "Garten", "Ofen", "Ausdruck", "Kind"].map(umlaut)).toEqual([
      "Väter", "Häus", "Gärten", "Öfen", "Ausdrück", "Kind",
    ]);
  });
});

describe("plural rules", () => {
  it("'always' rules have no exception, 'usually' rules hold for at least 85%", () => {
    for (const rule of RULES) {
      const nouns = NOUNS_WITH_PLURAL.filter((n) => ruleFor(n) === rule);
      const right = nouns.filter((n) => rule.follows(n, n.plurals[0])).length;
      if (rule.strength === "always") expect(right, rule.id).toBe(nouns.length);
      else expect(right / nouns.length, rule.id).toBeGreaterThanOrEqual(0.85);
    }
  });

  it("finds the pattern of a noun", () => {
    const ids = ["Wohnung", "Möglichkeit", "Frage", "Mädchen", "Lehrer", "Auto", "Kollege", "Stadt", "Tag", "Kind"].map(
      (word) => ruleFor(noun(word)).id,
    );
    expect(ids).toEqual(["ung", "suffix", "fe", "chen", "erelen", "vowel", "weak", "fUmlaut", "m", "n"]);
  });

  it("has a name and an explanation for every category", () => {
    for (const category of CATEGORIES) expect(category.name(t)).not.toMatch(/plural\./);
    for (const rule of RULES) expect(en).toHaveProperty(`plural.rule.${rule.id}`);
  });
});

describe("plural drill", () => {
  it("shows the singular with its article and asks for the plural", () => {
    const exercise = makeExercise(noun("Tag"));
    expect(sentence(exercise, "___")).toBe(`der Tag → <span class="g-p">die</span> ___`);
    expect(isCorrect(exercise, "Tage")).toBe(true);
    expect(isCorrect(exercise, "tage ")).toBe(true);
    expect(isCorrect(exercise, "Tag")).toBe(false);
  });

  it("accepts every right plural", () => {
    const exercise = makeExercise(noun("Wort"));
    expect(isCorrect(exercise, "Wörter")).toBe(true);
    expect(isCorrect(exercise, "Worte")).toBe(true);
    expect(exercise.explain(t)).toContain("Also right: die Worte.");
  });

  it("explains the pattern, or the exception", () => {
    expect(makeExercise(noun("Wohnung")).explain(t)).toEqual([
      "-ung → -ungen, always.",
      "die Wohnung → die Wohnungen.",
    ]);
    expect(makeExercise(noun("Mutter")).explain(t)[1]).toBe("But Mutter is an exception: die Mutter → die Mütter.");
  });

  it("a run asks every word of its category once", () => {
    const ung = CATEGORIES.find((c) => c.id === "ung")!;
    const run = makeRun(ung, makeExercise);
    expect(new Set(run.map((e) => e.noun.word)).size).toBe(ung.nouns.length);
    expect(run.every((e) => e.answer.endsWith("ungen"))).toBe(true);
  });
});
