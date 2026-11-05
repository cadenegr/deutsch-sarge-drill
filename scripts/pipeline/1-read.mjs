// Step 1, read: a book file (EPUB, PDF or TXT) → plain German paragraphs.
// Everything stays on this computer; nothing is uploaded.
//
// Run: node scripts/pipeline/1-read.mjs <book file> <output folder>
// Writes: <output folder>/1-text.txt (paragraphs separated by a blank line)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { extname, join } from "node:path";
import { epubToParagraphs, pdfToParagraphs, textToParagraphs, looksGerman } from "./lib/read.mjs";

const [file, outDir] = process.argv.slice(2);
if (!file || !outDir) fail("usage: node scripts/pipeline/1-read.mjs <book file> <output folder>");
if (!existsSync(file)) fail(`no such file: ${file}`);

const buf = readFileSync(file);
const type = extname(file).toLowerCase();
let paragraphs;
if (type === ".epub") paragraphs = epubToParagraphs(buf);
else if (type === ".pdf") paragraphs = await pdfToParagraphs(buf);
else if (type === ".txt") paragraphs = textToParagraphs(buf.toString("utf8"));
else fail(`unknown file type "${type}": use .epub, .pdf or .txt`);

const german = paragraphs.filter(looksGerman);
if (german.length === 0) {
  fail(type === ".pdf"
    ? "no German text found. If this PDF is scanned pages (pictures), it has no text to read."
    : "no German text found in this file.");
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "1-text.txt"), german.join("\n\n") + "\n");
console.log(`1 read:    ${paragraphs.length} paragraphs, ${german.length} German, ${paragraphs.length - german.length} skipped (headings, English, page numbers)`);

function fail(msg) {
  console.error(`1 read: ${msg}`);
  process.exit(1);
}
