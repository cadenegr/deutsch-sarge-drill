import { describe, expect, it } from "vitest";
import { ARTICLES } from "./articles";
import { EXERCISES, PREPOSITIONS, makeDrill } from "./real-dativ";

describe("real Dativ sentences (rule 3.2)", () => {
  it("has enough sentences to drill", () => {
    expect(EXERCISES.length).toBeGreaterThan(300);
  });

  it("asks for the Dativ article: dem / der, den in the plural", () => {
    for (const e of EXERCISES) {
      expect(e.answer).toBe(e.plural ? "den" : ARTICLES.Dativ[e.noun.gender]);
    }
  });

  it("blanks the word right after a Dativ preposition", () => {
    for (const e of EXERCISES) {
      expect(e.text.split("{blank}")).toHaveLength(2);
      expect(PREPOSITIONS).toContain(e.preposition);
      expect(e.text.toLowerCase()).toContain(`${e.preposition} {blank} {noun}`);
    }
  });

  it("keeps the Tatoeba number for the credit", () => {
    for (const e of EXERCISES) expect(e.tatoeba).toBeGreaterThan(0);
  });

  it("makes a drill of the asked length, in blocks of one preposition", () => {
    const drill = makeDrill("blocks", 20, () => 0.3);
    expect(drill).toHaveLength(20);
    expect(new Set(drill.slice(0, 5).map((e) => e.preposition)).size).toBe(1);
  });
});
