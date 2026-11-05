#!/bin/sh
# Runs the sentence program on small maps and checks the solutions.
# Usage: tests/run_sentence_tests.sh [path/to/sentence-engine]   (or: make -C engine test)

BIN="${1:-./sentence-engine}"
pass=0
fail=0

# check NAME EXPECTED MAP [MAX]
#   EXPECTED is the solutions, one per line joined by "|" (sorted), or "error".
check() {
	name="$1"; expected="$2"; map="$3"; shift 3
	out=$(printf '%s\n' "$map" | "$BIN" - "$@" 2>/dev/null)
	if [ $? -ne 0 ]; then got="error"
	else got=$(printf '%s\n' "$out" | tail -n +2 | sort | tr '\n' '|' | sed 's/|$//'); fi
	if [ "$got" = "$expected" ]; then
		pass=$((pass + 1)); echo "ok    $name"
	else
		fail=$((fail + 1)); echo "FAIL  $name"; echo "      expected: $expected"; echo "      got:      $got"
	fi
}

# Cells: 0 = article (0 dem, 1 der, 2 den), 1 = noun (0 Bus, 1 Frau, 2 Kindern),
# 2 = gender/number (0 masculine, 1 feminine, 3 plural).
RULE='group 0 2
0 0
1 1
2 3
end'
WORDS='group 1 2
0 0
1 1
2 3
end'

# Create: every correct "mit + article + noun": exactly 3, never "mit der Bus".
check "create: the Dativ rule allows only right pairs" "0 0 0|1 1 1|2 2 3" "cells 3
$RULE
$WORDS"

# A fixed slot: the sample's noun is "Frau", the article is open.
check "a fixed slot narrows the search" "1 1 1" "cells 3
domain 1 1
$RULE
$WORDS"

# Find: lines from a text are a group. "mit den Bus" (2 0) is in the text,
# but the rule throws it out: only real AND correct lines are found.
check "find: a wrong line in the text is not found" "0 0 0|2 2 3" "cells 3
$RULE
$WORDS
group 0 1
0 0
2 0
2 2
end"

check "stops at the maximum" "0 0 0" "cells 3
$RULE
$WORDS" 1

check "no solution when the slots contradict the rules" "" "cells 3
domain 0 0
domain 1 1
$RULE
$WORDS"

check "bad map: value over 31" "error" "cells 1
group 0
32
end"
check "bad map: group without end" "error" "cells 1
group 0
1"
check "bad map: candidate of the wrong length" "error" "cells 2
group 0 1
1
end"

echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
