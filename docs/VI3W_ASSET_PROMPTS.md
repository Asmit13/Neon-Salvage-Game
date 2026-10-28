# Vi3W asset prompts for NEON SALVAGE

Generate each object separately. Export each result as GLB, then rename and place it in `public/models/` as shown below.

## 1. Player hovercraft

**Save as:** `public/models/hovercraft.glb`

**Prompt:**

> A compact futuristic salvage hovercraft for a sci-fi arcade game, chunky low-poly silhouette, dark navy armored body, glowing cyan light strips, subtle orange safety accents, wide aerodynamic body, no wheels, no visible driver, single isolated object, three-quarter front view, clean game-ready mesh, realistic PBR materials, centered on the ground, no background, no text, no platform, no extra objects.

**Review before exporting:** Make sure the silhouette is easy to recognize from a slightly elevated camera, the model is one object, and its materials remain readable against a dark environment.

## 2. Energy crystal collectible

**Save as:** `public/models/energy-crystal.glb`

**Prompt:**

> A floating energy crystal collectible for a futuristic sci-fi arcade game, faceted geometric crystal, electric cyan glow with a subtle purple core, stylized low-poly design, bright readable silhouette, single isolated object, centered and upright, clean game-ready 3D mesh, detailed PBR materials, no background, no text, no platform, no extra objects.

**Review before exporting:** Prefer a tall, narrow silhouette and bright cyan/purple colours so it is distinct from the red hazards and easy to notice while moving quickly.

## Import behaviour

The game requests these exact paths:

- `/models/hovercraft.glb`
- `/models/energy-crystal.glb`

Files inside Vite's `public/` directory are served from the site root, so the full local paths should be `public/models/hovercraft.glb` and `public/models/energy-crystal.glb`.

If either file is absent or cannot be loaded, the game uses its built-in procedural placeholder for that asset. After importing your exports, check scale and direction in a browser; generated 3D models can have different origins and forward-facing axes. If the hovercraft is facing away from the camera, adjust the `model.rotation.y` line inside `loadVi3WModels()` in `src/main.js`.
