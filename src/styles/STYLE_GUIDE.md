# NEON NOIR DESIGN SYSTEM — STYLE GUIDE

Industrial sci-fi aesthetic for Neuro-Scrap. Inspired by Blade Runner and salvaged hardware.

---

## 1. Colour Roles (CSS Tokens in `src/styles/neonNoir.css`)

| Token | Hex | Role | Usage |
| :--- | :--- | :--- | :--- |
| `--void` | `#04060B` | Backdrop Shadow | Deepest room void, shadow recesses |
| `--haze` | `#0B1F2A` | Cold Atmospheric Mist | Ambient gradient back-scatter, window glare |
| `--steel` | `#1A2733` | Chassis & Metal | Heavy industrial plates, terminal caps, frames |
| `--steel-lit` | `#34495A` | Catch-lights & Bevels | Chiseled metal rims, bolts, screw heads |
| `--neon-cyan` | `#19F0FF` | Nominal / Energy | Power charge, active tasks, status nominal |
| `--sodium` | `#FF9A1F` | Hazard / Corrosion / Leak | Amber alert, contact prompt (USE), fractures |
| `--neon-magenta`| `#FF2E88` | Fault Accent | Severe damage warning, catastrophic fault |
| `--core-white` | `#FFF4E0` | Incandescent Core | Center of neon tubes, hot plasma filaments |
| `--text` | `#C9D6E2` | Primary Readout | Station titles, step counters, WCAG AA legible |
| `--text-dim` | `#7F93A6` | Etched Labels | Riveted serial plates, inactive slots |

---

## 2. Typography Scale

- **Display & Titles**: Condensed tall sans (`Chakra Petch` / `Rajdhani`), uppercase, wide tracking (`letter-spacing: 0.16em` to `0.25em`). Font size: **22px+**.
- **Labels & Action Headers**: Condensed tall sans, bold, uppercase. Minimum font size: **16px** (WCAG AA).
- **Serial Codes & Coordinates**: Monospace (`Share Tech Mono`), bold, stamped metal appearance. Font size: **12px–14px**.

---

## 3. Glow Recipe (Core + Coloured Halo)

Real neon tubes have a **white-hot incandescent core** and a **saturated outer halo**:
- **Cyan Glow**:
  `box-shadow: 0 0 2px #FFF4E0, 0 0 8px #19F0FF, 0 0 22px rgba(25, 240, 255, 0.45);`
- **Sodium Amber Glow**:
  `box-shadow: 0 0 2px #FFF4E0, 0 0 8px #FF9A1F, 0 0 22px rgba(255, 154, 31, 0.45);`
- **Rule**: Maximum **two** neon hues visible per object at any time.

---

## 4. Hardware & Wear Rules

- **Construction**: Heavy steel casings with chamfered corners, corner bolts, stamped serial nameplates (`PC-0417`, `STN-02`), and hazard diagonal warning tape on rim edges.
- **Lighting Direction**: Single primary warm sodium rim light originating from the upper-right corner (`85% 15%`), casting subtle warm specular highlights on metal bevels.
- **Cracks & Fractures**: Always rendered as thin, near-black hairline fissures cut into the surface (`#04060B`, 1–2px) with an underlying diffuse warm sodium light bleed. Never draw bright rainbow zigzags or surface wires.
- **Atmosphere**: Faint cold teal haze gradient (`#0B1F2A` to `#04060B`) with subtle floor contact shadows.

---

## 5. Three Do's and Don'ts

### DO
1. **DO anchor meaning with iconography and text together**: Never convey state by colour alone (e.g. checkmark + "DONE", padlock + "LOCKED").
2. **DO use transform and opacity exclusively for animation**: Neon breathing ($\le 0.5\text{ Hz}$), rare electric arcs ($\le 1$ per 2s), and clean transitions.
3. **DO provide full Reduce Motion overrides**: All pulses, bobs, and flickers must become completely static when reduced motion is requested.

### DON'T
1. **DON'T use web dialog conventions**: No pill buttons, no emojis, no generic purple-blue gradients, and no rounded cards with drop shadows.
2. **DON'T animate SVG filters or use backdrop-filter**: These decimate mobile/desktop frame rates. Use layered DOM gradients and opacity.
3. **DON'T flash elements faster than 1 Hz**: Prevents visual fatigue and maintains high accessibility standards.
