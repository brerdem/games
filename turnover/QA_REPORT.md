# Turnover — QA Report R1 (revision cycle 1 of 2)
Commit `1f0a7ffe698752e22ecc50c1a7045d83a17ea642` · live https://brerdem.github.io/games/turnover/ · Tester: Grok Bot · 2026-10-25 09:55 (UTC+3)
All results are **SIMULATION**: headless Chrome with CDP touch drags plus my independent engine. No humans, no real devices. The R0 report is archived as `QA_REPORT_R0.md` with `shots_r0/` and `data_r0/`.

## A. Verdict
**74/100: REVISE.** It is still below 80, and there is a new critical defect: P1 TO-011, where a queued move plays after a win or after the budget is spent. Four of the five R0 issues I re-checked are fixed. TO-003 was resolved as design.

| Category | R0 | R1 | Gate |
|---|---|---|---|
| Core | 15 | 16 | ✓ |
| Feel | 14 | 15 | ✓ |
| Hook | 10 | 10 | ✓ (borderline) |
| Progression | 11 | 11 | – |
| Visuals | 7 | 8 | – |
| Mobile | 8 | 8 | ✓ |
| Originality | 6 | 6 | ✓ (provisional) |
| **Total** | **71** | **74** | 80 ✗; critical defect ✗ |

## B. Build and rule changes
- **Live files match the commit:** sha256 prefixes game.js 0182ddd914ee, index.html 67c4df3c36bf, logic.js 88b04ebaa787.
- **logic.js changes:** a canFinish memo and `prewarm` only. The levels, the rules and the par+2 budget are unchanged, so I did not recompute the exact lazy odds. The R0 values still apply (L7–L10 = 8.87 / 11.15 / 1.19 / 2.19%; copy in `data/exact_odds_r0_unchanged_rules.json`).
- **Rechecked on R1 logic.js:**
  - Base metrics: identical.
  - Fidelity: every reachable state, 0 mismatches (2,938,704 states / 46.8M moves in the largest config).
  - Banner exactness: 0 wrong (exhaustive on L1–L5; sampled on L6–L10).
- **Builder tests:** 17/17 pass (`data/o_builder_tests.txt`).

## C. Fix verification (real interaction at 320×568, 360×800, 390×844, 430×932)
| ID | Status | Evidence |
|---|---|---|
| TO-001 (queued moves bypass rules) | **Fixed** | Seq [2,1,1], [2,3,0], [1,2,0]: 3/3 at each size → flip, flip, `reject:1,2,0` with a shake and red flash. Max plate height 4. The keyboard sequence `3q23e12w1` gives the same result. Fuzz: 120 bursts of 2–4 fast drags across L1–L10 at 320 and 390 (345 drags). 0 capacity breaches, piece multiset preserved, and the final state equals a replay of the logged flips in 120/120 bursts. Shot `to001_a_390.png`. |
| TO-002 (undo not a stack) | **Fixed** | Rapid undo taps after idle: L4 3 moves/3 undos, L10 4/4, L9 5/5 at all 4 sizes → back to the exact start every time, with the exact reverse moves. L9/L10 one-at-a-time undos #1 and #2 restore the exact previous states. After that the stuck card appears and blocks further undo, which is expected under the accepted economy. |
| TO-003 | **Closed as design** | The stuck card shows Restart only (`stuck_card_390.png`). **But the copy still says "Can't finish in N flips — undo or restart"** (`logic.js` stuckText). See TO-013. |
| TO-004 (depth-4 contrast) | **Fixed** | Pixel classification of 300 bands at level starts (320 and 390): 300/300 correct. Depth-4 burnt vs golden is **6.91:1**, the same as depths 1–3. It was 1.51–1.97:1 in R0. Shot `read_390x844_L9.png`. |
| TO-005 (tap-then-tap) | **Partly fixed** | Tap a pancake, then tap the empty part of the target column → flips (320, 390, and the R0 regression probe). Tap a pancake, then tap a pancake on the target plate → it re-selects instead of flipping (0 flips). |
| TO-006 (top-edge hit overlap) | **Fixed** | Misfire stress, touch anywhere in the pancake box (1–99% of width and height, no wobble), random legal depth-1–3 moves on L9/L10: **0/100 at 320, 360, 390 and 430**. Central 70% with 3 px wobble: 0/100 at 390. |
| TO-007 (first-flip spike) | **Mostly fixed** | 6 runs at 390, DPR 2, 4× CPU: a 216 ms frame at frames 2–3 in 1/6 runs (the first, cold browser). The other 5 runs had a worst frame ≤67 ms (mean 58.7–59.9 fps). |
| TO-008 (undo during animation) | **Queue logic works; touch unconfirmed** | Mouse click on Undo mid-flip → queued and played 6/6 (320, 390, 430). A CDP touch tap mid-flip was queued only 5/21 times (4/4 at 320/360 in one run, 1/17 elsewhere). Touch taps after idle work 6/6. R0 showed the same pattern of swallowed synthetic taps right after a drag, so this looks like a harness/emulation effect. **Needs a real-device check.** A held-over queued move under the stuck card is moot now that the card is Restart-only. |
| TO-009 (GF sim probe noise) | Open (sim-side, not re-run) | – |
| TO-010 (empty top / wobble) | **Fixed** | Stacks are vertically centred and the wobble shake is drawn (shots). |

## D. New issues
| ID | Pri | Owner | Issue / evidence |
|---|---|---|---|
| TO-011 | **P1** | MVP Builder | **A queued move still plays after the level has ended.** `finishAnim` pumps the queue before revealing the outcome, and `moveLegal` doesn't check won or flips.<br>(a) L1: make the winning flip, then drag again within its 400 ms → the win is erased (`[[0,0],[],[2,2,2,0]]`), with no win card. **12/12** (4 sizes × 3).<br>(b) L1 at flips = 1: last flip plus 1–2 queued drags → flips **−1 / −2**, used 6–7 of a budget of 5, fail card. **12/12** (−1 runs) plus 1 (−2). Shots `edge_queued_after_win_390.png`, `edge_queued_after_fail_390.png`.<br>Fix: clear or reject the queue once the result is win or fail (stuck may continue), and reject any move when flips ≤ 0. |
| TO-012 | P2 | MVP Builder | **A drag that starts off a pancake throws `TypeError: Cannot read properties of null (reading 'plate')`** in `endDrag` because `d.lift` is null. This happens when a drag starts in the 4 px gap between pancakes, on empty counter, or on a spot that a queued flip has just emptied. The drag is lost with no feedback. Seen at 320 and 390 in probes, in the R0 gesture regression, and 2 times in each fuzz run. These are the only console errors in R1. |
| TO-013 | P3 | MVP Builder | The stuck copy says "undo or restart", but the card offers only Restart (`stuck_card_390.png`). |
| TO-014 | P3 | MVP Builder | Release-time rejections give no reject event or red flash. In fuzzing, a drag that was legal when it started became illegal at release because a queued flip had run meanwhile. It got only the short 220 ms source wobble (8/180 drags at 320, 5/165 at 390). This is not a queued-move drop. |

**"No queued move is ever silently dropped": holds.** In the fuzz runs, every *queued* move ended as either a `flip` or a `reject` event (shake plus flash). The only lost inputs were drags that never got queued: TO-012 (silent, with an error) and TO-014 (wobble only).

## E. Regression
- **Stuck banner:** 590 in-browser spot checks on L7–L10 after real drags (145 stuck states), 0 wrong.
- **Layout:** 19 sizes, 320×568 to 480×1000, all levels, 4-high boxes: nothing off-screen or overlapping.
- **Offline:** file:// with the network off → win, 0 non-file requests.
- **Overlays:**
  - Triple tap on win-Next advances one level.
  - Triple tap on lesson-OK leaves the state clean.
  - Triple tap on stuck-Restart gives one clean restart.
  - Double tap on fail-Restart is clean.
- **Rotate and resize:** the landscape overlay appears and drags are ignored. Rotating back and resizing to 360×640 keeps the state, and drags work afterwards.
- **Gestures:**
  - Commit nothing: an 8 px drag, a drop back on the same plate, a drop in the gap, a drop on a full plate, the 4th pancake, touchcancel, a two-finger touch.
  - Commit, because the target is chosen by x only: a release over the HUD or bar, a diagonal drag.
- **fps (my measurement, 390, DPR 2, 4× CPU, L10 solve):**
  - First 3 runs: mean 57.5 / 58.7 / 59.8, worst 30-frame window 40.0 / 54.6 / 58.1.
  - Repeat 3 runs: 59.5 / 59.9 / 59.9, worst windows 54.6 / 58.1 / 58.1.
  - The builder's own test in my run: 58.2 / 60.0 / 59.5.

## F. Builder claims
| Claim | Result |
|---|---|
| TO-001 re-checked, shake, not applied | ✓ for capacity. ✗ for terminal states (TO-011) |
| TO-002 proper stack | ✓ |
| TO-003 | ✓ Restart-only (copy mismatch, TO-013) |
| TO-004 full strength + shadow + dashed rim, ≥4.5:1 | ✓ 6.91:1 |
| Tap-then-tap for touch | Partial (empty column area only) |
| Fixed hit boxes | ✓ (but gap/empty starts now throw, TO-012) |
| Opening flips prewarmed | Mostly (spike in 1/6 runs) |
| Undo queued during animation | ✓ via mouse; touch unconfirmed (C, TO-008) |
| Stacks moved higher | ✓ |
| 0/100 misfires incl. top edges | ✓ on L9/L10 at 4 sizes. I did not test L1/L4 |
| 17/17 tests | ✓ |
| Min fps 59.5 | ✗ not reproduced as a minimum. Their test gave 58.2 in my run; still well above the 50 gate |

## G. Game Finder asks (status)
Lazy odds unchanged (rules unchanged) ✓. Readability ✓ at all depths, measured automatically; the 5-human 2 s test has **not been run**. Misfires ✓. Queue never drops a queued move ✓, but TO-011 is open. Stuck banner ✓ exact. L9 vs L10 proxies unchanged from R0. Human checks H1–H5, the opacity test and the originality review are still pending.

## H. Next (cycle 2)
1. Fix TO-011: stop the queue at win/fail and require flips > 0.
2. Guard `endDrag` when `d.lift` is null (TO-012).
3. Change the stuck copy (TO-013).
4. Optionally make a tap on a target-plate pancake complete tap-then-tap.
5. Confirm undo taps during animation on a real phone.

## I. Key shots
`to001_a_390.png`, `edge_queued_after_win_390.png`, `edge_queued_after_fail_390.png`, `stuck_card_390.png`, `read_390x844_L9.png`, `read_320x568_L9.png`, `undo_rapid_L9_390.png`, `landscape_844x390.png`.
