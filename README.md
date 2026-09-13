# Shiny's Token Aura Rings

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
