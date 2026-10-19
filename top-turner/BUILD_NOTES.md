# Top Turner — build notes

## Concept

- Game ID: `top-turner`
- Brief: 2026-10-19 brief 3 (TOP TURNER), copied to `BRIEF.md`
- Summary: carve a spinning top on a lathe, then launch it. The profile changes how long it spins and how hard it hits. Three fights: Pine Pawn, Flat Jack, and Needle.

## Implementation

- Tech: `index.html`, `logic.js`, `game.js`. Classic scripts, system fonts, no build and no network assets. `fightSim` in `logic.js` is the headless battle used by the tests and by the page's launch math.
- Mechanics: 32 slices, radii from 0.08 to 1. A drag shaves the slice under the pointer and its two neighbors. Keyboard carving runs only while Space is held, so a pointer carve cannot cut the resting chisel at slice 16. Launch speed is `pull × 1.15`, measured from the touch-down point, and only if the touch starts within about 2.2 radii of your top. A release outside the canvas keeps the last in-canvas pull and still throws. Hits chip at most 0.014 spin. Flat Jack is a heavy wide top. Needle is a light long-spin top. The enemy steers with its own homing, not the player's dash meter.
- Loop: carve, launch, battle. R restarts the current fight on a fresh blank. Progress is `localStorage` key `top-turner-progress-v1` (unlocked fight, best score, mute).
- Controls: drag to carve, Battle to launch, hold or arrow keys to dash. M and the Sound button mute. Esc pauses. R restarts.
- Animation and visuals: PERFECT pop on a timed release, spark burst and a 30 ms hit-stop on impact, a KO / SPUN OUT / OVER THE EDGE banner, then the result card about 0.55 s later with a reason line. The blank is centered in portrait with the stat bars underneath. In a short landscape window the blank uses the full height and the bars sit to its right.
- Physics: fixed 1/120 s steps, two per frame, same step the simulator uses. No dash in the balance sweep.

## Scope

- Done: TT-001, TT-002, TT-003, TT-005, TT-006, TT-007, and the shared shell on this game.
- Simplified: three fights, not the brief's ladder of eight. No wood types, upgrades, coins, or save slots.
- Deferred: keeping the carved design after a loss (TT-009), a drawn keyboard chisel (TT-008), and carve speed that ignores event rate (TT-016).
- Limitations: the uncarved blank still wins every sampled Pine Pawn launch. Fight 2 is exactly 24/48 for the blank, which meets "at most half" with no margin. A normal slingshot rarely clears the rim; OVER THE EDGE is reached by a top already at the rim with outward speed above 150.

## Design decisions

- The old clamp of 0.25 spin per hit ended fights on the first collision, so the heaviest shape always won. Hits are now small, spin lasts longer, and Flat Jack and Needle are built so a heavy carve beats them while a plain cylinder usually does not.
- The counter used in the sweep is one heavy top: wide body, medium tip (`shaped(0.5, 0.98, 0.8)`). A sharper stamina shape also wins 75% of Flat Jack. They are different carves from the blank.
- Releasing outside the canvas finishes the throw at the last point that was still on the canvas. Canceling it would have changed pulls that merely slid off the edge of the phone.

## Testing

| AC | Result | Evidence |
| --- | --- | --- |
| 0.1 Win focus | PASS | Next is focused in `revealResult` (same pattern as the other games) |
| 0.2 Help sheet | PASS | `focus({preventScroll:true})` and `scrollTop = 0` |
| 0.3 Classic script | PASS | `logic.js` then `game.js`, system fonts, no module |
| 0.4 R, M, Esc, save | PASS | `keys and a carve gesture on eight viewports` mutes, pauses, and R restores every radius to 1.0 |
| 0.5 Overlay lock | PASS | `pointer carve does not touch slice 16, and overlay taps do not carve` double-taps Start and the blank stays at 1.0 |
| 0.6 Release outside | PASS | `a nudge away from the top does not launch, and an outside release keeps the throw`. The throw uses the last in-canvas pull |
| 0.7 CI | PASS | `.github/workflows/ci.yml` job `top-turner` |
| TT-001 Battle length and carving | PASS | `blank loses the later fights and a heavy carve beats every opponent`. Blank F2 24/48 (50%), F3 12/48 (25%). Heavy carve 48/48, 48/48, 42/48. Median of that pool 12.58 s and 5 hits |
| TT-002 No phantom cut | PASS | After a pointer carve of slice 4, slice 16 stays 1.0 and only slices 3–5 change |
| TT-003 Lathe layout | PASS | `blank stays fully on screen with slices at least 12 px` at 360×800, 390×844, 430×932, and 844×390. Stats and Battle do not overlap the blank |
| TT-005 Feedback | PASS | PERFECT pop, spark hit-stop, KO/SPUN OUT/OVER THE EDGE banner, result reason line. The card opens 0.55 s after the deciding hit. Visible on `top-turner-mid-battle.png` |
| TT-006 Launch from the touch | PASS | A nudge at the top of the screen does not launch. Pull is the distance from pointerdown |
| TT-007 No ghost carve | PASS | Double-tap Start leaves every radius at 1.0 |

Commands: `node --test --test-timeout=180000 top-turner/tests/logic.test.mjs top-turner/tests/browser.test.mjs`

Unverified: a real finger on the lathe, and whether a 12 s fight feels like the brief's 20–60 s target. The sweep has no player dash.

## Delivery

- URL: https://brerdem.github.io/games/top-turner/
- Commit: `4078b9c` on `main`
- Build: GitHub Actions workflow `ci`, job `top-turner`, plus the existing Pages workflow
- Game Tester: ready for a round-1 retest of Top Turner. Other game folders were not changed. The shared CI workflow gained a `top-turner` job.
