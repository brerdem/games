# Fizz Tower — build notes

## Concept

- Game ID: GF-20261027-01
- Brief: v1 in `BRIEF.md`
- Tap a bottle to pour one measure of soda into the tower. A full glass takes the new soda on top and pushes its old top layer out toward the side it leans. Brass rockers flip after every spill. Win when every glass holds its target layers, within par + 2 pours.

## R2 rulings

- Spout gap: the target is 8 to 16 px from spout tip to the entry-glass rim. 24 px is the hard maximum at 320×568, 360×800, 390×844 and 430×932. This build places the rest pose at 12 px on every bottle. If the tower is too tall, the glasses scale down. The bottles are not raised. Each pour draws a short stream from the spout to that rim.
- Undo: it puts the last pour back (that pour is refunded) and the undo itself costs 1. A pour followed by Undo nets 1 pour used. The par + 2 budget is unchanged. The button still reads Undo −1.
- The stuck card still appears when the current tower cannot be finished in the pours that remain. It offers Restart only. Undo is not on that card.
- The 150 ms grace window is unchanged. A tap during a cascade or in that window is swallowed, wiggles the bottle, and is appended to `window.__ftLog` as `{ t, level, sinceEnd, bottle }`. `sinceEnd` is negative while the cascade is still playing and 0–150 during the grace window.

## R1 rulings still in force

- `core.py` is retired and is not in this repo. `tests/core2.py` is the only rules source.
- Cascades have no slow final step. The first push is 280 ms. Later steps share the remaining time. The schedule cap is 1140 ms so a late frame still finishes by 1.2 s.
- Shared-column bottles sit side by side in index order, each center half a bottle width from the glass, spouts angled into that glass. Hit boxes do not overlap. They are 64 px where the columns allow it, and never under 44 px. At 360 px and narrower the art scale is 0.7.
- Taps in the cascade and for 150 ms after it are not queued.

## Implementation

- `logic.js` is the rules port. `l10dist.js` is L10's shipped distance-to-win table (515 finite distances; any other reached state is unwinnable). Stuck detection on L10 is a lookup, including while the background solver is still running. Other levels use the sliced solver and show "Checking the tower…" until it finishes. Undo never builds that graph on the click.
- A pour followed by Undo restores the board and the stain from that pour. The counters refund the pour and then charge 1, so `used` and `left` stay where the pour left them.
- The win card is a strip along the bottom, in place of the Undo / Restart / Menu row. The finished tower stays on screen. Stars are still par / par+1 / par+2, and undos count as pours.
- Short landscape viewports (height at most 520 px) show "Rotate your phone" and hide the stage. 1440×900 and 1920×1080 keep the centered portrait frame.
- Audio is one clink per glass, 70 ms apart. The backing store caps `devicePixelRatio` at 1.5.

## Spout gap and hit size

Rest-pose spout-to-rim gap, measured from the layout at every level and all four sizes: **12.0 px**. That is inside the 8–16 px target and under the 24 px maximum. Idle bob moves the spout by about ±3 px, so the seen gap stays about 9–15 px.

Hit-box width:

| Levels | 320×568 | 360×800 | 390×844 | 430×932 |
| --- | --- | --- | --- | --- |
| L1–L7 | 64 | 64 | 64 | 64 |
| L8, L9 | 53 | 59 | 64 | 64 |
| L10 | 52 | 59 | 64 | 64 |

L8–L10 share a column with a neighbour, so 64 px boxes would overlap at the narrower widths. Those hits stay at or above 44 px. No hit boxes overlap.

## Odds before and after the undo rule

Before: pour only, the published pack. JavaScript `lazyRates` and a Python walk on `core2.py` both match these to 0.00 pp.

After: the same policies, plus Undo as an action. Undo returns to the previous board and does not spend an extra pour (the pour is refunded and the undo costs 1, so `used` stays). One undo of memory is kept, which is enough to take the last pour back. JavaScript `lazyRatesUndo` and the Python walk agree to 0.00 pp.

Random clear rates fall, because a random undo spends the attempt and returns to the previous tower. GREEDY and FILLFIRST stay at 0 from L2 on. GREEDY2 rises where a two-ply player can take back a weak first pour (L2 and L8).

| Level | RAND before | RAND after | GREEDY before / after | GREEDY2 before | GREEDY2 after | FILLFIRST before / after |
| --- | --- | --- | --- | --- | --- | --- |
| L1 | 100 | 68.75 | 100 / 100 | 100 | 100 | 100 / 100 |
| L2 | 37.5 | 23.3 | 0 / 0 | 0 | 33.33 | 0 / 0 |
| L3 | 25 | 12.28 | 0 / 0 | 0 | 0 | 0 / 0 |
| L4 | 6.01 | 2.69 | 0 / 0 | 0 | 0 | 0 / 0 |
| L5 | 2.34 | 0.59 | 0 / 0 | 0 | 0 | 0 / 0 |
| L6 | 4.12 | 1.64 | 0 / 0 | 0 | 0 | 0 / 0 |
| L7 | 1.5 | 0.38 | 0 / 0 | 0 | 0 | 0 / 0 |
| L8 | 0.7 | 0.12 | 0 / 0 | 0.64 | 11.34 | 0 / 0 |
| L9 | 0.65 | 0.12 | 0 / 0 | 1.47 | 1.5 | 0 / 0 |
| L10 | 0.19 | 0.05 | 0 / 0 | 0 | 0 | 0 / 0 |

## Performance

Ten cold runs, fresh context, 390×844, requested device pixel ratio 2, backing store capped at 1.5, 4× CPU. Served from a local static server:

`http://127.0.0.1:38861/index.html`

This is not the GitHub Pages host. QA's live https measurement of R1 was L10 visible median 273.5 ms and max 328 ms. The R1 notes that said L10 visible median 219 were from an earlier local run and are not the hosted number. This run's L10 visible maximum is 331 ms.

Visible time is navigation until the loading cover hides. The L10 worst 30-frame window includes an Undo while the background solver is still running. Stuck latency is the time from the end of a losing first pour's cascade (L10 bottle 1) until the card is up. Min / median / max:

| Level | Visible ms | Worst 30-frame fps | Undo during solve ms | Stuck after cascade ms |
| --- | --- | --- | --- | --- |
| L5 | 190 / 212 / 247 | 60.0 / 60.0 / 60.0 | | |
| L8 | 200 / 214 / 244 | 60.0 / 60.0 / 60.0 | | |
| L10 | 212 / 244 / 331 | 58.0 / 58.0 / 60.0 | 12.1 / 12.8 / 13.9 | 1.8 / 2.6 / 6.3 |

Undo's own call is 12–14 ms at 4×, under the 50 ms long-task line. The L10 solver still runs in the background (about 1.3–1.9 s) and is not on the undo click. The stuck card does not wait for it.

The longest L10 cascade in the same runs was 1146.2 / 1150.4 / 1154.3 ms.

## Testing

- `node --test --test-timeout=180000 fizz-tower/tests/logic.test.mjs fizz-tower/tests/browser.test.mjs fizz-tower/tests/browser-perf.test.mjs`
- This revision: logic 5 pass, browser 14 pass, cold perf 1 pass. The gallery layout gate passed.
- Pour-only lazy rates still match the pack. The undo-aware rates above were run in JavaScript and in Python against `core2.py`.
- Not a device-lab result.

## Delivery

- URL: https://brerdem.github.io/games/fizz-tower/
- Screenshots:

- `/opt/cursor/artifacts/fizz-tower-390-l8-rim.png`
- `/opt/cursor/artifacts/fizz-tower-390-l10-rim.png`
- `/opt/cursor/artifacts/fizz-tower-390-win-strip.png`
- `/opt/cursor/artifacts/fizz-tower-390-stuck.png`
- `/opt/cursor/artifacts/fizz-tower-320-l10.png`
- `/opt/cursor/artifacts/fizz-tower-844-landscape.png`
- `/opt/cursor/artifacts/fizz-tower-desktop-1440.png`
- `/opt/cursor/artifacts/fizz-tower-desktop-1920.png`
