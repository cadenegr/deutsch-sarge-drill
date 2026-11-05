import { describe, expect, it } from "vitest";
import { htmlToParagraphs, looksGerman, textToParagraphs } from "./read.mjs";
import { splitSentences, isSentence } from "./split.mjs";
import { readFileSync } from "node:fs";
import { labelSentence, isRegularPast } from "./label.mjs";
import { RULES, rulesOf, parseGrammarMap } from "./rules.mjs";

describe("step 1, read", () => {
  it("turns HTML into paragraphs and decodes entities", () => {
    const html = `<html><head><title>x</title></head><body><h1>Die Rübe</h1>
      <p>Es waren einmal zwei Brüder,
      die dienten beide als Soldaten.</p><p>Grün &amp; &#246;de&#x21;&nbsp;</p></body></html>`;
    expect(htmlToParagraphs(html)).toEqual(["Die Rübe", "Es waren einmal zwei Brüder, die dienten beide als Soldaten.", "Grün & öde!"]);
  });

  it("joins words broken at a line end in text and PDFs", () => {
    expect(textToParagraphs("Es war ein Schu-\nster.\n\nZweiter Absatz.")).toEqual(["Es war ein Schuster.", "Zweiter Absatz."]);
  });

  it("keeps German, drops English and Plattdeutsch", () => {
    expect(looksGerman("Es war ein Schuster ohne seine Schuld so arm geworden, daß ihm nichts mehr blieb.")).toBe(true);
    expect(looksGerman("This eBook is for the use of anyone anywhere in the United States.")).toBe(false);
    expect(looksGerman("Dar wöör mal eens en Fischer un syne Fru, de wahnden tosamen in'n Pißputt.")).toBe(false);
    expect(looksGerman("Hänsel und Gretel 102")).toBe(true);
    expect(looksGerman("102")).toBe(false);
  });
});

describe("step 2, split", () => {
  it("splits at . ! ? before a capital letter", () => {
    expect(splitSentences("Er kam. Sie ging! Wer war das? Niemand.")).toEqual(["Er kam.", "Sie ging!", "Wer war das?", "Niemand."]);
  });

  it("keeps quotes with their sentence", () => {
    expect(splitSentences("Da sprach er: »Wie geht's?« Die Frau lachte.")).toEqual(["Da sprach er: »Wie geht's?«", "Die Frau lachte."]);
  });

  it("does not split when the next word is lowercase (»Komm!« sprach er.)", () => {
    expect(splitSentences("»Komm her!« sprach der König.")).toEqual(["»Komm her!« sprach der König."]);
  });

  it("does not split after abbreviations or numbers", () => {
    expect(splitSentences("Er kam z. B. am 3. Mai mit Dr. Müller. Dann ging er.")).toEqual(["Er kam z. B. am 3. Mai mit Dr. Müller.", "Dann ging er."]);
  });

  it("drops headings and page numbers", () => {
    expect(isSentence("Die Wichtelmänner 10")).toBe(false);
    expect(isSentence("Erstes Märchen.")).toBe(false);
    expect(isSentence("Da nickte es.")).toBe(true);
  });
});

// spaCy's real analysis of: "Der König ging mit seiner schönen Tochter in den Wald, weil er Hunger hatte."
const T = (i, text, lemma, pos, tag, morph, dep, head) => ({ i, text, lemma, pos, tag, morph, dep, head });
const KOENIG = {
  text: "Der König ging mit seiner schönen Tochter in den Wald, weil er Hunger hatte.",
  words: 14,
  commas: 1,
  tokens: [
    T(0, "Der", "der", "DET", "ART", { Case: "Nom", Definite: "Def", Gender: "Masc", Number: "Sing" }, "nk", 1),
    T(1, "König", "König", "NOUN", "NN", { Case: "Nom", Gender: "Masc", Number: "Sing" }, "sb", 2),
    T(2, "ging", "gehen", "VERB", "VVFIN", { Mood: "Ind", Tense: "Past", VerbForm: "Fin" }, "ROOT", 2),
    T(3, "mit", "mit", "ADP", "APPR", {}, "mo", 2),
    T(4, "seiner", "sein", "DET", "PPOSAT", { Case: "Dat", Gender: "Fem", Number: "Sing" }, "nk", 6),
    T(5, "schönen", "schön", "ADJ", "ADJA", { Case: "Dat", Gender: "Fem", Number: "Sing" }, "nk", 6),
    T(6, "Tochter", "Tochter", "NOUN", "NN", { Case: "Dat", Gender: "Fem", Number: "Sing" }, "nk", 3),
    T(7, "in", "in", "ADP", "APPR", {}, "mo", 2),
    T(8, "den", "der", "DET", "ART", { Case: "Acc", Definite: "Def", Gender: "Masc", Number: "Sing" }, "nk", 9),
    T(9, "Wald", "Wald", "NOUN", "NN", { Case: "Acc", Gender: "Masc", Number: "Sing" }, "nk", 7),
    T(10, ",", "--", "PUNCT", "$,", {}, "punct", 2),
    T(11, "weil", "weil", "SCONJ", "KOUS", {}, "cp", 14),
    T(12, "er", "er", "PRON", "PPER", { Case: "Nom", Gender: "Masc", Number: "Sing" }, "sb", 14),
    T(13, "Hunger", "Hunger", "NOUN", "NN", { Case: "Acc", Gender: "Masc", Number: "Sing" }, "oa", 14),
    T(14, "hatte", "haben", "VERB", "VAFIN", { Mood: "Ind", Tense: "Past", VerbForm: "Fin" }, "mo", 2),
    T(15, ".", "--", "PUNCT", "$.", {}, "punct", 2),
  ],
};

describe("step 5, label", () => {
  const r = labelSentence(KOENIG);

  it("gives one sentence all its labels", () => {
    expect(r.labels).toEqual([
      "Akkusativ-Objekt", "Präteritum", "Präteritum-sein/haben/Modal", "Präteritum-unregelmäßig", "in+Akkusativ", "mit+Dativ", "weil-Nebensatz",
    ]);
    expect(r.length).toBe("medium");
  });

  it("cuts the mit phrase into slots", () => {
    const mit = r.phrases.find((p) => p.prep === "mit");
    expect(mit.ok).toBe(true);
    expect(mit.text).toBe("mit seiner schönen Tochter");
    expect(mit.pattern).toBe("Präposition + Possessiv + Adjektiv + Nomen");
    expect(mit.slots.map((s) => s.role)).toEqual(["prep", "poss", "adj", "noun"]);
    expect(mit.slots[3]).toMatchObject({ lemma: "Tochter", case: "Dat", gender: "Fem", number: "Sing" });
  });

  it("does not trust the parser when it gives mit another case", () => {
    const wrong = structuredClone(KOENIG);
    for (const i of [4, 5, 6]) wrong.tokens[i].morph.Case = "Acc";
    const mit = labelSentence(wrong).phrases.find((p) => p.prep === "mit");
    expect(mit.ok).toBe(false);
    expect(labelSentence(wrong).labels).toContain("mit+?");
  });

  it("knows Perfekt (haben + Partizip) and old spelling daß", () => {
    const s = {
      text: "Er sagte, daß er gegessen hat.", words: 6, commas: 1,
      tokens: [
        T(0, "Er", "er", "PRON", "PPER", { Case: "Nom" }, "sb", 1),
        T(1, "sagte", "sagen", "VERB", "VVFIN", { Tense: "Past" }, "ROOT", 1),
        T(2, ",", "--", "PUNCT", "$,", {}, "punct", 1),
        T(3, "daß", "daß", "SCONJ", "KOUS", {}, "cp", 6),
        T(4, "er", "er", "PRON", "PPER", { Case: "Nom" }, "sb", 6),
        T(5, "gegessen", "essen", "VERB", "VVPP", {}, "oc", 6),
        T(6, "hat", "haben", "AUX", "VAFIN", { Tense: "Pres" }, "oc", 1),
        T(7, ".", "--", "PUNCT", "$.", {}, "punct", 1),
      ],
    };
    expect(labelSentence(s).labels).toEqual(["Perfekt", "Perfekt-haben", "Präteritum", "Präteritum-regelmäßig", "dass-Nebensatz"]);
  });

  it("a modal verb needs its infinitive: Ich kann schwimmen, not Ich mag Mathe", () => {
    const sentence = (verb, other) => ({
      text: "x", words: 3, commas: 0,
      tokens: [
        T(0, "Ich", "ich", "PRON", "PPER", { Case: "Nom" }, "sb", 1),
        T(1, verb, verb === "kann" ? "können" : "mögen", "VERB", "VMFIN", { Tense: "Pres" }, "ROOT", 1),
        other,
      ],
    });
    expect(labelSentence(sentence("kann", T(2, "schwimmen", "schwimmen", "VERB", "VVINF", {}, "oc", 1))).labels).toContain("Modalverb");
    expect(labelSentence(sentence("mag", T(2, "Mathe", "Mathe", "NOUN", "NN", { Case: "Acc" }, "oa", 1))).labels).not.toContain("Modalverb");
  });
});

describe("Konjunktiv is not Präteritum", () => {
  const verb = (text, lemma, tag, morph, extra = []) => ({
    text: "x", words: 3, commas: 0,
    tokens: [T(0, "Ich", "ich", "PRON", "PPER", { Case: "Nom" }, "sb", 1), T(1, text, lemma, "VERB", tag, morph, "ROOT", 1), ...extra],
  });
  const SUB_PAST = { Mood: "Sub", Tense: "Past" };

  it("hätte, könnte → Konjunktiv II (7.2), not 6.4", () => {
    const r = labelSentence(verb("hätte", "haben", "VAFIN", SUB_PAST));
    expect(r.labels).toEqual(["Konjunktiv-II"]);
    expect(rulesOf(r)).toEqual(["7.2"]);
    expect(labelSentence(verb("könnte", "können", "VMFIN", SUB_PAST)).labels).not.toContain("Präteritum");
  });

  it("hätte gesagt → Konjunktiv II past (7.3), not Plusquamperfekt", () => {
    const r = labelSentence(verb("hätte", "haben", "VAFIN", SUB_PAST, [T(2, "gesagt", "sagen", "VERB", "VVPP", {}, "oc", 1)]));
    expect(rulesOf(r)).toEqual(["7.3"]);
  });

  it("er sei → the Konjunktiv-I tag, but not dass ich komme (looks like the present)", () => {
    const sub = (subject, form, lemma) => ({
      text: "x", words: 3, commas: 0,
      tokens: [
        T(0, subject, subject.toLowerCase(), "PRON", "PPER", { Case: "Nom" }, "sb", 1),
        T(1, form, lemma, "VERB", "VVFIN", { Mood: "Sub", Tense: "Pres", Person: "3", Number: "Sing" }, "ROOT", 1),
      ],
    });
    const tags = (s) => labelSentence(s).labels;
    expect(tags(sub("er", "sei", "sein"))).toEqual(["Konjunktiv-I"]);
    expect(tags(sub("Er", "komme", "kommen"))).toEqual(["Konjunktiv-I"]);
    // The parser says person 3, but the subject is "ich": the normal present.
    expect(tags(sub("ich", "komme", "kommen"))).toEqual([]);
    // "Bitte sei leise": no subject, an imperative.
    expect(tags(verb("sei", "sein", "VAFIN", { Mood: "Sub", Tense: "Pres", Person: "3", Number: "Sing" }))).toEqual([]);
    // Not a grammar map rule yet (7.8 is not trusted).
    expect(rulesOf(labelSentence(sub("er", "sei", "sein")))).toEqual([]);
  });

  it("Er ist gegangen → Perfekt (6.2); Die Tür ist geöffnet → a state, no tense", () => {
    const ist = (part, lemma) => verb("ist", "sein", "VAFIN", { Mood: "Ind", Tense: "Pres" }, [T(2, part, lemma, "VERB", "VVPP", {}, "oc", 1)]);
    expect(rulesOf(labelSentence(ist("gegangen", "gehen")))).toEqual(["6.2"]);
    expect(rulesOf(labelSentence(ist("passiert", "passieren")))).toEqual(["6.2"]);
    const tuer = labelSentence(ist("geöffnet", "öffnen"));
    expect(rulesOf(tuer)).toEqual([]);
    expect(tuer.labels).toEqual(["Zustand-sein+Partizip"]);
  });

  it("a verb the parser does not know gets no tense (Lass → lemma Lass)", () => {
    expect(labelSentence(verb("Lass", "Lass", "VVFIN", { Mood: "Ind", Tense: "Past" })).labels).toEqual([]);
  });
});

describe("regular or irregular Präteritum", () => {
  it("stem + te is regular", () => {
    for (const [form, lemma] of [["machte", "machen"], ["arbeitete", "arbeiten"], ["Wohnten", "wohnen"], ["kauftest", "kaufen"]]) {
      expect(isRegularPast(form, lemma), form).toBe(true);
    }
  });
  it("a changed stem is irregular", () => {
    for (const [form, lemma] of [["ging", "gehen"], ["dachte", "denken"], ["brachte", "bringen"], ["kam", "kommen"], ["wusste", "wissen"]]) {
      expect(isRegularPast(form, lemma), form).toBe(false);
    }
  });
});

describe("grammar map rules", () => {
  const map = parseGrammarMap(readFileSync("docs/grammar-map.md", "utf8"));

  it("reads every rule of the map, with its level", () => {
    expect(map.length).toBeGreaterThan(80);
    expect(map.find((r) => r.id === "3.2")).toMatchObject({ star: true, level: "A2" });
    expect(new Set(map.map((r) => r.id)).size).toBe(map.length);
  });

  it("every finder belongs to a rule that is in the map", () => {
    for (const id of Object.keys(RULES)) expect(map.some((r) => r.id === id), id).toBe(true);
  });

  it("Der König ging mit seiner schönen Tochter in den Wald, weil er Hunger hatte.", () => {
    // possessive, mit + Dativ, in + Akkusativ, hatte, ging, weil
    expect(rulesOf(labelSentence(KOENIG))).toEqual(["1.10", "3.2", "3.3", "6.4", "6.6", "8.7"]);
  });
});
