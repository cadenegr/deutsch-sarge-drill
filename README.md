# Deutsch Sarge Drill

German grammar by repetition: many typed exercises, one rule at a time, with
an explanation in English or Spanish after every answer.

```sh
npm install
npm run dev     # open the shown address; the Network one works on your phone
npm test
```

## Drills

- **Articles & cases**: der / den / dem in Nominativ, Akkusativ, Dativ
- **Gender**: der / die / das for 3,000 common nouns, by ending or by heart
- **Plural**: die Tage, die Kinder… for 2,200 nouns, by pattern or by heart
- **Cases**: one noun in Nominativ, Akkusativ, Dativ, singular and plural

## Word list

`src/data/nouns.json` is built by `node scripts/build-nouns.mjs` (and `src/data/verbs.json` by
`node scripts/build-verbs.mjs`, from Wiktionary verbs) from:

- [Wiktionary](https://en.wiktionary.org) nouns as extracted by
  [kaikki.org](https://kaikki.org/dictionary/German/), CC BY-SA 4.0
- word counts from the [Leipzig Corpora Collection](https://wortschatz.uni-leipzig.de/en/download/German)
  (deu_mixed-typical_2011_1M), CC BY 4.0
- [OdeNet](https://github.com/hdaSprachtechnologie/odenet), the Open German
  WordNet, CC BY-SA 4.0, and the [Open English WordNet](https://github.com/globalwordnet/english-wordnet)
  2025, CC BY 4.0: what kind of thing a noun is (person, place, food…)

`scripts/skip-nouns.txt` and `scripts/noun-groups.txt` hold the few
corrections by hand.

The download links are at the top of the script; the files go in `.cache/`.

## From a book to drills (pipeline, work in progress)

`scripts/pipeline/` reads a book the learner owns (EPUB, PDF with text, or
TXT) on their own computer and finds the grammar in it. Nothing is
uploaded, and the drills will be new sentences, not copies of the book.
Each step does one job, checks the file from the step before, and writes
its own into `.cache/pipeline/<book>/`:

1. `1-read.mjs`: the file → German paragraphs (English and Plattdeutsch are dropped)
2. `2-split.mjs`: paragraphs → sentences
3. `3-measure.mjs`: words, characters, commas
4. `4-analyse.py`: case, gender, number, tense of every word, with
   [spaCy](https://spacy.io) (MIT) and its `de_core_news_md` model
5. `5-label.mjs`: the rules of `docs/grammar-map.md` each sentence shows
   (`3.2`, `6.6`, `8.7`…), finer tags (`mit+Dativ`, `weil-Nebensatz`,
   `Präteritum-unregelmäßig`…), and every preposition phrase cut into slots
   (Präposition + Artikel + Adjektiv + Nomen); `5-summary.md` to read.
   Which verbs take *sein* in the Perfekt comes from Wiktionary:
   `node scripts/build-sein-verbs.mjs` writes `scripts/pipeline/sein-verbs.txt`

6. `6-engine.mjs`: one sample sentence → every example of its shape in the
   texts (find), or new correct ones (create), solved by the constraint
   engine in `engine/`: its core is copied from
   [github.com/cadenegr/skyscrapers](https://github.com/cadenegr/skyscrapers)
   (see `engine/core/README.md`), the `sentence` plug-in lives here.
   For now: `mit + article + noun`.
   `node scripts/pipeline/6-engine.mjs "Ich fahre mit dem Bus." --open noun`
   (`--open article|noun|both|none`, `--create`). Build the engine first:
   `make -C engine` (tests: `make -C engine test`).

Setup once: `python3 -m venv .venv && .venv/bin/pip install spacy && .venv/bin/python -m spacy download de_core_news_md`

Run: `node scripts/pipeline/run.mjs book.epub`

Tatoeba: `node scripts/pipeline/run.mjs .cache/tatoeba/tatoeba.tsv` (the
[German export](https://downloads.tatoeba.org/exports/per_language/deu/deu_sentences.tsv.bz2),
unpacked and renamed), then `node scripts/build-baseline.mjs` writes
`src/data/baseline.json`: the sentences the app knows without any book,
a few hundred for each grammar map rule the pipeline can find (Tatoeba,
CC BY 2.0 FR, each with its sentence number). `src/baseline.ts` finds them
by rule number and tag.

Demo book: [Deutsche Märchen gesammelt durch die Brüder Grimm](https://www.gutenberg.org/ebooks/77905),
Project Gutenberg, public domain; saved as `.cache/books/grimm.epub`.

## Licence

The code is MIT (see `LICENSE`). The engine core in `engine/core/` is also
MIT, from [github.com/cadenegr/skyscrapers](https://github.com/cadenegr/skyscrapers).

The data keeps the licence of its source:

- `src/data/nouns.json`, `src/data/verbs.json`, `scripts/pipeline/sein-verbs.txt`:
  from Wiktionary via kaikki.org (CC BY-SA 4.0), with OdeNet (CC BY-SA 4.0),
  the Open English WordNet (CC BY 4.0) and the Leipzig Corpora Collection
  (CC BY 4.0), see "Word list" above
- `src/data/baseline.json`: sentences from [Tatoeba](https://tatoeba.org)
  (CC BY 2.0 FR); each keeps its sentence number (`src`), so it can be
  credited at https://tatoeba.org/sentences/show/<src>
