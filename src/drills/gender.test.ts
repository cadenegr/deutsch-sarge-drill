import { describe, expect, it } from "vitest";
import { en } from "../i18n/en";
import { isCorrect, sentence, type Translate } from "./exercise";
import { CATEGORIES, NOUNS, RULES, label, makeExercise, members, ruleFor } from "./gender";
import { makeRun } from "./nouns";

const t: Translate = (key, values = {}) =>
  en[key].replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));

function noun(word: string) {
  const found = NOUNS.find((n) => n.word === word);
  if (!found) throw new Error(`${word} is not in the word list`);
  return found;
}

describe("noun data", () => {
  it("has the right gender for well-known nouns", () => {
    const known: Record<string, "m" | "f" | "n"> = {
      Tisch: "m", Mann: "m", Tag: "m", Weg: "m", Vater: "m", Kopf: "m", Arzt: "m", Zug: "m",
      Name: "m", Montag: "m", Sommer: "m", Computer: "m", Kaffee: "m", Hund: "m", Platz: "m",
      Frau: "f", Zeit: "f", Stadt: "f", Frage: "f", Wohnung: "f", Mutter: "f", Nacht: "f",
      Tür: "f", Arbeit: "f", Straße: "f", Schule: "f", Familie: "f", Musik: "f", Uhr: "f",
      Kind: "n", Haus: "n", Jahr: "n", Auto: "n", Buch: "n", Mädchen: "n", Wasser: "n",
      Ende: "n", Leben: "n", Zimmer: "n", Fenster: "n", Geld: "n", Problem: "n", Bett: "n",
    };
    for (const [word, gender] of Object.entries(known)) expect(noun(word).gender, word).toBe(gender);
  });

  it("only has single words with a capital and a meaning", () => {
    expect(NOUNS.length).toBeGreaterThan(2000);
    for (const n of NOUNS) {
      expect(n.word).toMatch(/^[A-ZÄÖÜ][a-zäöüß]+$/);
      expect(["m", "f", "n"]).toContain(n.gender);
      expect(n.en.length).toBeGreaterThan(0);
    }
    expect(new Set(NOUNS.map((n) => n.word)).size).toBe(NOUNS.length);
  });
});

describe("ending rules", () => {
  it("'always' rules have no exception, 'usually' rules hold for at least 85%", () => {
    for (const rule of RULES) {
      const nouns = members(rule);
      const right = nouns.filter((n) => n.gender === rule.gender).length;
      if (rule.strength === "always") expect(right, rule.id).toBe(nouns.length);
      else expect(right / nouns.length, rule.id).toBeGreaterThanOrEqual(0.85);
    }
  });

  it("finds the rule by ending, and leaves look-alikes out", () => {
    expect(ruleFor(noun("Wohnung"))?.id).toBe("ung");
    expect(ruleFor(noun("Möglichkeit"))?.id).toBe("heit");
    expect(ruleFor(noun("Mädchen"))?.id).toBe("chen");
    expect(ruleFor(noun("Montag"))?.id).toBe("time");
    expect(ruleFor(noun("Kuchen"))).toBeUndefined();
    expect(ruleFor(noun("Tisch"))).toBeUndefined();
  });
});

describe("gender drill", () => {
  it("asks for der / die / das before the noun", () => {
    const exercise = makeExercise(noun("Wohnung"));
    expect(sentence(exercise, "___")).toBe("___ Wohnung");
    expect(isCorrect(exercise, "die")).toBe(true);
    expect(isCorrect(exercise, "der")).toBe(false);
  });

  it("explains the rule, the exceptions and nouns with no rule", () => {
    expect(makeExercise(noun("Wohnung")).explain(t)).toEqual(["Nouns ending in -ung are always feminine → die."]);
    expect(makeExercise(noun("Frage")).explain(t)).toEqual(["Nouns ending in -e are usually feminine → die."]);
    expect(makeExercise(noun("Ende")).explain(t)).toEqual([
      "Nouns ending in -e are usually feminine, but Ende is an exception: neuter → das Ende.",
    ]);
    expect(makeExercise(noun("Tisch")).explain(t)).toEqual([
      "No ending rule here: learn it together with its article, der Tisch.",
    ]);
    expect(label(RULES.find((r) => r.id === "heit")!)).toBe("-heit / -keit");
  });

  it("offers each ending, the nouns with no clue, and all words", () => {
    const ids = CATEGORIES.map((c) => c.id);
    expect(ids).toContain("ung");
    expect(ids.slice(-2)).toEqual(["none", "all"]);
    const none = CATEGORIES.find((c) => c.id === "none")!;
    expect(none.nouns.every((n) => !ruleFor(n))).toBe(true);
    const clued = CATEGORIES.filter((c) => c.clue).reduce((sum, c) => sum + c.nouns.length, 0);
    expect(clued + none.nouns.length).toBe(NOUNS.length);
  });

  it("a run asks every word of its category once, most common first", () => {
    const ung = CATEGORIES.find((c) => c.id === "ung")!;
    const run = makeRun(ung, makeExercise);
    expect(run).toHaveLength(ung.nouns.length);
    expect(new Set(run.map((e) => e.noun.word)).size).toBe(ung.nouns.length);
    expect(run.every((e) => e.answer === "Die")).toBe(true);
    expect(new Set(run.slice(0, 10).map((e) => e.noun))).toEqual(new Set(ung.nouns.slice(0, 10)));
  });
});
