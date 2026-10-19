# Ring Out — build notes

## Concept

- Game ID: `ring-out`
- Brief: 2026-10-18 brief 1 (RING OUT), copied to `BRIEF.md`
- Summary: spin concentric rings so a pin's lane is open, then fire it. A successful shot kicks that ring and opens a gap, so the order of clear shots changes the board.

## Implementation

- Tech: one HTML file, `logic.js` (rules) and `game.js` (canvas). Classic scripts, no `type=module`, no build step, no external fonts or images. System font stack: Trebuchet MS, Segoe UI, system-ui.
- Mechanics: 12 sectors. Dragging a ring snaps by sector and spends one move per step. Launching is free. A pin escapes only when every outer ring has a gap on that angle, no pin in the way, and the outermost gate (if any) matches. On escape, that ring kicks forward one sector for free and a gap opens at base sector `(pin.sector - 1) mod 12`. A colored pin on the outermost ring leaves a gate of its color in the new hole. Hearts start at 3. A blocked launch costs a heart. Moves at 0 with no clear pin loses.
- Loop: 12 solver-checked levels, then the same reverse-construction generator can keep making boards. Stars: 3 if moves used ≤ par and no hearts lost, 2 if moves used ≤ par+3 or at most one heart lost, otherwise 1. Progress (unlocked level, stars, mute) is `localStorage` key `ring-out-progress-v1`.
- Levels: L1–L2 two rings and two pins. L3–L5 three rings. L6–L7 keep a pin on the outer ring. L8–L10 two colors and gates, slack ≤ 1. L11–L12 four rings and three colors, slack 1. L1 uses two pins because a single pin cannot raise the remaining minimum.
- Controls: drag and tap, on-screen Undo / Hint / Restart / Pause / Sound. Keys: arrows or WASD, Tab, Space, Enter, Z undo, R restart, H hint, M mute, Esc pause.
- Animation and visuals: the kicked ring eases with the pin flying out, a blocked sector flashes red, particles on escape, and a level-clear spin with a star burst before the Next overlay. Gates are a coral triangle, a teal diamond, or a gold circle. Every pin draws a green or red lane tick. The background gradient is cached on an offscreen canvas and redrawn only on resize.
- Physics: none. The board is discrete sectors.

## Scope

- Done: the 12-level ladder, the generator, stars and save, undo / hint / restart, the order rule, the shared shell (0.1–0.6) on Ring Out, and the CI gate.
- Simplified: no level-select grid (Start, Continue, Next, Replay). No rewarded-continue button. Hint names the next solver action instead of playing it.
- Deferred: Flow Fort and Top Turner keep their own rules. This run only switched them to classic scripts, the system font, win-button focus, a help sheet that opens at the top, and a 300 ms canvas lock after an overlay closes. Scratch & Slay, Sand Strata, and Smash Cascade were not touched.
- Limitations: four rings cannot all be 44 px thick inside a 390 px circle. Measured hit band on L11 is 41.1 px at 390×844 and at 844×390, and 45.5 px at 932×430. Two- and three-ring boards clear 44 px on every probed viewport, which is the case QA measured.

## Design decisions

- Order rule: "a gap opens when a pin leaves" by itself cannot raise the remaining minimum, because an extra gap only helps. The shipped rule is that gap plus a free +1 kick of the pin's ring. The kick shifts the other gaps, so firing a clear outer pin can shut an inner lane. That is the smallest addition that the solver can still key by `(rotations, remaining pins)` and that produces an order trap on every level. Greedy "fire the outermost clear pin, else the cheapest rotation that opens any lane" fails 7 of the 8 levels from L5 (L5–L11 fail, L12 does not).
- Slack is 3, 2, 2, 2 on L1–L4 so the obvious shot still wins while a trap exists in the graph. From L8, slack is 0 or 1.
- Portrait play sits in a centered column at most 430 px wide. Short landscape (height ≤ 520) uses the full viewport so the rings stay tappable. Desktop does not stretch the board.
- Tap slop is 12 px, so a 10 px wobble still launches. Releasing more than one band outside the outer ring, or outside the canvas, cancels the drag and spends nothing.
- `logic.js` is an IIFE on `globalThis.RingLogic` so Node tests can load it with `vm` and the page can load it with a plain script tag. `file://` makes no HTTP requests.

## Testing

| AC | Result | Evidence |
| --- | --- | --- |
| 0.1 Win focus, Enter advances | PASS | `Enter advances after a win and progress survives reload` |
| 0.2 Help sheet scrollTop 0 | PASS | `help sheet opens at scrollTop 0` at 360×800 and 844×390 |
| 0.3 Classic script, system font, file:// | PASS | `file:// play has no http requests` |
| 0.4 R, M, Esc, localStorage | PASS | `keys, undo, and mute` plus the reload assertion in the Enter test. Flow Fort and Top Turner did not get these keys: Flow Fort already uses R and W to launch, and saving a continue point would change where those games start. |
| 0.5 Overlay double-tap lock | PASS | `double tap on overlay buttons does not act on the next screen` |
| 0.6 Release outside the canvas | PASS | `outside release spends nothing and a 10px wobble launches` (release at (5,5) spends 0) |
| 0.7 CI gate | PASS | `.github/workflows/ci.yml` job `ring-out` runs `ring-out/tests/logic.test.mjs` and `ring-out/tests/browser.test.mjs`. Local run of that command is green. The lazy sweep is `lazy greedy policy fails at least half of the levels from L5` (7/8). Lose states: `a script reaches both lose states`. Viewports: `core gesture and hit band on eight viewports`. |
| RO-001 12 levels, generator, stars, save | PASS | `twelve solver-verified levels stay inside their budgets`; `twenty consecutive generated boards are solvable`; stars in `stars follow the brief thresholds`; save in the Enter/reload test |
| RO-002 Order rule, slack ≤ 1 from L8, greedy fails ≥ 50% from L5, every level has a trap | PASS | `lazy greedy policy fails at least half of the levels from L5` (7/8); `each level has an order trap`; `slack is at most 1 from level 8`. Rule note above. |
| RO-003 Live −N, cancel far release | PASS | Same outside-release test asserts `pending >= 1` while the drag is held (the HUD reads that value as −N) and 0 moves after release at (5,5) |
| RO-004 Undo, restart, hint | PASS | `keys, undo, and mute` restores moves, rotation, pin count, and hearts; R restarts; H runs |
| RO-005 Lane ticks and ~12 px slop | PASS | 10 px wobble launches in `outside release spends nothing and a 10px wobble launches`. Every pin's lane is drawn whenever the board is idle; green and red ticks are visible in `ring-out-mid-level.png` (L8, 390×844). |
| RO-009 Landscape hit band ≥ 44 px | PASS | `core gesture and hit band on eight viewports` asserts L3 `hitBand >= 44` on all eight, including 52.7 px at 844×390 and 58.3 px at 932×430. L11 (4 rings) measures 41.1 px at 844×390 and 45.5 px at 932×430. Four non-overlapping 44 px bands do not fit in a 390 px circle; that limit is in Scope. |
| RO-010 Flash, clear sequence, gate shape, queued keys | PASS | Blocker flash is drawn on a failed launch. Level-clear spin, star burst, and stars are in `ring-out-level-clear.png`. Gate glyphs are in the L8 mid-level shot. Queued keys: `keys, undo, and mute` presses ArrowRight twice during the turn animation and spends 2 moves. |
| RO-011 ≥ 50 fps at 4× CPU, 4 rings / 8 pins, cached background | PASS | `four-ring stress board stays at or above 50fps under 4x CPU throttle`. Local result on the full suite: **61.0 fps**. Method: headless Chrome, Playwright CDP `Emulation.setCPUThrottlingRate` rate 4, count `requestAnimationFrame` over 1 second on the stress board (4 rings, 8 pins) at 390×844. The full-screen gradient is painted once into an offscreen canvas in `ensureBackground` and blitted each frame. |

Commands: `node --test --test-timeout=180000 ring-out/tests/logic.test.mjs ring-out/tests/browser.test.mjs`

Unverified: a physical phone, Safari file://, and a second machine's 4× throttle. The fps figure is from this environment's headless Chrome, not a mid-range Android CPU. Flow Fort and Top Turner were smoke-loaded (no page errors, no HTTP) but not re-tested for their own gameplay ACs.

## Delivery

- URL: https://brerdem.github.io/games/ring-out/
- Commit: `db07643` on `main` (this notes tweak may sit one commit later)
- Build: GitHub Actions workflow `ci` (job `ring-out`) plus the existing Pages workflow
- Game Tester: ready for a round-1 retest of Ring Out against this table. Flow Fort and Top Turner only changed shell packaging, win focus, help scroll, and the post-overlay input lock.

## Layout

On a desktop window the play area is a centred portrait frame about 390×844 (9:19.5), letterboxed on the page background, and the game world is not stretched sideways. A phone fills the screen at its own shape, including 360×800 and 430×932. The canvas backing store uses the same scale on both axes.
