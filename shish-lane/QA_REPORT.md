# Shish Lane — QA Report R0
Build: brerdem/games `main` @ 4092315954263c61e25bcbdb98019482b9b1b76f (commit time 2026-10-24 17:10 UTC+3), folder `shish-lane`, live https://brerdem.github.io/games/shish-lane/
Tester: Grok Bot (Game Tester). The game code was not modified. Tools are in `tools/shish-lane/`; raw data is in `reports/shish-lane/data/`.
Method notes: all touch input was real CDP touch events (synthetic, not a human finger). Headless Chrome fps is indicative only. Every percentage marked SIMULATION is an exact probability from full recursion, not a sample.

## A. Verdict
**REVISE — 72/100.** The total is below 80. All category gates pass. There is no P0, but there are two P1 issues: the undo economy contradicts the star table and the sandbox model, and L7 random+undo is over its threshold. Once those are fixed, the build needs human review only. It is not production-ready.

| Category | Score | Gate | Basis |
|---|---|---|---|
| Core | 15/20 | ≥14 ✓ | Rules match the brief exactly: 0 mismatches over every reachable state. The undo economy (SL-001) caps play at one useful undo. |
| Feel | 14/20 | ≥14 ✓ | Commit takes 310–330 ms with drag preview, a free mismatch shake and stable 60 fps. The stuck card can be a dead end (SL-003). touchcancel commits a thrust (SL-004). |
| Hook | 11/15 | ≥10 ✓ | Each swipe clears a strong chunk of the board and opens new lanes. Real appeal is untested by humans (H1–H4). |
| Progression | 11/15 | — | 11 levels; coal and slab each get one teaching card. L7 random+undo is at 17.4% (SL-002). The ★ tier is unreachable (SL-001). |
| Visuals | 6/10 | — | Clean and readable, using shapes plus colour. Flat canvas primitives, no art assets. |
| Mobile | 8/10 | ≥7 ✓ | No overflow or off-screen UI at 19 sizes. Lane zones are ≥44 px. Phone landscape shows a rotate card by design. |
| Originality | 7/10 | ≥6 ✓ | The lane, first-4 cap and either-direction ticket rules are distinct. The theme overlaps adjacent games (brief §B). |
| **Total** | **72** | 80 ✗ | |

## B. Build and file integrity
- The sha256 of the live index.html, game.js and logic.js matches the commit.
- BRIEF.md is byte-identical to the Game Finder brief.
- Dropped features are consistent with the brief: no hint (§K "No hint in the MVP"), no L12 (§N "Ship 11"), and no daily grill (listed under Future, not authorised).

## C. Builder claim checks
| Claim | Result |
|---|---|
| 15/15 tests | **Confirmed 15/15**, but only after Playwright was made resolvable. Out of the box, browser.test.mjs fails with ERR_MODULE_NOT_FOUND, giving 8/9 (SL-005). I ran the tests from a temp copy plus a node_modules symlink; the repo was untouched. |
| Fidelity 400 cases, 0 mismatches | Confirmed by their test. My own independent engine went further: all 1,814 reachable states and 5,469 legal thrusts across 11 levels, with 0 mismatches in sequence, cells, stop reason, legal set or solver (`data/o_fid.txt`). State counts match the brief. |
| Misfires 0/100 | Confirmed by me at **0/350** (L11; 100 at 360, 150 at 390, 100 at 430). Each swipe had ±3 px wobble, ±6 px start jitter and 0.8–1.4 cells of travel. There were 0 non-commits and 0 wrong lanes. These are synthetic swipes. |
| FPS min 60 | **Nearly confirmed.** At 390, DPR 2, 4× throttle, three swiped L11 solves gave 59.9 / 59.9 / 59.9 avg fps, p95 16.8 ms, worst frame 33.3 ms (one dropped frame). A DPR 3 run gave 59.8 / 60 / 60. |
| Commit ≤340 ms | Observed animMs of 310–330. |
| L11 cell 50 px at 390 | Confirmed (45 at 360, 57 at 430). |
| Restart fade ~160 ms | **Not measured.** Restart restoring the full budget was observed. |

## D. Brief M1–M8
- **M1 PASS:** all 11 reference lines cleared with ★★★ via real swipes at 360, 390 and 430 (`data/m1_reference_swipes.json`).
- **M2 PASS:** a mismatched swipe on L1 left the board, tickets and skewers unchanged.
- **M3 PASS as literally worded** (undo restores the board and ticket and costs exactly 1; restart restores 6/6 and 9/9). But see SL-001: a serve plus an undo costs 2 skewers.
- **M4 PARTIAL:**
  - 25 states checked (each start L2–L11 plus random swipe walks): 0 mismatches against the game's own rule (solver-unsolvable or skewers < tickets).
  - The game also raises the "unsolvable" banner when the board is solvable but skewers < tickets, e.g. L7 at its start position after 2 undos. That breaks the brief's "iff the solver says unsolvable" (SL-003).
- **M5 PASS:** checked exhaustively in the engine comparison, and the coal/slab levels were played through with swipes.
- **M6 PASS:** the smallest lane zone was 44×44 on every level at 360, 390 and 430. A tap, an 8 px drag and a 30%-cell drag never thrust.
- **M7 PASS:** commit takes 310–330 ms and fps is as above (headless, indicative only).
- **M8:**
  - Pack exactness: PASS (my parse equals logic.js).
  - Non-isomorphism: confirmed only by the builder's test, not checked independently.

## E. Game Finder targets (SIMULATION, exact)
Model: the sandbox's own policies, with thrusts de-duplicated by cell set. Probe means undo and ban the fatal thrust, at most 2 times. Source: `tools/shish-lane/sodds2.mjs` → `data/o_odds2.txt`.

| Level | Lazy max (policy) | RAND+probe | Target |
|---|---|---|---|
| L7 | 29.0 (LONG+probe) | **17.4 ✗** | ≤30 / ≤16 |
| L8 | 14.3 | 7.1 | ✓ |
| L9 | 13.8 | 9.0 | ✓ |
| L10 | 16.7 | 7.5 | ✓ |
| L11 | 8.2 | 1.5 | ✓ |

- The brief's L7 figure of 15.3% came from a 300-sample run. The builder's test reuses that seed, so it passes; the exact value fails (SL-002).
- With the game's real economy (only 1 useful undo, see SL-001), L7 random+undo is 8.8% and L7 lazy max is 16.2% (`data/o_odds_1undo.txt`).
- **L11 hardest: PASS.** It has the lowest lazy max and RAND+probe of L7–L11 (also below L6), the most states (549), and the highest fatal share on the brief's reference-path metric (0.442). On my alternative all-states metric, L6 is higher (0.647 vs 0.469).
- **Swipe misfires under 3/100: PASS** (0/350, synthetic).

## F. Lose states, gestures, overlays, resize
- **Stuck banner:** shown on a fatal L7 thrust (`shots/m390_rules_01_L7_stuck_banner.png`).
- **Fail card:** reached at all 3 sizes (L1: 3 serves, then undo, undo, stuck-undo → 0 skewers) (`shots/m390_mis_01_fail_card.png`).
- **Second undo:** always triggers the banner. On L7 it shows at the start position with 5 skewers for 7 tickets (`shots/m390_rules_02_L7_after_undo2.png`). After undoing back to the start on L1, the banner's "Undo −1" does nothing and is not disabled (`shots/m390_mis_02_stuck_after_two_undos_L1.png`).
- **Gestures:**
  - Drag-back cancel: no thrust.
  - Swipe starting in the board centre: no thrust.
  - Release far past the board: commits (acceptable).
  - An exact 45° diagonal resolves to vertical at 390/430 (note only).
  - **touchcancel after a 1-cell drag commits the thrust** at all sizes (SL-004).
- **Overlay multi-taps:**
  - Win "Next" ×2 and ×3 went to L2 exactly once.
  - Stuck-undo ×3 applied 1 undo.
  - Fail-restart ×3 gave one clean restart.
- **Rotate/resize:** mid-L7 state kept through portrait → landscape → portrait and a shrink. Landscape phone shows "Turn upright" and ignores swipes. Each level was then finished with a win. All at 3 sizes.
- **Off-screen checks (19 sizes, 320×568 to 1920×1080 plus 3 landscape phones):** no off-screen buttons, rail or HUD, and no scroll. Bar buttons are 48 px high.
  - At 320×568, the T-lane zones overlap the ticket rail (SL-006).
  - Landscape phones are covered by the rotate card.
- **file:// offline:** L1 won with ★★★ and 0 network requests (moves via the commit hook, not swipes).
- **Keyboard and URL:** `?level=7` loaded L7. Arrow then Enter thrust R0 (a mismatch, so it was free).
- **Errors:** 0 page errors in all runs.

## G. Issues
| ID | Pri | Owner | Issue / evidence |
|---|---|---|---|
| SL-001 | P1 | MVP Builder (Game Finder rules on the intent) | The serve skewer is not refunded **and** undo charges another 1, so skewers − tickets = 2 − 2×undos. Consequences: one undo leaves exactly zero slack; a second undo always triggers the stuck banner; ★ (2 undos) can never be earned. The sandbox (§E) models 2 usable undos. Evidence: `data/rules_390.json` (L7: 9 → 8 → 7 (u1) → 6 → 5 (u2, stuck); a one-undo clear ends ★★ with 0 skewers); game.js:294 and :383. |
| SL-002 | P1 | Game Finder (pack/threshold), then MVP Builder | Exact L7 RAND+probe is 17.4%, over the 16% limit (the brief's 15.3% was a 300-sample estimate). This interacts with SL-001: under the current 1-undo economy it is 8.8%. Decide the economy first, then re-check. |
| SL-003 | P2 | MVP Builder | After a budget-stuck, the banner says "No remaining sequence can serve every ticket." even when the board is solvable, which breaks M4's "iff". Its primary "Undo −1" stays enabled and does nothing once the undo stack is empty. Shots: `m390_rules_02…`, `m390_mis_02…`. |
| SL-004 | P2 | MVP Builder | pointercancel is handled like pointerup and commits a thrust (game.js:836). An OS interruption mid-drag spends a skewer. Seen at 360, 390 and 430 (`data/input_overlays_rotate.json`). |
| SL-005 | P3 | MVP Builder | browser.test.mjs cannot find `playwright` from the repo. Document or add the dependency. |
| SL-006 | P3 | MVP Builder | At 320×568, the T-lane hit zones overlap the bottom of the ticket rail. |

## H. Human playtest list (not done, need humans)
- H1: rules understood without text by L3.
- H2: the long-lane moment feels satisfying.
- H3: players plan ≥2 thrusts ahead from L6.
- H4: failures feel fair. Watch for SL-001: does a second undo feel like a forced fail?
- Real-finger misfire rate (my 0/350 was synthetic).
- Real-device fps.

## I. Key artifacts
- **Screenshots:** `shots/m390_m1_02_L11_win.png`, `m390_rules_01_L7_stuck_banner.png`, `m390_rules_02_L7_after_undo2.png`, `m390_rules_03_L7_one_undo_win.png`, `m390_mis_01_fail_card.png`, `m390_mis_02_stuck_after_two_undos_L1.png`, `m390_input_01_landscape_mid_L7.png`, `size_*_L11.png` (19 sizes), `m390d2_fps3_01_L11_win_fps_dpr2.png`.
- **Data:** `data/o_fid.txt`, `o_odds2.txt`, `o_odds_1undo.txt`, `o_odds.txt` (alternate non-deduped model), `o_tests.txt`, `m1_reference_swipes.json`, `rules_390.json`, `input_overlays_rotate.json`, `misfire_fail.json`, `misc.json`, `fps_390_dpr2_4x.json`.
- Times are UTC+3. Report written 2026-10-22.
