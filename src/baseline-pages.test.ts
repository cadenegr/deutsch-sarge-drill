import { describe, expect, it } from "vitest";
import { find } from "./baseline";
import { ruleSentences, showsRule } from "./baseline-pages";

const t = (key: string, values: Record<string, string | number> = {}) => `${key}${JSON.stringify(values)}`;

describe("grammar map pages", () => {
  it("marks the phrase that shows the rule in (almost) every preposition and article sentence", () => {
    for (const id of ["1.7", "1.8", "1.9", "1.10", "3.1", "3.2", "3.3", "3.4", "3.8"]) {
      const sentences = find({ rules: [id] });
      const marked = sentences.filter((s) => s.phrases.some((p) => showsRule(p, id)));
      expect(marked.length / sentences.length, id).toBeGreaterThan(0.95);
    }
  });

  it("lists a rule's sentences, shortest first, with the Tatoeba link", () => {
    const html = ruleSentences("6.6", t);
    expect(html).toContain("https://tatoeba.org/sentences/show/");
    expect((html.match(/<li>/g) ?? []).length).toBe(find({ rules: ["6.6"] }).length);
  });
});
