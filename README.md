# Spacecraft Defender

![Spacecraft Defender project banner](docs/banner.svg)

**Spacecraft Defender** is a responsive browser arcade game built with HTML5 Canvas, CSS, and vanilla JavaScript. Defend the relay through increasingly difficult enemy waves, collect temporary upgrades, and chase a locally saved high score.

This is a portfolio-focused rebuild of a game I first created as a school coding project in 2021. The rebuild keeps the original space-defence concept and selected visual assets while replacing the repetitive prototype logic with a clearer, data-driven game structure.

## Play

Open the [live game](https://sanathnarayana.github.io/spacecraft-defender/) or run it locally:

```bash
python3 -m http.server 4317 --bind 127.0.0.1
```

Then visit `http://localhost:4317`.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | `A` / `D` or arrow keys | Left and right buttons |
| Fire | `Space` | Fire button |
| Pause | `P` or `Esc` | — |
| Toggle sound | `M` | — |

You can also drag across the game area to position the spacecraft on pointer-enabled devices.

## Features

- Data-driven enemy formations that scale across waves
- Increasing movement and projectile difficulty
- Score, hull, wave, and system-status HUD
- Shield and rapid-fire power-ups
- Particle effects, screen shake, parallax stars, and synthesized sound
- Start, pause, game-over, and restart states
- Keyboard, pointer, and mobile touch controls
- Responsive layout with reduced-motion support
- Local high-score persistence
- Dependency-free smoke test for core gameplay flows
- No framework, package installation, or build step required

## Refactoring highlights

The original prototype represented every UFO and collision separately. This rebuild improves that foundation by using:

- Arrays and reusable classes for enemies, projectiles, particles, and power-ups
- A single animation loop with delta-time movement
- Reusable collision and fleet-management logic
- A small state machine for the complete game lifecycle
- DOM-based controls and HUD updates around a Canvas game surface
- Browser-native Web Audio for lightweight sound effects

## Project structure

```text
spacecraft-defender/
├── assets/          # Selected visual assets from the original student project
├── docs/            # Repository preview image
├── src/game.js      # Game state, entities, input, rendering, and audio
├── index.html       # Accessible game interface
└── style.css        # Responsive visual design
```

## Built with

- HTML5 Canvas
- Vanilla JavaScript
- CSS
- Web Audio API
- Local Storage API

## Project history

The first version was created while I was learning JavaScript during school. In 2026, I revisited the idea to practice refactoring, reduce duplicated logic, improve the user experience, and turn an early learning project into a more complete browser game.

## Future improvements

- Boss waves and additional enemy behaviours
- Multiple spacecraft choices
- Online leaderboard backed by an API
- Automated gameplay tests

## Author

**Sanath Narayana**<br>
[GitHub](https://github.com/SanathNarayana) · [LinkedIn](https://www.linkedin.com/in/sanath-suresh-a30743376/)
