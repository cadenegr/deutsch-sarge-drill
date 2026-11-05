// Runs the whole pipeline on one book, step by step. Each step reads the
// file the step before wrote, checks it, and writes its own.
//
// Run: node scripts/pipeline/run.mjs <book.epub | book.pdf | book.txt | tatoeba deu_sentences.tsv>
// Output: .cache/pipeline/<book name>/

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { basename, extname, join } from "node:path";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/pipeline/run.mjs <book.epub | book.pdf | book.txt>");
  process.exit(1);
}
const dir = join(".cache/pipeline", basename(file, extname(file)));
const python = ".venv/bin/python";
if (!existsSync(python)) {
  console.error("step 4 needs spaCy: see the setup lines at the top of scripts/pipeline/4-analyse.py");
  process.exit(1);
}

// A Tatoeba export (.tsv) is already one sentence per line: read and split are one step.
const first = extname(file) === ".tsv"
  ? [["node", "scripts/pipeline/1-read-tatoeba.mjs", file, dir]]
  : [["node", "scripts/pipeline/1-read.mjs", file, dir], ["node", "scripts/pipeline/2-split.mjs", dir]];
const steps = [
  ...first,
  ["node", "scripts/pipeline/3-measure.mjs", dir],
  [python, "scripts/pipeline/4-analyse.py", dir],
  ["node", "scripts/pipeline/5-label.mjs", dir],
];
for (const [cmd, ...args] of steps) {
  const { status } = spawnSync(cmd, args, { stdio: "inherit" });
  if (status !== 0) process.exit(status ?? 1);
}
