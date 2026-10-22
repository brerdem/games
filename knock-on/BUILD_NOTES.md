# Knock-On — build notes

## Concept

- Game ID: GF-20261022-01
- Brief: v1, 2026-10-22, copied verbatim to `BRIEF.md`
- Summary: Knock every standing domino, elbow and splitter flat. A fall lies down in the next cell and leaves a tail, so later pushes can run out of floor. A side hit spins a domino and leaves it standing. Elbows turn a chain. Splitters fork it. Order is the puzzle. No physics and no randomness.

## Implementation

- Tech: `index.html`, `logic.js`, `game.js`. Classic scripts, system sans, Canvas 2D, synthesised WebAudio. No build step and no network assets. The rules, the solver, and the D1–D10 policies live in `logic.js`.
- Mechanics: swipe a standing domino along its length. The grid steps are the brief's `push()`. H falls east or west, V falls north or south. Parallel dominoes knock on only when they have room, otherwise they jam. A side hit spins 90° and stays standing. Elbows and splitters are not pushed; a chain turns or forks them. Pushes are par + 2. Undo costs one. Restart is free. One hint pulses an optimal push, or says the table cannot be finished.
- Loop: 12 levels from §I.2, with the suggested names. Stars: 3 for a clear in exactly par pushes with no undo and no hint, 2 when at least one push is left, 1 on the last push. Progress is `localStorage` key `knock-on-progress-v1`.
- Controls: swipe at least 24 px along the axis to commit. A preview appears from 12 px. Releasing over the button bar or on the outer pixels of the viewport cancels. An illegal push wobbles and spends nothing. A cross-axis swipe does nothing. Tap a domino, then tap an arrow on one end. Arrow keys move the cursor, Shift+arrow pushes, Z undoes, R restarts, H hints, Esc opens the menu.
- Animation and visuals: a walnut table and a green felt board. Ivory dominoes, wooden walls, amber elbows, teal splitters. The cascade plays the push log tick by tick, capped at 2.2 s, with a rising click. Six or more falls in one push label "Knock-on ×N". The last clear replays the fallen cells as a short stadium wave. A tap after 0.5 s skips the rest of a cascade.
- Physics: none. The tip-over is a hinge tween. The committed grid is the rule result.

## Scope

- Done: the twelve levels, swipe and arrow play, live preview, illegal wobble, undo, restart, exact stuck banner, out of pushes, pinned marker, stars, one hint, cascade audio, portrait lock, save, level select.
- Simplified: the tip-over is 2D and top-down, which the brief allows. Music is one synthesised loop. No meta and no generator, which the brief allows.
- Deferred: domino sets, the daily board, new piece types, boosters.
- Limitations: the domino face is a two-pip tile, not a double-six set. Flat tiles remember their fall direction in a drawing pose beside the rule grid. The rule grid itself is still only the characters from §I.4.

## Design decisions

- `push()` writes the grid exactly as §I.4. It also returns the sandbox log (fell, spin, jam, turn, split) so the preview and the cascade can name each tick. Felled counts on the §I.3 lines match the brief.
- The stuck check is a memoised search built when the table opens. A push then looks the position up. The search treats a cycle as no progress, and every budget in this set is at most 8.
- Restart asks first once a push has been spent, so a mis-tap does not throw the table away. From the stuck and out-of-pushes cards it restarts immediately.
- Arrow buttons stay on screen. If the screen edge would drop one on top of the domino, that arrow shifts aside so the swipe can still start on the cell.
- The domino theme is shared with other toppling toys. The rules are not. That flag is for Burak.

## Testing

| Item | Result | Evidence |
| --- | --- | --- |
| I.3 lines and felled counts | PASS | All 12 reference lines clear. Felled counts match §I.3. BFS par and optimal-route counts match |
| Preview equals commit | PASS | Every legal push on the opening board and along each solution commits the same grid the preview computed |
| Illegal push is free | PASS | A west push from L1's left edge spends nothing |
| L1 stuck and out of pushes | PASS | East from the third domino opens the stuck banner with 2 pushes left. After undo, the same push spends the last token and opens Out of pushes |
| Undo costs 1 and restores the grid | PASS | The L1 board returns and one push is spent |
| Stars | PASS | Par with no undo and no hint is 3. A hint on that clear is 2. A clear after an undo on the last token is 1 |
| D1 RAND ≤ 3% on L7–L12 | PASS | Exact 0.2, 0.5, 0.0, 0.2, 0.0, 0.1% |
| D2 RAND+probe ≤ 5% | PASS | Exact 0.3, 1.1, 0.0, 0.2, 0.0, 0.1% |
| D3 GREEDY is 0% | PASS | Exact 0 on L7–L12 |
| D4 GREEDY2 ≤ 10% | PASS | Exact 0 on L7–L12 |
| D5 GREEDY2+probe ≤ 15% | PASS | Exact 0 on L7–L12 |
| D6 MAXIMAL+probe ≤ 30% | PASS | Exact 28.2, 26.9, 15.6, 13.9, 16.0, 7.0%. A 300-seed sample is also logged |
| D7 NOSPIN is 0% on L5–L12 | PASS | Exact 0 |
| D8 SAFE1 ≤ 5% on L7–L12 | PASS | Exact 0.6, 3.6, 0, 0, 1.0, 0% |
| D9 hint fishing ≤ 60%, never 3★ | PASS | Worst exact clear is 55.6% on L8 and on L12. Hinted clears are not 3★ |
| D10 preview fishing | PASS | Accepted by design. The preview is one push, which is what GREEDY knows, and D3–D5 fail |
| P1 planner clears at par | PASS | BFS par equals the listed par on all 12 |
| P2 elbows and splitters | PASS | Replacing any of them with floor raises par or makes the level unsolvable. Each turns or splits on the reference line |
| P3 L12 strictly hardest | PASS | Lowest MAXIMAL+probe (7.0%) and MAXIMAL (2.0%) of L7–L12, and the only par of 6 |
| P4 no mirror or 180° copy | PASS | The 12 grids stay distinct under horizontal mirror, vertical mirror, and 180° rotation |
| Stuck lookup < 50 ms | PASS | After the table's search is built, a lookup is under 50 ms. Building L9's search is the slow open, about a quarter second here |
| Cells ≥ 54 px at 360×800 | PASS | The 360×800 viewport reports a cell at least 54 px. Buttons stay at least 48 px |
| Eight-viewport swipe | PASS | 360, 375, 390, 393, 412, 430, 768×1024, 1440. Each clears L1 with a real touch swipe |
| Release over the bar and the screen edge | PASS | A CDP touch past the commit distance lifts in the button bar and spends nothing. A second lift at the right screen edge spends nothing. The logged pointerup matches those points |
| Overlay triple-tap | PASS | Three taps on Restart and on Next do not spend a push or skip an extra table |
| Resize and rotate keep the table | PASS | A push on L2 survives a shorter height, a landscape round-trip, and the return to 390×844 |
| Reload opens the last unlock | PASS | Saved unlock 4 reloads as Table 4 |
| Landscape rotate prompt | PASS | 844×390 shows only the rotate card. A tap spends nothing |
| Idle frames identical | PASS | Two frames of a settled L1 match |
| 50 fps at 4× during a swiped solve | PASS | L10, 390×844, deviceScaleFactor 2, buffer scale 1.5, buffer 585 wide. Three-run minimum 60.0 fps |
| Portrait frame | PASS | Shared layout check: desktop letterbox at 9:19.5, phones fill the screen, canvas scale is uniform |
| No network, file:// | PASS | `file://` play has no http requests |
| H2–H5 human play | DROPPED | Section M.2 is for Game Tester |
| Domino sets, daily, generator | DROPPED | Future in sections J and K |

Unverified: the haptic tick on a real phone, and whether a person can read the tail by the end of L3. Both need a device and Game Tester.

Repro: `node --test --test-timeout=180000 knock-on/tests/logic.test.mjs knock-on/tests/browser.test.mjs`

## QA revision 1

R0 was REVISE at 71/100 (`QA_REPORT.md`). Rules and the twelve levels are unchanged.

| ID | Action | What changed | Test | Status |
| --- | --- | --- | --- | --- |
| KO-001 | Arrows appear only after a tap with less than 8 px of movement. They sit inside that cell. A touch on another domino selects or swipes that domino | `game.js` placeArrows, endDrag | L3: a tap's arrows stay inside the cell, and a tap on the domino above spends nothing. An 8 px drag shows no arrows, and the next swipe pushes the neighbour | PASS |
| KO-002 | A cascade skip finishes on pointer-up, and a panel ignores input for 340 ms after it opens | `game.js` show, endDrag | L9's stuck cascade, tapped at 600 ms over the centre, still shows the banner with 6 pushes left | PASS |
| KO-003 | Undo no longer copies `hintUsed` back from the snapshot. Restart is the reset | `logic.js` undo | After Hint and Undo the button stays Used | PASS |
| KO-004 | Minimum pushes are a shipped table, one object per level. Opening and restarting do not search | `min.js`, `game.js` minFor | L9 at 4× CPU: largest frame 16.8 ms on open and 50.0 ms on restart | PASS |
| KO-005 | The hint paints the chosen direction, marks that arrow, and shows the ghost of the push | `game.js` doHint, placeArrows | The hinted arrow uses the gold hint style and the preview is that push | PASS |
| KO-006 | A tail is the far half of the one fallen plank, plus the dashed taken-cell mark. It is not a second domino | `game.js` drawFlat, drawTailMark | L1 after the third domino falls shows one plank per fall | PASS |
| KO-007 | The pinned marker is a pin with a head and a stem, about 24 px tall | `game.js` drawPin | Visible on the domino the stuck push leaves behind | PASS |
| KO-008 | On the last table the win panel focuses Retry. Escape leaves that panel open | `game.js` openWin, keydown | Focus and Escape | PASS |
| KO-009 | Arrows are clipped to the selected cell, so they do not meet the button bar | `game.js` placeArrows | The L3 arrow boxes lie inside the cell at 390 | PASS |
| KO-010 | R restarts immediately when no push has been spent, and confirms after one has | `game.js` keydown | Same rule as the Restart button | PASS |

## Delivery

- URL: https://brerdem.github.io/games/knock-on/
- Commit: first Knock-On on `main`
- Build: GitHub Actions workflow `ci`, job `knock-on`
- Game Tester: ready for a first pass against section M. The domino theme is shared with toppling toys; the floor, spin, elbow and splitter rules are not. That flag is for Burak, not a silent change.
