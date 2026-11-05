import "./style.css";
import * as articles from "./drills/articles";
import * as cases from "./drills/cases";
import * as gender from "./drills/gender";
import * as plural from "./drills/plural";
import { capitalize, isCorrect, sentence, type Exercise } from "./drills/exercise";
import { makeRun, type Category, type DataNoun } from "./drills/nouns";
import { getLanguage, setLanguage, t, type MessageKey } from "./i18n";
import { loadClues, loadColors, loadOrder, loadStats, recordAnswer, saveClues, saveColors, saveOrder } from "./progress";

const SESSION_LENGTH = 20;
// In a long run a missed word comes back this many words later, not at the
// end, which may be hundreds of words away.
const REPEAT_GAP = 5;
// Letters a learner without a German keyboard can tap in.
const GERMAN_LETTERS = ["ä", "ö", "ü", "ß"];
const app = document.querySelector<HTMLDivElement>("#app")!;

// What a drill asks: one blank, or a set of rows (one noun in every case).
type Item = Exercise | cases.CaseSet;

function isSet(item: Item): item is cases.CaseSet {
  return "rows" in item;
}

// A page is one rule of the grammar map: a menu of categories, each a long
// run through every word of that category.
interface Page {
  title: MessageKey;
  description: MessageKey;
  // Pages with "clue" and "no clue" categories show both, with a hint each;
  // others show one list with one hint.
  clueHint: MessageKey;
  noClueHint?: MessageKey;
  categories: Category[];
  make(noun: DataNoun, index: number): Item;
  // Show the switch for underlining the word that decides the case.
  clues?: boolean;
  // The answer is a whole word, so it needs room and the German letters.
  wordAnswer: boolean;
}

const PAGES = {
  gender: {
    title: "drill.gender.title",
    description: "drill.gender.description",
    clueHint: "gender.menu.clueHint",
    noClueHint: "gender.menu.noClueHint",
    categories: gender.CATEGORIES,
    make: gender.makeExercise,
    wordAnswer: false,
  },
  plural: {
    title: "drill.plural.title",
    description: "drill.plural.description",
    clueHint: "plural.menu.clueHint",
    noClueHint: "plural.menu.noClueHint",
    categories: plural.CATEGORIES,
    make: plural.makeExercise,
    wordAnswer: true,
  },
  cases: {
    title: "drill.cases.title",
    description: "drill.cases.description",
    clueHint: "cases.menu.hint",
    categories: cases.CATEGORIES,
    make: cases.makeCaseSet,
    wordAnswer: false,
    clues: true,
  },
} satisfies Record<string, Page>;
type PageId = keyof typeof PAGES;

type Start = { kind: "articles" } | { kind: "page"; page: PageId; category: Category };

// A missed item comes back later, so a drill only ends once every item has
// been answered right. A right answer moves straight on; only a wrong one
// stops to show the explanation.
interface Drill {
  start: Start;
  queue: Item[];
  total: number;
  index: number;
  firstTryRight: number;
  missed: Set<Item>;
  // What was typed, one entry per blank, once a wrong answer is shown.
  given: string[] | null;
  lastRight: Item | null;
}

type Screen =
  | { name: "home" }
  | { name: "menu"; page: PageId }
  | { name: "drill"; drill: Drill }
  | { name: "done"; start: Start; correct: number; total: number };

let screen: Screen = { name: "home" };

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function startDrill(start: Start): void {
  const queue: Item[] =
    start.kind === "articles"
      ? articles.makeDrill(loadOrder(), SESSION_LENGTH)
      : makeRun<Item>(start.category, PAGES[start.page].make);
  screen = {
    name: "drill",
    drill: { start, queue, total: queue.length, index: 0, firstTryRight: 0, missed: new Set(), given: null, lastRight: null },
  };
  render();
}

function show(next: Screen): void {
  screen = next;
  render();
}

function header(): string {
  return `
    <header class="top">
      <button class="link" data-action="home">Deutsch Sarge Drill</button>
      <button class="lang" data-action="language" aria-label="${t("language.switchLabel")}">${t("language.switchTo")}</button>
    </header>`;
}

function card(action: string, title: MessageKey, description: MessageKey, value = ""): string {
  return `
    <button class="drill-card" data-action="${action}" data-value="${value}">
      <span class="drill-title">${t(title)}</span>
      <span class="drill-description">${t(description)}</span>
    </button>`;
}

function homeScreen(): string {
  const stats = loadStats();
  const line = stats.answered
    ? t("home.stats", {
        answered: stats.answered,
        percent: Math.round((stats.correct / stats.answered) * 100),
        streak: stats.bestStreak,
      })
    : t("home.noStats");

  return `
    ${header()}
    <main class="home">
      <p class="subtitle">${t("home.subtitle")}</p>
      ${(Object.keys(PAGES) as PageId[]).map((id) => card("menu", PAGES[id].title, PAGES[id].description, id)).join("")}
      ${card("articles", "drill.articles.title", "drill.articles.description")}
      ${toggle("order.label", "order", loadOrder(), [
        ["blocks", t("order.blocks")],
        ["mixed", t("order.mixed")],
      ])}
      ${colorsToggle()}
      <p class="stats">${line}</p>
    </main>`;
}

function toggle(label: "order.label" | "colors.label" | "clues.label", action: string, current: string, options: [string, string][]): string {
  const buttons = options
    .map(
      ([value, text]) => `<button class="${value === current ? "on" : ""}" data-action="${action}"
        data-value="${value}" aria-pressed="${value === current}">${text}</button>`,
    )
    .join("");
  return `
    <div class="setting">
      <span>${t(label)}</span>
      <div class="setting-options">${buttons}</div>
    </div>`;
}

function colorsToggle(): string {
  const key = `
    <p class="color-key">
      <span class="g-m">der</span> · <span class="g-f">die</span> · <span class="g-n">das</span> ·
      <span class="g-p">${t("colors.plural")}</span>
    </p>`;
  return (
    toggle("colors.label", "colors", loadColors() ? "on" : "off", [
      ["on", t("colors.on")],
      ["off", t("colors.off")],
    ]) + (loadColors() ? key : "")
  );
}

function menuScreen(id: PageId): string {
  const page: Page = PAGES[id];
  const button = (category: Category) => `
    <button class="category" data-action="category" data-value="${category.id}">
      <span>${category.name(t)}</span>
      <span class="count">${t("menu.count", { count: category.nouns.length })}</span>
    </button>`;
  const list = (categories: Category[]) => `<div class="categories">${categories.map(button).join("")}</div>`;

  const sections = page.noClueHint
    ? `
      <h2>${t("menu.clue")}</h2>
      <p class="hint">${t(page.clueHint)}</p>
      ${list(page.categories.filter((c) => c.clue))}
      <h2>${t("menu.noClue")}</h2>
      <p class="hint">${t(page.noClueHint)}</p>
      ${list(page.categories.filter((c) => !c.clue))}`
    : `
      <p class="hint">${t(page.clueHint)}</p>
      ${list(page.categories)}`;

  return `
    ${header()}
    <main class="menu">
      <h1>${t(page.title)}</h1>
      ${sections}
      ${colorsToggle()}
      ${
        page.clues
          ? toggle("clues.label", "clues", loadClues() ? "on" : "off", [
              ["on", t("colors.on")],
              ["off", t("colors.off")],
            ])
          : ""
      }
    </main>`;
}

// The noun in its gender color, when colors are on (CSS does the rest).
function coloredNoun(exercise: Exercise): string {
  return `<span class="g-${exercise.noun.gender}">${exercise.shown ?? exercise.noun.word}</span>`;
}

function solved(exercise: Exercise): string {
  const color = exercise.color ?? exercise.noun.gender;
  return sentence(exercise, `<strong class="g-${color}">${exercise.answer}</strong>`, coloredNoun(exercise));
}

// A row's noun: the gender color in the singular, purple in the plural.
function rowColor(set: cases.CaseSet, row: cases.Row): string {
  return row.plural ? "p" : set.noun.gender;
}

// The word that decides the case, underlined while clues are on (CSS).
function trigger(word: string): string {
  return `<span class="trigger">${word}</span>`;
}

function solvedRow(set: cases.CaseSet, row: cases.Row): string {
  const color = rowColor(set, row);
  return cases.rowSentence(row, `<strong class="g-${color}">${row.answer}</strong>`, `<span class="g-${color}">${row.noun}</span>`, trigger);
}

// "der Tisch · den Tisch · dem Tisch" for the "✓" line.
function solvedShort(item: Item): string {
  if (!isSet(item)) return solved(item);
  const color = item.noun.gender;
  return item.rows
    .filter((row) => !row.plural)
    .map((row) => `<strong class="g-${color}">${row.answer.toLowerCase()}</strong> <span class="g-${color}">${row.noun}</span>`)
    .join(" · ");
}

// The category after this one, for "Next type"; none after "all words".
function nextCategory(start: Start): Category | undefined {
  if (start.kind !== "page" || start.category.id === "all") return undefined;
  const types = PAGES[start.page].categories.filter((c) => c.id !== "all");
  return types[(types.indexOf(start.category) + 1) % types.length];
}

function input(index: number, given: string[] | null, wide: boolean, placeholder: string): string {
  const value = given ? `value="${escapeHtml(given[index] ?? "")}" disabled` : "";
  return `<input id="answer-${index}" class="blank${wide ? " word" : ""}" autocomplete="off" autocapitalize="off"
    autocorrect="off" spellcheck="false" placeholder="${placeholder}" ${value} />`;
}

// One blank: the sentence and, after a wrong answer, the explanation.
function singleExercise(exercise: Exercise, current: Drill, wordAnswer: boolean): { form: string; feedback: string } {
  const answered = current.given !== null;
  const blank = input(0, current.given, wordAnswer, t(wordAnswer ? "drill.placeholderWord" : "drill.placeholder"));
  const form = `<p class="sentence">${sentence(exercise, blank, coloredNoun(exercise))}</p>`;
  const feedback = answered
    ? `
      <p class="verdict">${t("drill.wrong", { given: escapeHtml(current.given![0]) })}</p>
      <p class="solution">${solved(exercise)}</p>
      <ol class="explanation">${exercise.explain(t).map((line) => `<li>${capitalize(line)}</li>`).join("")}</ol>`
    : "";
  return { form, feedback };
}

// A set: one row per case, singular then plural. After a wrong answer every
// row shows the right article, and the wrong rows say why.
function setExercise(set: cases.CaseSet, current: Drill): { form: string; feedback: string } {
  const answered = current.given !== null;
  const rows = set.rows
    .map((row, i) => {
      const heading = i === 0 || row.plural !== set.rows[i - 1].plural
        ? `<tr class="row-heading"><th colspan="2">${t(row.plural ? "cases.pluralLabel" : "cases.singular")}</th></tr>`
        : "";
      const noun = `<span class="g-${rowColor(set, row)}">${row.noun}</span>`;
      return `${heading}<tr><th>${row.case}</th><td>${cases.rowSentence(row, input(i, current.given, false, ""), noun, trigger)}</td></tr>`;
    })
    .join("");
  const form = `<p class="step">${t(`cases.step.${set.step}` as MessageKey)}</p><table class="rows">${rows}</table>`;

  const feedback = answered
    ? `
      <p class="verdict">${t("cases.wrong")}</p>
      <ol class="explanation rows-solved">${set.rows
        .map((row, i) => {
          const right = cases.isRowCorrect(row, current.given![i] ?? "");
          const why = right ? "" : row.explain(t).map((line) => `<br /><span class="why">${capitalize(line)}</span>`).join("");
          return `<li class="${right ? "row-right" : "row-wrong"}">${right ? "✓" : "✗"} ${solvedRow(set, row)}${why}</li>`;
        })
        .join("")}</ol>`
    : "";
  return { form, feedback };
}

function drillScreen(current: Drill): string {
  const item = current.queue[current.index];
  const meaning = getLanguage() === "es" ? (item.noun.es ?? item.noun.en) : item.noun.en;
  const answered = current.given !== null;
  const { start } = current;
  const wordAnswer = start.kind === "page" && PAGES[start.page].wordAnswer;
  const { form, feedback } = isSet(item) ? setExercise(item, current) : singleExercise(item, current, wordAnswer);

  const letters =
    wordAnswer && !answered
      ? `<div class="letters" aria-label="${t("keys.label")}">${GERMAN_LETTERS.map(
          (letter) => `<button type="button" data-action="letter" data-value="${letter}">${letter}</button>`,
        ).join("")}</div>`
      : "";

  const title = start.kind === "page" ? `<span class="run-title">${start.category.name(t)}</span>` : "";
  const nextType = nextCategory(start)
    ? `<button class="link" data-action="nextType">${t("drill.nextType")}</button>`
    : "";
  // In a set the lesson is the case, not the gender, so the noun comes with
  // its article: "der Tisch = table".
  const tag = isSet(item)
    ? `<span class="g-${item.noun.gender}">${articleFor(item.noun)} ${item.noun.word}</span>`
    : coloredNoun(item);

  return `
    ${header()}
    <main class="drill">
      <div class="drill-bar">
        <span>${t("drill.progress", { done: current.index + 1, total: current.queue.length })} ${title}</span>
        <span class="drill-actions">${nextType}<button class="link" data-action="stop">${t("drill.quit")}</button></span>
      </div>
      <p class="last-right">${current.lastRight && !answered ? `✓ ${solvedShort(current.lastRight)}` : "&nbsp;"}</p>
      <form class="exercise" data-action="check">
        <p class="case-tag">${tag} = ${meaning}</p>
        ${form}
        ${letters}
        ${answered ? "" : `<button class="primary" type="submit">${t("drill.check")}</button>`}
      </form>
      ${
        answered
          ? `<section class="feedback wrong">
              ${feedback}
              <p class="again">${t("drill.again")}</p>
              <button class="primary" data-action="next">${t("drill.next")}</button>
            </section>`
          : ""
      }
    </main>`;
}

function articleFor(noun: DataNoun): string {
  return { m: "der", f: "die", n: "das" }[noun.gender];
}

function doneScreen(result: Extract<Screen, { name: "done" }>): string {
  return `
    ${header()}
    <main class="done">
      <h1>${t("done.title")}</h1>
      <p>${t("done.score", { correct: result.correct, total: result.total })}</p>
      <button class="primary" data-action="again">${t("done.again")}</button>
      <button class="link" data-action="stop">${t(result.start.kind === "page" ? "done.menu" : "done.home")}</button>
    </main>`;
}

function render(): void {
  document.documentElement.lang = getLanguage();
  app.classList.toggle("colors", loadColors());
  app.classList.toggle("clues", loadClues());
  app.innerHTML =
    screen.name === "drill"
      ? drillScreen(screen.drill)
      : screen.name === "done"
        ? doneScreen(screen)
        : screen.name === "menu"
          ? menuScreen(screen.page)
          : homeScreen();

  const first = app.querySelector<HTMLInputElement>("input.blank:not([disabled])");
  if (first) first.focus();
  else app.querySelector<HTMLButtonElement>("[data-action=next]")?.focus();
}

function check(): void {
  if (screen.name !== "drill" || screen.drill.given !== null) return;
  const drill = screen.drill;
  const inputs = [...app.querySelectorAll<HTMLInputElement>("input.blank")];
  const given = inputs.map((input) => input.value);
  const empty = inputs.find((input) => !input.value.trim());
  if (empty) {
    empty.focus();
    return;
  }

  const item = drill.queue[drill.index];
  const right = isSet(item)
    ? item.rows.every((row, i) => cases.isRowCorrect(row, given[i]))
    : isCorrect(item, given[0]);
  recordAnswer(right);

  if (right) {
    if (!drill.missed.has(item)) drill.firstTryRight += 1;
    drill.lastRight = item;
    next();
    return;
  }

  drill.missed.add(item);
  const comeBack = drill.start.kind === "page" ? drill.index + 1 + REPEAT_GAP : drill.queue.length;
  drill.queue.splice(comeBack, 0, item);
  drill.given = given;
  render();
}

function next(): void {
  if (screen.name !== "drill") return;
  const drill = screen.drill;
  if (drill.given !== null) drill.lastRight = null;
  drill.index += 1;
  drill.given = null;

  if (drill.index >= drill.queue.length) {
    screen = { name: "done", start: drill.start, correct: drill.firstTryRight, total: drill.total };
  }
  render();
}

// Leaving a drill goes back to where it was started from.
function stop(): void {
  const start = screen.name === "drill" ? screen.drill.start : screen.name === "done" ? screen.start : null;
  show(start?.kind === "page" ? { name: "menu", page: start.page } : { name: "home" });
}

// Puts the letter where the cursor is, and keeps typing going.
function typeLetter(letter: string): void {
  const input = app.querySelector<HTMLInputElement>("input.blank:not([disabled])");
  if (!input) return;
  input.setRangeText(letter, input.selectionStart ?? input.value.length, input.selectionEnd ?? input.value.length, "end");
  input.focus();
}

app.addEventListener("submit", (event) => {
  event.preventDefault();
  check();
});

// In a set, Enter moves down to the next empty blank; on the last one it
// checks the whole set.
app.addEventListener("keydown", (event) => {
  const input = event.target as HTMLElement;
  if (event.key !== "Enter" || !input.matches("input.blank")) return;
  const inputs = [...app.querySelectorAll<HTMLInputElement>("input.blank:not([disabled])")];
  const following = inputs.slice(inputs.indexOf(input as HTMLInputElement) + 1).find((i) => !i.value.trim());
  if (following) {
    event.preventDefault();
    following.focus();
  }
});

// Tapping a letter button must not take the focus (and the phone keyboard)
// away from the answer.
app.addEventListener("mousedown", (event) => {
  if ((event.target as HTMLElement).closest("[data-action=letter]")) event.preventDefault();
});

app.addEventListener("click", (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
  const action = target?.dataset.action;
  const value = target?.dataset.value ?? "";

  if (action === "articles") startDrill({ kind: "articles" });
  else if (action === "menu" && value in PAGES) show({ name: "menu", page: value as PageId });
  else if (action === "category" && screen.name === "menu") {
    const page = screen.page;
    const category = PAGES[page].categories.find((c) => c.id === value);
    if (category) startDrill({ kind: "page", page, category });
  } else if (action === "nextType" && screen.name === "drill" && screen.drill.start.kind === "page") {
    const following = nextCategory(screen.drill.start);
    if (following) startDrill({ kind: "page", page: screen.drill.start.page, category: following });
  } else if (action === "letter") typeLetter(value);
  else if (action === "again" && screen.name === "done") startDrill(screen.start);
  else if (action === "next") next();
  else if (action === "stop") stop();
  else if (action === "home") show({ name: "home" });
  else if (action === "order") saveOrder(value === "mixed" ? "mixed" : "blocks");
  else if (action === "colors") saveColors(value === "on");
  else if (action === "clues") saveClues(value === "on");
  else if (action === "language") setLanguage(getLanguage() === "en" ? "es" : "en");

  if (action === "order" || action === "colors" || action === "clues" || action === "language") render();
});

render();
