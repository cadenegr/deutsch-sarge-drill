import type { Order } from "./drills/exercise";

// Progress lives in the browser for now; a backend comes when other people
// use the app.

export interface Stats {
  answered: number;
  correct: number;
  streak: number;
  bestStreak: number;
}

const STATS_KEY = "sargeStats";
const EMPTY: Stats = { answered: 0, correct: 0, streak: 0, bestStreak: 0 };

export function loadStats(): Stats {
  try {
    const saved = localStorage.getItem(STATS_KEY);
    return saved ? { ...EMPTY, ...JSON.parse(saved) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

export function recordAnswer(correct: boolean): void {
  const stats = loadStats();
  stats.answered += 1;
  stats.correct += correct ? 1 : 0;
  stats.streak = correct ? stats.streak + 1 : 0;
  stats.bestStreak = Math.max(stats.bestStreak, stats.streak);

  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // Not saved; the drill goes on.
  }
}

// Drill order chosen on the home screen: in blocks (default) or mixed.
const ORDER_KEY = "sargeOrder";

export function loadOrder(): Order {
  try {
    return localStorage.getItem(ORDER_KEY) === "mixed" ? "mixed" : "blocks";
  } catch {
    return "blocks";
  }
}

export function saveOrder(order: Order): void {
  try {
    localStorage.setItem(ORDER_KEY, order);
  } catch {
    // No storage: the drill stays in blocks.
  }
}

// Gender colors (der blue, die pink, das green, plural purple): on by default.
const COLORS_KEY = "sargeColors";

export function loadColors(): boolean {
  try {
    return localStorage.getItem(COLORS_KEY) !== "off";
  } catch {
    return true;
  }
}

export function saveColors(on: boolean): void {
  try {
    localStorage.setItem(COLORS_KEY, on ? "on" : "off");
  } catch {
    // No storage: colors stay on.
  }
}

// Underline the word that decides the case (the clue): on by default.
const CLUES_KEY = "sargeClues";

export function loadClues(): boolean {
  try {
    return localStorage.getItem(CLUES_KEY) !== "off";
  } catch {
    return true;
  }
}

export function saveClues(on: boolean): void {
  try {
    localStorage.setItem(CLUES_KEY, on ? "on" : "off");
  } catch {
    // No storage: clues stay on.
  }
}
