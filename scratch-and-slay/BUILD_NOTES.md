# Scratch & Slay — build notes

MVP of the 2026-10-18 Scratch & Slay brief. Static canvas game in this folder. No build step.

## What was built

- Three fights: a rat, a skeleton, and a small lich. Each foe shows its next move and then does exactly that.
- Tickets are 3×3 scratch cards. Drag the silver coat, tap a cell, or move with the arrow keys and press Space. A cell opens once about half of a 12×12 sample of its coat is gone, then the rest of that cell clears.
- The header prints the real skull count, including a curse that swapped in an extra skull. The third open skull breaks the card: nothing resolves, and the next attack is harder.
- Cash In plays every open symbol. Swords deal damage, shields block the next hit and then fade, hearts heal, coins add gold. One line of three matching symbols is doubled. A star doubles the biggest open number after that.
- Enemy block soaks swords. A defend move gives the foe block. A curse marks the next ticket.
- After the rat and the skeleton, pick one reward: a heal, a ticket, or a charm. Steady Hand keeps the first scratch of a card off a skull. Bone Collector makes an open skull deal 1 when you cash in.
- Score is floors cleared × 100, plus damage dealt, plus gold left, plus 500 for the lich. The run end shows the seed. `?seed=` replays that run.

## Cut or simplified

- The 8-floor map, shops, elite, Safe ticket, Big 4×4 ticket, and four of the six charms.
- The lich has 34 HP and a shorter move list than the brief's 70 HP boss, so three fights stay beatable.
- Foe moves follow a fixed cycle. The brief's small random choice inside a cycle was left out.
- No scratch-noise volume tied to pointer speed beyond a short filtered noise burst while dragging.

## Controls

- Drag to scratch. Tap a cell to open it.
- Arrow keys or WASD move the cursor. Space opens that cell. Enter or Cash In resolves the card.
- On the reward screen, press 1, 2, or 3, or click a button.

## Deviations

- Fredoka from Google Fonts, with Trebuchet MS / Segoe UI as fallback.
- The stage uses the wide desktop frame. The scratch brush is at least 22 pixels and grows with the cell so a drag still opens a cell on a large board.
- Perfect-information runs (never opening a skull) win on seeds 1, 2, and 3. A blind run can still bust.

## Ideas for the full version

- Eight floors, the shop, the elite, and the remaining tickets and charms.
- Seeded daily run and the rest of the meta from the brief.
- Branching paths and more foes.
