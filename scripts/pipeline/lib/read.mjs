// Step 1 helpers: turn an EPUB, PDF or text file into plain paragraphs,
// and keep only the German ones (books also have English licence pages,
// tables of contents, page numbers…).

import { readZip } from "./zip.mjs";

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** HTML (one EPUB page) → list of paragraphs. */
export function htmlToParagraphs(html) {
  return html
    .replace(/<head[\s\S]*?<\/head>|<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "")
    // Block elements end a paragraph; line breaks inside a <p> are only wrapping.
    .replace(/<\/(p|div|h[1-6]|li|blockquote|tr|section)>|<br\s*\/?>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) =>
      e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENTITIES[e] ?? m,
    )
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** EPUB → paragraphs, in reading order (the "spine" in content.opf). */
export function epubToParagraphs(buf) {
  const files = readZip(buf);
  const text = (name) => {
    const f = files.get(name);
    if (!f) throw new Error(`EPUB is missing ${name}`);
    return f.toString("utf8");
  };
  const opfPath = text("META-INF/container.xml").match(/full-path="([^"]+)"/)?.[1];
  if (!opfPath) throw new Error("EPUB container.xml does not name a content file");
  const opf = text(opfPath);
  const dir = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1) : "";

  const hrefOf = new Map();
  for (const [item] of opf.matchAll(/<item\b[^>]*>/g)) {
    const id = item.match(/\bid="([^"]+)"/)?.[1];
    const href = item.match(/\bhref="([^"]+)"/)?.[1];
    if (id && href) hrefOf.set(id, dir + decodeURIComponent(href));
  }
  const pages = [...opf.matchAll(/<itemref\b[^>]*idref="([^"]+)"/g)].map((m) => hrefOf.get(m[1])).filter(Boolean);
  if (pages.length === 0) throw new Error("EPUB has no pages in its reading order");
  return pages.flatMap((p) => htmlToParagraphs(text(p)));
}

/** PDF → paragraphs. Only works for PDFs with real text, not scanned pages. */
export async function pdfToParagraphs(buf) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), verbosity: 0 }).promise;
  const lines = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    let line = "";
    for (const item of (await page.getTextContent()).items) {
      line += item.str;
      if (item.hasEOL) { lines.push(line); line = ""; }
    }
    lines.push(line, ""); // a page break ends a paragraph… mostly
  }
  return linesToParagraphs(lines);
}

/** Plain text → paragraphs (blank lines between paragraphs). */
export function textToParagraphs(text) {
  return linesToParagraphs(text.split(/\r?\n/));
}

function linesToParagraphs(lines) {
  const paragraphs = [];
  let cur = "";
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (cur) paragraphs.push(cur);
      cur = "";
    } else if (cur.endsWith("-") && /^[a-zäöüß]/.test(line)) {
      cur = cur.slice(0, -1) + line; // word broken at the line end: "Schu-\nster"
    } else {
      cur = cur ? `${cur} ${line}` : line;
    }
  }
  if (cur) paragraphs.push(cur);
  return paragraphs.map((p) => p.replace(/\s+/g, " "));
}

// Short, very common words: enough to tell German from English.
const GERMAN = new Set("der die das den dem des ein eine einen einem einer und ist war nicht sich er sie es ich du wir ihr zu mit von auf in im an am als auch so da daß dass wie aber noch nur sein seine hatte wenn weil".split(" "));
const ENGLISH = new Set("the of and to is was it you he she that this with for not be are or by on at from his her have had which".split(" "));
// Plattdeutsch (Low German): old fairy tales often have some. Not standard German.
const LOW_GERMAN = new Set("un dat de wat ick he nich wöör wör harr sä se wi up ehr sien syn".split(" "));

/** True if the paragraph looks like standard German (more German small words than English or Plattdeutsch ones). */
export function looksGerman(paragraph) {
  let de = 0, en = 0, low = 0;
  for (const w of paragraph.toLowerCase().match(/[a-zäöüß]+/g) ?? []) {
    if (GERMAN.has(w)) de++;
    if (ENGLISH.has(w)) en++;
    if (LOW_GERMAN.has(w)) low++;
  }
  return de > 0 && de > en && de > low;
}
