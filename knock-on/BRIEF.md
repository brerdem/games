# GF-20261022-01: Knock-On — Game Design Brief v1

*Game Finder, for Burak Erdem's pipeline · Thursday 2026-10-22 (Europe/Istanbul, UTC+3) · Slug `knock-on` · Status: brief v1, handoff-ready (not built, not production-ready)*

> **Handoff essentials (summary for Game MVP Builder and Game Tester)**
> - **Mechanic that must not be compromised:** *space-consuming deterministic toppling on a grid.* Swipe a standing domino along its long axis to topple it. A falling domino **lies down in the next cell** (leaving a tail) unless something is standing there. A domino can't fall into a wall, a flat domino or a tail. So every push **uses up floor** that later pushes might need. A parallel domino in the path is knocked on (if it has room to fall); a domino hit **from the side spins 90° and stays standing** (a switch). Order is the whole puzzle. No physics, no randomness.
> - **Key entertainment hypothesis:** planning *which run to knock first* (so each chain has room to fall and arrives at the switches set by earlier chains) is a satisfying "I see it" puzzle, and the deterministic toppling cascade is a destruction-as-reward payoff, the thing that makes Smash Fest–style games watchable, delivered without physics luck.
> - **Signature moment:** the *payoff push*: after set-up pushes, one swipe sends a long cascade through elbows, splitters and the dominoes that earlier chains spun into place, with a rising click scale (L10: one push fells 11 pieces). On the last piece, a stadium-wave flash runs along the whole fallen path.
> - **Minimum viable experience:** 12 embedded levels (§I.2) on a 6×8 portrait board; swipe-to-push with a live landing/spin preview; pushes = par + 2; undo (costs 1 push); budget-aware stuck banner; stars; one hint per level.
> - **Permitted simplifications:** 2D top-down dominoes with a tween-based tip-over (no physics, no 3D); one music loop; no meta; no level generator in the build (levels are embedded).
> - **Game Tester must validate:** §M objective criteria, *especially* the degenerate-strategy table (D1–D10) re-measured on the shipped level data, rule fidelity of `push()` against §I.3 and §I.4, the readability of the landing rule (H2), and human H2–H5.

---

## A. Concept Identity
| Field | Value |
|---|---|
| Game ID | **GF-20261022-01** |
| Working title | **Knock-On** (no game under this name in iTunes search, US, 2026-10-22. "Knock Out" is a smash/cannon title named by GameRefinery on 13 Oct; the names differ, but flag the similarity for Burak) |
| Date / version | 2026-10-22 · v1 |
| Genre / subgenre | Puzzle → hybridcasual ordering puzzle (chain-reaction × deterministic planning) |
| Target audience | Adult casual puzzle players: the ordering/arrow-puzzle audience (Arrows, Amaze GO, CubeAway, Rotate Rings), Smash-genre players who like watching things fall, and strict-logic players (Meowdoku). Inferred from the reference audiences; no demographic data. |
| Target platform | Mobile iOS and Android |
| Prototype platform | Web in browser, mobile-first, offline single page |
| Orientation | **Portrait** (6 wide × 8 tall board; the existing 390×844 letterbox shell) |
| Elevator pitch | *Knock over every domino on the board in as few pushes as you can. But every domino that falls takes up floor, and every side-hit spins a domino into a new direction, so the order you push in decides whether the last chain runs or jams.* |
| USP | Domino toppling has always been a one-tap physics toy (Rolling Domino, Domino Smash) or a pre-set tap-to-watch cascade (Cascadot). Knock-On makes toppling **the planning puzzle itself**. Fallen dominoes block floor, side-hits spin dominoes into switches, and the solver guarantees fairness. Every move still ends in a cascade. |

## B. Market Research
All observations are from 2026-10-22, 07:07–07:40 UTC+3, US storefront unless stated. No paid analytics were used. Download and revenue figures are third-party estimates quoted from public articles and labelled as such.

| # | Reference | Facts (verified unless labelled estimate) | Relevant mechanic | Gap / opportunity |
|---|---|---|---|---|
| 1 | **Smash genre**: Smash Fest! (Flow Games), Royal Smash!, Angry Smash, Smash Blast, Knock Out | Smash Fest iOS Top Free **#9**. Royal Smash GP Casual **#1** (Sensor Tower). Angry Smash GP Casual #10 ▲2. GameRefinery (13 Oct): 30+ developers shipped the Cannon Fest format; clones within 1–2 weeks. The four reasons it works: no tutorial, *destruction is the reward*, fair losing, no pressure. AppMagic via MobileGamer.biz (21 Oct), **estimates**: Smash Fest 25.2M downloads, Royal Smash lifetime IAP ~$6.7M, 80+ smash titles. https://www.gamerefinery.com/how-a-toon-blast-side-event-became-its-own-genre/ · https://mobilegamer.biz/data-digest-scopely-century-and-dream-lead-publisher-list-block-blast-and-arrows-top-download-chart-more/ | Aim and fire to topple stacks; a physics chain reaction | Watching things fall is proven mass appeal. The genre is saturated (80+ titles), and physics outcomes vary run to run. Knock-On keeps "watch it fall" with deterministic, plannable falls. |
| 2 | **Ordering-puzzle wave**: Arrows / Arrow Puzzle, Amaze GO (iOS #18), CubeAway (iOS #11; GP Puzzle #15 ▲2), Rotate Rings (iOS #5; GP Puzzle #3) | MobileGamer.biz (21 Oct; AppMagic, **estimates**): Q3 top hypercasual downloads were Block Blast 47M, Arrow Puzzle 42M, Meowdoku 32M, and 3 of the top 10 are arrow puzzles. PocketGamer.biz (21 Oct): Rotate Rings passed 10M installs (AppMagic **estimate** 11.1M), #199 → #6 most-downloaded Sept → Oct. GP reviews (newest): "same 4 levels on repeat", "so easy … boring". https://www.pocketgamer.biz/nebula-studios-rotate-rings-surpasses-10m-mobile-installs/ | Tap the right piece in the right order | Ordering is the dominant 2026 puzzle verb, but the leaders are criticised as too easy and repetitive. Knock-On is an ordering puzzle in which order genuinely matters (sim: greedy 0% from L7). |
| 3 | **Colony Flow!** (ABI; iOS #17), **Pocket Sort** (SayGames; GP Puzzle #14), **Bus Fever Party!** (iOS #6, GP Casual #2) | Colony Flow iOS 36,647 ratings; GP 1M+, 4.5★. Pocket Sort GP 10M+. Bus Fever GP 10M+, 4.0★. Newest GP reviews: "Super Hard levels … impossible without spending", "they rig the levels", "AI levels have become unplayable". | Sort / escape under constraints | Players punish perceived rigging. Knock-On's every level is solver-verified, with no hidden randomness, and the stuck banner is honest. Fairness is part of the pitch. |
| 4 | **Domino prior art**: Cascadot (Ymix, iOS, 2026-06-11, 0 ratings), Topple Match (Neuros Studio, GP 500+, updated 16 Oct), Rolling Domino (Lion, 2019, 38,086 ratings), Domino Smash (Gismart, 2019, 21,582) | iTunes / Play search, 2026-10-22 | Cascadot: rotate arrow tiles, then a single tap cascade. Topple Match: tap colour chains with boosters. Lion / Gismart: physics one-tap. | The domino *theme* is used; the rule set (floor-consuming landing, side-hit spin switches, multi-push ordering under a par budget) was not found. **Flag the theme adjacency for Burak.** |
| 5 | **Domino toppling as watchable content**: Hevesh5 (YouTube) | 4.65M subscribers, 2.52B views, ~25.4M views in the last 28 days (vidIQ **estimate**, observed 2026-10-22) | Large domino builds toppling | The cascade is ad-creative-friendly: the "last push" makes a natural 10-second video. Social popularity is not proof of commercial success. |

**Market signals**
- Destruction-as-reward is today's breakout casual format (Smash genre at GP Casual #1, iOS #9).
- Ordering puzzles dominate hypercasual downloads (3 of the Q3 top 10 are arrow puzzles; AppMagic estimates).
- The leaders draw "too easy / repetitive" (Rotate Rings) and "rigged" (Colony Flow, Pocket Sort, Bus Fever) complaints, which leaves room for a deterministic, fair, deeper ordering puzzle with a spectacle payoff.

**Opportunities**
- Combine the two winning verbs, *order things* and *watch things fall*, without physics luck.
- Use the cascade as the ad creative.
- Make every level solver-verified fair.

**Known uncertainties**
- No current top-chart deterministic domino puzzle. Cascadot (0 ratings) suggests the pure-cascade puzzle has not broken out, but its rules are much simpler.
- Whether casual players can read the landing rule ("it lies down in the next square") without text is unknown (H2).
- No gameplay video of the references was watched today. Their mechanics are described from store text and reviews.

## C. Core Gameplay Concept
- **What the player controls:** standing dominoes on a 6×8 grid. An **H** domino stands across a row and can fall East or West. A **V** domino stands along a column and can fall North or South.
- **Primary action:** swipe on a standing domino in one of its two fall directions (a tap-tap alternative exists, §F). That is one **push**.
- **Response (deterministic, tick by tick, §I.4):**
  - The pushed domino lies flat in its own cell. Its top lands in the next cell:
    - **Empty floor:** it lies there, leaving a **tail** on that floor (the floor is now used).
    - **A standing parallel domino:** that domino is **knocked on**. It falls the same way *only if* its own next cell is open; otherwise it **jams** and stays standing.
    - **A standing perpendicular domino:** it **spins 90°** and stays standing (it can now fall the other way). The chain stops.
    - **Elbow block** (corner piece, two open sides): if entered through an open side, it falls and sends the chain out of its other open side. Otherwise it acts like a wall.
    - **Splitter block** (T piece, one input side): if entered through its input side, it falls and sends the chain out to **both** perpendicular sides.
    - **Wall, flat domino, tail, or board edge:** the chain stops.
  - **Legality:** a domino can be pushed (or knocked on) only if the next cell in that direction is inside the board and is not a wall, a flat domino or a tail. Elbows and splitters can't be pushed; they only fall through chains.
- **Immediate objective:** topple **every** domino, elbow and splitter on the board.
- **Win:** nothing left standing. **Fail:**
  - (a) **Out of pushes.** Pushes = par + 2; every push and every undo costs 1.
  - (b) **Stuck.** The level can no longer be cleared within the pushes left. A banner says so right after the push that caused it (§F), offering Undo (if a push remains) and Restart (free).
- **Structure:** level-based, 12 levels in the MVP. Each level is ~20–120 s for a thinking player.
- **How players improve:**
  - learning that falling dominoes **eat floor** (start at the end of a run, not the middle);
  - learning that a side-hit **turns** a domino, so an early chain can **set a switch** for a later chain;
  - learning that a domino with no room to fall is **pinned** for now, but a spin can free it;
  - learning to route chains through elbows and splitters.
- **Why it's enjoyable:** every push ends in a cascade you caused. Plans pay off in visible chains. Mistakes are legible ("my first chain lay down right where the second one needed to fall").

## D. First 10 Seconds (L1)
- **On screen:** a soft felt board, 6×8, with one row of four H dominoes in row 4, from the left edge, and floor to their right. Three push tokens sit at the top right.
- **How the player understands:** a ghost finger swipes right on the leftmost domino once (no text). A ghost preview shows the four dominoes tipping, with the last one lying in the empty cell.
- **First action:** the player swipes right on any domino.
  - **If it's the leftmost:** all four topple in a click-click-click-clack, and the level clears with three stars.
  - **If it's a middle one:** only the right part falls. The left part is left with no room to fall (the next cell is now a flat domino) and shows the **pinned** marker. The stuck banner appears with Undo, which teaches the core rule on L1 with one undo.
- **Immediate feedback:** each domino tips with a 90 ms stagger and a rising wooden click. The last one lands with a deeper *clack* and a dust puff on its tail cell. The tile glows.
- **Curiosity / satisfaction:** a clean chain. L2 has two runs and a wall, L3 introduces the side-hit spin.
- **Tutorial text:** at most one short line per level, outside the board:
  - L1 "Swipe to knock them over."
  - L2 "Fallen dominoes take up space."
  - L3 "A side hit turns a domino."
  - L4 "Corners turn the chain."
  - L6 "Order matters."
  - L11 "Splitters send it both ways."

## E. Signature Gameplay Moment
**The payoff push.** The push that cashes in earlier set-up. On the reference lines, L10's 4th push fells 11 pieces and L11's 3rd fells 7. Any push that fells ≥ 6 pieces gets the full treatment:
- the cascade runs through switches the player set earlier;
- the camera eases 4% closer, the click pitch climbs one step per domino, elbows *swish* as the chain turns, and splitters *crack* and send two chains at once;
- the last domino of the chain lands with a heavy clack, and the board does a small "settle" bounce.

**Clear moment:** when the last standing piece falls, every fallen piece flashes once in the order it fell, like a stadium wave replaying the whole solve.

**Secondary moment, the switch:** a chain runs into a domino side-on and spins it. A few pushes later, that domino becomes the bridge that lets the final chain through ("I set that up!"). The rules produce this, not scripted effects. Spins are required on L5–L12 (the solver confirms no spin-free solution within par).

## F. Controls and Interaction
- **Primary:** touch a standing domino and swipe (≥ 24 px) toward one of its two fall directions. H dominoes accept East/West; V dominoes accept North/South. A swipe across the axis does nothing.
  - **While the finger is down and moved ≥ 12 px:** a **ghost preview** shows the result of the push: pieces that will fall (translucent tipped), spins (curved arrow), jams (small ✕), and tail cells (dotted).
  - **Release** past 24 px commits. Moving back to the start cancels.
  - If the push is illegal (the next cell is blocked), the domino wobbles, plays a dull tick, and **no push is used**.
- **Alternative (accessibility / precision):** tap a domino to select it, then tap one of the two arrow buttons that appear on its ends. The preview shows while an arrow is held or hovered.
- **Buttons (≥ 48 px):**
  - **Undo:** restores the board before the last push and costs 1 push.
  - **Restart:** free; resets the pushes.
  - **Hint:** 1 per level. It pulses one push on an optimal line from the current board. If the board can no longer be cleared, it says so instead.
  - Menu, mute.
- **Stuck banner:** shown right after a push leaves the board unclearable within the pushes left ("Can't finish from here: Undo or Restart"). Push tokens still in hand are shown on the banner. This is the exact, budget-aware check (§I.4). It never appears before the push that caused it, and it is never shown as a preview.
- **Pinned marker:** a standing domino whose two fall cells are both blocked shows a small pin icon. It is **informational only**: a later spin can free it. Do not treat it as a fail state.
- **Touch targets:** cells are ≥ 54 px at 360 wide (6 cells × 56 px + 2×12 px margins). The whole cell is the hit area.
- **Failure / cancellation:**
  - Pointer-leave or touchcancel mid-swipe cancels and uses no push.
  - Input is locked while a cascade animates.
  - Board input is ignored for ≥ 300 ms after any overlay closes (Spillproof SP-002 lesson). A release over the button bar or at the screen edge cancels (Foldprint daa26e9 lesson).
- **Accessibility:** no colour coding is needed (pieces differ by shape). Elbow and splitter open sides carry arrows. No timers anywhere.
- **Desktop:** mouse drag the same way. Keyboard: arrow keys move a cursor, Shift+arrow pushes, Z undo, R restart (with confirm), H hint, Esc menu.

## G. Visual and Audio Direction
- **Art style:** a cosy tabletop.
  - A deep green felt board (#2E5E4E) with faint cell seams (#3C6F5E); a walnut frame (#4A3324).
  - Dominoes are ivory (#F4EEDF) with a black pip face (#1E1E1E) and a soft drop shadow. Standing dominoes are drawn as a thick tile seen from above, with a highlight on top. Flat dominoes are a longer, lower tile, rotated to the fall direction.
  - Tails show as the far half of the flat domino lying across the next cell. Make it obvious that the cell is taken.
- **Palette:**

  | Element | Hex |
  |---|---|
  | Felt / seams | #2E5E4E / #3C6F5E |
  | Domino / pips | #F4EEDF / #1E1E1E |
  | Wall blocks | #7B6A58 (wooden block with grain) |
  | Elbow blocks | #E9B44C (amber, arrow chevrons on open sides) |
  | Splitter blocks | #5BC0BE (teal, T-arrows) |
  | Preview fall | 40% ivory |
  | Preview spin | #FFD166 curved arrow |
  | Jam ✕ / pinned pin | #EF476F |

- **Camera:** fixed top-down. Pushes are shown as wooden tokens at the top right.
- **Shapes:** chunky, rounded, toy-like. No realistic physics debris.
- **Animation principles:** a tip-over is a 120 ms rotate-and-squash about the leading edge. Knock-ons stagger 70–90 ms per tick (a splitter's two arms run in lock-step). A spin is a 140 ms rotate with a small hop. A jam is a 2 px shudder.
- **Particles / impact:** a dust puff on each tail cell; a tiny wood chip on a jam; on a splitter, a crack and two puffs.
- **Audio:**
  - wooden clicks pitched up a pentatonic step per piece within one push;
  - a deeper clack on the last piece of a push;
  - a swish for an elbow, a crack for a splitter, a ratchet for a spin, a dull tock for a jam;
  - a three-note chime on level clear;
  - music: a light marimba loop, mutable.
- **Visual reference descriptions:** domino-run videos (long snaking lines); a tabletop board-game look. Do not copy any creator's builds, branding or artwork. All layouts are generated by our sandbox.

## H. Game Feel
| Event | Feedback | Timing |
|---|---|---|
| Swipe start | Ghost preview: falls, spins, jams, tails; a light haptic tick when the swipe passes the commit threshold | Immediate (<16 ms per frame) |
| Commit a push | Tick-by-tick cascade; click pitch climbs | 80 ms per tick + 120 ms final settle |
| Spin | Rotate and hop; ratchet; the spun domino glows for 400 ms so the player notices the new direction | 140 ms |
| Jam | 2 px shudder and tock; ✕ fades | 200 ms |
| Illegal push | Wobble and dull tick; no push used | 150 ms |
| Big chain (≥ 6 pieces in one push) | "Knock-on ×N" label beside the board (no score multiplier) | — |
| Stuck | Board dims; banner with Undo / Restart | — |
| Out of pushes | Token stack empties; "Out of pushes", with Restart | — |
| Level complete | Signature moment (§E), then stars stamp in | ≈1.5 s |
| Restart | Pieces pop back up in a 200 ms ripple | — |

Weight comes from the final clack and settle. Responsiveness comes from the swipe preview. A cascade must never take longer than 2.2 s (cap the per-tick stagger on long chains).

## I. Gameplay Progression
**Notation.** The grid is 6 columns × 8 rows, origin top-left. Cell index = row×6 + col. Directions are 0=N, 1=E, 2=S, 3=W.

| Symbol | Meaning |
|---|---|
| `.` | floor |
| `#` | wall |
| `H` | standing domino, falls E/W |
| `V` | standing domino, falls N/S |
| `a` / `b` / `c` / `d` | elbow with open sides N+E / E+S / S+W / W+N |
| `1` / `2` / `3` / `4` | splitter whose **input** side is N / E / S / W |
| `_` | flat domino (runtime only) |
| `~` | tail (runtime only) |

**Pushes** = par + 2. **Stars:** 3★ = cleared in exactly par pushes with no undo and no hint; 2★ = cleared with ≥ 1 push left; 1★ = cleared on the last push.

### I.1 Sample stages (what changes)
1. **Stage A (L1–L4): runs, floor and corners.**
   - L1: one run.
   - L2: two runs.
   - L3: the first side-hit spin.
   - L4: the first elbow (one 7-piece chain).
   - *Learns:* start at the end of a run, fallen dominoes take space, a corner turns the chain.
2. **Stage B (L5–L7): switches and order.**
   - Spins are *necessary* (no spin-free solution within par).
   - L6 has a single optimal order (nOpt 1); greedy max-fell play clears only 12.5%.
   - L7 is the first "lazy fails" level (greedy 0%, random 0.4%).
   - *Learns:* set a switch for a later chain; temporary pins are fine.
3. **Stage C (L8–L10): chains that turn.**
   - Elbows join runs into L- and U-shapes.
   - L10's two elbows let one push fell 11 pieces, but only after three set-up pushes.
   - *Learns:* route the cascade.
4. **Stage D (L11–L12): splitters.**
   - One chain feeds two arms.
   - L12 (par 6) is the hardest level: the lowest MAXIMAL+probe (7.2%) and MAXIMAL (2.2%) clear rates, and the highest par.
   - *Learns:* make one push do two jobs.

### I.2 Embedded level data (v1, sandbox-verified). Builder: use exactly these.
```json
[{"id":"L1","par":1,"pushes":3,"rows":["......","......","......","HHHH..","......","......","......","......"]},
{"id":"L2","par":2,"pushes":4,"rows":[".#....","......","..#...","HHHHH.","......","......","......","HHH..."]},
{"id":"L3","par":3,"pushes":5,"rows":["......","......","..#...","......","....#.","HHHHHV",".....V",".....V"]},
{"id":"L4","par":3,"pushes":5,"rows":["......","...HHH","H.....","V.....","V.....","aHHHH.","......","......"]},
{"id":"L5","par":4,"pushes":6,"rows":["......",".....#","HH....","...HHH",".#...V",".....V","....#H","......"]},
{"id":"L6","par":4,"pushes":6,"rows":["#V....",".V....",".V....",".VHH..","..HHHH","......","......","..#..."]},
{"id":"L7","par":5,"pushes":7,"rows":["..V...","......","......","VHHHH.","V.V...","V.V...","H.V...","V....."]},
{"id":"L8","par":4,"pushes":6,"rows":["....V.","....V.","bHH...","H.....","H.....","V.....","V.....","......"]},
{"id":"L9","par":5,"pushes":7,"rows":["......","HHHHHH","..#..V",".....V","HHHHHd","...V..","...V..","...V.."]},
{"id":"L10","par":5,"pushes":7,"rows":["......","VHbHc.","..V.V.","..V.V.","..V.V.","..V.V.","HHH#..","......"]},
{"id":"L11","par":5,"pushes":7,"rows":["V.....","3##...","V.....","VHH...","V.....","V.....","V.....","VHVHH."]},
{"id":"L12","par":6,"pushes":8,"rows":["....V.","##..V.","HHHH3.","....HH","...VV.","...VV.","...V..","...V.."]}]```
Suggested names, for flavour only:
- L1 First Tip, L2 Two Lines, L3 Side Swipe, L4 Corner, L5 Turnstile, L6 One Way;
- L7 Comb, L8 Hook, L9 Zigzag;
- L10 Twin Corners, L11 Fork, L12 Grand Knock.

### I.3 Reference solutions (one optimal sequence each; for CI only, never shown to players)
Format: `(col,row)dir`. Last column: pieces felled by each push.

| Level | One optimal sequence | # optimal sequences | Felled per push |
|---|---|---|---|
| L1 | (0,3)E | 1 | [4] |
| L2 | (0,3)E → (0,7)E | 2 | [5, 3] |
| L3 | (0,5)E → (5,7)N → (5,5)N | 1 | [5, 2, 1] |
| L4 | (5,1)W → (0,2)E → (0,3)S | 9 | [3, 1, 7] |
| L5 | (0,2)E → (5,3)W → (5,4)S → (5,6)S | 12 | [2, 3, 2, 1] |
| L6 | (5,4)W → (1,0)S → (3,3)W → (1,3)W | 1 | [4, 3, 2, 1] |
| L7 | (2,0)S → (1,3)E → (2,4)S → (0,7)N → (0,6)N | 60 | [1, 4, 3, 1, 4] |
| L8 | (4,0)S → (2,2)W → (0,3)S → (0,4)S | 8 | [2, 3, 1, 3] |
| L9 | (0,1)E → (3,7)N → (0,4)E → (3,4)E → (5,1)N | 3 | [5, 3, 3, 5, 1] |
| L10 | (0,1)N → (1,1)E → (0,6)E → (4,5)N → (2,6)S | 20 | [1, 1, 2, 11, 1] |
| L11 | (0,0)S → (1,3)E → (0,7)N → (1,7)E → (2,7)E | 30 | [1, 2, 7, 1, 3] |
| L12 | (4,0)S → (0,2)E → (3,7)N → (5,3)W → (4,5)N → (4,3)N | 20 | [2, 4, 4, 1, 2, 2] |

### I.4 Reference rule implementation (must match exactly; identical to `sim/knock-on/lib.mjs`)
```js
const DX=[0,1,0,-1], DY=[-1,0,1,0];                 // 0=N 1=E 2=S 3=W
const ELB={a:[0,1],b:[1,2],c:[2,3],d:[3,0]};        // open sides
const SPL={'1':0,'2':1,'3':2,'4':3};                 // input side
const isPiece=c=>c==='H'||c==='V'||c in ELB||c in SPL;
function canFall(g,W,H,p,d){const x=p%W+DX[d],y=(p/W|0)+DY[d]; if(x<0||y<0||x>=W||y>=H)return false; const c=g[y*W+x]; return !(c==='#'||c==='_'||c==='~');}
function moves(g,W,H){const m=[];for(let p=0;p<g.length;p++){const c=g[p];const ds=c==='H'?[1,3]:c==='V'?[0,2]:null; if(ds)for(const d of ds)if(canFall(g,W,H,p,d))m.push([p,d]);}return m;}
function push(g,W,H,p,d){ // p must be in moves(g)
  g=g.slice(); let events=[[p,d]]; g[p]='_';
  while(events.length){ const next=[];
    for(const [q,dd] of events){                      // all events of one tick, in list order
      const x=q%W+DX[dd], y=(q/W|0)+DY[dd]; if(x<0||y<0||x>=W||y>=H) continue;
      const t=y*W+x, c=g[t];
      if(c==='.'){ g[t]='~'; continue; }              // lies down: tail uses the floor
      if(c==='H'||c==='V'){ const parallel=(c==='H')===(dd===1||dd===3);
        if(parallel){ if(canFall(g,W,H,t,dd)){ g[t]='_'; next.push([t,dd]); } /* else jam: stays standing */ }
        else g[t]= c==='H'?'V':'H';                   // side hit: spin 90°, stays standing, chain ends
      } else if(c in ELB){ const o=ELB[c], from=(dd+2)%4;
        if(o.includes(from)){ const out=o[0]===from?o[1]:o[0]; if(canFall(g,W,H,t,out)){ g[t]='_'; next.push([t,out]); } }
      } else if(c in SPL){ const s=SPL[c];
        if((dd+2)%4===s){ g[t]='_'; next.push([t,(s+1)%4],[t,(s+3)%4]); } // both perpendicular arms
      } // '#', '_', '~': chain stops
    }
    events=next; }
  return g; }
// Win: no isPiece cell left. Stuck banner after a push: minPushes(g) > pushesLeft (exact search; memoised DFS; ≤ 40k states on these levels).
```
Note: no level in v1 has two chain heads hitting the same cell on the same tick (checked). The tick-order rule above is still normative.

## J. Replayability
- **Mastery:** 3★ needs exactly par with no undo, so efficient planning is rewarded. Par is shown after the first clear.
- **Different approaches:** L7–L12 have 3–60 optimal sequences, so players compare routes.
- **Discovery:** the switch, the "temporary pin" insight, chain routing through elbows and splitters.
- **New content:** an offline generator plus the filter (the sandbox exists) gives cheap, verified level supply, and a daily board.
- **Collection (future):** domino sets (wood, glass, candy) and a "longest knock-on" personal record. Artificial rewards are not the core.

## K. MVP Scope
**Essential** (validates the core hypothesis):
- 12 embedded levels with the exact rules (§I.4);
- swipe-to-push with live preview (falls, spins, jams, tails);
- tap-then-arrow alternative;
- illegal-push wobble (free);
- pushes = par + 2;
- undo (costs 1), free restart;
- exact stuck banner after a push, and out-of-pushes;
- pinned marker;
- stars;
- 1 hint per level (pulses one optimal push from the current board, or says it can't be finished);
- tick-based cascade animation with clicks;
- level select with locks, save progress (localStorage);
- portrait lock with a rotate prompt in landscape;
- file:// offline play.

**Optional:**
- "Knock-on ×N" label;
- the stadium-wave flash on clear;
- music loop;
- par reveal after clear;
- haptics (navigator.vibrate) where supported.

**Future (not in MVP):**
- domino sets and meta;
- daily board;
- new pieces, each needing the necessity filter: *bridges* (a chain passes over one cell), *one-way gates*, *heavy dominoes* (need two hits), *portals*;
- the generator in the client;
- boosters (e.g. "lift" = stand one fallen domino back up) only if tested not to break the filter.

## L. Technical Considerations
- **Stack:** plain Canvas 2D (or DOM grid plus CSS transforms) is enough. **No physics engine.** The rules are char-grid operations (§I.4). Phaser is optional, not needed.
- **Animation:** record per-tick events during `push` (fall / spin / jam / turn / split, with cell and direction; the sandbox's `lib.mjs` returns such a `log`) and play them back with a per-tick stagger. The state is committed at the push; the animation is cosmetic.
- **State:** `{levelId, cells[48], pushesLeft, hintUsed, undoUsed, history[]}`. Undo pops `history` (a full snapshot per push).
- **Stuck check / hint:** a memoised DFS for the minimum pushes from the current board. It visits ≤ 40k states on these levels (sandbox reachable-state counts: 12–38,678). Run it in a microtask after the push animation starts, or precompute per level. The target is < 50 ms on a mid phone. If it is too slow, cache min-push values per visited state.
- **Performance:** at most 48 cells. Repaint only on change; idle should not animate (Spillproof SP-007/014 lessons). Cap the canvas backing store at DPR 1.5.
- **Testing requirements (CI):**
  - (1) `push` unit tests replaying every I.3 sequence to a clear board, checking that the felled counts per push equal I.3, and that BFS par equals the listed par;
  - (2) the §M D1–D10 policy simulations on the shipped level data, run per level (not pooled), with ≥ 300 seeds per random policy;
  - (3) touch-input tests (CDP touch, not only mouse);
  - (4) overlay double/triple-tap lockout;
  - (5) frame rate measured during a real swiped solve at 4× CPU slowdown, 390 wide, DPR 2.
- **Unity portability:** trivial. The rules are pure functions on a grid; the tip-over is a hinge tween. Nothing is hard to replicate.
- **Sandbox (for Builder/Tester reference, on the Game Finder box):** `/workspace/game-ideas/sim/knock-on/`, containing:
  - `lib.mjs` (rules, BFS);
  - `policies.mjs` (lazy policies);
  - `evalx.mjs` (budget-model evaluation);
  - `gen.mjs` (generator);
  - `select.py` (ladder plus isomorphism);
  - `lbscan.mjs` / `lbpre.mjs` (load-bearing filter);
  - `usecheck.mjs` (elbows and splitters used on the optimal line);
  - `brief_ref.mjs` + `fidelity.mjs` (the §I.4 code equals `lib.mjs` on 38,486 pushes, 0 mismatches);
  - `final.mjs` → `final_out.md`;
  - `knock_on_levels_v1.json`.

## M. Acceptance Criteria
### M.1 Objective (testable)
1. **Rule fidelity:** a scripted replay of each I.3 sequence clears the board with the listed felled counts. Every listed par equals the BFS minimum.
2. **Legality:** only H (E/W) and V (N/S) dominoes whose next cell is in-board and not `#`, `_` or `~` can be pushed. An illegal swipe uses no push.
3. **Win/lose:** an empty board wins. Out of pushes without a win → "Out of pushes". A push after which the minimum remaining pushes exceed the pushes left → stuck banner. This is reachable in the browser on L1: push the 3rd domino east first.
4. **Undo** restores the exact previous board and costs 1 push. 3★ requires par pushes, no undo and no hint.
5. **Preview** equals the committed result for every legal push on every level (falls, spins, jams and tails).
6. **Degenerate strategies that must fail** (SIMULATION on the shipped data, per level; ≥ 300 seeds; sandbox values from 1000 runs in brackets). Budget = par+2; undo costs 1.

| ID | Policy | Requirement | Sandbox result |
|---|---|---|---|
| D1 | RAND: any legal push | clear ≤ 3% on each of L7–L12 | 0.0–1.0% |
| D2 | RAND+probe: random push, undo whenever the stuck banner shows | clear ≤ 5% on L7–L12 | 0.0–1.2% |
| D3 | GREEDY: the push that fells the most | 0% on L7–L12 | 0% |
| D4 | GREEDY2: 2-push lookahead maximising felled | clear ≤ 10% on L7–L12 | 0% |
| D5 | GREEDY2+probe | clear ≤ 15% on L7–L12 | 0% |
| D6 | MAXIMAL+probe: random among non-dominated pushes, undo on the banner (the strongest lazy policy) | clear ≤ 30% on L7–L12 | 7.2–29.9% |
| D7 | NOSPIN: never make a push that spins a domino | 0% on L5–L12 (a spin is required) | 0% |
| D8 | SAFE1: never leave a pinned domino | clear ≤ 5% on L7–L12 | 0–3.4% |
| D9 | Hint fishing: GREEDY2+probe plus the one hint at the best moment | ≤ 60% on L7–L12; a hint-assisted clear is never 3★ | 0–58.7% (L8 58.7%, L12 57.3%) |
| D10 | Preview fishing | Accepted by design: the preview equals one-push knowledge (what GREEDY uses), which D3–D5 show fails | — |

7. **Positive controls:**
   - P1: a full planner (BFS) clears every level at par (100%).
   - P2: every elbow and splitter is load-bearing: replacing it with floor raises par or makes the level unsolvable (✔ L4, L8–L12). Each one turns or splits on the reference line (✔).
   - P3: **L12 is the hardest level**: the strictly lowest MAXIMAL+probe (7.2%) and MAXIMAL (2.2%) clear rates of L7–L12, and the strictly highest par (6).
   - P4: all 12 levels are pairwise distinct under mirror and 180° rotation (✔).
8. **Mobile:** cells ≥ 54 px at 360×800; 0 off-screen elements on 17 common sizes; landscape shows only a rotate prompt; overlays ignore board input for ≥ 300 ms; swipe-out, touchcancel, and a release over the button bar use no push.
9. **Performance:** ≥ 50 fps during a swiped solve at 4× CPU slowdown (390 wide, DPR 2); idle frames are pixel-identical; the stuck check is < 50 ms per push.
10. **Offline:** 0 network requests from file://.

### M.2 Subjective hypotheses (human playtest; not measurable by CI)
- **H1** Planning beats luck (supported by simulation D1–D9).
- **H2** Players understand the landing rule ("a fallen domino takes the next square") by the end of L1–L3 without reading text (≥ 4/5 testers can explain it).
- **H3** The cascade feels satisfying: testers voluntarily name a big knock-on or the last push as a favourite moment (≥ 3/5).
- **H4** Switches (L5–L9) produce "aha", not frustration: median attempts ≤ 4 per level and ≤ 1 rage-quit in 5 testers.
- **H5** The preview plus the pinned marker make outcomes predictable: < 1 "surprise" push per level after L4 (think-aloud).

## N. Design Risks and Experiments
| Risk | Why | Experiment |
|---|---|---|
| Landing rule is unreadable | The tail can look like decoration | Draw the tail as the domino's far half across the cell. Playtest L1–L3 with and without a dotted "takes this square" ghost in the preview. Keep it if H2 rises. |
| Difficulty spike at L6 → L7 | L6 GREEDY2+probe 48% → L7 0%; humans may stall | Track attempts. If median > 4 on L7, insert a bridge level from the sandbox pool (`e1.jsonl`, par 5, MAXIMAL+probe 40–50%), or make the first hint on L7 free. |
| Repetitive single verb | Only "push" | Each stage adds a decision type (floor → switch → turn → split). Future pieces must pass the load-bearing filter. Measure session length L1–L12. |
| Dead ends feel unfair | Pins and floor use surface later | Exact stuck banner right after the causal push, plus Undo, plus a hint that states "can't finish". A/B a one-line diagnostic ("this domino has no room to fall"). |
| Stuck banner / undo too strong (failure patterns 6 and 10) | An exact detector could be used to probe | Every probe costs a push (undo = 1). D2/D5/D6 show probe-assisted lazy play ≤ 30%. If testers solve by banner-fishing, hide the banner until the board is truly unclearable at any budget. |
| Lack of skill expression | Deterministic puzzles | Par stars; 3–60 optimal routes on later levels; a future daily board leaderboard by pushes. |
| Insufficient differentiation (theme) | Domino games exist (Cascadot, Topple Match, Rolling Domino) | The differences (§O) are rule-level. **Flag for Burak:** the domino *theme* is shared, the rules are not. Alternative skins if needed: books on a shelf, dominoes → cards, or "toppling tin soldiers". |
| Long cascades feel slow | 11-piece chains | Cap the total animation at 2.2 s; tap-to-skip after the first 0.5 s. |
| Technical: stuck-check cost | DFS per push | Precompute per level (≤ 40k states) or cache. CI times it. |

## O. Concept Score
| Criterion | Max | Score | Reason |
|---|---|---|---|
| Core gameplay and fun potential | 25 | **18** | Real ordering depth (sim: greedy 0%, 2-push lookahead 0%, strongest lazy policy ≤ 30% on L7–L12), a cascade payoff on every push, and the switch aha. Readability of the landing rule and the L7 difficulty step are unproven with humans. |
| Originality and differentiation | 20 | **14** | The domino theme is common and Cascadot / Topple Match are adjacent. No searched game uses floor-consuming landing plus side-hit spin switches under a push budget. It is not a known public logic genre. |
| Market evidence and opportunity | 20 | **14** | Destruction-as-reward is today's breakout (Smash genre at GP Casual #1, iOS #9; GameRefinery; AppMagic estimates). Ordering puzzles dominate Q3 hypercasual downloads. Domino content is highly watchable (Hevesh5). There is no current charting deterministic domino puzzle (analogical evidence). |
| Web MVP feasibility | 15 | **14** | Char-grid rules, 48 cells, levels and solver done, tween animation; no physics. |
| Mobile control suitability | 10 | **9** | One swipe per move along the piece's own axis, with preview and cancel; a tap-arrow alternative; large targets. |
| Production and commercial potential | 10 | **7** | Cheap verified level supply, a natural ad-creative moment, a Smash-style IAA plus ad-removal model and domino-set cosmetics. Boosters must not break the filter. |
| **Total** | 100 | **76** | **Promising (70–84). Evidence confidence: medium-low** (simulation-backed depth; no human data; market evidence is analogical). |

**Recommendation:** build the web prototype for Game Tester validation, with the D1–D10 checks encoded in CI. Burak should review the domino-theme adjacency flag (low–medium risk: the theme is shared, the rules are original). This brief does not authorize any production, Unity or native work.

**Differences from inspirations (IP/originality):**
- **Smash genre:** physics aim-and-fire at stacks. Knock-On has no aiming, no physics and no randomness; the puzzle is push *order*.
- **Rolling Domino / Domino Smash:** physics one-tap toys. Knock-On is a deterministic grid with legality rules and a budget.
- **Cascadot:** rotate arrow tiles to pre-set a single cascade. In Knock-On, the player's own chains reconfigure the board (spins, floor use) across several pushes, and pieces are spent permanently.
- **Topple Match:** colour-chain tap-matching with boosters. Knock-On has no colour matching.
- No assets, names, level layouts or UI from any reference are used. All levels were generated by our own sandbox.
