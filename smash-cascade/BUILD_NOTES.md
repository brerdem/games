# Smash Cascade — build notes

MVP of the 2026-10-18 Smash Cascade brief. Static canvas game in this folder. No build step.

## What was built

- Three stages. Level 1 is a glass stem under one crown. Level 2 adds wood and stone. Level 3 adds a red charge and a second crown.
- A cannon on the left. Pull back and release to fire, or aim with the arrow keys and fire with Space or Enter. A dotted line shows the first third of a second of flight, with no collisions.
- Blocks sit on a shelf. Glass has 1 HP, wood 2, stone 3, the charge 1, crowns 1. A hit damages them. If a block is no longer connected through its neighbors to the shelf, it falls.
- The charge damages blocks within two cells. Falling pieces and the cannonball bounce through pegs into seven buckets: ×1, ×2, +BALL, ×5, +BALL, ×2, ×1.
- A +BALL bucket returns a ball. Block refunds stop after two per level. The cannonball can always come back. Multiplier buckets pay the piece's coin value, or a flat 5 for the cannonball.
- Win when every crown has left the shelf and the shot has settled. Lose when no balls are left and a crown is still standing. Clearing pays 20 coins for each ball still held.
- Start screen, How to play, lose screen with Restart This Level and Restart, win screen with Next or Play again plus Replay. Score carries across the three stages. Replaying a level restores the score from when that stage began.

## Cut or simplified

- The 12-level ladder, endless mode, shop, upgrades, level select, stars, and localStorage.
- Dynamic pieces use circles. Loose blocks are drawn as rotating squares. They bounce off each other, but this is not a full rigid-body stack.
- No rewarded extra-ball button.

## Controls

- Drag backward from the cannon and release.
- Left/Right or A/D change the angle. Up/Down or W/S change power. Hold Shift for a bigger step. Space or Enter fires.

## Deviations

- Fredoka from Google Fonts, with Trebuchet MS / Segoe UI as fallback.
- The board fills the shared wide stage (up to about 1080px) instead of a fixed 540×960 letterbox. Gravity and launch speed scale with the stage height.
- Coins are the score. The HUD shows that total, the level, and the balls left.

## Shots that clear a stage

Checked in a fixed 540×960 world. Results move a little because pegs add a small sideways kick.

- Level 1: about -0.55 radians and power 0.62, one shot.
- Levels 2 and 3: about -0.6 radians and power 0.4, repeated.

## Ideas for the full version

- The rest of the 12 handcrafted towers and the endless generator.
- The four upgrades and the coin shop between levels.
- Heavier stacking, moving shelves, and special cannonballs.

## Layout

On a desktop window the play area is a centred portrait frame about 390×844 (9:19.5), letterboxed on the page background, and the game world is not stretched sideways. A phone fills the screen at its own shape, including 360×800 and 430×932. The canvas backing store uses the same scale on both axes.
