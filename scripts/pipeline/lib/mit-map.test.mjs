import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { DATIV_ARTICLES, DATIV_RULE, GN, buildLexicon, buildMap, parseSample, readSolutions } from "./mit-map.mjs";

const NOUNS = JSON.parse(readFileSync("src/data/nouns.json", "utf8"));
const lexicon = buildLexicon(NOUNS);
const allowed = (article, gn) => DATIV_RULE.some(([a, g]) => DATIV_ARTICLES[a] === article && g === gn);

describe("the Dativ rule after mit", () => {
  it("fits fewer than 32 articles in one cell", () => {
    expect(DATIV_ARTICLES.length).toBeLessThanOrEqual(32);
    expect(new Set(DATIV_ARTICLES).size).toBe(DATIV_ARTICLES.length);
  });

  it("dem: masculine and neuter; der: feminine; den: plural", () => {
    expect(allowed("dem", GN.m)).toBe(true);
    expect(allowed("dem", GN.n)).toBe(true);
    expect(allowed("dem", GN.f)).toBe(false);
    expect(allowed("der", GN.f)).toBe(true);
    expect(allowed("der", GN.m)).toBe(false);
    expect(allowed("den", GN.pl)).toBe(true);
    expect(allowed("den", GN.m)).toBe(false);
  });

  it("no plural with ein or jed-", () => {
    expect(DATIV_RULE.filter(([, g]) => g === GN.pl).map(([a]) => DATIV_ARTICLES[a])).not.toContain("einen");
    expect(DATIV_ARTICLES).not.toContain("jeden");
  });

  it("possessives: meinem, meiner, meinen", () => {
    expect(allowed("meinem", GN.n)).toBe(true);
    expect(allowed("meiner", GN.f)).toBe(true);
    expect(allowed("unseren", GN.pl)).toBe(true);
  });
});

describe("noun forms in the Dativ", () => {
  const forms = (word) => lexicon.filter((f) => f.noun === word).map((f) => [f.form, f.gn]);

  it("plural gets -n, unless it ends in -n or -s", () => {
    expect(forms("Kind")).toEqual([["Kind", GN.n], ["Kindern", GN.pl]]);
    expect(forms("Auto")).toEqual([["Auto", GN.n], ["Autos", GN.pl]]);
    expect(forms("Uhr")).toEqual([["Uhr", GN.f], ["Uhren", GN.pl]]);
  });

  it("weak nouns: mit dem Herrn", () => {
    expect(forms("Herr")[0]).toEqual(["Herrn", GN.m]);
  });
});

describe("sample → map → solutions", () => {
  const sample = parseSample("Ich fahre mit dem Bus zur Arbeit.", lexicon);

  it("finds the slots in the sample", () => {
    expect(sample.before).toBe("Ich fahre ");
    expect(sample.after).toBe(" zur Arbeit.");
    expect(DATIV_ARTICLES[sample.article]).toBe("dem");
    expect(lexicon[sample.nouns[0]].form).toBe("Bus");
  });

  it("does not take a sample it cannot read", () => {
    expect(parseSample("Ich fahre mit Freunden.", lexicon)).toBeNull();
    expect(parseSample("Ich fahre mit dem Xyzzy.", lexicon)).toBeNull();
  });

  it("fixes the slots that are not open", () => {
    expect(buildMap({ lexicon, sample, open: "noun", lines: null })).toContain(`domain 0 ${sample.article}\n`);
    expect(buildMap({ lexicon, sample, open: "article", lines: null })).not.toContain("domain 0 ");
    expect(buildMap({ lexicon, sample, open: "both", lines: null })).toContain("domain 5 4\n"); // a bus is a thing
  });

  it("reads the engine's answer, and refuses a broken one", () => {
    expect(readSolutions("solutions 1\n0 0 1 2 0 4\n")).toEqual([{ article: 0, noun: 34 }]);
    expect(() => readSolutions("solutions 2\n0 0 1 2 0 4\n")).toThrow();
  });
});

// With the real engine (make -C engine): skipped if it is not built.
const ENGINE = process.env.ENGINE ?? "engine/sentence-engine";
describe.skipIf(!existsSync(ENGINE))("with the engine", () => {
  const sample = parseSample("Ich fahre mit dem Bus.", lexicon);
  const solve = (map, max = 5000) => {
    const run = spawnSync(ENGINE, ["-", String(max)], { input: map, encoding: "utf8", maxBuffer: 1 << 26 });
    expect(run.status).toBe(0);
    return readSolutions(run.stdout);
  };

  it("create: every phrase is correct German", () => {
    const solutions = solve(buildMap({ lexicon, sample, open: "both", lines: null }));
    expect(solutions.length).toBeGreaterThan(100);
    for (const s of solutions) {
      const f = lexicon[s.noun];
      expect(allowed(DATIV_ARTICLES[s.article], f.gn), `mit ${DATIV_ARTICLES[s.article]} ${f.form}`).toBe(true);
      expect(f.group).toBe(lexicon[sample.nouns[0]].group);
    }
  });

  it("article open: only the articles that fit Bus", () => {
    const articles = solve(buildMap({ lexicon, sample, open: "article", lines: null })).map((s) => DATIV_ARTICLES[s.article]);
    expect(articles).toContain("dem");
    expect(articles).toContain("einem");
    expect(articles).not.toContain("der");
    expect(articles).not.toContain("den");
  });

  it("find: a wrong line in the text is not found", () => {
    const bus = sample.nouns[0];
    const lines = [{ article: DATIV_ARTICLES.indexOf("dem"), noun: bus }, { article: DATIV_ARTICLES.indexOf("der"), noun: bus }];
    const found = solve(buildMap({ lexicon, sample, open: "article", lines }));
    expect(found).toEqual([{ article: DATIV_ARTICLES.indexOf("dem"), noun: bus }]);
  });
});
