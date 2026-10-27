# Fizz Tower — build notes

## Concept

- Game ID: GF-20261027-01
- Brief: v1 in `BRIEF.md`
- Tap a bottle to pour one measure of soda into the tower. A full glass takes the new soda on top and pushes its old top layer out toward the side it leans. Brass rockers flip after every spill. Win when every glass holds its target layers, within par + 2 pours.

## Rulings recorded for R1

- `core.py` is retired. It is not in this repo. `tests/core2.py` is the only rules source. The pack and the brief match it: new soda settles on top of a full glass, and the old top is pushed toward the lean captured before the rocker flips.
- A tap during a cascade is ignored. It is never queued and the cascade plays to the end. The ignored tap wiggles that bottle and plays a soft tick. The pour count does not change.
- FT-003: there is no slow-motion final step. The first push stays at full readable speed (280 ms). If the chain would pass 1.2 s, the middle steps are shortened evenly. The schedule is capped at 1140 ms so a frame that lands slightly late still finishes by 1.2 s. A 4-event drip chain is 200 ms lead + 280 ms first push + three equal middles.
- FT-002: every bottle hangs over its entry glass, neck down, spout toward that glass's rim. When two bottles share a column (L2, L3, L5, L10) they sit side by side in bottle-index order, each center half a bottle width from the glass center, and both spouts angle into that glass. Hit boxes are at least 64 px and never under 44 px, and they do not overlap. If two centered pairs would overlap, the later pair drops to the next row instead of shrinking the hit box. At 360 px wide and narrower the bottle art scales to 0.7 and the hit box stays 64 px.
- FT-014: a tap during a cascade, and a tap that starts in the 150 ms after it ends, is swallowed and never queued. Each swallowed tap wiggles the bottle. Only a tap that starts after that window pours.

## Implementation

- Tech: Canvas 2D. No build step and no physics library. `logic.js` is the rules, ported from `core2.py`. `game.js` draws and handles taps. `pack.js` is the committed `pack_v1.json`.
- A pour is atomic. If the glass has room, the measure settles on top. If it is full, the new measure replaces the top and the old top travels to the child on the current lean (left child same column, right child column + 1). A rocker flips after that spill. Liquid that leaves the tower is lost. A drip stain is stored on that pour's undo entry and disappears only when that pour is undone. Bottles do not run out.
- The 10 levels are `tests/pack_v1.json`. Budget is par + 2. Undo restores the previous tower and costs 1 pour. The button reads Undo −1. Restart drains the tower for about 300 ms and is free.
- The stuck card is exact. It reads "This tower can't be finished in 1 pour" or "in N pours". It appears only when pours remain and the solver distance is greater than those pours. Undo on that card hides it and then undoes, which costs 1 pour. Undo is offered only when paying for the undo still leaves a winnable tower. On L7 the pour that strands the tower with Undo offered is bottle 0 (B over column 0). Bottle 1 (A) leaves distance 7 with 9 pours remaining, so the card stays down. Running the budget to zero without a win shows the fail card.
- Stars: par is ★★★, par + 1 is ★★, par + 2 is ★. The finished tower plays for 750 ms, then the win card says Cheers!. Audio is one clink per glass, each note 70 ms after the previous, from the top of the tower downward. It is not a simultaneous chord.
- Controls: one tap on a bottle is one pour. There is no drag and no flick. Keys 1–4 pour, Z undoes, R restarts. While an overlay button's finger is down, the canvas is blocked. For 260 ms after that finger lifts, taps on the canvas are ignored, and another tap in that window extends it.
- The loading cover hides after the first paint. The solver then runs in short slices off the pointer path, so L10's search is not part of the visible load. `judge` does not build the graph on a frame. The party background and the idle tower are cached. A cascade redraws the glasses that changed. The backing store uses `devicePixelRatio` capped at 1.5 (`dpr = raw > 1.5 ? 1.5 : raw`).
- `?level=8` opens Rock Garden on the first paint. `?level=abc`, `?level=99`, and any other non-integer or out-of-range value opens Tower 1. There is no throw and no hang on "Chilling the glasses".
- Feel on top of the rules: L1 draws a pulse ring until the first pour. L2 draws a lime ghost arrow if nothing has been poured after 4 s. L3 pulses the rockers until the first pour. A glass that matches its target gets a small rim sparkle. Target bands are a 15% fill plus a dashed outline. The first 22% of a pour lead tips the bottle back by about 2° (−0.035 rad), then it pours. Win confetti starts when the card appears.

## Scope

| ID | Action | Change | Test | Status |
| --- | --- | --- | --- | --- |
| M1 | Reference lines | All 10 lines win at par with `landN` / `spillN` labels | `logic.test.mjs` | PASS |
| M2 | Rules parity | 400 sequences per level, 0 mismatches | fixtures vs `core2.py` | PASS |
| M3 | Lazy odds | RAND / GREEDY / GREEDY2 / FILLFIRST within 0.5 pp. L10 hardest | `logic.test.mjs` | PASS |
| FT-001 | Stuck Undo | Undo on the stuck card hides it, restores the tower, and costs 1 pour | L7 bottle 0, then `#stuck-undo` | PASS |
| FT-002 | Bottles over glasses | Side by side, half a width from the glass, spouts angled in, hits ≥ 64, no overlap, art shrinks at ≤ 360 | 320 / 360 / 390 / 430 on L2, L3, L8, L10 | PASS |
| FT-003 | Cascade length | First push 280 ms, middles share the remainder, no slow final step, measured end ≤ 1.2 s | Schedule for 1–6 events, live L10 4-event at 4× CPU | PASS |
| FT-004 | Ignored tap | Swallowed tap wiggles and does not pour | Triple tap during L1 | PASS |
| FT-006 | Bad deep link | Invalid or out-of-range `?level` opens Tower 1 | `?level=abc` and `?level=99` | PASS |
| FT-007 | Visible load | Cover hides before the search | HTTP table below. L10 max 233 ms | PASS |
| FT-010 | Drip stain | Undo removes a stain only if that pour created it | L3: B, B (drip), B | PASS |
| FT-011 | Frame time | Solver slices yield while indexing, tower layer is cached | Worst 30-frame window below | PASS |
| FT-012 | Landscape | 844×390 keeps the centered 9:19.5 frame. Targets stay ≥ 44 px | Landscape browser test | PASS |
| FT-013 | These notes | DPR cap, one clink per glass, HTTP numbers, `core.py` retired | This file | PASS |
| FT-014 | Grace window | 150 ms after a cascade swallows taps and wiggles. A tap at ~200 ms pours | Triple tap, then ~100 ms and ~200 ms | PASS |
| Show spill path | Optional | Off unless `?path=1` or the menu toggle | | OPTIONAL |
| Haptics, level select, meta | Dropped | Not in the MVP | | DROPPED |

## Performance

Cold load, 10 runs each, fresh context, 390×844, requested device pixel ratio 2, backing store capped at 1.5, 4× CPU. Served from a local static server, not `file://` and not the GitHub Pages host:

`http://127.0.0.1:36869/index.html`

Visible time is navigation until the loading cover hides. The solver keeps running after that. The worst 30-frame window is the first 70 frames after the cover hides. On L8 a pour starts during that window. On L10 the same runs also play a 4-event cascade and the table uses the slower of the idle window and the cascade window. Min / median / max:

| Level | Visible ms | Worst 30-frame fps | Solver ms | Cascade ms |
| --- | --- | --- | --- | --- |
| L5 | 188 / 202.5 / 213 | 60.0 / 60.0 / 60.0 | 111 / 113.5 / 145 | |
| L8 | 201 / 207.5 / 264 | 60.0 / 60.0 / 60.0 | 223 / 235 / 278 | |
| L10 | 191 / 219 / 233 | 60.0 / 60.0 / 60.0 | 1129 / 1173 / 1282 | 1141.9 / 1149.0 / 1155.9 |

L10's solver median is about 1.2 s because the search is 8,193 states. That work starts after the cover hides, in short slices, so the visible maximum is 233 ms. The earlier `file://` table in R0 included the search inside the cover and is not the hosted number. These 60 fps rows are the windows measured in this run. They are not a claim about a phone.

## Design decisions

- A reference step such as `B@1` names the colour and the entry column. Two bottles with the same pair are the same pour. The line is replayed by the first matching bottle.
- The stuck solver is the full graph of states reachable within the budget, then distances back from the goals. The pack's state count is the shorter BFS that stops when the first goal is dequeued. Both numbers are checked.
- Undo costs a pour even though it returns to an earlier tower. That matches the brief.
- Spill path is a preview of the current pour. It is off unless asked for.
- Brief section F said a tap during a cascade finishes the animation instantly and is consumed. Game Finder ruled the other way: ignore the tap, let the cascade finish, and wiggle the bottle. FT-014 extends that ignore through 150 ms after the cascade ends.

## Testing

- `node --test --test-timeout=180000 fizz-tower/tests/logic.test.mjs fizz-tower/tests/browser.test.mjs fizz-tower/tests/browser-perf.test.mjs`
- Result this revision: logic 5 pass, browser 12 pass, cold perf 1 pass.
- The gallery layout gate also passed (`tests/layout.test.mjs`).
- Fixtures: `tests/fixtures.json`, 400 sequences per level, generated from `tests/core2.py` with seed 20261027.
- Not claimed from a device lab. The fps gate is throttled desktop Chrome.
- Repro: open `fizz-tower/index.html`. `?level=8` opens Rock Garden. `?path=1` draws the spill path.

## Delivery

- URL: https://brerdem.github.io/games/fizz-tower/
- R1 is pushed to `main`. Whisk Away was not edited.
- Screenshots, 390×844 unless named otherwise:

- `/opt/cursor/artifacts/fizz-tower-390-l1-pulse.png`
- `/opt/cursor/artifacts/fizz-tower-390-l2-ghost.png`
- `/opt/cursor/artifacts/fizz-tower-390-l8-bottles.png`
- `/opt/cursor/artifacts/fizz-tower-390-l10-cascade.png`
- `/opt/cursor/artifacts/fizz-tower-390-win-before-card.png`
- `/opt/cursor/artifacts/fizz-tower-390-stuck.png`
- `/opt/cursor/artifacts/fizz-tower-desktop-1440.png`
- `/opt/cursor/artifacts/fizz-tower-desktop-1920.png`
