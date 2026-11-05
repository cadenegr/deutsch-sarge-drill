import { describe, expect, it } from "vitest";
import map from "../docs/grammar-map.md?raw";
import { RULES, SENTENCES, TAGS, find, ruleCounts } from "./baseline";

// The cases each preposition takes: the baseline must never say otherwise.
const PREP_CASES: Record<string, string[]> = {
  mit: ["Dat"], aus: ["Dat"], bei: ["Dat"], nach: ["Dat"], seit: ["Dat"], von: ["Dat"], zu: ["Dat"],
  durch: ["Acc"], für: ["Acc"], gegen: ["Acc"], ohne: ["Acc"], um: ["Acc"],
  in: ["Acc", "Dat"], an: ["Acc", "Dat"], auf: ["Acc", "Dat"], wegen: ["Gen"], trotz: ["Gen"], während: ["Gen"],
};
const ids = (s: (typeof SENTENCES)[number]) => s.rules.map((i) => RULES[i].id);

describe("baseline data", () => {
  it("every rule is in docs/grammar-map.md, with the map's title", () => {
    expect(RULES.length).toBeGreaterThanOrEqual(25);
    for (const r of RULES) expect(map, r.id).toContain(`| ${r.id}${r.star ? " ★" : ""} | ${r.title} |`);
  });

  it("has a few hundred sentences for every rule", () => {
    for (const [rule, n] of ruleCounts()) expect(n, rule.id).toBeGreaterThanOrEqual(100);
  });

  it("only whole, short drill sentences, credited to Tatoeba", () => {
    for (const s of SENTENCES) {
      expect(s.words).toBeGreaterThanOrEqual(3);
      expect(s.words).toBeLessThanOrEqual(15);
      expect(s.text).toMatch(/^[»"„“(]?[A-ZÄÖÜ]/);
      expect(s.src).toBeGreaterThan(0);
      for (const t of s.tags) expect(TAGS[t]).toBeDefined();
    }
  });

  it("every phrase is where it says, with a case its preposition takes", () => {
    for (const s of SENTENCES) {
      for (const p of s.phrases) {
        expect(s.text.slice(p.at).startsWith(p.slots[0][1]), `${s.text} / ${p.slots[0][1]}`).toBe(true);
        if (PREP_CASES[p.prep]) expect(PREP_CASES[p.prep], `${s.text}: ${p.prep}`).toContain(p.case);
      }
    }
  });

  it("3.2 always has a Dativ preposition, 3.1 an Akkusativ one", () => {
    for (const s of find({ rules: ["3.2"] })) expect(s.phrases.some((p) => p.case === "Dat")).toBe(true);
    for (const s of find({ rules: ["3.1"] })) expect(s.phrases.some((p) => p.case === "Acc")).toBe(true);
  });

  it("passes the dictionary test (no Tatoeba typos like Tunell)", () => {
    expect(SENTENCES.some((s) => /\bTunell\b/.test(s.text))).toBe(false);
  });

  it("does not teach old spelling", () => {
    for (const s of SENTENCES) expect(s.text).not.toMatch(/\b(daß|muß|wußte)\b/);
  });
});

describe("find", () => {
  it("finds the sentences of a rule", () => {
    const found = find({ rules: ["3.2"] });
    expect(found.length).toBeGreaterThanOrEqual(100);
    for (const s of found) expect(ids(s)).toContain("3.2");
  });

  it("needs every rule and tag, and keeps to maxWords", () => {
    const both = find({ rules: ["3.2", "6.6"], tags: ["mit+Dativ"], maxWords: 10 });
    expect(both.length).toBeGreaterThan(0);
    for (const s of both) {
      expect(ids(s)).toEqual(expect.arrayContaining(["3.2", "6.6"]));
      expect(s.tags.map((t) => TAGS[t])).toContain("mit+Dativ");
      expect(s.words).toBeLessThanOrEqual(10);
    }
  });

  it("finds nothing for unknown rules or an empty query", () => {
    expect(find({ rules: ["99.9"] })).toEqual([]);
    expect(find({})).toEqual([]);
  });
});
