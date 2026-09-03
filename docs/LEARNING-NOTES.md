# Spacecraft Defender: Architecture Walkthrough

Use this document to understand the rebuild, make your own changes, and explain the project confidently.

## 1. Game loop

The browser calls `requestAnimationFrame` before each screen refresh. `Game.loop()` calculates the time since the previous frame, updates the game when it is running, and then renders the current state.

Movement is multiplied by `deltaTime`. That makes the game run at approximately the same speed on screens with different refresh rates.

## 2. Game states

The `Game` instance moves between four states:

- `ready`: the opening screen is visible
- `playing`: entities update and the player can interact
- `paused`: gameplay is frozen and the pause screen is visible
- `game-over`: the final score and restart action are displayed

This is a small state machine. It prevents unrelated logic from running at the wrong time.

## 3. Reusable entities

The original prototype used separate variables for each UFO and repeated the same collision code many times. The rebuild uses classes:

- `Player` handles movement, cooldowns, temporary effects, and drawing the spacecraft.
- `Enemy` stores one UFO's position, row, column, hit points, and drawing behavior.
- `Projectile` represents either a player or enemy shot.
- `PowerUp` represents a falling shield or rapid-fire upgrade.
- `Starfield` and `ParticleSystem` manage reusable visual effects.

Each enemy is stored in the `enemies` array. Loops can update, draw, and check collisions for any number of enemies.

## 4. Enemy formations

`Game.createWave()` calculates the number of rows and columns from the current wave. Enemies are generated in a centered grid and given row and column numbers.

The fleet moves as a group. When its left or right edge reaches the play-area boundary, it reverses direction, moves downward, and becomes slightly faster.

For enemy firing, a map selects the lowest surviving UFO in every column. One of those UFOs is chosen at random, which prevents enemies from unrealistically firing through each other.

## 5. Collision detection

The reusable `rectsOverlap()` function performs axis-aligned bounding-box collision detection. It compares the horizontal and vertical bounds of two rectangular entities.

Player projectiles use it against enemies. Enemy projectiles use it against the player. Power-ups also use it to detect collection.

## 6. Power-ups and player damage

Destroyed enemies occasionally drop one of two power-ups:

- `shield` absorbs one hit and lasts for a limited time
- `rapid` temporarily reduces the player's firing cooldown

After taking damage, the player receives a short invulnerability window. This prevents several overlapping projectiles from removing every life in one frame.

## 7. Canvas and DOM responsibilities

The Canvas draws the animated game world: stars, grid, spacecraft, UFOs, projectiles, particles, and lighting effects.

Regular HTML handles the score, wave, hull display, overlays, buttons, and instructions. This keeps important controls and status text accessible to assistive technologies.

## 8. Sound

The `AudioSystem` uses the browser's Web Audio API to generate short effects with oscillators. No audio files are downloaded. Audio starts only after user interaction because browsers normally block autoplay sound.

## 9. Input

`InputManager` combines physical keyboard keys and virtual keys from the mobile controls. The rest of the game can therefore use one input interface for keyboard and touch.

Pointer dragging across the Canvas also moves the spacecraft, which makes the game more comfortable on phones and tablets.

## 10. Useful changes to try yourself

Make several of these changes before presenting the project:

1. Add a new power-up with a different color and effect.
2. Change the enemy formation for every third wave.
3. Add a boss enemy with multiple hit points.
4. Replace one visual asset with artwork you created.
5. Add a difficulty-selection screen.
6. Write a test for the new behavior.

## Interview questions to prepare for

- Why does movement use delta time?
- Why are enemies stored in an array instead of separate variables?
- How does the collision function work?
- Why can only the lowest enemy in a column shoot?
- What is the difference between Canvas rendering and the DOM-based HUD?
- How does the game prevent several bullets from removing multiple lives at once?
- What would you move to a backend if you added an online leaderboard?
