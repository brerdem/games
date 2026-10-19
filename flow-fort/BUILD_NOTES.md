# Flow Fort — build notes

MVP of the 2026-10-19 Flow Fort brief. Static canvas game in this folder. No build step.

## What was built

- Three levels. A color formation sits in the fort grid and steps toward the wall. Gunners ride a clockwise rail around it.
- A gunner fires only when the first occupied cell in the lane it is crossing matches its color. One shot per lane per lap. Ammo drops by 1. At 0 it pops and frees a rail spot.
- Leftover ammo at the end of a lap parks in one of five bench slots. A full bench jams and costs a heart. The rail holds at most four gunners.
- The horde steps down on a timer. A row that reaches the wall is removed and costs a heart. You also lose if the deck, bench, and rail are empty while blocks remain.
- Level 1 is two colors and slow. Level 2 hides a blue block inside a red and yellow shell. Level 3 is a green shell with red inside and one yellow center. Ammo for each color matches the number of blocks. A greedy player that always sends the gunner with the most open lanes clears every level.
- Score is 10 per block, plus 100 for each heart left and 50 for each empty bench slot on a clear.
- Start screen, How to play, lose screen with Restart This Level and Restart, win screen with Next or Play again and Replay.

## Cut or simplified

- The 15-level ladder, armored cells, bombs, 2×2 bosses, endless mode, coin shop, stars, calm mode, and localStorage.
- No level map, mute button, hint key, or 2× fast-forward.
- Hold-to-preview draws the open lanes for the gunner you are holding. It is not on by default.
- The placeholder "continue +1 heart" button is not included.

## Controls

- Tap the front gunner of a column, or a gunner waiting on the bench.
- Arrow keys move the selection. Enter or Space sends it. 1–3 send columns. Q W E R T send bench slots.
- Hold a gunner to see which lanes it can shoot right now.

## Deviations

- Fredoka from Google Fonts, with Trebuchet MS / Segoe UI as fallback.
- The board fills the shared wide stage (up to about 1080px) instead of a fixed 720×1280 letterbox. The grid is 8×8 or 9×9, sized to the picture, not 12×14.
- Level 1's march starts on the first launch, so the opening board does not walk into the wall while you are still reading it.

## Ideas for the full version

- The rest of the 15 pictures, including armored cells, bombs, and bosses.
- The deck generator, endless waves, and the four-upgrade shop.
- Saved stars, coins, and calm mode.
