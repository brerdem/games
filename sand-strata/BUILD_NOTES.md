# Sand Strata — build notes

MVP of the 2026-10-19 Sand Strata brief. Static canvas game in this folder. No build step.

## What was built

- Three bottles. Each target is the settled result of a pour script, so a careful replay can match it. Grains fall straight down, then diagonally, and they never pass through the glass.
- Level 1 is two flat bands. Level 2 is three bands. Level 3 piles a sun-colored dune, then caps it with a plum sky.
- The hopper slides over the mouth. Hold to pour the selected color until that color's budget runs out. Budgets are about 10% more sand than the target used.
- A thumbnail shows the finished bottle. Ticks on the left mark where the center color changes. G ghosts the target over your sand and drops the no-ghost bonus.
- Seal once the sand has stopped. 75% match clears the level. Score is the match, leftover sand, and 200 if the ghost was never used. Emptying every budget seals on its own.
- Start screen, How to play, a lose screen with Restart This Level and Restart, and a win screen with Next or Play again and Replay.

## Cut or simplified

- The 15-level ladder, pegs, shelves and pins, wet sand, extra bottle shapes, endless mode, undo, stars saved to disk, and the shop.
- The grid is 72×100 cells, not 100×160.
- The nozzle is 4 cells wide so a pour is readable on the wide stage.
- Settle detection is for the whole bottle (no grains moving), not a 30-frame timer on each grain.

## Controls

- Move the pointer to slide the hopper. Hold to pour. Click a color.
- Arrow keys or A/D move the hopper. Hold Space to pour. 1–4 pick colors. G toggles the ghost. Enter seals.

## Deviations

- Fredoka from Google Fonts, with Trebuchet MS / Segoe UI as fallback.
- The bottle fills the shared wide stage (up to about 1080px) instead of a fixed 720×1280 letterbox.

## Ideas for the full version

- Pegs, pull-pins, wet sand, and the other bottle shapes from the brief.
- Undo for the last pour, a shelf of 15 bottles, and the endless generator.
- Saved best scores and the wider-nozzle upgrade.
