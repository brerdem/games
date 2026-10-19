# MVP Brief 3 — TOP TURNER
*Date: 2026-10-19 · Author: Grok Bot for Burak Erdem (Clockwork) · For: Game MVP Builder bot · Score 7/10 (GO — web-portal-first prototype) — see `2026-10-19-report.md` §3 Idea 3*

## 1. One-line pitch
Carve your own spinning top on a wood lathe, then launch it into the arena. The shape you cut decides how long it spins, how hard it hits and whether it survives.

## 2. Inspiration (for context only; do not copy art/names)
- **Woodturning** (BallGames, Google Play "100M+", still updated 7 Oct 2026) / **Woodturning 3D** (Voodoo, 473,729 iOS ratings): drag a chisel against a spinning blank to shape it. That is the tactile core.
- **Beyblade X EVOBATTLE** (PS5 launch 14 Sep 2026; Steam 123 reviews, 81% positive): top battles where the type (Attack/Defense/Stamina/Balance) and **customisation** decide strategy. Demand phrasing: "make your own beyblade online free".
- **Car Evolve** (iOS free #21 ▲3 today) / **Epic Plane Evolution**: "build a better car with every run": try, fail, upgrade and redesign.
- **Made by Hand** (Steam, coming soon; r/IndieGaming post 1,914 pts): physical crafting *is* the game.

## 3. Target platform & tech
- **Single self-contained `index.html`**, plain JavaScript + Canvas 2D. No libraries, external assets or network. Runs from `file://`.
- Portrait logical 720×1280, scaled to fit; it should also work in landscape on desktop (center a 720-wide column).
- WebAudio: the lathe hum's pitch follows the spin; chisel scrape noise is shaped by cut depth; clacks on collisions; a whir that falls in pitch as spin decays; a crowd "ooh" chord on a KO. Mute toggle.
- `localStorage`: 3 design slots, coins, upgrades, ladder progress.

## 4. Phase A — The Lathe (carve)
- **Blank:** a vertical wooden cylinder, axis centered on screen. The profile is **N = 32 slices** from top (i=0) to tip (i=31), with radius r_i ∈ [0.08, 1.0] (1.0 = 130 px on screen). Start with r_i = 1.0 everywhere. The blank "spins": animate moving grain stripes and a rim-light shimmer.
- **Chisel:** while the pointer is pressed inside the lathe area, find slice k from pointer y and the cut radius c = |pointer.x − axis.x| / 130.
  - If c < r_k, then r_k moves toward c at **2.5 units/s** (so cutting takes time and feels physical). Neighbors k±1 move toward max(c, r_k) at 50% of that rate, for a smooth chisel width.
  - Radii never increase and never go below 0.08.
  - Chip particles fly off and the scrape sound plays.
- **Tip:** the bottom 3 slices form the tip, and the player carves them like any others.
- **Mirror rendering:** draw the silhouette symmetric about the axis, filled with a wood gradient and horizontal grain lines, plus the "ghost" outline of the previous design. The cut edge highlights in a lighter tone.
- **Wood types** (upgrade): Pine (density 0.8, light tan), Oak (1.0, honey), Ebony (1.3, dark). The type changes color and density.
- **Live stats panel** (5 bars + an archetype label), recomputed every frame while carving:
  - V = Σ r_i² / N (volume); **mass** m = ρ·V.
  - I = ρ·Σ r_i⁴ / (2N) (moment of inertia).
  - **Reach** R = max r_i.
  - **CoM height** h = Σ (31−i)·r_i² / (31·Σ r_i²) ∈ [0,1] (0 = at tip).
  - **Tip radius** t = mean(r_29, r_30, r_31).
  - Tip friction μ = 0.35 + 1.6·t. Spin decay constant k = 0.18·μ / (I + 0.02).
  - **STAMINA** = estimated spin time T = ln(ω0/ω_min)/k with ω0 = 1, ω_min = 0.12, shown in seconds.
  - **STABILITY** = 1 − h (wobble starts at ω_w = 0.12 + 0.45·h, so a high CoM wobbles sooner).
  - **WEIGHT** = m.
  - **REACH** = R.
  - **SPEED** = traction τ = 0.2 + 1.8·t (a wide tip "drives" around the bowl; a needle tip stays put).
  - Normalise every bar against fixed reference ranges in code (e.g. T 5–60 s) and clamp to 0–100.
  - **Archetype label:** the dominant pair → Attack (SPEED+REACH), Defense (WEIGHT+STABILITY), Stamina (STAMINA+STABILITY), Balance (no stat > 1.3× the others).
- **Buttons:** New Blank (reset), Undo stroke (`Ctrl+Z`, last 10 strokes), Save to slot 1–3, **Battle!**

## 5. Phase B — The Arena (battle)
- **Arena:** a top-down circular bowl, radius A = 300 px, centered. Rim at radius A.
- **Tops:** discs. Visual radius ρ = 16 + 26·R px.
  - Top-down drawing: concentric rings colored by slice bands (group the profile into 4 bands by radius steps), plus 3 radial marks that rotate at a speed ∝ ω.
  - When wobbling, offset the drawing by a small precessing vector and draw a shadow ellipse.
- **Launch:** your top waits on the launch mark at the bottom of the arena. Drag backwards from it (slingshot, max 160 px) to aim; the arrow shows the direction.
  - A **timing ring** shrinks around the top on a 1.2 s loop. Releasing while it overlaps the top's edge (±8 px) is a **Perfect launch** (+15% initial spin, "PERFECT" pop).
  - Initial spin ω0 = 0.6 + 0.4·(pull/160), plus the perfect bonus. Initial velocity = pull vector × 3.2 px/s per px.
  - AI tops launch simultaneously from evenly spaced marks with preset pull/accuracy per opponent.
- **Physics** (fixed dt = 1/120 s, 2 sub-steps per frame), per top:
  - Bowl slope: a += −0.9·pos (toward center).
  - Traction drive: a += τ·ω·120 in the direction perpendicular to pos (counter-clockwise for clockwise spin). This makes wide tips orbit aggressively.
  - Floor friction: v *= (1 − 0.6·μ·dt).
  - Spin decay: ω −= k·ω·dt + 0.004·dt.
  - Wobble: if ω < ω_w, add a random jitter force of magnitude 220·(ω_w−ω)/ω_w (seeded PRNG) and start the visual tilt.
  - **Spin-out:** ω < 0.12 → the top topples (falls-over animation, out).
  - **Rim:** if |pos| > A − ρ: when the outward radial speed is > 260 px/s, the top is **knocked over the edge** (out, "OVER THE EDGE!" banner); otherwise reflect the radial velocity with restitution 0.5.
  - **Collisions** (circle–circle): first separate along the normal by mass ratio. Then apply an impulse with restitution e = 0.8 using masses m.
  - **Spin damage:** Δω_other = 0.0009·|v_rel·n|·(R_self/R_other)·(m_self/(m_self+m_other)), applied symmetrically with roles swapped and clamped to ≤ 0.25 per hit.
  - Sparks particles and a clack whose volume tracks the impulse.
- **Player control during battle — DASH:** hold anywhere on the screen to steer: a += 380·unit(pointer − top.pos). It costs spin (ω −= 0.03·dt per frame held) and drains a **Dash meter** (100, −45/s, +12/s regen; usable while > 0). Releasing stops the dash.
- **Win / lose:** win when the last top still spinning is yours; lose when your top spins out or goes over the edge. Draw (all out in the same frame) = replay. A 60 s cap decides by highest remaining ω.

## 6. Controls
- **Lathe:** mouse or touch press-drag = chisel. Keyboard: `↑/↓` move the chisel slice, `←/→` move the cut radius, hold `Space` to cut, `N` new blank, `Ctrl+Z` undo, `B` battle.
- **Launch:** drag back and release (mouse/touch). Keyboard: `←/→` aim, hold `Space` to charge the pull (oscillates 0→max→0), release to launch.
- **Battle:** hold pointer = dash toward it. Keyboard: arrow keys = dash direction (meter rules apply).
- **Global:** `P`/`Esc` pause, `M` mute, `R` restart the battle. Tap targets ≥ 48 px; `touch-action:none`.

## 7. Core loop
1. Carve a top (20–60 s) while watching the stats and archetype react live.
2. Launch it with a skill-timed release and fight 1–3 AI tops (20–60 s).
3. Win coins (or lose and learn why: "spun out at 14 s — too little stamina", "knocked over the edge — too light").
4. Re-carve or upgrade (wood type, launcher, metal rim), then take on the next opponent on the ladder.

## 8. Progression & content
- **Ladder of 8 opponents**, each with a fixed procedural profile, name and color:
  1. "Pine Pawn" (Balance, slow AI)
  2. "Flat Jack" (Attack, wide tip)
  3. "Needle" (Stamina, sharp tip)
  4. "Barrel" (Defense, heavy)
  5. Two-top free-for-all (Pawn + Needle)
  6. "Saw Disc" (Attack, max reach, AI dashes)
  7. Three-top free-for-all
  8. Boss "Old Ebony" (Ebony, perfect launch every time, dashes)
  - Show each opponent's silhouette and archetype before the fight, so counter-carving is possible.
- **Coins:** win 50 + 5 per 10% spin remaining + 20 per knock-over; lose 10.
- **Upgrades:**
  - Oak (150), Ebony (400).
  - Launcher power +8% (3 levels: 100/200/300).
  - **Metal rim ring** (300): adds +0.25 mass at the widest slice. It raises I and WEIGHT and shows as a gray band.
  - Fine chisel (120): halves the neighbor smoothing, for precise tips.
- **Endless "Gauntlet"** after the boss: random AI profiles with escalating wood and dash, scored by streak.

## 9. Scoring
- Battle score = 1000 × (your remaining ω / ω0) + 300 per KO + 200 for a perfect launch + 500 for winning.
- Ladder stars: 3★ = won with > 50% spin left; 2★ = won with > 20% left; 1★ = won.
- Best gauntlet streak is saved.

## 10. Game feel & art direction (procedural)
- **Lathe scene:** a dark workshop (#1b1612) with a warm overhead light cone; headstock and tailstock drawn as simple gray rects; the spinning blank has scrolling grain stripes, curls of shavings (orange arcs) and dust particles; the hum rises as you start cutting.
- **Arena:** a slate bowl with concentric shading rings for depth; the rim is a lighter stroke; and the floor shows faint scuff trails behind fast tops (fading polyline).
- **Impact:** a 2-frame hit-stop (freeze 30 ms) on hard hits > 0.08 Δω, plus spark burst and a camera shake proportional to impulse.
- **KO:** slow-mo (0.3× for 0.5 s) when a top goes over the edge, and a banner.
- **Spin-out:** the top tilts into a precessing ellipse, then falls with a clatter.
- **Clarity:** each top has a colored rim halo (yours = cyan) and a small spin meter arc around it.

## 11. Screens & UI
1. **Title:** a spinning top turning on a lathe. Play / Gauntlet (locked) / Workshop (upgrades) / Settings.
2. **Ladder:** 8 opponent cards (silhouette, name, archetype, stars).
3. **Lathe screen:** the blank (center), 5 stat bars + archetype label (right or bottom on portrait), wood-type chip, buttons New / Undo / Save / Battle.
4. **Launch overlay:** slingshot arrow, timing ring, "PERFECT" feedback.
5. **Battle HUD:** your spin % big, opponents' small spin bars, dash meter, timer.
6. **Result:** win/lose, reason line (stamina / over the edge / outspun), stats comparison vs the opponent, coins, Re-carve / Retry / Next.
7. **Workshop:** upgrade cards.
8. **Tutorial** (first run): "Drag to carve", "Wide = long spin but heavy", "Sharp tip = stamina, flat tip = speed", "Pull back to launch — release on the ring!", "Hold to dash".

## 12. MVP feature list (build now)
- [ ] Single `index.html`, responsive canvas, 60 fps.
- [ ] Lathe: 32-slice profile, rate-limited chisel with neighbor smoothing, mirror render, undo, save slots, wood types.
- [ ] Stats model (mass, inertia, reach, CoM, tip → STAMINA/STABILITY/WEIGHT/REACH/SPEED + archetype), live bars.
- [ ] Arena physics: bowl, traction, friction, spin decay, wobble, collisions with spin damage, rim bounce/over-the-edge, spin-out.
- [ ] Slingshot launch with timing ring; dash with meter; AI launch + simple AI dash (steer toward the nearest top when the meter is > 50).
- [ ] 8-opponent ladder incl. FFA, coins, 5 upgrades, stars, localStorage.
- [ ] Mouse/touch/keyboard controls; WebAudio SFX; title, ladder, lathe, battle, result, workshop screens; tutorial.

## 13. Later features (do NOT build in MVP)
- Separate parts (ring/blade/tip) with mix-and-match like the Beyblade X customisation; paint/stencil step (Woodturning-style); decals.
- Online/async PvP using shared design codes (profile → base64 string), daily tournament, leaderboard.
- Arena hazards (bumpers, slopes, X-line rail), team 2v2, bursting tops.
- Cosmetic woods/finishes, battle pass, rewarded "re-launch".

## 14. Acceptance criteria
1. Opens from disk, 0 network requests, no console errors.
2. Carving never increases a radius, never goes below 0.08, and changes the stat bars live. A wide, low design produces a Defense/Stamina label; a flat-tip, wide-rim design produces Attack; a needle tip produces higher STAMINA than the same design with a flat tip.
3. Stats are deterministic: the same profile always yields the same numbers (show them in a debug overlay with `Shift+D`).
4. The launch slingshot sets direction and power; releasing on the timing ring gives exactly +15% ω0 and a "PERFECT" pop.
5. In the arena, a top spins out exactly when ω < 0.12; a top crossing the rim with outward speed > 260 px/s is eliminated, and below that it bounces.
6. Collisions conserve momentum within 2% (debug log) and apply spin damage with the stated formula, clamped.
7. **Balance sanity** (`Shift+T`): a headless sim runs 30 AI-vs-AI battles for each archetype pair, using 4 reference designs (Attack/Defense/Stamina/Balance), and logs win rates. No archetype may win < 20% or > 80% against any other.
8. Ladder progress, coins, upgrades and the 3 design slots persist after reload; upgrades change stats or behavior as specified.
9. The first ladder opponent can be beaten by a new player using mouse only, touch only, or keyboard only.
10. ≥ 50 fps on a mid-range phone with 4 tops, sparks and scuff trails (pooled particles; no per-frame allocations in the physics loop).
