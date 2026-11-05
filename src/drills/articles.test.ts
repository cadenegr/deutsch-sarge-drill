import { describe, expect, it } from "vitest";
import { NOUNS, PATTERNS, makeDrill, makeExercise, trigger, type ArticleExercise } from "./articles";
import { BLOCK_SIZE, isCorrect, sentence } from "./exercise";

function exerciseFor(word: string, before: string): ArticleExercise {
  const noun = NOUNS.find((n) => n.word === word)!;
  const pattern = PATTERNS.find((p) => p.before === before)!;
  let pick = 0;
  const picks = [NOUNS.indexOf(noun) / NOUNS.length, PATTERNS.indexOf(pattern) / PATTERNS.length];
  return makeExercise(() => picks[pick++]);
}

describe("articles drill", () => {
  it("gives the right article for each case", () => {
    expect(exerciseFor("Hund", "Ich sehe").answer).toBe("den");
    expect(exerciseFor("Hund", "Was machst du mit").answer).toBe("dem");
    expect(exerciseFor("Katze", "Was machst du mit").answer).toBe("der");
    expect(exerciseFor("Buch", "Das ist für").answer).toBe("das");
    expect(exerciseFor("Tür", "Wo ist").answer).toBe("die");
  });

  it("capitalizes the article at the start of a sentence", () => {
    const exercise = exerciseFor("Auto", "");
    expect(exercise.answer).toBe("Das");
    expect(sentence(exercise, exercise.answer)).toBe("Das Auto ist neu.");
    expect(isCorrect(exercise, "das")).toBe(true);
  });

  it("builds the sentence around the blank", () => {
    const exercise = exerciseFor("Schlüssel", "Ich gehe nicht ohne");
    expect(sentence(exercise, "___")).toBe("Ich gehe nicht ohne ___ Schlüssel.");
  });

  it("in blocks: one trigger word per block of 5, never the same noun twice in a block", () => {
    const drill = makeDrill("blocks", 20);
    expect(drill).toHaveLength(20);
    const blocks = [0, 5, 10, 15].map((start) => drill.slice(start, start + BLOCK_SIZE));
    for (const block of blocks) {
      expect(new Set(block.map((e) => trigger(e.pattern))).size).toBe(1);
      expect(new Set(block.map((e) => e.noun.word)).size).toBe(BLOCK_SIZE);
      expect(new Set(block.map((e) => e.noun.gender))).toEqual(new Set(["m", "f", "n"]));
    }
    expect(new Set(blocks.map((b) => trigger(b[0].pattern))).size).toBe(4);
  });

  it("mixed stays one random pick per exercise", () => {
    expect(makeDrill("mixed", 20)).toHaveLength(20);
  });

  it("accepts spaces and any capitals, not a wrong article", () => {
    const exercise = exerciseFor("Park", "Das kommt aus");
    expect(isCorrect(exercise, "  DEM ")).toBe(true);
    expect(isCorrect(exercise, "den")).toBe(false);
  });
});
