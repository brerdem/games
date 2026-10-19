# Top Turner — build notes

MVP of the 2026-10-19 Top Turner brief. Static canvas game in this folder. No build step.

## What was built

- Three fights. You carve a wooden blank, launch it into a bowl, and try to be the last top spinning.
- The blank is 32 slices. Dragging the chisel shaves a slice toward the pointer and lightly trims its neighbors. Radii only shrink, and they stop at 0.08. Arrow keys move the chisel and Space shaves.
- Live bars: stamina, steady (stability), weight, reach, and speed, plus an archetype name. A narrower tip lowers speed and raises stamina. A wide flat body stays heavy.
- Launch is a slingshot. Releasing while the timing ring meets the top adds 15% spin. Keyboard aim is left and right; Space charges the pull and releasing it launches.
- The bowl pulls tops inward. A wide tip orbits. Spin decays, a slow top wobbles, and it falls at spin 0.12. Hitting the rim too fast knocks a top out; otherwise it bounces. Hits also steal a little spin.
- Hold in a direction, or use the arrow keys, to dash. Dashing spends a meter and some spin.
- Fight 1 is Pine Pawn, fight 2 is Flat Jack, fight 3 is Needle. A plain cylinder can win the first fight. Score is spin left, a perfect launch, and the win.
- Start screen, How to play, lose screen with Restart This Level and Restart, win screen with Next or Play again and Replay.

## Cut or simplified

- The 8-opponent ladder, free-for-alls, wood types, launcher upgrades, metal rim, save slots, coins, and the gauntlet.
- AI tops launch on their own and steer in while their dash meter is high. They do not use the timing ring.
- No undo stack. Restart This Level recuts the current fight.

## Controls

- Carve: drag on the blank. Up and down pick a slice, left and right set the cut, Space shaves. Battle or Enter starts the launch.
- Launch: pull back and release. Left and right aim. Space charges, and letting go launches.
- Battle: hold toward a direction to dash. Arrow keys dash too.

## Deviations

- Fredoka from Google Fonts, with Trebuchet MS / Segoe UI as fallback.
- The lathe and the bowl fill the shared wide stage (up to about 1080px). The arena is a fixed 230-unit bowl drawn to fit, not a 300 px portrait column.
- The stamina bar is scaled to the spin times this model actually produces, about 1 to 6 seconds.

## Ideas for the full version

- The rest of the ladder, including multi-top fights and the ebony boss.
- Pine, oak, and ebony, the launcher upgrade, and the metal rim.
- Three saved designs, coins, and the gauntlet.
