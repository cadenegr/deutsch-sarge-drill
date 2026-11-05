import { describe, expect, it } from "vitest";
import { en } from "../i18n/en";
import { ARTICLES } from "./articles";
import { OBJECT_PATTERNS, SUBJECT_PATTERNS, TIMES } from "./case-patterns";
import { CATEGORIES, VERBS, dativePlural, makeSet, rowSentence, type Group } from "./cases";
import type { Translate } from "./exercise";
import { NOUNS, type DataNoun } from "./nouns";

const t: Translate = (key, values = {}) =>
  en[key].replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));

function noun(word: string) {
  const found = NOUNS.find((n) => n.word === word);
  if (!found) throw new Error(`${word} is not in the word list`);
  return found as DataNoun & { group: Group };
}

// Always the first choice, so a set is predictable.
const first = () => 0;
const plain = (set: ReturnType<typeof makeSet>) => set.rows.map((r) => rowSentence(r, r.answer));

describe("noun groups", () => {
  it("puts well-known nouns in the right group", () => {
    const known: Record<string, string> = {
      Lehrer: "person", Arzt: "person", Kind: "person", Frau: "person",
      Bahnhof: "place", Stadt: "place", Kino: "place", Hotel: "place",
      Kuchen: "food", Brot: "food", Kaffee: "food",
      Hund: "animal", Katze: "animal", Pferd: "animal",
      Tisch: "thing", Auto: "thing", Stuhl: "thing", Fahrrad: "thing",
    };
    for (const [word, group] of Object.entries(known)) expect(noun(word).group, word).toBe(group);
    expect(NOUNS.find((n) => n.word === "Arm")?.group).toBeUndefined();
  });

  it("has a few hundred nouns to drill, and a name for every group", () => {
    expect(CATEGORIES.find((c) => c.id === "all")!.nouns.length).toBeGreaterThan(300);
    for (const category of CATEGORIES) expect(category.name(t)).not.toMatch(/cases\./);
  });
});

describe("verbs", () => {
  it("has the present tense of every verb the sentences use", () => {
    for (const pattern of OBJECT_PATTERNS) expect(VERBS, pattern.verb).toHaveProperty(pattern.verb);
    expect(VERBS.helfen["2s"]).toEqual(["hilfst"]);
    expect(VERBS.einladen["3s"]).toEqual(["lädt", "ein"]);
    expect(VERBS.sein["2p"]).toEqual(["seid"]);
    expect(VERBS.treffen["3s"]).toEqual(["trifft"]);
  });
});

describe("sentence patterns", () => {
  it("give every group sentences for every step and every case", () => {
    for (const group of ["person", "thing", "place", "food", "animal"] as Group[]) {
      for (const level of [1, 2, 3]) {
        expect(SUBJECT_PATTERNS.some((p) => p.groups.includes(group) && p.level === level), `${group} ${level}`).toBe(true);
      }
      for (const c of ["Akkusativ", "Dativ"]) {
        expect(OBJECT_PATTERNS.some((p) => p.groups.includes(group) && p.case === c), `${group} ${c}`).toBe(true);
      }
    }
  });

  it("never use a preposition that melts into the article (im, zum, vom…)", () => {
    for (const p of OBJECT_PATTERNS) expect(["in", "an", "zu", "von", "bei"]).not.toContain(p.prep);
    for (const p of SUBJECT_PATTERNS) expect(p.singular).not.toMatch(/\b(in|an|zu|von|bei) \{X\}/);
  });
});

describe("case sets", () => {
  it("step 1: normal order, the plural rows repeat the singular sentences", () => {
    expect(plain(makeSet(noun("Lehrer"), 1, first))).toEqual([
      "Der Lehrer wartet schon.",
      "Ich frage den Lehrer.",
      "Ich helfe dem Lehrer.",
      "Die Lehrer warten schon.",
      "Ich frage die Lehrer.",
      "Ich helfe den Lehrern.",
    ]);
  });

  it("step 2: a time word first, the subject after the verb", () => {
    expect(plain(makeSet(noun("Lehrer"), 2, first)).slice(0, 3)).toEqual([
      "Heute kommt der Lehrer.",
      "Heute frage ich den Lehrer.",
      "Heute helfe ich dem Lehrer.",
    ]);
  });

  it("step 3: the noun first, with a capital article", () => {
    const set = makeSet(noun("Lehrer"), 3, first);
    expect(plain(set).slice(0, 3)).toEqual(["Das ist der Lehrer.", "Den Lehrer frage ich.", "Dem Lehrer helfe ich."]);
    expect(set.rows.slice(0, 3).map((r) => r.answer)).toEqual(["der", "Den", "Dem"]);
  });

  it("marks the word that decides the case", () => {
    const set = makeSet(noun("Lehrer"), 1, first);
    expect(rowSentence(set.rows[1], "___", "Lehrer", (w) => `<${w}>`)).toBe("Ich <frage> ___ Lehrer.");
  });

  it("adds the Dativ plural -n only where it belongs", () => {
    expect(["Kinder", "Tische", "Väter", "Frauen", "Autos", "Städte"].map(dativePlural)).toEqual([
      "Kindern", "Tischen", "Vätern", "Frauen", "Autos", "Städten",
    ]);
  });

  it("leaves out the plural rows when a noun has no plural", () => {
    expect(noun("Milch").plurals).toEqual([]);
    expect(makeSet(noun("Milch"), 1).rows).toHaveLength(3);
  });

  it("every row of every noun, at every step, matches the article table and reads as a sentence", () => {
    for (const n of CATEGORIES.find((c) => c.id === "all")!.nouns as (DataNoun & { group: Group })[]) {
      for (const step of [1, 2, 3, 4]) {
        const set = makeSet(n, step);
        expect([3, 6]).toContain(set.rows.length);
        for (const row of set.rows) {
          const expected = row.plural ? (row.case === "Dativ" ? "den" : "die") : ARTICLES[row.case][n.gender];
          expect(row.answer.toLowerCase(), `${n.word} ${row.case}`).toBe(expected);
          const text = rowSentence(row, row.answer);
          expect(text).toMatch(/^[A-ZÄÖÜ].*[.?!]$/);
          expect(text).not.toMatch(/undefined|\{|\[|  /);
          expect(row.explain(t).join(" ")).not.toMatch(/\{|cases\.|explain\./);
        }
        // Akkusativ and Dativ: the plural row is the same sentence.
        if (set.rows.length === 6) expect(set.rows[4].text).toBe(set.rows[1].text);
        if (step === 2) expect(TIMES.some((time) => set.rows[1].text.startsWith(time))).toBe(true);
        if (step === 3) expect(set.rows[1].text).toMatch(/^(\[[^\]]+\] )?\{X\}/);
      }
    }
  });
});

describe("masculine nouns that change (n-Deklination)", () => {
  it("uses den Bären, dem Präsidenten, and says why", () => {
    const bear = makeSet(noun("Bär"), 1, first);
    expect(bear.rows.slice(0, 3).map((r) => r.noun)).toEqual(["Bär", "Bären", "Bären"]);
    const president = makeSet(noun("Präsident"), 1, first);
    expect(plain(president).slice(0, 3)).toEqual([
      "Der Präsident wartet schon.",
      "Ich frage den Präsidenten.",
      "Ich helfe dem Präsidenten.",
    ]);
    expect(president.rows[1].explain(t).at(-1)).toBe(
      "Präsident is one of the masculine nouns that add -n or -en outside the Nominativ: den Präsidenten.",
    );
  });
});
