"""Step 4, analyse: the grammar of every word, with spaCy (open source, MIT).

For each word: lemma (dictionary form), part of speech, case, gender,
number, tense, and which word it belongs to (the parse tree).

Setup once (a local Python environment, kept out of git):
    python3 -m venv .venv
    .venv/bin/pip install spacy
    .venv/bin/python -m spacy download de_core_news_md

Run: .venv/bin/python scripts/pipeline/4-analyse.py <output folder>
Reads 3-measured.jsonl, writes 4-analysed.jsonl (same lines + "tokens").
"""

import json
import sys
from pathlib import Path


def fail(msg):
    print(f"4 analyse: {msg}", file=sys.stderr)
    sys.exit(1)


if len(sys.argv) != 2:
    fail("usage: .venv/bin/python scripts/pipeline/4-analyse.py <output folder>")
folder = Path(sys.argv[1])
source = folder / "3-measured.jsonl"
if not source.exists():
    fail(f"needs {source}: run step 3 first")

def read_sentences():
    with source.open(encoding="utf8") as f:
        for n, line in enumerate(f):
            if not line.strip():
                continue
            s = json.loads(line)
            if not isinstance(s.get("text"), str) or "words" not in s:
                fail(f"line {n + 1} has no text or measures")
            yield s["text"], s


import spacy  # noqa: E402  (slow import, only after the input is found)

try:
    nlp = spacy.load("de_core_news_md", disable=["ner"])
except OSError:
    fail("German model missing: .venv/bin/python -m spacy download de_core_news_md")

count = words = 0
with (folder / "4-analysed.jsonl").open("w", encoding="utf8") as out:
    for doc, s in nlp.pipe(read_sentences(), as_tuples=True, batch_size=256):
        s["tokens"] = [
            {
                "i": t.i,
                "text": t.text,
                "lemma": t.lemma_,
                "pos": t.pos_,  # NOUN, VERB, ADP (preposition)…
                "tag": t.tag_,  # finer German tags: APPR, ART, VVFIN…
                "morph": t.morph.to_dict(),  # {"Case": "Dat", "Gender": "Fem", …}
                "dep": t.dep_,
                "head": t.head.i,
            }
            for t in doc
        ]
        out.write(json.dumps(s, ensure_ascii=False) + "\n")
        count += 1
        words += s["words"]
        if count % 50000 == 0:
            print(f"4 analyse: {count} sentences…", flush=True)

if count == 0:
    fail("3-measured.jsonl is empty")
print(f"4 analyse: {count} sentences, {words} words analysed")
