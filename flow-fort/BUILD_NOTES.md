# Flow Fort — build notes

## Concept

- Game ID: `flow-fort`
- Brief: 2026-10-19 brief 1 (FLOW FORT), copied to `BRIEF.md`
- Summary: color-matched gunners ride a clockwise rail around a fort. A shot lands only on the first block in that lane when the colors match. Leftover ammo parks on a five-slot bench. The horde steps toward the wall unless Calm is on.

## Implementation

- Tech: `index.html`, `logic.js`, `game.js`. Classic scripts, system fonts, no build and no network assets. Rules and the headless simulator live in `logic.js`.
- Mechanics: one shot per lane per lap. Ammo 0 pops the gunner off the rail. A full bench jams and costs a heart. The rail cap is 3 on L1, 2 on L2, and 1 after that, so sending the wrong gunner blocks the loop. A row that reaches the wall costs a heart and is thrown back to the top, so a breach cannot clear the level. Purple gunners match nothing; they only occupy the bench.
- Loop: 8 levels. L1–L2 are short and safe. L3–L7 are layered shells with the needed color behind a decoy column. L8 keeps one inner color split into single-shot gunners so a bad order can jam that ammo away. Stars: 3 with 3 hearts and no jam, 2 with at least 2 hearts, 1 otherwise. Calm caps stars at 2. Progress is `localStorage` key `flow-fort-progress-v1` (unlocked level, stars, mute, calm).
- Controls: tap a deck front or a bench gunner. Keys 1–4 launch columns. Q W E R T launch bench slots, so R still launches. Restart is the on-screen Restart button or Backspace. M mutes, with a Sound button. Esc pauses and freezes the march. Calm is a title-screen toggle.
- Animation and visuals: the existing slate fort, chevron rail, gunner pips, hold-to-preview, breach flash, and jam shake stay. Landscape puts the bench and deck in a column to the right of the rail.
- Physics: none. The rail is a timed lap of 6.4 seconds.

## Scope

- Done: FF-001, FF-002, FF-003, FF-005, FF-011, and the rest of the shared shell on this game (mute, pause, save, outside release, restart on a key that is not R).
- Simplified: 8 levels rather than the brief's 15. No armored cells, bombs, bosses, endless mode, or coin shop. Those were called out as later work once the bench and the clock had stakes.
- Deferred: gunner spacing on the spawn point (FF-008). W still launches bench slot 2, because that key is part of Q W E R T.
- Limitations: L8 is where OUT OF GUNNERS shows up, and random play often still clears it. The pooled lazy-random loss rate stays just over half because L3–L7 lose every sampled run.

## Design decisions

- Depth comes from order and the bench, not a faster rail. The lap time is still 6.4 seconds. Later levels allow only one gunner on the rail, and the column in front of the player is full of purple decoys or inner-color shots that cannot fire yet.
- A breach respawns that row at the top. Deleting the row was letting the last blocks "clear" the level by walking into the wall.
- Careful time in the tests is the greedy policy with a 0.8 second gap between launches. One-second and 1.5-second greedy runs use the same policy with a longer gap. Calm greedy never marches.
- Spam is `spamLeftmostDeckOnly`: only deck column 0, never the bench. Random picks any current front.

## Testing

| AC | Result | Evidence |
| --- | --- | --- |
| 0.1 Enter after a win | PASS | `mute, pause, restart, and saved progress` presses Enter and lands on level 2 |
| 0.2 Help sheet at the top | PASS | Already wired: `focus({preventScroll:true})` and `scrollTop = 0` |
| 0.3 Classic script, file:// | PASS | `file:// has no http requests` |
| 0.4 Mute, pause, save. R kept as launch | PASS | Same browser test. M and the Sound button mute. Esc pauses. Stars and unlock survive reload. Restart is Backspace and the Restart button. R still launches bench slot 4 |
| 0.5 Overlay lock | PASS | `core gesture, landscape separation, and next stays off the bench` clicks Next immediately and the level does not change |
| 0.6 Release outside the canvas | PASS | `outside release does not launch` (mouseup at (5,5), rail stays empty) |
| 0.7 CI | PASS | `.github/workflows/ci.yml` job `flow-fort` runs `flow-fort/tests/logic.test.mjs` and `flow-fort/tests/browser.test.mjs` |
| FF-001 Lazy loss, greedy, both rare lose states | PASS | `lazy strategies lose on L3+ and greedy holds the timed line`. Spam 6/6 on L3+. Random 86/170 losses (L3–L7 are 16/16 each; L8 is 6/90). Greedy calm 8/8. Greedy at 1 second 8/8. JAMMED 13 runs, OUT OF GUNNERS 3 runs |
| FF-002 Time pressure and calm | PASS | Median careful clear on L3+ is 81.0 seconds (greedy, 0.8 second reaction). Greedy at 1.5 seconds loses at least one heart on 3/4 of L5–L8 and wins L1 and L2 with 3 hearts. Calm toggle is on the title screen |
| FF-003 Breach is not a clear | PASS | `breach frame never clears the level`. The scripted shell leaves the blue block in play and costs a heart |
| FF-005 Landscape bench/board overlap | PASS | `core gesture...` asserts grid/rail do not overlap bench/deck on all 8 viewports, including 844×390 and 932×430 |
| FF-011 Next over the bench | PASS | At 844×390, `elementFromPoint` on every bench slot is not `#nextBtn`. A click in the first 300 ms does not advance |

Commands: `node --test --test-timeout=180000 flow-fort/tests/logic.test.mjs flow-fort/tests/browser.test.mjs`

Unverified: a physical phone, and whether an 81 second careful clear feels tense or tedious. The times are from the headless simulator, which uses the same lap, shot, park, jam, and march rules as the page.

## Delivery

- URL: https://brerdem.github.io/games/flow-fort/
- Commit: the `main` commit that adds this rebuild
- Build: GitHub Actions workflow `ci`, job `flow-fort`, plus the existing Pages workflow
- Game Tester: ready for a round-1 retest of Flow Fort. Other games were not changed except the shared CI workflow, which gained a `flow-fort` job.
