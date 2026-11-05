// Builds src/data/nouns.json: the most common German nouns with gender,
// plurals, an English meaning and, for concrete nouns, a group (person,
// animal, food, thing, place) that decides which sentences fit them.
//
// Sources (downloaded into .cache/, which is not committed):
// - Wiktionary nouns, extracted by kaikki.org (CC BY-SA):
//   https://kaikki.org/dictionary/German/pos-noun/kaikki.org-dictionary-German-by-pos-noun.jsonl
// - Word counts from the Leipzig Corpora Collection, deu_mixed-typical_2011_1M
//   (CC BY), the words.txt file from:
//   https://downloads.wortschatz-leipzig.de/corpora/deu_mixed-typical_2011_1M.tar.gz
// - OdeNet, the Open German WordNet (CC BY-SA), for the groups:
//   https://raw.githubusercontent.com/hdaSprachtechnologie/odenet/master/odenet/wordnet/deWordNet.xml
//   saved as .cache/odenet.xml
// - Open English WordNet 2025 (CC BY 4.0), to check the groups:
//   https://github.com/globalwordnet/english-wordnet/releases/download/2025-edition/english-wordnet-2025.xml.gz
//   unzipped as .cache/ewn.xml
//
// Run: node scripts/build-nouns.mjs

import { createReadStream, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createInterface } from "node:readline";

const COUNT = 3000;
// Senses that only point to another word, or name a letter, a note or a
// number, are not nouns to learn.
const NOT_A_WORD = /^(nominalization|gerund|alternative|obsolete|archaic|dated|diminutive|plural|the letter|the name of the letter)\b|\b[A-H]-(flat|sharp)\b|^(zero|one|two|three|four|five|six|seven|eight|nine|ten)$/i;

const GENDERS = { masculine: "m", feminine: "f", neuter: "n" };

// Real nouns that the checks below let through but are not worth drilling.
const SKIP = new Set(
  readFileSync("scripts/skip-nouns.txt", "utf8")
    .split("\n")
    .map((w) => w.trim())
    .filter((w) => w && !w.startsWith("#")),
);

// Groups, so a sentence fits its noun: people are asked and helped, food
// is bought, places are come from. First choice: Wiktionary's labels on the
// main meaning, which say what a word is ("Furniture", "Occupations").
const WIKTIONARY_GROUPS = {
  person: ["People", "Occupations", "Male people", "Female people", "Healthcare occupations", "Demonyms",
    "Nationalities", "Ethnonyms", "Family members", "Female family members", "Male family members", "Heads of state", "Nobility"],
  animal: ["Animals", "Mammals", "Birds", "Fish", "Insects", "Reptiles", "Dogs", "Cats", "Canids", "Horses",
    "Livestock", "Male animals", "Female animals"],
  food: ["Foods", "Meals", "Breads", "Fruits", "Vegetables", "Beverages", "Alcoholic beverages", "Nonalcoholic beverages",
    "Dairy products", "Desserts", "Cakes and pastries", "Meats", "Cheeses", "Soups", "Sweets", "Spices"],
  thing: ["Furniture", "Vehicles", "Clothing", "Footwear", "Headwear", "Containers", "Musical instruments", "Tools",
    "Kitchenware", "Jewelry", "Toys", "Bags", "Aircraft", "Watercraft", "Computer hardware"],
  place: ["Buildings", "Rooms", "Places of worship", "Restaurants", "Shops", "Universities", "Landforms",
    "Bodies of water", "Places"],
};
const GROUP_OF_LABEL = new Map(Object.entries(WIKTIONARY_GROUPS).flatMap(([group, labels]) => labels.map((l) => [l, group])));

// Second choice: OdeNet, where every meaning of a word is filed under a
// class from the Princeton WordNet. Only used when all meanings of the word
// land in the same group: "Kuchen" is food in every meaning, "Hund" is an
// animal, a thing and a person, so it gets no group from here.
const ODENET_GROUPS = { "noun.person": "person", "noun.animal": "animal", "noun.food": "food", "noun.artifact": "thing", "noun.location": "place" };
const odenet = new Map();
{
  const xml = readFileSync(".cache/odenet.xml", "utf8");
  const classOf = new Map([...xml.matchAll(/<Synset id="([^"]+)"[^>]*dc:subject="([^"]+)"/g)].map((m) => [m[1], m[2]]));
  for (const m of xml.matchAll(/<Lemma writtenForm="([^"]+)" partOfSpeech="n"\/>([\s\S]*?)<\/LexicalEntry>/g)) {
    const groups = [...m[2].matchAll(/synset="([^"]+)"/g)].map((s) => ODENET_GROUPS[classOf.get(s[1])]);
    odenet.set(m[1], [...(odenet.get(m[1]) ?? []), ...groups]);
  }
}

// The check: the English meaning ("Lehrer = teacher") looked up in the
// English WordNet, which lists the meanings of a word most common first. A
// group is kept only if the English side agrees: "Arm" may be a thing in
// OdeNet, but "arm" is a body part, so it gets no group. Buildings and
// other structures count as places (Bahnhof, Flughafen), not as things.
const english = new Map();
const synsets = new Map();
{
  const xml = readFileSync(".cache/ewn.xml", "utf8");
  for (const m of xml.matchAll(/<Lemma writtenForm="([^"]+)" partOfSpeech="n"\/?>([\s\S]*?)<\/LexicalEntry>/g)) {
    if (!english.has(m[1])) english.set(m[1], [...m[2].matchAll(/<Sense id="[^"]+" synset="([^"]+)"/g)].map((s) => s[1]));
  }
  for (const m of xml.matchAll(/<Synset id="([^"]+)"[^>]*partOfSpeech="n"[^>]*lexfile="([^"]+)">([\s\S]*?)<\/Synset>/g)) {
    const hypernyms = [...m[3].matchAll(/<SynsetRelation relType="hypernym" target="([^"]+)"/g)].map((h) => h[1]);
    synsets.set(m[1], { lexfile: m[2], hypernyms });
  }
}
const STRUCTURES = new Set(["structure", "facility", "building"].map((word) => english.get(word)[0]));

function isStructure(id, seen = new Set()) {
  if (STRUCTURES.has(id)) return true;
  if (seen.has(id)) return false;
  seen.add(id);
  return (synsets.get(id)?.hypernyms ?? []).some((h) => isStructure(h, seen));
}

// The groups the English meaning allows: "teacher" → person. Only its most
// common meaning, or all of them when Wiktionary already labelled the
// German word ("Tisch" is Furniture; "table" is first a table of data).
function englishGroups(en, allMeanings) {
  const groups = new Set();
  for (const item of en.split(",")) {
    const word = item.trim().replace(/^(a|an|the) /, "");
    const ids = english.get(word) ?? english.get(word.toLowerCase()) ?? [];
    for (const id of allMeanings ? ids : ids.slice(0, 1)) {
      const lexfile = synsets.get(id)?.lexfile;
      if (lexfile === "noun.artifact" && isStructure(id)) groups.add("place");
      else if (ODENET_GROUPS[lexfile]) groups.add(ODENET_GROUPS[lexfile]);
    }
  }
  return groups;
}

// Last word: corrections by hand, "Word group" per line ("-" for none).
const GROUP_FIXES = new Map(
  readFileSync("scripts/noun-groups.txt", "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split(/\s+/)),
);

function groupOf(word, labels, en) {
  if (GROUP_FIXES.has(word)) return GROUP_FIXES.get(word) === "-" ? null : GROUP_FIXES.get(word);
  const fromLabels = new Set([...labels].map((l) => GROUP_OF_LABEL.get(l)).filter(Boolean));
  const fromOdenet = new Set(odenet.get(word) ?? [undefined]);
  const german = fromLabels.size > 0 ? fromLabels : fromOdenet;
  if (german.size !== 1 || [...german][0] === undefined) return null;
  const group = [...german][0];
  const allowed = englishGroups(en, fromLabels.size > 0);
  // A thing that is mainly a building in English is a place.
  if (group === "thing" && englishGroups(en, false).has("place")) return "place";
  return allowed.has(group) ? group : null;
}

const counts = new Map();
for (const line of readFileSync(".cache/words.txt", "utf8").split("\n")) {
  const [, word, count] = line.split("\t");
  if (word) counts.set(word, (counts.get(word) ?? 0) + Number(count));
}

// In German only nouns are capitalized inside a sentence, so a real noun is
// written with a capital far more often than without ("Frage" 1680 times,
// "frage" 22). Words like "Ich" or "Hier" are capitalized only at the start
// of a sentence, about as often as they are written small.
function nounCount(word) {
  const capital = counts.get(word) ?? 0;
  return capital >= 2 * (counts.get(word.toLowerCase()) ?? 0) ? capital : 0;
}

// One word can have several entries (der See / die See); collect them all
// before deciding.
const words = new Map();
const lines = createInterface({ input: createReadStream(".cache/nouns.jsonl") });

for await (const line of lines) {
  const entry = JSON.parse(line);
  const word = entry.word;
  if (!/^[A-ZÄÖÜ][a-zäöüß]+$/.test(word) || SKIP.has(word) || !nounCount(word)) continue;

  // "form-of" senses point to another word ("plural of …"), except agent
  // nouns: Lehrer is "agent noun of lehren" but a word of its own.
  const senses = entry.senses.filter(
    (s) => (!s.tags?.includes("form-of") || s.tags.includes("agent")) && !NOT_A_WORD.test(s.glosses?.[0] ?? ""),
  );
  if (senses.length === 0) continue;

  const info = words.get(word) ?? {
    genders: new Set(),
    plurals: new Set(),
    labels: new Set(),
    en: null,
    weak: false,
    pluralOnly: false,
    akk: null,
    dat: null,
  };
  for (const sense of senses) {
    for (const tag of sense.tags ?? []) {
      if (GENDERS[tag]) info.genders.add(GENDERS[tag]);
      if (tag === "plural-only") info.pluralOnly = true;
    }
  }
  // Plurals only from the first entry, the main meaning (the one "en"
  // describes): Tag "day" → Tage, not Tag "label" → Tags.
  if (!words.has(word)) {
    for (const form of entry.forms ?? []) {
      if (form.tags?.length === 1 && form.tags[0] === "plural") info.plurals.add(form.form);
    }
    for (const sense of senses) {
      for (const label of sense.categories ?? []) info.labels.add(typeof label === "string" ? label : label.name);
    }
    // Some masculine nouns change in Akkusativ and Dativ: den Bären, dem
    // Herrn (n-Deklination). Old or informal forms are skipped.
    info.akk = singularForm(entry, "accusative");
    info.dat = singularForm(entry, "dative");
  }
  info.en ??= meaning(senses);
  if (entry.head_templates?.some((h) => /weak/.test(h.args?.["1"] ?? ""))) info.weak = true;
  words.set(word, info);
}

// Only nouns with exactly one gender: a drill must never call a right
// answer wrong.
const nouns = [...words]
  .filter(([, info]) => info.genders.size === 1 && !info.pluralOnly && info.en)
  .sort(([a], [b]) => nounCount(b) - nounCount(a))
  .slice(0, COUNT)
  .map(([word, info]) => ({
    word,
    gender: [...info.genders][0],
    plurals: usedPlurals(word, info.plurals),
    en: info.en,
    ...(info.weak ? { weak: true } : {}),
    ...(info.akk && info.akk !== word ? { akk: info.akk } : {}),
    ...(info.dat && info.dat !== word ? { dat: info.dat } : {}),
    ...(groupOf(word, info.labels, info.en) ? { group: groupOf(word, info.labels, info.en) } : {}),
  }));

mkdirSync("src/data", { recursive: true });
writeFileSync("src/data/nouns.json", JSON.stringify(nouns, null, 0).replace(/\},\{/g, "},\n{") + "\n");
console.log(`${nouns.length} nouns written to src/data/nouns.json`);

// Wiktionary lists the main plural first, then other accepted ones
// (Wörter, Worte), but also plurals nobody uses ("Zukünfte", "Musiken").
// Keep the ones found at least 3 times in the Leipzig texts. Rare but
// correct ones ("Freitage") are lost too; the plural drill skips nouns with
// none left. A second "plural" equal to the singular ("Jahr") is dropped:
// it is only colloquial ("drei Jahr").
function usedPlurals(word, plurals) {
  return [...plurals].filter((plural, i) => (counts.get(plural) ?? 0) >= 3 && (i === 0 || plural !== word));
}

function singularForm(entry, kase) {
  return (
    entry.forms?.find(
      (f) => f.tags?.length === 2 && f.tags.includes(kase) && f.tags.includes("singular"),
    )?.form ?? null
  );
}

// The first everyday meaning, cut to a few words: "flat, apartment".
function meaning(senses) {
  const everyday = senses.find((s) => !s.tags?.some((t) => ["archaic", "obsolete", "dated", "rare", "dialectal"].includes(t)));
  const gloss = everyday?.glosses?.[0];
  if (!gloss) return null;
  return gloss
    .replace(/^agent noun of \S+?[:;,]?\s+/, "")
    .replace(/\s*\(.*?\)/g, "")
    .split(/[;:]/)[0]
    .split(",")
    .slice(0, 2)
    .join(",")
    .trim();
}
