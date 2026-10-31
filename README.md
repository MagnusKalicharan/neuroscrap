# NEURO-SCRAP — Landing Page Architecture & Developer Guide

> **Theme**: Post-Apocalyptic Solarpunk / Ruined High-Tech (Horizon Zero Dawn × NieR: Automata)  
> **Tech Stack**: Next.js 16 (App Router, Turbopack) • React 19 • TypeScript • Tailwind CSS v4 • Three.js (r186) • Framer Motion • Lucide React

---

## 1. Project Overview & Context

**Neuro-Scrap** is a web-based programming puzzle game where players act as scavengers of ruined neural algorithms in a world reclaimed by nature and fractured by code.

This repository implements the complete interactive landing page. It combines:
1. **ThreeUI Procedural Living World**: Full-screen 3D procedural root/moss terrain with custom GLSL shaders, camera projection, wind swaying, and interactive grass blade deformation.
2. **Interactive Solarpunk Scrap Robot**: An articulated scrap quadruped perched atop the moss arch that watches and tracks your cursor across the entire screen, spawns only after the terrain scan loads, and chirps/hops when clicked.
3. **NeonBlade UI Design System**: Cyberpunk/solarpunk HUD telemetry readouts, chromatic glitch typography, and animated SVG border-beam corner-cut CTA buttons.
4. **Seamless Background Audio**: Solarpunk ambient electronic soundtrack playing on a zero-gap loop from 0:00 with a minimal, text-free volume controller.

---

## 2. Layer Architecture (3-Tier + Global Overlay)

The interface follows a strict multi-layered spatial architecture:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Fixed z-50: Audio Controller (Independent Stacking Context)           │
│   • BackgroundMusic: Speaker icon, expandable volume slider           │
├────────────────────────────────────────────────────────────────────────┤
│ Layer 2 (z-20): Main Content & Hero Action                            │
│   • pointer-events-none layout container                               │
│   • GlitchText: Massive "NEURO SCRAP" title                           │
│   • pointer-events-auto button: BorderBeamCornerCutCard "PLAY GAME"   │
├────────────────────────────────────────────────────────────────────────┤
│ Layer 1 (z-10): Subtle Ambient Accents (pointer-events-none)          │
│   • Ambient scanline overlay (bg-scanlines mix-blend-overlay)         │
│   • Solarpunk corner bracket accents                                  │
├────────────────────────────────────────────────────────────────────────┤
│ Layer 0 (z-0): 3D Living World Canvas (Three.js)                      │
│   • SylvaLivingWorld procedural canvas                                │
│   • ScrapRobot perched on near-root arch crest                        │
│   • Soft radial vignette (.bg-vignette, open bottom-left)             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Directory Map & File-by-File Breakdown

```
neuro-scrap/
├── public/
│   ├── audio/
│   │   └── neuro-scrap-bgm.mp3           # Soundtrack asset (seamless 4-min looping BGM)
│   ├── file.svg                          # Default static icon
│   ├── globe.svg                         # Default static icon
│   ├── next.svg                          # Next.js branding SVG
│   ├── vercel.svg                        # Vercel branding SVG
│   └── window.svg                        # Default static icon
├── src/
│   ├── app/
│   │   ├── favicon.ico                   # Browser tab icon
│   │   ├── globals.css                   # Tailwind v4 setup, custom radial vignettes & scanlines
│   │   ├── layout.tsx                    # Root layout with Share Tech Mono & Rajdhani fonts
│   │   └── page.tsx                      # Landing page orchestrator (3 layers + audio controller)
│   ├── components/
│   │   ├── audio/
│   │   │   └── background-music.tsx      # Minimal speaker button, volume slider & zero-gap loop
│   │   ├── neonblade-ui/
│   │   │   ├── border-beam-button.tsx    # Button wrapper around BorderBeamCornerCutCard
│   │   │   ├── corner-cut-button.tsx     # Solarpunk clip-path button with hover glow
│   │   │   └── glitch-text.tsx           # Chromatic glitch typography with RGB split
│   │   └── threeui/
│   │       ├── scrap-robot.ts            # Articulated robot logic, textures, materials & tracking
│   │       └── sylva-living-world.tsx    # Complete Three.js procedural root/moss world
│   └── lib/
│       └── components/
│           └── ui/
│               └── cards/
│                   └── BorderBeamCornerCutCard.tsx  # NeonBlade SVG border-beam card & button
├── eslint.config.mjs                     # ESLint configuration
├── next.config.ts                        # Next.js configuration (Turbopack)
├── package.json                          # Dependencies & build scripts
├── README.md                             # This file (Complete architecture documentation)
└── tsconfig.json                         # TypeScript compiler configuration
```

---

## 4. Comprehensive File Descriptions

### `src/app/page.tsx`
* **Role**: Primary landing page orchestrator.
* **What it does**:
  * Integrates the 3-layer architecture (`Layer 0`, `Layer 1`, `Layer 2`) plus the isolated `z-50` audio controller.
  * Streamlined, atmospheric layout: displays the massive chromatic glitch game title (`NEURO SCRAP`) and a single, high-impact **`PLAY GAME`** CTA button with dual cyan border beams and play icon.
  * All clutter (heavy telemetry readouts, description paragraphs, stats strips, and footer links) has been removed as requested.
  * Ensures the `PLAY GAME` button explicitly has `pointer-events-auto` while parent HUD containers remain `pointer-events-none`.

### `src/app/layout.tsx`
* **Role**: Next.js App Router root layout.
* **What it does**:
  * Loads Google Web Fonts via `next/font/google`: `Share_Tech_Mono` (`--font-mono`) and `Rajdhani` (`--font-rajdhani`).
  * Applies `suppressHydrationWarning` to `<html>` to prevent hydration mismatches caused by browser extensions (e.g., Dark Reader).
  * Sets root body styling: `bg-[#050806] text-white overflow-hidden antialiased`.

### `src/app/globals.css`
* **Role**: Global CSS and utility classes.
* **What it does**:
  * Configures Tailwind CSS v4 (`@import "tailwindcss";`).
  * Defines utility classes for:
    * `.bg-vignette`: Cinematic radial gradient that darkens canvas edges while leaving the center open.
    * `.bg-left-anchor`: Horizontal linear gradient blending the left side into deep black for optimal typography contrast.
    * `.bg-scanlines`: Subtle repeating horizontal CRT scanline overlay (`mix-blend-overlay`).

### `src/components/audio/background-music.tsx`
* **Role**: Text-free, solarpunk background audio player.
* **What it does**:
  * Streams `/audio/neuro-scrap-bgm.mp3` with native `autoPlay`, `loop`, and explicit `onEnded` (`currentTime = 0; play()`) for seamless zero-gap continuous looping.
  * **Refresh & Autoplay Handling**: On every page reload or mount, explicitly resets `audio.currentTime = 0` so playback strictly begins from the start. Automatically attempts immediate playback, and registers capture-phase listeners on all window activities (`pointerdown`, `click`, `keydown`, `touchstart`, `pointermove`, `wheel`) so sound engages immediately on the very first gesture without delay.
  * Provides a compact, text-free HUD widget:
    * **Speaker Icon**: Toggles ON/OFF (`Volume2`, `Volume1`, `VolumeX`). Shows an amber `VolumeX` when paused/muted and cyan when audible. Muting saves the last volume level; unmuting restores it.
    * **Expandable Volume Slider**: Smoothly slides open on hover or touch (`w-20`), staying locked open while dragging.
    * **Mouse Wheel Support**: Hovering and scrolling the wheel adjusts volume in real time in 5% increments.

### `src/components/threeui/sylva-living-world.tsx`
* **Role**: Full-screen procedural 3D living world canvas.
* **What it does**:
  * Renders procedural gnarled roots, moss carpets, bark, grass blades, ferns, flowers, and pollen motes.
  * Uses custom GLSL shaders with simplex noise, curl noise, wind animation, and unscanned dissolve masks.
  * **Wireframe Survey Scan**: Initial expanding wireframe pulse (`uScanR` expanding 0 to 3000 over ~3.4s) that reveals the lush solarpunk terrain.
  * **Cursor Interaction**: Casts raycasts onto a zero plane to deform nearby grass blades and emit floating pollen spray particles.
  * **Robot Mounting**: Calculates the highest peak crest of the near-root arch via `limbSurface(nearLimbs[2], 0.06, ...)` and mounts the scrap robot at this position.
  * Passes world mouse coordinates (`mouseHit`), interaction state (`mouseLive`), and survey scan state (`scanning`) to `robot.update()`.

### `src/components/threeui/scrap-robot.ts`
* **Role**: Fully articulated, interactive solarpunk scrap robot.
* **What it does**:
  * **Spawn State Machine**:
    * `"dormant"`: Remains invisible (`root.visible = false`) while Sylva conducts its wireframe terrain scan.
    * `"spawning"`: Once scan finishes, executes a smooth landing drop onto the moss arch while eyes power on with progressive bloom.
    * `"booting"`: Calibrates with a curious head shake and plays a Web Audio synthesized chirp.
    * `"active"`: Enters live tracking and idle living behaviors.
  * **3D Cursor Tracking**:
    * Computes world vector from head to mouse: `toMouseWorld = mouseWorld - headWorld`.
    * Inverts root's world matrix: `toMouseLocal = toMouseWorld.transformDirection(root.matrixWorld.invert())`.
    * Computes local yaw (`Math.atan2(toMouseLocal.x, toMouseLocal.z)`), pitch, and inquisitive roll tilt (`-yaw * 0.18`), clamped to ergonomic limits and smoothed with exponential damping.
  * **High-Visibility Solarpunk Materials**:
    * Procedural canvas texture with mint/sage verdigris plating (`#b4ccbf`), white metal scratches, terracotta rust patches (`#c45d2c`, `#963d18`), panel seams, and `NS//04` stencils.
    * Low PBR metalness (`0.12`) so 88% of diffuse color reflects without an HDRI envMap.
    * Dedicated `HemisphereLight`, `DirectionalLight` (pointing at robot center), and downward cyan optic point light.
  * **Optics & Articulation**:
    * Dual glowing lenses: Primary Cyan left optic (`emissiveIntensity: 4.5`) + Secondary Amber right optic (`emissiveIntensity: 3.8`).
    * Articulated 4-legged quadruped chassis (hip, thigh, knee, shin, foot) gripping the moss.
    * Idle breathing, wind antenna sway, periodic optic blinking, proximity excitement, and click-hop jump with audio chirp.

### `src/lib/components/ui/cards/BorderBeamCornerCutCard.tsx`
* **Role**: NeonBlade UI dynamic border-beam corner-cut component.
* **What it does**:
  * Polymorphic component (`as="div"` or `as="button"`) with chamfered corner cuts (`diagonal`, `all`, `top-right`, `bottom-left`).
  * Generates an exact SVG perimeter path with animated SVG stroke gradients.
  * Supports 4 animated variants:
    * `single`: Single beam tracing the cut perimeter.
    * `dual`: Two counter-rotating beams moving in opposite directions.
    * `gradient-sweep`: Wide continuous gradient sweep with high neon glow.
    * `rainbow`: Full-spectrum rotating neon hue beam.
  * Uses `ResizeObserver` to dynamically update SVG paths when component dimensions change.

### `src/components/neonblade-ui/border-beam-button.tsx`
* **Role**: Convenient button wrapper around `BorderBeamCornerCutCard`.

### `src/components/neonblade-ui/corner-cut-button.tsx`
* **Role**: Clip-path corner-cut button with hover state, sound click feedback, and cyan/warning variants.

### `src/components/neonblade-ui/glitch-text.tsx`
* **Role**: High-intensity chromatic aberration text component.
* **What it does**:
  * Uses Framer Motion with pseudo-layer RGB chromatic shifts (`cyan` and `red/pink` splits).
  * Triggers periodic random jitter, slice offsets, and glitch noise.

---

## 5. Critical Technical Lessons & Gotchas

1. **Three.js PBR Without Environment Maps**:
   * In standard Three.js `MeshStandardMaterial`, diffuse color is modulated by `(1.0 - metalness)`.
   * High metalness (`0.8`+) reflects almost exclusively the scene environment map (`scene.environment`). In a dark or unmapped scene, high-metalness meshes render **100% pitch black**.
   * **Solution**: Keep metalness between `0.10` and `0.22`, use rich diffuse canvas textures, add a dedicated `HemisphereLight` to `root`, and add ambient lighting to the scene.

2. **Hierarchical 3D Cursor Tracking Over Scaled Groups**:
   * The `nearGroup` container in Sylva is scaled dynamically by `~218x`.
   * Attempting to project world cursor coordinates into group local coordinates causes scale inversions.
   * **Solution**: Keep cursor hit positions in true 3D world space, compute `toMouseWorld = mouseWorld - headWorld`, and transform directions using `root.matrixWorld.clone().invert()`. This ensures tracking is completely invariant to scene scaling.

3. **React `useEffect` Audio Volume Overwrites**:
   * If a mounting effect includes `volume` or `isMuted` in its dependency array, adjusting the slider triggers a re-render that re-runs the effect and resets `audio.volume = defaultVolume`.
   * **Solution**: Decouple the one-time mounting effect (`[]` dependencies) from user-driven volume/mute event handlers.

4. **Stacking Context (`z-index`) Isolation**:
   * Interactive UI elements placed inside a parent with `z-10` cannot rise above an overlapping sibling layer with `z-20`, even if the child specifies `z-30`.
   * **Solution**: Place global interactive HUD controls (like `BackgroundMusic`) directly at the root of `main` with `fixed top-6 right-6 z-50 pointer-events-auto`.

---

## 6. Development & Build Commands

```bash
# Navigate to project directory
cd neuro-scrap

# Start development server (Turbopack, port 3000)
npm run dev

# Run TypeScript type verification
npx tsc --noEmit

# Run Next.js production build
npm run build

# Start production server
npm run start
```

---

## 7. NEURO-SCRAP — First-Person 3D Spaceship Crash Site (`/game` route)

Clicking **PLAY GAME** on the landing page immediately opens the `/game` route. There is **no redundant secondary start screen or "Robo Terra" title overlay** — the 3D world loads and starts directly.

### New Components & Files

| File | Role |
|---|---|
| `src/components/Game.tsx` | Complete first-person 3D game featuring a crashed modern starship on an alien planetary surface under a black sky with 3D stars, a Gargantua-style black hole, and active 3D meteor showers. |
| `src/components/ui/black-hole-hero-section.tsx` | General Relativity ray-marched Schwarzschild black hole component with Keplerian shear, relativistic Doppler beaming, and gravitational lensing. |
| `src/components/ui/animated-shader-hero.tsx` | Reusable WebGL2 fractal noise & animated nebula shader hero component with pointer tracking, badges, and dual CTA buttons. |
| `src/components/ui/demo.tsx` | Integration and usage demo for `Hero` / `animated-shader-hero`. |
| `src/app/game/page.tsx` | Next.js route at `/game` — dynamic client-side import of `Game.tsx` (`ssr: false`). |

---

### `src/components/Game.tsx`

> **Tech Stack** — `@react-three/fiber ^8.x`, `@react-three/drei ^9.x`, `three ^0.186.x`, `react ^19.x`, `TypeScript`

#### 1. Environmental Architecture: Modern Spaceship Crash on Alien Planet
- **Deep Space Black Sky & 3D Celestial Coordinates**:
  - The sky is rendered in real 3D world space (NOT a fixed 2D canvas overlay) so stars, meteors, and celestial bodies stay in their true cosmic positions when looking around.
  - **3D Starfield**: 9,000 stars distributed across celestial radius 180.
  - **Ray-Marched Schwarzschild Black Hole**: True general relativity raytracer solving the null geodesic metric \(a = -\frac{3}{2} h^2 \frac{\vec{r}}{|\vec{r}|^5}\). Features an absolute event horizon shadow, Shakura–Sunyaev temperature gradient, Keplerian shear accretion gas with turbulence noise, relativistic Doppler beaming (\(g^3\)), and a bright photon sphere ring, integrated dynamically into the 3D celestial sky at `[-50, 58, -95]`.
  - **3D Meteor Shower**: 18 dynamic meteorites streaking horizontally through high planetary airspace with incandescent white heads and long glowing orange/gold tail streaks.
- **Alien Planetary Crust (Regolith)**:
  - Procedural basalt regolith ground with crater rims, dust ripples, and scattered volcanic boulders.
  - Raised impact gouge berm where the spacecraft skidded across the terrain.
- **Modern Interplanetary Rocket Wreck (Sci-Fi Starship)**:
  - **3-Engine Propulsion Cluster**: Giant conical rocket engine exhaust bells (Raptor/aerospace style) half-buried in the impact crater with cooling manifolds and an active cyan plasma leak deep inside.
  - **Sheared Starship Fuselage**: 22-unit cylindrical rocket body split open, lined with dark hexagonal heat-shield tiles on the exterior, exposed circular titanium bulkheads, longitudinal stringers, and cryo propellant tanks.
  - **Shattered Solar Array Wing**: Carbon composite truss arm angled out of the ground with blue photovoltaic solar panels.
  - **Command Module / Crew Capsule**: Sleek aerodynamic nose cone capsule broken off nearby with dark thermal viewport glass and an active emergency flashing beacon.
  - **Quantum Reactor Core**: Exposed magnetic containment cylinder pulsing with intense cyan/blue Cherenkov radiation light (`pointLight` intensity 12).
  - **Aerospace Cargo & Shrapnel**: Titanium avionics lockers and scattered debris across the regolith.

#### 2. Celestial Sky: Black Hole, Opposite Planetary System & Starfield
- **Multi-Colored Realistic Starfield**:
  - Predominantly brilliant white & diamond silver (~70%), interspersed with warm solar golds, electric cyan-blue giants, deep ruby supergiant embers, and subtle jewel points.
  - High dynamic range: landmark stars reach up to $15.0$ luminance with prominent 4-point cross diffraction spikes and horizontal streak glints.
  - Very small, rare, faint deep-red interstellar dust wisps (astronomical H-alpha emission) to provide authentic deep-space realism.
- **Unique Planetary System (Opposite Side of the Sky)**:
  - **Aurelia Prime**: Massive Ringed Azure Gas Giant (`[44, 46, 76]`) with banded storm belts, Cassini-division rings, and a glowing cyan atmosphere halo.
  - **Ignis-IV**: Shattered Tectonic Molten Magma Moon (`[74, 30, 54]`) with glowing volcanic lava rifts and hotspots.
  - **Thalassa**: Jeweled Emerald Ocean World (`[12, 36, 88]`) with polar ice caps and swirling hurricane cloud spirals.
  - Real-time axial rotation in `useFrame`.
- **Realistic General Relativity Black Hole (Gargantua)**:
  - Iconic solar plasma accretion colors: blinding white-hot inner rim $\to$ majestic warm solar gold/amber accretion disk $\to$ deep warm fiery orange outer gas.
  - Mathematically pure Schwarzschild shadow void ($b_c^2 \le 6.85$) with zero stars or fog bleeding through.
  - Unobstructed photon ring and event horizon shadow.
- **Shooting Stars Engine**:
  - Fast, elegant shooting stars dashing gracefully across different arcs of the night sky with warm solar-gold tails.
  - Staggered intervals ($1.0 - 4.0$s) across random celestial dome arcs.

#### 3. Gameplay, Physics & Collision Engine
- **First-Person Controls**: Camera is locked to `EYE_HEIGHT = 1.6` on top of the dynamic 3D terrain heightmap (`getTerrainHeight(x, z)`).
- **Physical Collision Engine (Solid Obstacles)**: Stones, boulders, monoliths, starship hull ribs, engine nozzles, and cargo crates have high-precision physical colliders registered in `WORLD_OBSTACLES`.
  - **2-Pass Iterative Relaxation**: When the player approaches within `obs.radius + PLAYER_RADIUS (0.68m)`, penetration is immediately resolved by projecting the player outward along the contact normal.
  - **Velocity Deflection**: The normal component of velocity is canceled, allowing realistic, smooth sliding along the curved contours of boulders and hull bulkheads.
  - **Non-Passable**: Players cannot walk or glitch through any stone, rock, or wreckage piece in the world.
- **Sculpted 3D Alien Terrain**: High-resolution 128×128 plane geometry deformed in real time to form:
  - Starship crash skid furrow (trench depression down to -0.85m).
  - Lateral ejecta berms (+0.65m raised slag ridges flanking the trench).
  - Impact crater rim (+0.45m) and undulating planetary regolith dunes.
- **Tactical AR Proximity Scanner**: Raycasts forward in a ~50° cone every 6 frames to identify the nearest obstacle within 14 meters, displaying target classification, composition, and physical collider state on the HUD.
- **Active Sonar / Radar Ping (`E` / `F`)**: Emits a resonant acoustic ping via Web Audio API and expands a holographic cyan pulse ring across the terrain surface.
- **Tactical Shoulder Flashlight (`T` / `L`)**: Toggles a high-intensity spotlight that casts crisp dynamic shadows into dark rock crevices and spaceship interiors.
- **Procedural Sci-Fi Web Audio Engine**: Zero-asset audio synthesis:
  - Footstep regolith crunches synchronized to head-bob troughs.
  - Physical collision thud on impact with boulders or metal.
  - Flashlight switch clicks and resonant sonar ping chimes.

WORLD_BOUNDS  = 52.0  // ±X and ±Z clamp boundary
PLAYER_RADIUS = 0.68  // Player physical cylinder collider radius
HEAD_BOB      = true  // Dynamic walking & sprinting head-bob
```

#### Controls Reference

| Key | Action |
|---|---|
| `W` / `↑` | Move forward |
| `S` / `↓` | Move backward |
| `A` / `←` | Strafe left |
| `D` / `→` | Strafe right |
| `Shift` | Sprint (9.0 u/s) |
| `Mouse` | Look around (360° first-person pointer lock) |
| `T` / `L` | Toggle tactical suit flashlight |
| `E` / `F` | Emit terrain sonar radar ping |
| `Esc` | Pause / unlock mouse cursor |
| `` ` `` (backtick) | Toggle debug telemetry HUD |

---

## 9. Next Steps for the Game

- **Collision detection** — integrate `@react-three/rapier` to add rigid bodies to mounds and arches so the player cannot walk through them.
- **Third-person toggle** — add a `P` key that switches from first-person to a third-person camera orbiting a visible robot body.
- **Footstep audio** — play short footstep sound clips when the player is moving, timed to the head-bob frequency.
- **Jumping** — apply a vertical impulse to the camera when Space is pressed, with gravity pulling it back down each frame.
- **Interactable beacon** — when the player walks close to the cyan beacon, trigger a visual event (beacon explodes into particles, door opens, etc.).
