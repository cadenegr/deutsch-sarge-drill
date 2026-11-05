// Step 2 helper: split a paragraph into sentences.
//
// A sentence ends at . ! or ? (maybe followed by a closing quote »« " ” ')
// when the next word starts with a capital letter or an opening quote.
// Not after abbreviations ("z. B.", "Dr.") or numbers ("am 3. Mai").
// »Komm her!« sprach er. stays ONE sentence: "sprach" is lowercase.

const ABBREVIATIONS = new Set(
  "z b bzw ca dr hr fr frl nr st str usw u vgl etc evtl ggf inkl s v d h o ä geb gest jh mio mrd".split(" "),
);
const CLOSE = `«»"”“'’)`;
const OPEN = `»«"„“'‚(–-`;

export function splitSentences(paragraph) {
  const sentences = [];
  let start = 0;
  const re = new RegExp(`[.!?]+[${CLOSE}]*(?=\\s+[${OPEN}]*[A-ZÄÖÜ])`, "g");
  for (const m of paragraph.matchAll(re)) {
    const end = m.index + m[0].length;
    if (m[0][0] === ".") {
      const before = paragraph.slice(start, m.index).match(/(\S+)$/)?.[1] ?? "";
      const word = before.replace(/^.*[.(»«"„“]/, "").toLowerCase();
      if (ABBREVIATIONS.has(word) || /^\d+$/.test(word) || /^[a-zäöü]$/i.test(word)) continue;
    }
    sentences.push(paragraph.slice(start, end).trim());
    start = end;
  }
  sentences.push(paragraph.slice(start).trim());
  return sentences.filter(Boolean);
}

/** A real sentence: at least 3 words and ends like a sentence (not a heading or a page number). */
export function isSentence(s) {
  return (s.match(/[A-Za-zÄÖÜäöüß]+/g) ?? []).length >= 3 && new RegExp(`[.!?][${CLOSE}]*$`).test(s);
}
