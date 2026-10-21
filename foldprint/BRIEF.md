# GF-20261021-01: Foldprint — Game Design Brief v1

*Game Finder, for Burak Erdem's pipeline · Wednesday 2026-10-21 (Europe/Istanbul, UTC+3) · Slug `foldprint` · Status: brief v1, handoff-ready (not built, not production-ready)*

> **Handoff essentials (summary for Game MVP Builder and Game Tester)**
> - **Mechanic that must not be compromised:** *wet contact printing across fold creases.* Folding along a crease presses the two halves together. Every painted cell prints onto its mirror cell, and both cells end up with the **union** of their paints. Primaries mix (R+Y=orange, Y+B=green, R+B=purple). Paint never comes off. Creases can be folded **again and again**. Order is the whole puzzle.
> - **Key entertainment hypothesis:** planning *which crease to press when* (so paint travels exactly where the stencil wants it and nowhere else) is a satisfying "I see it" puzzle. The fold, press and unfold reveal is a physical payoff that pure logic grids lack.
> - **Signature moment:** the *last press.* The sheet slaps shut, squishes, and peels open on a mirrored print that matches the stencil exactly. The pencil outlines vanish, the colours glow, and the print is pegged to a gallery line.
> - **Minimum viable experience:** 12 embedded levels (§I.4), the drag-to-fold interaction with live print preview, presses = par + 2, smudge and stuck rules, stars, and one hint per sheet.
> - **Permitted simplifications:** 2D fold animation (a skewed or scaled flap, not true 3D); a flat paint texture; one music loop; no gallery meta; no level generator in the build (levels are embedded).
> - **Game Tester must validate:** the §M objective criteria, *especially* the degenerate-strategy table (D1–D10) re-measured on the shipped level data, the rule fidelity of `fold()`, and human H2–H5.

---

## A. Concept Identity
| Field | Value |
|---|---|
| Game ID | **GF-20261021-01** |
| Working title | **Foldprint** (no game found under this name in iTunes search on 2026-10-21; "Ink Fold" exists and is a different block-overlap game, so avoid that name) |
| Date / version | 2026-10-21 · v1 |
| Genre / subgenre | Puzzle → hybridcasual ordering puzzle ("fold puzzle" × deterministic planning) |
| Target audience | Adult casual puzzle players: Paper Fold / Origame fold-puzzle players, arrow/sort ordering-puzzle players (Amaze GO, CubeAway), and strict-logic players (Meowdoku). Inferred from the reference audiences; no demographic data. |
| Target platform | Mobile iOS and Android |
| Prototype platform | Web in browser, mobile-first, offline single page |
| Orientation | **Portrait** (6 wide × 8 tall sheet; the existing 390×844 letterbox shell) |
| Elevator pitch | *Fold a paper along its creases to print wet paint onto the other side, mixing colours as they touch, until your print matches the stencil, without a single drop landing where it shouldn't.* |
| USP | The first fold puzzle where the fold **moves paint**, not paper shapes. Each press is permanent, colours mix, and a crease can be pressed again to bounce paint back. That turns a 100M+-download "fold" fantasy into a real planning puzzle with a print reveal on every move. |

## B. Market Research
All observations are from 2026-10-21, 07:00–08:30 UTC+3, US storefront unless stated. No paid analytics were used. Play installs are Google Play's public download band. Ratings counts are iTunes lookup / Sensor Tower's displayed count.

| # | Reference | Facts (verified) | Relevant mechanic | Gap / opportunity |
|---|---|---|---|---|
| 1 | **Paper Fold** (com.game.foldpuzzle; iOS id1558177980, AI Games FZ) | GP **100M+**, 4.5★, updated 2026-08-26. iOS 345,672 ratings (4.55), released 2021-03-14. https://play.google.com/store/apps/details?id=com.game.foldpuzzle · https://apps.apple.com/us/app/id1558177980 | Tap dashed crease lines to fold flaps in the right order to "reveal hidden objects" | Review snippets: ads after "EVEERRRYYY PUUUZZLLLEE"; "fun… even if very simple in concept". Proven mass appeal of folding, but shallow and ad-heavy. **Not in today's top 25s.** Fold demand is proven but older (2021). |
| 2 | **Folding Fun: Cute Folding Paper** (paper.puzzle.fold.fun.play) / **Paper Fold: Paper Puzzle 3D** (com.TumbGames.PaperFold) / **Origame** (Ketchapp, iOS 84,291 ratings) | GP 5M+ (4.8★) / GP 1M+ (4.6★; reviews: "only like 70 of them… the same one over and over") / iOS 84,291 ratings, updated 2026-09-02 | Fold-to-shape | A long tail of fold apps still updating in 2026; the content-repetition complaint suggests a need for generative depth |
| 3 | **Meowdoku!** (Oakever) | iOS Top Free **#1** (4th day running; Sensor Tower 352,150), GP Puzzle **#1** (496,913) | Strict deduction, checked moves, hearts, "guessing won't save you" | Mass casual accepts hard, fair, deterministic puzzles. Foldprint uses the same fairness promise (every level solvable by reasoning, verified in a solver) |
| 4 | **Arrow/ordering wave**: Amaze GO! (iOS #13 ST; GP Puzzle #4 ▲1), CubeAway (iOS Top Free **#9**, GP Puzzle #16 ▲5), Arrows – Puzzle Escape (GP Puzzle #19; GP category #8), Maze Out! (Grand Games) | GameRefinery (15 Oct): CubeAway peaked at #4 downloads and #140 grossing on 22 Sep with "strict movement limits"; Maze Out entered the top-200 grossing in early October. Netmarvel / Sensor Tower (third-party; treat as estimates): sorting-puzzle IAP **+335% YoY**, H1 2026; Arrows Puzzle Escape / Arrow Puzzle among the fastest-growing by downloads. https://www.gamerefinery.com/mobile-game-market-review-september-2026/ · https://www.netmarvel.com/en/news/1657.html | Ordering under a move limit; tap the right piece in the right order | Arrow-escape is *monotone* (removing never blocks), so the "any free arrow" order is usually safe. Complaints: "levels are too easy… a nightmare level is just a lot of lines" (10-20 GP review). Foldprint keeps the ordering-under-move-limit hook but makes order genuinely matter |
| 5 | **tint.** (Lykkegaard; iOS 8,767 ratings, 4.74) and **Mix Colors!** (Tokyo Smart Games; 23,534) | Colour-mixing puzzles with a calm, no-timer stance | Watercolour mixing as the goal | Shows appeal for colour-mixing puzzles at niche scale. Foldprint uses mixing as a constraint inside a fold puzzle |

**Market signals**
- Ordering/sort puzzles are the fastest-growing hybridcasual puzzle subgenre (GameRefinery; Sensor Tower via Netmarvel, labelled estimates).
- Grand Games' "hypercasual mechanic + polished casual economy" playbook keeps producing charting games: Block Out #2 and Magic Sort #3 on iOS today.
- The fold fantasy has a proven 100M+ GP audience whose complaints are ads and shallowness. Autocomplete (hl=en, gl=us): "paper fold game online / poki / for fold phone"; YouTube: "paint fold butterfly".

**Opportunities**
- Bring real ordering depth to the fold fantasy.
- Make the payoff a *print* (paint, colour, symmetry) instead of a revealed sticker.
- Make every level solver-verified fair.

**Known uncertainties**
- No current top-chart fold game, so fold demand evidence dates from 2021–2025.
- Whether casual players enjoy mirrored-position reasoning is unknown (H5).
- No gameplay video was watched today. Paper Fold's mechanic is described from its store text and review snippets, not footage.

## C. Core Gameplay Concept
- **What the player controls:** the creases of a paper sheet, 1–5 dashed lines per level. Each crease has a fold tab at both ends.
- **Primary action:** drag a tab across its crease to fold the sheet there. A tap-tap alternative exists (§F).
- **Response:**
  - The smaller side flaps over, presses and unfolds.
  - Every painted cell prints onto its mirror cell across that crease. **Both** cells end up with the union of the two paints (contact print).
  - Colours mix: R+Y=O, Y+B=G, R+B=P. R+Y+B=mud, which never appears in a stencil.
  - Cells beyond the shorter side have no mirror and are untouched. **Wax** cells (L10+) never take or give paint.
- **Immediate objective:** make the sheet exactly equal to the **stencil**, which is drawn on the sheet as faint pencil outlines of the target colours (and shown as a small card above the sheet).
- **Win:** exact match. **Fail:**
  - (a) **Out of presses.** Presses = par + 2; every fold, smudge and undo costs 1.
  - (b) **Stuck.** No remaining fold would change the sheet without smudging.
- **Smudge:** a committed fold that would put paint (or a wrong colour) in any cell where the stencil doesn't allow it. The fold is shown, then wiped back (reverted), and it still costs the press. Paint the stencil allows is never "wrong".
- **Structure:** level-based, 12 levels in the MVP. Each level is ~30–120 s for a thinking player.
- **How players improve:**
  - learning to read mirror pairs ("column 1 ↔ column 4 across V3");
  - learning that order controls *how far* paint travels;
  - learning to save a crease for a second press (the rebound);
  - learning to treat wax cells as walls.
- **Why it's enjoyable:** each decision is visible, deterministic and physical. A plan pays off in a tactile press-and-peel, and mistakes are understandable ("I printed the yellow before it had reached row 5").

## D. First 10 Seconds (L1)
- **On screen:** a cream sheet, 6×8, with one vertical dashed crease down the middle. A tab at its top and bottom pulses gently. Three blobs of paint sit on the left half. On the right half, faint pencil circles show where paint should appear. A small stencil card sits above, plus 3 press stamps.
- **How the player understands:** a ghost finger drags the top tab across the crease once (no text). The left half lifts, showing a ghost of the mirrored print, and then returns.
- **First action:** the player drags the tab across.
- **Immediate feedback:**
  - The flap folds (≈350 ms), presses with a soft *thup* and paint-squish particles (≈120 ms), then peels back open (≈300 ms).
  - The mirrored blobs fill the pencil circles exactly.
  - The circles turn into solid paint with a tick sparkle, and the print slides onto a gallery peg.
- **Curiosity / satisfaction:** the clean mirror print (Rorschach pleasure). L2 then shows two creases, and the order matters immediately.
- **Tutorial text:** at most one short line per level, shown outside the board: L2 "Order matters." L3 "Paint never comes off." L4 "Colours mix." L7 "Press a crease again." L10 "Wax won't take paint."

## E. Signature Gameplay Moment
**The last press.** On the final fold:
- the press is heavier (a longer squish, a deeper *thup*);
- the unfold peels in slow motion (≈500 ms);
- every pencil outline is now filled, so the outlines dissolve, and the mirrored print glows once;
- the sheet lifts, swings, and clips onto the gallery line.

**Secondary moment, the rebound** (L7+): pressing a crease for the second time sends paint *back* across, now carrying a colour it picked up elsewhere. The player watches a colour travel two hops through the sheet ("I bounced the blue back through!"). Both moments come straight from the rules; no scripted effects decide anything.

## F. Controls and Interaction
- **Primary:** drag a crease tab (or anywhere within 24 px of a crease line on the smaller side) across the crease.
  - While dragging, the flap follows the finger (scale-x flip around the crease). A **ghost print preview** shows where paint will land, with a red ✕ on any cell that would smudge.
  - Release past 50% of the flap width commits. Releasing before that cancels (the flap springs back, no press used).
- **Alternative (accessibility / precision):**
  - Tap a tab to select it: the crease highlights and the preview shows.
  - Tap the "Press" button to commit. Tap elsewhere to cancel.
- **Mapping:** one crease = one fold. A centre crease folds left onto right (vertical) or top onto bottom (horizontal). Otherwise the smaller side folds onto the larger. Direction never changes the result (the transfer works both ways).
- **Buttons (≥48 px):**
  - **Undo:** reverts the last fold and costs 1 press.
  - **Fresh sheet:** free restart.
  - **Hint:** 1 per sheet.
  - Menu, mute.
- **Touch targets:** tabs are ≥48×48 px. Cells are ≥52 px at 360 wide (6 cells × 54 px + 2×16 px margins).
- **Failure / cancellation:**
  - Pointer-leave or touchcancel mid-drag cancels and uses no press.
  - Input is locked during the ≈800 ms fold animation.
  - Board input is ignored for ≥300 ms after any overlay closes (Spillproof SP-002 lesson). Extra taps of a multi-tap never act.
- **Accessibility:**
  - Colour-blind mode: R = dots, Y = diagonal stripes, B = waves; mixes overlay both patterns.
  - Every colour also carries a letter on long-press.
  - No timers anywhere.
- **Desktop:** mouse drag the tabs. Keys 1–9 select creases in listed order, Enter presses, Z undo, R fresh sheet (with confirm), H hint, Esc menu.

## G. Visual and Audio Direction
- **Art style:** a printmaker's desk.
  - Warm cream paper (#F7F1E3) with a subtle fibre texture, on a dark walnut desk (#3B2A20).
  - Paint is **gouache blobs**: each painted cell is a soft rounded blob with a slightly darker rim and a wet highlight, not a flat square.
  - Mixed colours show a faint marbled swirl of both parents for 600 ms after mixing.
- **Palette:**

  | Colour | Hex |
  |---|---|
  | Red | #E63946 |
  | Yellow | #FFC93C |
  | Blue | #2F6FDB |
  | Orange | #F38B2A |
  | Green | #3BAA5C |
  | Purple | #8E4FC4 |
  | Mud (smudge only) | #6B5A4A |
  | Pencil outlines | #9C8F7A at 50% |
  | Creases | dashed #C9BBA0, 2 px |
  | Smudge ✕ | #D7263D |

  Contrast: every paint colour against the paper is ≥3:1 except yellow. Give yellow a #C99A1E rim.
- **Wax cells:** glossy ivory with a diagonal sheen and a tiny drop icon. Paint visibly beads and slides off them during a press.
- **Camera:** fixed top-down. The stencil card is pinned at the top left; presses show as a stamp stack at the top right.
- **Shapes:** soft, round, handmade. Slightly irregular blobs, seeded per cell so they are stable.
- **Animation principles:**
  - The fold uses ease-in (0.35 s), then a squash on contact (the paper bulges 3%), then ease-out-back on the unfold (0.3 s).
  - Prints appear *during* the unfold (wiped in by the peel line), not after it.
- **Particles / impact:**
  - On contact, 6–10 tiny paint flecks per newly printed cell.
  - Mixes get a two-colour swirl.
  - A smudge shows a dark mud splat, then a wipe-back "rewind" streak.
- **Audio:**
  - Paper flap whoosh; a soft *thup* on the press; a wet peel on the unfold.
  - A pitched "plink" per newly matched stencil cell, rising through a pentatonic scale within one fold.
  - A smudge plays a dull squelch plus a short tape-rewind.
  - The final press plays a three-note chime and a page-turn.
  - Music: a lo-fi acoustic loop at low volume, mutable.
- **Visual reference descriptions:** Rorschach butterfly prints; Japanese *suminagashi* marbling; screen-print studio drying lines. Do not use any protected artwork. All prints are abstract and generated from the level data.

## H. Game Feel
| Event | Feedback | Timing |
|---|---|---|
| Drag a tab | The flap tracks the finger 1:1; ghost print preview; red ✕ on would-smudge cells; light haptic tick when crossing 50% | Immediate (<16 ms per frame) |
| Commit a fold | Fold → squash → peel; new prints wipe in with flecks and plinks | 0.35 + 0.12 + 0.30 s |
| Correct cells | A pencil outline that becomes exactly matched fills solid with a small tick shimmer | During the peel |
| Combo / chain | One fold matching ≥4 new cells: the plinks climb the scale and a brief "Clean print ×N" label appears beside the sheet (no score multiplier) | — |
| Mix | A two-colour swirl settles into the mixed colour | 0.6 s |
| Smudge | The press shows the mud splat → a 250 ms freeze → wipe-back rewind; a press stamp cracks off; short screen nudge (2 px) | ≈0.9 s |
| Stuck | The sheet dims; "No clean fold left" with Undo (if a press remains) and Fresh sheet | — |
| Out of presses | The stamp stack empties; "Out of presses", with Fresh sheet | — |
| Level complete | Signature moment (§E), then stars stamp in one by one | ≈1.6 s |
| Restart | A new sheet slides in from the stack (0.3 s); presses reset | — |

Weight comes from the press squash. Responsiveness comes from the drag preview. Do not slow the fold beyond 0.8 s total (except the final press).

## I. Gameplay Progression
Notation: grid 6 columns × 8 rows, origin top-left.
- `V k` = vertical crease between columns k−1 and k. It mirrors column k−1−i with column k+i, for i < min(k, 6−k).
- `H k` = horizontal crease between rows k−1 and k, mirrored in the same way.
- `.` empty, `R` `Y` `B` primaries, `O` `G` `P` mixes, `#` wax.
- **Presses** = par + 2.
- **Stars** (presses left at the win): 3★ = 2 left and no hint used; 2★ = 1 left (or 2 left with a hint); 1★ = 0 left.

### I.1 Sample stages (what changes)
1. **Stage A (L1–L3): print and order.**
   - L1: one centre crease (the mirror print).
   - L2: two creases where paint must hop twice, so folding the far crease first strands it.
   - L3: the *greedy trap*. The fold that prints the most is the one that makes the level impossible (sim: greedy max-paint clears 0%).
   - *Learns:* mirror pairs, order, permanence.
2. **Stage B (L4–L6): mixing under order.**
   - Three creases, and stencils need green/orange/purple.
   - A primary must reach a cell *before* or *after* another depending on the crease order, so the mix lands only where the stencil wants it.
   - *Learns:* mixing is a constraint; a mixed cell spreads its mix.
3. **Stage C (L7–L9) and Stage D (L10–L12): the rebound, then wax walls.**
   - Every level from L7 *requires* pressing some crease twice (the solver confirms no once-each order exists).
   - L10–L12 add 2 wax cells each. Both are load-bearing: removing either changes par or solvability.
   - Wax blocks one mirror pair, so paint must route around it.
   - *Learns:* save a crease; a crease is a reusable channel; wax is a wall that breaks symmetry.

### I.2 Embedded level data (v1, sandbox-verified). Builder: use exactly these.
```json
[{"id":"L1","par":1,"presses":3,"creases":["V3"],"start":["......",".R....","......","..R...","......","B.....","......","......"],"target":["......",".R..R.","......","..RR..","......","B....B","......","......"]},
{"id":"L2","par":2,"presses":4,"creases":["H3","H4"],"start":[".....R",".....B","......","......","..Y...","......","......","......"],"target":[".....R","..Y..B","..Y...","..Y...","..Y..B",".....R",".....B",".....R"]},
{"id":"L3","par":2,"presses":4,"creases":["V3","V4"],"start":["....RR","......","......","......","......",".R....","......","......"],"target":["RRRRRR","......","......","......","......",".R..R.","......","......"]},
{"id":"L4","par":3,"presses":5,"creases":["H1","H2","H4"],"start":["YR....","B.....","......",".....R","......","......","......","......"],"target":["GR...R","GR....","GR....","GR...R",".....R","......","B.....","YR...."]},
{"id":"L5","par":3,"presses":5,"creases":["V2","V4","V5"],"start":["R.....","......","......","......","......","......","....BR","...R.."],"target":["R..R..","......","......","......","......","......","PPPPPP","R..RR."]},
{"id":"L6","par":3,"presses":5,"creases":["H3","H4","H7"],"start":["......","......","..Y...","......","..B...","....R.","......","...R.."],"target":["...RR.","..B...","..Y.R.","..G...","..G...","..Y.R.","..BRR.","..BRR."]},
{"id":"L7","par":5,"presses":7,"creases":["V1","V2","V4","V5"],"start":["B.....","...R.B","B.....","......","......","......","....R.","......"],"target":["BB.BB.","PPBPPB","BB.BB.","......","......","......","RRRRRR","......"]},
{"id":"L8","par":5,"presses":7,"creases":["H1","H2","H4","H5"],"start":["....R.",".R....","......","......","..R...","......","..B...","......"],"target":[".RP.R.",".RP.R.",".RP...","..P.R.","..P.R.",".RR...",".RB...","..B.R."]},
{"id":"L9","par":6,"presses":8,"creases":["H1","H5","H6","H7"],"start":["...Y..","......",".....B","......","..R...","......","..Y...","....Y."],"target":["...Y..","...Y..","..O.YB","..Y.Y.","..O.YB","..O.YB","..O.YB","..O.YB"]},
{"id":"L10","par":6,"presses":8,"creases":["V4","H2","H5","H6","H7"],"start":[".....#","R..RY.","...#..","..Y...","......",".....B","......",".....B"],"target":["..Y..#","R.BOOB","R.B#YB","..G..G","..B..B","..G..G","..G..G","..G..G"]},
{"id":"L11","par":6,"presses":8,"creases":["V5","H1","H2","H4","H5"],"start":["..B...","....B.",".....#","......","......","..#...","..Y..Y","..B..B"],"target":["..B.BB","..G.GG","..G.B#","..G.GG","..B.BB","..#.BB","..G.GG","..G.BB"]},
{"id":"L12","par":6,"presses":8,"creases":["V2","H1","H2","H4","H6"],"start":["..#...","....R.","......","..R.#Y","......",".Y....","..B.B.","......"],"target":[".Y#.PY",".GG.P.",".GG.P.",".OO.#Y",".RR..Y",".GG.P.",".GG.P.",".RR..Y"]}]
```
Suggested names, for flavour only:
- L1 First Blot, L2 Two Hops, L3 Don't Rush, L4 Green Thumb, L5 Purple Band, L6 Ladder;
- L7 Bounce Back, L8 Echo, L9 Long Echo;
- L10 Wax Seal, L11 Resist, L12 Grand Print.

### I.3 Reference solutions (one optimal sequence each; for CI only, never shown to players)
| Level | One optimal sequence | # optimal sequences |
|---|---|---|
| L1 | V3 | 1 |
| L2 | H4 → H3 | 1 |
| L3 | V4 → V3 | 1 |
| L4 | H4 → H1 → H2 | 1 |
| L5 | V5 → V4 → V2 | 1 |
| L6 | H3 → H4 → H7 | 1 |
| L7 | V2 → V5 → V4 → V2 → V1 | 4 |
| L8 | H5 → H2 → H4 → H2 → H1 | 1 |
| L9 | H1 → H7 → H6 → H5 → H7 → H6 | 6 |
| L10 | H6 → H5 → H2 → V4 → H6 → H7 | 12 |
| L11 | H1 → H2 → H4 → H2 → V5 → H5 | 7 |
| L12 | H6 → H4 → H1 → H2 → V2 → H6 | 4 |

### I.4 Reference rule implementation (must match exactly)
```js
// cells: int bitmask R=1,Y=2,B=4; WAX=-1. crease {o:'V'|'H', k}
function pairs(W,H,c){ const P=[]; if(c.o==='V'){const n=Math.min(c.k,W-c.k); for(let y=0;y<H;y++) for(let i=0;i<n;i++) P.push([y*W+(c.k-1-i), y*W+(c.k+i)]);}
  else {const n=Math.min(c.k,H-c.k); for(let x=0;x<W;x++) for(let i=0;i<n;i++) P.push([(c.k-1-i)*W+x,(c.k+i)*W+x]);} return P; }
function fold(st,P){ const s=st.slice(); for(const [a,b] of P){ if(st[a]===-1||st[b]===-1) continue; const u=st[a]|st[b]; s[a]=u; s[b]=u; } return s; } // reads the pre-fold state only
const smudges=(s,T)=>s.some((v,i)=>v!==-1 && (v & ~T[i])); // any bit not allowed by the stencil
// A fold that changes nothing still costs a press (allowed, but pointless). Stuck = every fold either changes nothing or smudges.
```

## J. Replayability
- **Mastery:** 3★ needs par, so efficient planning is rewarded. Par is shown after the first clear.
- **Different approaches:** L7–L12 have 4–12 optimal sequences, so players compare routes.
- **Discovery:** the "rebound" and "wax wall" insights; future elements (§K).
- **New content:** an offline generator plus the filter (the sandbox exists) gives cheap, verified level supply, and a daily print.
- **Collection:** the gallery of the player's own prints (future). Artificial rewards are not the core.

## K. MVP Scope
**Essential** (validates the core hypothesis):
- 12 embedded levels with the exact rules (§I.4);
- drag-to-fold with live preview and ✕ marks;
- tap-tap alternative;
- presses = par + 2;
- smudge revert, undo (costs a press), fresh sheet, stuck and out-of-presses detection;
- stars;
- 1 hint per sheet (pulses the tab of the next fold on an optimal path from the current state; if the sheet can no longer be finished, it says so instead);
- stencil outlines on the sheet plus a card;
- fold/press/peel animation with prints wiped in;
- core SFX;
- level select with locks, save progress (localStorage);
- colour-blind patterns;
- portrait lock with a rotate prompt in landscape;
- file:// offline play.

**Optional:**
- marbled mix swirl;
- music loop;
- "Clean print ×N" label;
- par reveal after clear;
- haptics (navigator.vibrate) where supported.

**Future (not in MVP):**
- gallery meta and themed paper;
- daily print;
- new elements, each needing the necessity filter: *stamp cells* (fixed paint sources that refill), *masking tape* (covers cells until peeled after N presses), *diagonal creases*, *dry-after-two-presses paint*;
- the generator in the client;
- boosters (e.g. "blotter" = remove the paint from one cell) only if tested not to break the filter.

## L. Technical Considerations
- **Stack:** plain Canvas 2D (or DOM grid plus CSS transforms) is enough. No physics. The rules are integer bitmask operations (§I.4). Phaser is optional, not needed.
- **Fold animation:** draw the flap as the mirrored half scaled on x (or y) from 1 → 0 → −1 around the crease, with a darkening gradient for depth. Prints are applied to the state at the press moment and revealed by a peel mask during the unfold.
- **State:** `{levelId, cells[48], pressesLeft, hintUsed, history[]}`. Undo pops `history` (a full snapshot per fold; tiny). The stuck check after each fold tries each crease with `fold` + `smudges` + changed.
- **Hint:** BFS/DFS over states from the current sheet, at most a few thousand states. Precompute or compute on demand (<20 ms measured in the sandbox for these levels).
- **Performance:** at most 48 cells. Repaint only on change; idle should not animate (Spillproof SP-007/014 lessons). Cap the canvas backing store at DPR 1.5. Snap strokes to device pixels.
- **Testing requirements (CI):**
  - (1) `fold` unit tests for every crease on the 12 levels against the reference solutions (I.3);
  - (2) the policy simulations of §M D1–D10 on the shipped level data, run per level (not pooled), with ≥300 seeds per random policy;
  - (3) touch-input tests (CDP touch, not only mouse);
  - (4) overlay double/triple-tap lockout;
  - (5) frame rate measured during a real tapped solve at 4× CPU slowdown, 390 wide, DPR 2.
- **Unity portability:** trivial. The rules are pure functions; the fold is a mesh hinge or shader. Nothing is hard to replicate.
- **Sandbox (for Builder/Tester reference, on the Game Finder box):** `/workspace/game-ideas/sim/foldprint/`, containing `lib.mjs` (rules), `ladder.mjs` (policies, analysis), `gen.mjs` (generator plus filter), `final.mjs` → `final_out.md` (the table below), `hint.mjs` → `hint_out.txt`, `foldprint_levels_v1.json`.

## M. Acceptance Criteria
### M.1 Objective (testable)
1. **Rule fidelity:** a scripted replay of each I.3 sequence reaches the exact target. Every listed par equals the BFS minimum.
2. **Win/lose:** exact match wins. 0 presses left without a match → "Out of presses". No clean changing fold left → "Stuck" (reachable in the browser on L3: folding V3 first leaves only V4, which smudges, so the sheet is stuck).
3. **Smudge:** a committed smudging fold reverts the sheet to its pre-fold state and decrements presses by 1.
4. **Preview:** the ghost preview equals the committed result for every crease on every level, and the ✕ marks equal the smudging cells.
5. **Degenerate strategies that must fail** (SIMULATION on the shipped data, per level; ≥300 seeds; sandbox values in brackets):

| ID | Policy | Requirement | Sandbox result (1000 runs) |
|---|---|---|---|
| D1 | RAND: any changing fold, smudges included | clear ≤ 6% on each of L7–L12 | 0.3–5.8% |
| D2 | SAFE1: random clean fold (perfect 1-step preview) | clear ≤ 10% on L7–L12; ≤ 20% on L4–L6 | 0.6–8.3%; 15.6–17.0% |
| D3 | SAFE2: clean fold that leaves another clean fold (2-step lookahead) | clear ≤ 20% on L7–L12 | 1.1–16.8% |
| D4 | Greedy: the clean fold printing the most cells | 0% on L3–L12 | 0% |
| D5 | Min-print first | clear ≤ 30% and 3★ ≤ 5% on L4–L12 | 0% except L10 26% clear / 0% 3★ |
| D6 | Outer-first / inner-first (smallest / largest flap) | 0% on L6–L12; ≤ 55% on L4–L5 | 0% (L5 outer 51%) |
| D7 | Vertical-first / horizontal-first | clear ≤ 15% on L7–L12 | 0–14.9% |
| D8 | "Each crease once before any repeat" | clear ≤ 16% on L7–L12, and no once-each order solves any of L7–L12 | 0–15.3%; reuse required on L7–L12 ✔ |
| D9 | Hint fishing: SAFE1/SAFE2 plus the one hint at the best moment | SAFE2+hint ≤ 55% on L7–L12; a hint-assisted clear can never be 3★ | ≤ 51% (L8) |
| D10 | Preview fishing | Accepted by design: the preview equals SAFE1 knowledge, which D2 shows fails | — |

6. **Positive controls:**
   - P1: a full planner (OPT) clears every level at par (100%).
   - P2: every crease on every level is necessary (removing it makes the target unreachable) ✔.
   - P3: every wax cell on L10–L12 is necessary (removing it changes par or solvability) ✔.
   - P4: **L12 is the hardest level**: the lowest SAFE1 and SAFE2 clear rates of the ladder (0.6% / 1.1%).
7. **Mobile:** cells ≥ 52 px and tabs ≥ 48 px at 360×800; 0 off-screen elements on 17 common sizes; landscape shows only a rotate prompt; overlays ignore board input for ≥300 ms; drag-out and touchcancel use no press.
8. **Performance:** ≥ 50 fps during a tapped solve at 4× CPU slowdown (390 wide, DPR 2); idle frames are pixel-identical.
9. **Offline:** 0 network requests from file://.

### M.2 Subjective hypotheses (human playtest; not measurable by CI)
- **H1** Deduction beats luck (supported by simulation D1–D9).
- **H2** Players understand the contact-print rule by the end of L1–L3 without reading text (≥ 4/5 testers explain "it prints on the other side and mixes").
- **H3** The press-and-peel feels satisfying: testers voluntarily name the fold/print moment as a favourite (≥ 3/5).
- **H4** The rebound (L7–L9) produces "aha", not frustration: median attempts ≤ 4 per level and ≤ 1 rage-quit in 5 testers.
- **H5** Mirror reasoning on 6×8 is readable with outlines plus preview: testers rarely misjudge which cell a print lands on (< 1 surprise smudge per level after L4).

## N. Design Risks and Experiments
| Risk | Why | Experiment |
|---|---|---|
| Mirror reasoning too taxing (readability) | Off-centre creases map column 1→4 etc. | Playtest L4–L9 with and without "pair highlight" (dragging also tints mirrored cell pairs). Keep it if surprise smudges halve. |
| Difficulty spike at L7+ | Sim says lazy play fails (≤17%); humans may stall | Track attempts. If median > 4, swap in the easier pool levels from the sandbox (`p_t2.jsonl`), or give the first hint free on L7. |
| Repetitive single verb | Only one action type | Each stage adds a decision type (order → mixing → reuse → wax). Future elements must pass the necessity filter. Measure session length L1–L12. |
| Dead ends feel unfair (no smudge, yet unwinnable) | The planning failure surfaces later | Stuck detection plus "Undo" plus the hint stating "this sheet can't be finished". A/B a soft "you've stranded the yellow" one-line diagnostic (rules out the fact without solving). |
| Lack of skill expression | Puzzles are deterministic | Par stars; 4–12 optimal routes on later levels; future daily print leaderboard by presses. |
| Hint or preview too strong (failure pattern #6) | The hint shows a whole next move | Cap at 1 per sheet; 3★ forbids it; D9 shows ≤ 51% lazy-plus-hint on L7–L12. If playtests show hint dependence, change the hint to "show one trap crease" instead. |
| Insufficient differentiation | The fold genre exists (Paper Fold, Origame) | The differences (§O) are rule-level (contact print, mixing, permanence, reuse, wax). Flag for Burak's review: the fold *theme* is shared, the rules are not. |
| Abstract prints look noisy | Generated targets are stripes/blobs | Render paint as gouache blobs with mix swirls. Future generator objective: prefer symmetric, low-density motifs (density ≤ 45% is already filtered). |
| Technical: animation cost | The fold plus peel mask | Repaint only on change, DPR cap 1.5, measured in CI on a tapped solve. |

## O. Concept Score
| Criterion | Max | Score | Reason |
|---|---|---|---|
| Core gameplay and fun potential | 25 | **18** | Real ordering depth (sim: greedy 0%, 2-step lookahead ≤ 17% on L7+), a physical print payoff, and the rebound aha. Mirror-reasoning load and difficulty are unproven with humans. |
| Originality and differentiation | 20 | **15** | Fold puzzles exist, but no searched game uses contact printing with mixing, permanence and reusable creases. This is not a known public logic genre (unlike Spillproof's Aquarium). |
| Market evidence and opportunity | 20 | **13** | The fold fantasy is proven (Paper Fold GP 100M+, iOS 345K ratings), but older. Ordering puzzles are the fastest-growing subgenre (GameRefinery; Sensor Tower via Netmarvel, estimates). Meowdoku proves strict fair puzzles. There is no current charting fold title. |
| Web MVP feasibility | 15 | **14** | Integer rules, 48 cells, levels and solver done, a simple 2D fold animation. |
| Mobile control suitability | 10 | **9** | One drag per move with preview and cancel; a tap-tap alternative; large targets. |
| Production and commercial potential | 10 | **7** | Cheap verified level supply (generator plus filter), gallery/daily print meta, light ads/hints. Booster design must not break the filter. |
| **Total** | 100 | **76** | **Promising (70–84). Evidence confidence: medium-low** (simulation-backed depth; no human data; market evidence is analogical). |

**Recommendation:** build the web prototype for Game Tester validation, with the D1–D10 checks encoded in CI. Burak should review the fold-genre adjacency flag (low risk: the theme is shared, the rules are original). This brief does not authorize any production, Unity or native work.

**Differences from inspirations (IP/originality):**
- Paper Fold / Origame fold *shapes* or reveal *pre-drawn images*. Foldprint folds to *transfer paint* under permanent, mixing, union rules, with reusable creases and move-limited planning.
- No assets, names, level layouts or UI from any reference are used. All levels were generated by our own sandbox.
