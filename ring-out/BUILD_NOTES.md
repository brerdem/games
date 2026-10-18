# Ring Out — build notes

MVP of the 2026-10-18 Ring Out brief. Static canvas game in this folder. No build step.

## What was built

- Three handcrafted levels, each checked by a breadth-first solver in `logic.js` (`solve`). The stored `par` is that shortest rotation count, and `moves` is par plus a few spare steps.
- Twelve sectors per ring. Dragging a ring snaps to a sector and spends one move per step. Launching a pin is free.
- A pin escapes only when every outer ring has a gap on that sector and no pin is mounted there. Otherwise it bounces and costs a heart.
- Level 1: two rings, one clockwise step opens both pins.
- Level 2: an outer pin shares an angle with an inner pin. The outer pin can leave immediately, but the wall stays, so the inner pin still needs the single gap rotated onto it. Another inner pin is already lined up.
- Level 3: three rings and coral, teal, and gold gates on the outer ring. A gate only passes the matching color. Plain gaps are not used on that ring.
- Score: 100 per pin, combo bonus for launches in a row with no rotation between them, then 50 per move left and 200 per heart left on a clear.
- Start screen, How to play (Close, outside click, Esc), lose screen (Restart This Level and Restart), win screen (Next or Play again, plus Replay).
- Mouse/touch drag and tap, plus arrow keys / WASD, Tab, Space, and Enter.
- Chunky Fredoka HUD: level, score, moves, hearts. Lane preview is green when the launch would escape and red when it would bounce.

## Cut or simplified

- Twelve-level ladder, endless mode, level select, stars, localStorage, undo, hint, pause menu, mute toggle, and the rewarded-continue placeholder.
- No tutorial hand overlay. Level 1 shows a one-line caption instead.
- Keyboard undo (`Z`) and hint (`H`) are not implemented.
- WebAudio is a few synthesized blips, not a full sound set.

## Controls

- Drag a ring to rotate it. A short tap on a pin launches it.
- Up/Down or W/S select the ring. Left/Right or A/D rotate one step. Tab cycles pins. Space or Enter launches.

## Deviations

- Google Fonts (Fredoka) replaces the brief's system-font-only rule, with Trebuchet MS / Segoe UI as fallback.
- The stage uses the wide desktop frame shared with the other games (up to about 1080px), not a portrait 720×1280 letterbox.
- Pins are only placed on wall sectors. Removing a pin does not open a gap. Order puzzles come from lining a real gap up before you launch, and from not firing into a wall or another pin.

## Ideas for the full version

- The 12-level ladder and the reverse-construction endless generator from the brief.
- Undo that restores rotations, launches, moves, and hearts.
- A hint that points at the next solver action.
- Stars, saved progress, and a level select.
- Geared rings, locks, and bomb pins from the later-features list.
