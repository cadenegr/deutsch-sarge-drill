// The sentences of the cases drill, as parts: who, which verb or
// preposition decides the case, and what else stands in the sentence. The
// drill puts them together in different orders, so the same trigger turns up
// in many different sentences.
//
// In a text, {X} is the article to type plus the noun, and [word] is the
// trigger: the word that decides the case, underlined when clues are on.
// No preposition that melts into the article (in dem → im, zu dem → zum).

import type { Group } from "./cases";

// Steps of the learning path, from easy to hard.
// 1: normal order, subject first ("Ich frage den Lehrer.")
// 2: a time word first, the subject after the verb ("Morgen frage ich den Lehrer.")
// 3: the noun first ("Den Lehrer frage ich.", "Das ist der Lehrer.")
export type Level = 1 | 2 | 3;

export type Person = "1s" | "2s" | "3s" | "1p" | "2p";

export interface Subject {
  word: string;
  person: Person;
}

export const SUBJECTS: Subject[] = [
  { word: "ich", person: "1s" },
  { word: "du", person: "2s" },
  { word: "er", person: "3s" },
  { word: "sie", person: "3s" },
  { word: "Anna", person: "3s" },
  { word: "Paul", person: "3s" },
  { word: "wir", person: "1p" },
  { word: "ihr", person: "2p" },
];

export const TIMES = ["Heute", "Morgen", "Jetzt", "Später", "Am Montag", "Oft"];

// The noun is the subject. Written out, since the verb agrees with the
// noun: "der Lehrer wartet", "die Lehrer warten".
export interface SubjectPattern {
  level: Level;
  groups: Group[];
  singular: string;
  plural: string;
  // "Das ist der Lehrer": after sein the noun is Nominativ too.
  predicate?: boolean;
}

const ALL: Group[] = ["person", "thing", "place", "food", "animal"];

export const SUBJECT_PATTERNS: SubjectPattern[] = [
  { level: 1, groups: ["person"], singular: "{X} [wartet] schon.", plural: "{X} [warten] schon." },
  { level: 1, groups: ["person"], singular: "{X} [arbeitet] hier.", plural: "{X} [arbeiten] hier." },
  { level: 1, groups: ["person", "animal"], singular: "{X} [ist] sehr nett.", plural: "{X} [sind] sehr nett." },
  { level: 1, groups: ["thing", "place"], singular: "{X} [ist] neu.", plural: "{X} [sind] neu." },
  { level: 1, groups: ["thing", "food"], singular: "{X} [kostet] viel.", plural: "{X} [kosten] viel." },
  { level: 1, groups: ["place"], singular: "{X} [ist] schön.", plural: "{X} [sind] schön." },
  { level: 1, groups: ["place"], singular: "{X} [ist] ganz in der Nähe.", plural: "{X} [sind] ganz in der Nähe." },
  { level: 1, groups: ["food"], singular: "{X} [schmeckt] gut.", plural: "{X} [schmecken] gut." },
  { level: 1, groups: ["animal"], singular: "{X} [schläft].", plural: "{X} [schlafen]." },
  { level: 2, groups: ["person", "animal"], singular: "Heute [kommt] {X}.", plural: "Heute [kommen] {X}." },
  { level: 2, groups: ALL, singular: "Wo [ist] {X}?", plural: "Wo [sind] {X}?" },
  { level: 2, groups: ["thing"], singular: "Leider [ist] {X} kaputt.", plural: "Leider [sind] {X} kaputt." },
  { level: 2, groups: ["place"], singular: "Am Wochenende [ist] {X} voll.", plural: "Am Wochenende [sind] {X} voll." },
  { level: 2, groups: ["food"], singular: "Hier [ist] {X} sehr gut.", plural: "Hier [sind] {X} sehr gut." },
  { level: 3, groups: ALL, singular: "Das [ist] {X}.", plural: "Das [sind] {X}.", predicate: true },
  { level: 3, groups: ["person"], singular: "Mich [fragt] {X} immer.", plural: "Mich [fragen] {X} immer." },
  { level: 3, groups: ["thing", "place", "animal"], singular: "Mir [gefällt] {X}.", plural: "Mir [gefallen] {X}." },
  { level: 3, groups: ["food"], singular: "Mir [schmeckt] {X}.", plural: "Mir [schmecken] {X}." },
];

// The noun is an object: of a verb, or after a preposition. The subject
// varies (ich, du, Anna…), so the verb is conjugated from verbs.json.
export interface ObjectPattern {
  case: "Akkusativ" | "Dativ";
  groups: Group[];
  verb: string;
  // The preposition before the noun, when it decides the case.
  prep?: string;
  // Words between the verb and the noun ("Blumen" in "kaufe Blumen für").
  before?: string;
  // Words after the noun ("das Buch" in "gebe dem Lehrer das Buch").
  after?: string;
  // Dativ for the one who gets something (geben, zeigen, schreiben).
  receiver?: boolean;
}

export const OBJECT_PATTERNS: ObjectPattern[] = [
  // Akkusativ after a verb
  ...["fragen", "besuchen", "kennen", "treffen", "einladen", "anrufen", "sehen", "suchen", "verstehen"].map(
    (verb): ObjectPattern => ({ case: "Akkusativ", groups: ["person"], verb }),
  ),
  ...["brauchen", "kaufen", "suchen", "finden", "verkaufen", "nehmen", "sehen"].map(
    (verb): ObjectPattern => ({ case: "Akkusativ", groups: ["thing"], verb }),
  ),
  ...["kennen", "besuchen", "suchen", "finden", "sehen"].map(
    (verb): ObjectPattern => ({ case: "Akkusativ", groups: ["place"], verb }),
  ),
  ...["bestellen", "kaufen", "nehmen", "probieren"].map(
    (verb): ObjectPattern => ({ case: "Akkusativ", groups: ["food"], verb }),
  ),
  ...["sehen", "füttern", "suchen", "finden"].map(
    (verb): ObjectPattern => ({ case: "Akkusativ", groups: ["animal"], verb }),
  ),
  // Akkusativ after a preposition
  { case: "Akkusativ", groups: ["person"], verb: "kaufen", before: "Blumen", prep: "für" },
  { case: "Akkusativ", groups: ["person", "animal"], verb: "gehen", before: "nicht", prep: "ohne" },
  { case: "Akkusativ", groups: ["person"], verb: "spielen", prep: "gegen" },
  { case: "Akkusativ", groups: ["thing", "food"], verb: "bezahlen", before: "viel", prep: "für" },
  { case: "Akkusativ", groups: ["place"], verb: "gehen", prep: "durch" },
  { case: "Akkusativ", groups: ["place"], verb: "haben", before: "Tickets", prep: "für" },
  { case: "Akkusativ", groups: ["animal"], verb: "kaufen", before: "Futter", prep: "für" },
  // Dativ after a verb
  ...["helfen", "danken", "antworten", "glauben", "gratulieren", "zuhören", "vertrauen"].map(
    (verb): ObjectPattern => ({ case: "Dativ", groups: ["person"], verb }),
  ),
  { case: "Dativ", groups: ["animal"], verb: "helfen" },
  { case: "Dativ", groups: ["person"], verb: "geben", after: "das Buch", receiver: true },
  { case: "Dativ", groups: ["person"], verb: "zeigen", after: "den Weg", receiver: true },
  { case: "Dativ", groups: ["person"], verb: "schreiben", after: "eine E-Mail", receiver: true },
  { case: "Dativ", groups: ["animal"], verb: "geben", after: "Wasser", receiver: true },
  // Dativ after a preposition
  { case: "Dativ", groups: ["person"], verb: "sprechen", prep: "mit" },
  { case: "Dativ", groups: ["person"], verb: "arbeiten", prep: "mit" },
  { case: "Dativ", groups: ["thing", "food"], verb: "sein", before: "zufrieden", prep: "mit" },
  { case: "Dativ", groups: ["thing", "place", "food"], verb: "haben", before: "ein Problem", prep: "mit" },
  { case: "Dativ", groups: ["place"], verb: "kommen", prep: "aus" },
  { case: "Dativ", groups: ["place"], verb: "wohnen", prep: "gegenüber" },
  { case: "Dativ", groups: ["animal"], verb: "spielen", prep: "mit" },
];
