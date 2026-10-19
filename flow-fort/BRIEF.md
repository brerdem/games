# MVP Brief 1 — FLOW FORT
*Date: 2026-10-19 · Author: Grok Bot for Burak Erdem (Clockwork) · For: Game MVP Builder bot · Score 8/10 (GO — build first) — see `2026-10-19-report.md` §3 Idea 1*

## 1. One-line pitch
Send color-coded gunners around the conveyor loop that rings your fort. Each one only shoots its own color, so you have to send them in the right order before the pixel horde marches into your walls.

## 2. Inspiration (for context only; do not copy art/names)
- **Pixel Flow!** (Loom Games): tap a unit to put it on a conveyor that circles a pixel picture. It only hits cubes of its own color and carries an ammo number. Leftover units park in **5 waiting slots**, and the conveyor has a capacity. Google Play "10M+", Google Play puzzle grossing #8 (Applyra) on 17, 18 and 19 Oct.
- **Yarn Loop / Loop Sort / CarLoop / Colony Flow!**: the same "capacity + reusable rack + color order" loop, with 5 titles in Sensor Tower's Google Play puzzle free top 25 today.
- **The Tower – Idle Tower Defense**: you defend one fixed base against waves and buy permanent upgrades between runs (Google Play simulation grossing #2).
- **Space Invaders–style descending formation**: this supplies the time pressure the calm loop games don't have.

## 3. Target platform & tech
- **Single self-contained `index.html`** (inline `<style>` + `<script>`), written in plain JavaScript on an HTML5 Canvas 2D. No build step, no libraries, and no external files, fonts, images, audio or network. It must run from `file://` in desktop Chrome/Safari/Firefox and in mobile Safari/Chrome.
- The canvas is portrait-first: logical 720×1280, scaled to fit with letterboxing on desktop, rendered at `devicePixelRatio`.
- Audio is synthesized with WebAudio oscillators and noise (pew, pop, thud, jam buzzer). It starts after the first gesture and has a mute toggle.
- `localStorage` stores the unlocked level, stars, coins, upgrades and settings.

## 4. Board model (rules)
- **Grid:** W=12 columns × H=14 rows of cells (40 px each, so a 480×560 px area), placed in the upper-middle of the screen.
- **Rail (conveyor):** a rounded rectangle 36 px outside the grid. It has four sides. The left and right sides each face H row-lanes; the top and bottom sides each face W column-lanes. Gunners **enter at the bottom-left corner and travel clockwise** (up the left side, along the top to the right, down the right side, then left along the bottom back to the entry). That is one lap.
- **Horde (formation):** a pixel image defined in level data, e.g. `["..RR..","RBBBBR","R.YY.R"]`, where letters are colors and `.` is empty. It starts at the top of the grid. Every `advanceSec` seconds (level parameter, 9 s at L1 down to 4 s late) the whole formation moves **down one row**. A thin "next advance" bar under the HUD fills toward the step.
- **Breach:** if an advance would push any cell past row H-1 (onto the wall line), that bottom row **crashes into the wall**. Those cells are removed with a red flash, and the fort loses **1 heart**.
- **Cell types:** colored cell (1 hit from a same-color gunner). From L6, **armored** cells are gray and take 2 hits from **any** color. From L9, **bomb** cells are colored with a white ring; destroying one also destroys its 4 orthogonal neighbors. From L12, a **boss** is a 2×2 block of one color with 4 HP that can be hit from any of its lanes.
- **Deck (bottom of screen):** 3–4 **columns** of queued gunners. Only the **front gunner** of each column can be launched. The next 3 in each column are visible beneath it, so the player can plan ahead. Every gunner has a color and an ammo number (5/10/15/20).
- **Rail capacity:** at most `cap` gunners on the rail at once (default 4). Tapping while the rail is full does nothing; the gunner shakes and a "Rail full" tooltip appears.
- **Firing rule (the core puzzle):** whenever a gunner on the rail crosses the center of a lane, it scans that lane inward from its own side and finds the **first occupied cell**:
  - If that cell is its color (or armored, or a boss of its color), it fires once. The hit is resolved immediately in logic (mark the cell as pending so no other gunner targets it), the bullet is animated over about 80 ms, and ammo drops by 1.
  - If the first cell is a different color, the shot is blocked: no shot, no ammo spent.
  - Each lane is evaluated **once per pass**.
- **Ammo 0:** the gunner pops right away (confetti) and frees a rail spot.
- **End of lap with ammo left:** the gunner drops into the first free **bench slot** (5 slots, shown above the deck). Tapping a bench gunner relaunches it, subject to rail capacity.
- **JAM:** if a gunner finishes a lap with ammo left and all bench slots are full, it explodes. The fort loses **1 heart** and its ammo is lost.
- **Ammo balance (generator rule):** for each color, total ammo in deck = number of cells of that color. Each armored cell adds 2 ammo, split across colors. Bomb chains create surplus, which is harmless.

## 5. Win / lose
- **Win:** every horde cell is destroyed.
- **Lose:** hearts reach 0 (start with 3), **or** the player runs out of gunners (deck, bench and rail all empty) while cells remain.
- The lose panel shows the reason ("The horde broke through" / "Jammed" / "Out of gunners"), plus Retry and a placeholder button "Continue +1 heart (AD)" that is non-functional and labelled as a placeholder.
- **Calm mode** (settings toggle, default OFF): the formation never advances, so the game plays as a pure Pixel Flow-like puzzle. It exists to A/B the time pressure. Calm mode awards a maximum of 2★.

## 6. Controls
- **Mouse/touch:** tap the front gunner of a deck column to launch it. Tap a bench gunner to relaunch it. Tap targets must be ≥ 56 px. The canvas uses `touch-action:none` and has no scroll or zoom.
- **Hold-to-preview:** pressing a deck or bench gunner for > 250 ms (then releasing outside it to cancel) draws faint highlight lines on every lane where that color is currently the first cell from the outside, so the player can see what it would hit right now.
- **Keyboard:** `1–4` launch deck column fronts; `Q W E R T` launch bench slots 1–5; `Space` toggles 2× fast-forward; `H` shows a hint; `P` or `Esc` pauses; `R` restarts; `M` mutes.
- **Hint:** pulses the deck/bench gunner that currently has the **most** valid first-cell lanes (ties go to the one with the lowest ammo).

## 7. Core loop
1. Read the horde: which colors are exposed on which sides.
2. Launch gunners whose color is exposed, and keep the rail flowing without overfilling the bench.
3. Peel the formation layer by layer before it reaches the wall. Bombs and order choices open new lanes.
4. Clear the horde to earn stars and coins, upgrade the fort, then play the next level (≈ 60–150 s per level).

## 8. Level design & progression
- **Level data format:**
```js
{ id:1, pic:["..RRRR..",".RRBBRR.","RRBBBBRR","..Y..Y.."], startRow:0,
  advanceSec:9, cap:4, bench:5, deckCols:3,
  deck:[[{c:'R',a:10},{c:'B',a:5}], [{c:'R',a:5},{c:'Y',a:2}], [{c:'B',a:5},{c:'R',a:3}]] }
```
- If `deck` is omitted, the generator below builds it.
- **Handcrafted ladder (15 levels, simple pixel pictures):**
  - L1–2: 2 colors, tutorial (L1 cannot be lost: no advance until the first launch, and it is slow).
  - L3–5: 3 colors, layered shells (outer color must go first).
  - L6–8: armored cells.
  - L9–11: bombs.
  - L12–15: boss blocks, 4 colors, faster advance.
  - Include two Halloween pictures (pumpkin at L5, ghost at L10) because it is October.
- **Deck generator:** for each color, split its cell count into gunners of 5/10/15/20 ammo (random partitions, remainder allowed as a small 2–4 gunner). Shuffle the gunners into `deckCols` columns with a **difficulty bias**: with probability p (0.2 → 0.6 as levels rise), put an inner-layer color near the front of a column. A wrong-order launch then sends a gunner around a full lap with no shots, which is what fills the bench.
- **Solvability check (debug):** a greedy auto-player that always launches the available gunner with the most valid lanes, in calm mode, must clear the level. Run it at level load in debug builds and log the result to the console. If it fails, reshuffle the deck (up to 20 tries).
- **Endless mode** (unlocks after L15): random mirrored "invader" sprites (7×7 left half mirrored, 3–4 colors) stacked 2–3 high. advanceSec and bias tighten every 3 waves.
- **Meta (between levels), coin shop with 4 upgrades:**
  - Rail speed +10% (5 levels).
  - Bench +1 slot (max 7).
  - Fort heart +1 (max 5).
  - **Overcharge** (single purchase): each gunner's first shot pierces, also hitting the next cell in the lane if it is the same color.
  - Prices: 100/200/400…

## 9. Scoring & stars
- +10 per cell destroyed; +5 per extra cell in a bomb chain.
- Level clear bonus: +100 × hearts left, +50 × empty bench slots at the end.
- Stars: 3★ means cleared with 3 hearts and no jam. 2★ means cleared with ≥ 2 hearts. 1★ means cleared.
- Coins = score / 10, rounded.

## 10. Game feel & art direction (procedural, no files)
- **Background:** deep slate (#141a2e). The grid has a faint checker. The fort wall is drawn under the bottom rail as a crenellated band of rects in warm stone (#c9b38f), and it cracks visibly per heart lost.
- **Cells:** rounded squares with 2 px inner highlights. Palette: red #ff5d6c, blue #4da3ff, yellow #ffd23f, green #3ddc97, purple #b47cff. Armored = #8a93a6 with a rivet dot; bomb = white ring.
- **Rail:** a dark track with animated chevrons that show the direction of travel.
- **Gunners:** circles with a small barrel that points inward toward the grid and turns at corners. The ammo number is drawn on the body.
- **Hits:** a bullet streak, the cell pops into 6–10 square particles, and a short rising "pip" sound (pitch varies by color).
- **Blocked lane:** a gunner passing a lane whose first cell is a different color does nothing. For readability, briefly tint that lane line in its color at 10% alpha.
- **Advance:** the formation steps down with a 120 ms ease and a low drum "thud". The screen shakes 4 px on a breach.
- **JAM:** red flash on the bench, buzzer, the gunner explodes.
- **Win:** remaining gunners fire off fireworks, then stars appear.

## 11. Screens & UI
1. **Title:** name, an animated rail with gunners circling, Play / Endless (locked) / Settings (sound, calm mode).
2. **Level map:** 15 nodes with stars.
3. **HUD:** level, hearts, advance bar, coins, pause; the rail-capacity pips (●●●○) next to the rail entry.
4. **Bench row** (5 slots) above the **deck** (3–4 columns, front gunner enlarged).
5. **Win panel:** stars, score, coins, Next / Upgrades. **Lose panel:** reason, Retry, placeholder AD continue.
6. **Upgrade shop:** 4 cards, each showing level, price and an effect line.
7. **Tutorial overlays** on L1–L2, with a hand pointer drawn from shapes: "Tap a gunner", "It only shoots its own color", "Leftovers wait here — don't fill the bench!".

## 12. MVP feature list (build now)
- [ ] Single `index.html`, responsive canvas, 60 fps.
- [ ] Grid, rail path parametrisation (perimeter distance → x,y, side, lane crossing events), clockwise travel, capacity.
- [ ] Firing rule (first-cell-in-lane, same color), ammo, pop at 0, bench, JAM.
- [ ] Formation advance, breach, hearts, win/lose, calm mode.
- [ ] Cell types: colored, armored, bomb, boss 2×2.
- [ ] 15 handcrafted levels, deck generator, greedy solvability check (debug), endless mode.
- [ ] Coins + 4-upgrade shop, stars, localStorage.
- [ ] Mouse/touch + keyboard controls, hold-to-preview, hint, 2× fast-forward.
- [ ] WebAudio SFX + mute; title, map, HUD, panels, tutorial.

## 13. Later features (do NOT build in MVP)
- Hidden gunners (?) in the deck, chained gunners, multi-color "rainbow" gunner, a rail switch that splits the loop.
- Enemy types that shoot back at the rail, shield rows, flying units that skip rows.
- Fail offers (+gunner, +slot), lives timer, boosters (bomb strike, freeze advance), rewarded ads, ad-removal IAP.
- Daily horde, leaderboards, LiveOps events, skins for gunners and the fort.

## 14. Acceptance criteria (prototype is "playable" when all pass)
1. Opening `index.html` from disk shows the title with no console errors and **0 network requests** after load.
2. L1 can be finished with mouse only, touch only, or keyboard only.
3. A gunner travels exactly one clockwise lap per launch. It fires **only** when the first occupied cell of the lane it is crossing has its color (or is armored/boss-compatible), and fires at most once per lane per pass. Ammo decreases by exactly 1 per hit.
4. Ammo 0 → the gunner disappears immediately and frees a rail spot. Lap end with ammo > 0 → the gunner enters the first free bench slot, and a full bench causes a JAM that costs exactly 1 heart.
5. The rail never holds more than `cap` gunners; launches beyond that are refused with feedback.
6. The formation advances on schedule; a breach removes the bottom row and costs exactly 1 heart; win and all three lose reasons trigger correctly; calm mode disables advancing.
7. For every handcrafted and 20 consecutive endless levels, total ammo per color ≥ required hits, and the greedy auto-player (`Shift+S` runs it visibly) clears the level in calm mode. Results are logged to the console.
8. Bombs destroy exactly their 4 orthogonal neighbors; armored cells need 2 hits; boss blocks need 4.
9. Coins, upgrades, stars and unlocks persist after reload; upgrades change behavior (speed, bench size, hearts, pierce).
10. ≥ 50 fps on a mid-range phone with 4 gunners on the rail and 150 cells (pool particles and bullets; no per-frame array allocations in the hot loop).
