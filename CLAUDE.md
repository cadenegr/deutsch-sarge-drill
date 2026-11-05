# Deutsch Sarge Drill

A German grammar trainer for Carlos (Mexican, in Berlin 12 years, about B1–B2:
understands and gets by, but grammar is shaky everywhere: word order,
articles, Akkusativ/Dativ, prepositions, Präteritum).

## The idea

Learning by repetition, the way math was taught in school in Mexico: many
exercises of one type in a row, each with a clear explanation, until the
pattern sticks. Not exam prep.

- The user **types** the answer. No multiple choice.
- A right answer moves straight on (a small "✓" line shows it); a wrong one
  stops and shows a short explanation of the rule.
- A missed exercise comes back later: at the end of a short drill, 5
  exercises later in a long gender run.
- Long runs: the gender drill goes through every word of one type (e.g. all
  -ung nouns) until the learner presses "Next type".
- Explanations in English and Spanish (UI switch). German grammar terms
  (Nominativ, Akkusativ, Dativ…) stay German.
- Exercises come from generators (word lists × sentence patterns), so there
  are always more. Later: bigger word lists (e.g. Wiktionary data), maybe
  AI-written sentences.

`docs/grammar-map.md` is the numbered checklist of every rule (A1–B2) and
which ones have a drill. Update its status column when a drill is added.

## Stack

Vite + TypeScript, no framework, plain CSS. Mobile-first web app with a
manifest so it can be installed on the phone. Progress in localStorage; no
backend until other people use it (then reuse the Fastify + SQLite + JWT setup
from `../wizard-game-platform/backend`).

- `npm run dev`: runs with `--host`, so the phone on the same Wi-Fi can open it
- `npm test`: Vitest; grammar data must have tests, a wrong table teaches wrong German
- `npm run build`: type-check + build
- `node scripts/build-nouns.mjs`: rebuilds `src/data/nouns.json` from
  Wiktionary, Leipzig word counts, OdeNet and the English WordNet
  (downloads in `.cache/`, links in the script and README). Data decisions
  are made by the script from these sources, so a rebuild gives the same
  result; hand corrections go in `scripts/skip-nouns.txt` and
  `scripts/noun-groups.txt`, never into the JSON.
- `node scripts/pipeline/run.mjs <book.epub|pdf|txt>`: book → sentences →
  grammar labels, in steps (see README). Step 4 needs spaCy in `.venv/`.
- `node scripts/build-baseline.mjs`: rebuilds `src/data/baseline.json` (the
  sentences the app knows without a book, by grammar map rule) from the
  labelled Tatoeba sentences in `.cache/pipeline/tatoeba/`;
  `node scripts/build-sein-verbs.mjs` rebuilds the list of sein verbs the
  labels need
- `make -C engine`: builds `engine/sentence-engine`, the constraint engine
  (core copied from github.com/cadenegr/skyscrapers, see
  `engine/core/README.md`; change the core there, not here) plus the
  German `sentence` plug-in; `make -C engine test` runs its tests
- `node scripts/build-verbs.mjs`: rebuilds `src/data/verbs.json`, the present
  tense of the verbs the sentence drills use (Wiktionary verbs in `.cache/`)

i18n: `src/i18n/en.ts` is the source; `es.ts` must have every key (the type
checker says which are missing).

## Reference project: wizard-game-platform

`/home/dci-student/Desktop/Workspace/wizard-game-platform` is Carlos's
earlier, bigger project (an online card game). When something is needed that
Wizard already has, look there first and copy it over by hand rather than
building it again. Never edit the Wizard repo from here. Useful pieces:

- `backend/`: Fastify, SQLite, JWT cookies, bcrypt, Vitest (accounts, saving
  progress on a server)
- `src/i18n/`: the pattern this app's i18n came from
- `server.js` and the Hostinger deploy setup
- `src/styles/`: how CSS was split per screen once one file got too big

## How Carlos likes to work

- Small visual tweaks: just edit, Carlos looks at the result. Run checks
  for logic changes and before pushing.
- Questions about rules or design: ask as numbered text in chat, not with the
  question tool.
- Near 150k tokens of context, say so and write a fresh handoff in `docs/`.
- Commit or push only when asked.
