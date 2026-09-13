# Shiny's Token Aura Rings

A small, from-scratch Foundry VTT v14 module that replaces the discontinued
["Token Aura Ring"](https://foundryvtt.com/packages/token-aura-ring) by
AnthonyEdmonds (last verified for Foundry v13 only).

## Features (v1.1.0)

- Any number of rings per token — add or remove them in the config dialog
- Per ring: radius in scene distance units (e.g. ft), measured from the
  token's edge outward, color, line width, line opacity, optional fill with
  its own fill opacity
- Configured via a button on the Token HUD (right column, ring icon)
- Rings hang off the token itself as a child object, so Foundry's normal
  token visibility/fog-of-war/movement handling applies automatically —
  no extra visibility logic needed

Deliberately **not** included (candidates for a later version, if wanted):
arcs/angles, role-based visibility ("GM only"), live preview while editing,
grid-based shapes.

## Technical notes (for debugging)

- Data is stored as a token flag: `flags.shinys-token-aura-rings.auras`
  (an array of ring objects). Older v1.0.x installs used a single object
  under `flags.shinys-token-aura-rings.aura` — this is read as a fallback
  and migrated to the new array format the next time you save the dialog.
- `refreshToken` hook redraws all rings for a token on every refresh
  (position, size, flag updates).
- Radius conversion: `canvas.grid.size / canvas.scene.grid.distance` gives
  pixels per one distance unit.
- Rings are drawn into a single `PIXI.Graphics` object inserted at index 0
  of the token's own container (below the token artwork).
- Token HUD extension uses the same `html?.jquery ? html[0] : html` trick
  as the Custom Status Effects module, since Foundry sometimes hands hooks
  jQuery and sometimes a native `HTMLElement`.
- The config dialog uses `foundry.applications.api.DialogV2.wait(...)` with
  its `render` callback to wire up "Add Ring" / "Remove" buttons via event
  delegation, so newly-added rows work without re-binding listeners.
- **Whole script is wrapped in an IIFE** (`(() => { ... })();`). This module
  and Custom Status Effects are both loaded as plain classic `<script>`
  tags (not ES modules) and therefore share one global scope — an earlier
  version of this module declared `const MODULE_ID` at the top level and
  collided with the same name in the other module, throwing
  `Uncaught SyntaxError: Identifier 'MODULE_ID' has already been declared`
  and silently killing the whole script. If you ever start a new Foundry
  module from scratch, wrap it in an IIFE from the start to avoid this.

**Not yet live-tested in this form** — as always, try it out in a session
and report back what breaks, then we iterate.

## Setup / installation

1. Create a GitHub repo (e.g. `LegendaryShiny/Shinys-Token-Aura-Rings`),
   branch `main`.
2. Upload these files to the repo root (`module.json`, `scripts/`,
   `styles/`, `README.md`).
3. If your repo owner/name differs from
   `LegendaryShiny/Shinys-Token-Aura-Rings`, update the `url`, `manifest`
   and `download` fields in `module.json` accordingly (both still point at
   `raw.githubusercontent.com/.../refs/heads/main/...`).
4. Optional: zip everything as `shinys-token-aura-rings.zip` and place it in
   the repo root too (for the `download` link), same as the other module.
5. Install in Foundry/Forge via the manifest URL.
6. Enable the module, select a token, click the new ring icon in the Token
   HUD, add/configure rings, save.

Whenever you push an update, remember to bump `version` in `module.json` —
Foundry only offers an update when the manifest's version number is higher
than the installed one.

## Repo file structure

```
module.json
scripts/shinys-token-aura-rings.js
styles/shinys-token-aura-rings.css
README.md
```
