# NEON SALVAGE — The Last Energy Run

A polished, browser-playable 3D arcade runner built with Three.js and Vite. The project is designed as a game-development hiring prototype around the workflow of generating individual 3D assets in Vi3W and integrating them into a playable experience.

> **Asset note:** The game runs immediately using built-in procedural 3D hovercraft and crystal models. For the Vi3W-specific assignment, export your own models and add them at the paths below. The loader uses the imported model when found and otherwise keeps the fallback asset, so the rest of the game does not break.

## Features

- 3D sci-fi environment with a neon runway, stars, lighting, lane markers, and moving side scenery.
- Lane-based hovercraft movement with smooth transitions.
- Collectible energy crystals, score tracking, increasing speed, and a 60-second run.
- Red hazard objects, collision detection, game-over screen, restart, pause/resume, and personal best saved in local storage.
- Keyboard controls and touch-friendly left/right controls.
- Responsive HUD and start, pause, and result screens.
- Vi3W GLB model loading with procedural fallback assets.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`).

Create a production build with:

```bash
npm run build
npm run preview
```

The final static site is written to `dist/`.

## Add your Vi3W models

1. Generate a hovercraft model in [Vi3W](https://app.vi3w.in) and export it as **GLB**.
2. Generate a separate collectible energy crystal and export it as **GLB**.
3. Copy the downloaded files into the project using these exact names:

```text
public/
└── models/
    ├── hovercraft.glb
    └── energy-crystal.glb
```

4. Restart the dev server or reload the page. The code tries to load `/models/hovercraft.glb` and `/models/energy-crystal.glb` automatically.
5. Confirm both model shapes and materials look correct in the game. GLB orientation and scale can vary by generated asset; if needed, tune `fitModel()` and the model rotation in `src/main.js`.

Prompt suggestions are in `docs/VI3W_ASSET_PROMPTS.md`.

## Controls

| Action | Control |
|---|---|
| Move left | `A`, `J`, or `←` |
| Move right | `D`, `L`, or `→` |
| Pause / resume | `P` or `Esc` |
| Start / restart | `Enter` or `Space`, or use the on-screen button |
| Touch devices | On-screen left and right arrows |

## Project structure

```text
neon-salvage-game/
├── index.html
├── package.json
├── src/
│   ├── main.js       # Three.js scene, assets, gameplay, controls and state
│   └── style.css     # HUD, overlays, responsive layout and visual styling
├── public/
│   └── models/       # Put the two Vi3W GLB exports here
└── docs/
    └── VI3W_ASSET_PROMPTS.md
```

## Gameplay loop

- Each run lasts 60 seconds.
- The craft starts in the middle lane and moves across three lanes.
- Energy cells add 100 points and increase the energy-cell counter.
- Contact with a hazard ends the run.
- The environment scrolls faster as the run progresses.
- The game also adds a small survival score over time.
- The personal best is saved in browser local storage on the current device/browser.

## Before sharing the prototype

- [ ] Add the actual Vi3W-generated GLB files.
- [ ] Start the game and check both imported models (scale, orientation, materials).
- [ ] Play at least one full run and test collision, scoring, timer, pause, and restart.
- [ ] Run `npm run build` and ensure it completes without errors.
- [ ] Capture a short gameplay recording or screenshots for the recruiter.
- [ ] Deploy the built project, then include the live URL and repository link in the submission.

## Technical notes

- Renderer: Three.js WebGL renderer.
- Build tool: Vite.
- Asset format: GLB / glTF 2.0 through `GLTFLoader`.
- This prototype is a 3D arcade runner, not a full open-world game. The generated models are static meshes, while the game moves the model as a single hovercraft object.
- The game imports Vi3W assets locally; it does not make an API call to Vi3W or require Vi3W to be online after the GLB files have been exported.
