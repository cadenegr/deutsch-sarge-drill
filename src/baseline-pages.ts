// Everything that needs the baseline (1.7 MB of sentences), in one module
// that main.ts loads only when it is needed, so the app itself stays small:
// the grammar map pages (every rule, and its example sentences) and the
// real-sentence Dativ drill.

import { RULES, find, ruleCounts, type Phrase, type Sentence } from "./baseline";
import type { Translate } from "./drills/exercise";

export { makeDrill as makeRealDativDrill } from "./drills/real-dativ";

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

// The list of rules, in map order: number, title, level, how many sentences.
export function rulesList(t: Translate): string {
  return `
    <p class="subtitle">${t("rules.intro")}</p>
    <ul class="rule-list">
      ${ruleCounts()
        .map(
          ([rule, count]) => `
        <li><button class="rule-row" data-action="rule" data-value="${rule.id}">
          <span class="rule-id">${rule.id}${rule.star ? " ★" : ""}</span>
          <span class="rule-title">${escapeHtml(rule.title)}</span>
          <span class="rule-meta">${rule.level} · ${t("rules.count", { count })}</span>
        </button></li>`,
        )
        .join("")}
    </ul>
    <p class="source">${t("rules.credit")}</p>`;
}

// One rule: its sentences, shortest first, with the phrase that shows the
// rule marked (for the preposition and article rules).
export function ruleSentences(id: string, t: Translate): string {
  const rule = RULES.find((r) => r.id === id);
  if (!rule) return "";
  const sentences = [...find({ rules: [id] })].sort((a, b) => a.words - b.words || a.text.length - b.text.length);
  return `
    <h1 class="rule-heading">${rule.id}${rule.star ? " ★" : ""} ${escapeHtml(rule.title)}</h1>
    <p class="rule-meta">${rule.level} · ${t("rules.count", { count: sentences.length })}</p>
    <ol class="sentence-list">
      ${sentences
        .map(
          (s) => `
        <li>${marked(s, id)}
          <a class="source" href="https://tatoeba.org/sentences/show/${s.src}" target="_blank" rel="noopener">#${s.src}</a></li>`,
        )
        .join("")}
    </ol>
    <p class="source">${t("rules.credit")}</p>`;
}

const PREPS: Record<string, string[]> = {
  "3.1": ["durch", "für", "gegen", "ohne", "um", "bis"],
  "3.2": ["aus", "bei", "mit", "nach", "seit", "von", "zu", "gegenüber"],
  "3.3": ["in", "an", "auf", "über", "unter", "vor", "hinter", "neben", "zwischen"],
  "3.8": ["wegen", "trotz", "während", "statt", "anstatt"],
};

// Which phrase shows the rule: the same tests as scripts/pipeline/lib/rules.mjs.
export function showsRule(p: Phrase, id: string): boolean {
  const det = p.slots[1];
  const last = p.slots.at(-1)!;
  if (PREPS[id]) return PREPS[id].includes(p.prep);
  if (id === "3.4") return p.slots[0][0] === "prepart";
  if (id === "1.7") return p.case === "Dat" && det?.[0] === "def";
  if (id === "1.8") return p.case === "Dat" && (det?.[0] === "indef" || /^kein/i.test(det?.[1] ?? ""));
  if (id === "1.9") return p.case === "Dat" && /^den$/i.test(det?.[1] ?? "") && last[5] === "Plur";
  if (id === "1.10") return p.slots.some((x) => x[0] === "poss");
  return false;
}

function marked(s: Sentence, id: string): string {
  const phrase = s.phrases.find((p) => showsRule(p, id));
  if (!phrase) return escapeHtml(s.text);
  const last = phrase.slots.at(-1)![1];
  const end = s.text.indexOf(last, phrase.at) + last.length;
  if (end < phrase.at + last.length) return escapeHtml(s.text);
  return `${escapeHtml(s.text.slice(0, phrase.at))}<mark>${escapeHtml(s.text.slice(phrase.at, end))}</mark>${escapeHtml(s.text.slice(end))}`;
}
