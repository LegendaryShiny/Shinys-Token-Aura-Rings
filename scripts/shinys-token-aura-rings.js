/**
 * Shiny's Token Aura Rings
 * A minimal, from-scratch replacement for the discontinued "Token Aura Rings"
 * module, rebuilt for Foundry VTT v14.
 *
 * v1.0.0 scope (deliberately minimal):
 * - One configurable ring per token
 * - Radius given in scene distance units (e.g. ft), measured from the
 *   token's edge outward — same convention as the original module
 * - Color, line width, fill toggle, fill opacity
 * - Configured via a button on the Token HUD (same extension point already
 *   used by Shiny's Custom Status Effects)
 * - Ring is a child of the token's own PIXI container, so Foundry's normal
 *   visibility/fog-of-war handling for the token automatically applies to
 *   the ring too (no extra visibility logic needed)
 */

const MODULE_ID = "shinys-token-aura-rings";
const FLAG_KEY = "aura";

const DEFAULT_AURA = {
  enabled: false,
  radius: 10,
  color: "#ff0000",
  width: 3,
  opacity: 0.35,
  fill: false
};

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing`);
});

/* -------------------------------------------- */
/*  Helpers                                      */
/* -------------------------------------------- */

function getAura(tokenDoc) {
  const stored = tokenDoc.getFlag(MODULE_ID, FLAG_KEY);
  return foundry.utils.mergeObject(DEFAULT_AURA, stored ?? {}, { inplace: false });
}

/** Pixels per one scene distance unit (e.g. per foot). */
function pixelsPerUnit() {
  const distance = canvas.scene?.grid?.distance || canvas.grid?.distance || 1;
  const size = canvas.grid?.size || 100;
  return size / distance;
}

/* -------------------------------------------- */
/*  Drawing                                      */
/* -------------------------------------------- */

function drawAuraRing(token) {
  if (!token?.document) return;

  if (!token.auraRingGraphics || token.auraRingGraphics.destroyed) {
    token.auraRingGraphics = new PIXI.Graphics();
    token.auraRingGraphics.eventMode = "none";
    // index 0 => below the token's own artwork/mesh
    token.addChildAt(token.auraRingGraphics, 0);
  }

  const gfx = token.auraRingGraphics;
  gfx.clear();

  const aura = getAura(token.document);
  if (!aura.enabled || !aura.radius) return;

  const ppu = pixelsPerUnit();
  const baseRadius = Math.max(token.w, token.h) / 2;
  const outerRadius = baseRadius + (Number(aura.radius) * ppu);
  const cx = token.w / 2;
  const cy = token.h / 2;

  let color;
  try {
    color = Color.from(aura.color).valueOf();
  } catch (err) {
    color = 0xff0000;
  }

  gfx.lineStyle(Number(aura.width) || 1, color, 1);
  if (aura.fill) gfx.beginFill(color, Number(aura.opacity));
  gfx.drawCircle(cx, cy, outerRadius);
  if (aura.fill) gfx.endFill();
}

Hooks.on("refreshToken", (token) => drawAuraRing(token));

Hooks.on("destroyToken", (token) => {
  token.auraRingGraphics?.destroy();
  token.auraRingGraphics = null;
});

/* -------------------------------------------- */
/*  Token HUD button                             */
/* -------------------------------------------- */

Hooks.on("renderTokenHUD", (hud, html) => {
  const token = hud.object;
  if (!token) return;

  const root = html?.jquery ? html[0] : html;
  const col = root.querySelector(".col.right") ?? root.querySelector(".col-right");
  if (!col) {
    console.warn(`${MODULE_ID} | Could not find Token HUD right column — HUD markup may have changed.`);
    return;
  }

  const aura = getAura(token.document);

  const button = document.createElement("div");
  button.classList.add("control-icon", "shinys-aura-ring-toggle");
  if (aura.enabled) button.classList.add("active");
  button.dataset.action = "auraRing";
  button.title = "Aura Ring konfigurieren";
  button.innerHTML = `<i class="fa-solid fa-ring"></i>`;
  button.addEventListener("click", (event) => {
    event.preventDefault();
    openAuraRingDialog(token);
  });

  col.appendChild(button);
});

/* -------------------------------------------- */
/*  Config dialog                                */
/* -------------------------------------------- */

async function openAuraRingDialog(token) {
  const current = getAura(token.document);
  const units = canvas.scene?.grid?.units || "";

  const content = `
    <form class="shinys-aura-ring-form">
      <div class="form-group">
        <label>Aktiv</label>
        <div class="form-fields">
          <input type="checkbox" name="enabled" ${current.enabled ? "checked" : ""}>
        </div>
      </div>
      <div class="form-group">
        <label>Radius (${units})</label>
        <div class="form-fields">
          <input type="number" name="radius" value="${current.radius}" step="1">
        </div>
      </div>
      <div class="form-group">
        <label>Farbe</label>
        <div class="form-fields">
          <input type="color" name="color" value="${current.color}">
        </div>
      </div>
      <div class="form-group">
        <label>Linienbreite (px)</label>
        <div class="form-fields">
          <input type="number" name="width" value="${current.width}" min="1" step="1">
        </div>
      </div>
      <div class="form-group">
        <label>Fläche füllen</label>
        <div class="form-fields">
          <input type="checkbox" name="fill" ${current.fill ? "checked" : ""}>
        </div>
      </div>
      <div class="form-group">
        <label>Deckkraft Füllung</label>
        <div class="form-fields">
          <input type="range" name="opacity" min="0" max="1" step="0.05" value="${current.opacity}">
        </div>
      </div>
    </form>
  `;

  await foundry.applications.api.DialogV2.wait({
    window: { title: `Aura Ring — ${token.document.name}` },
    content,
    buttons: [
      {
        action: "save",
        label: "Speichern",
        icon: "fa-solid fa-check",
        default: true,
        callback: async (event, button) => {
          const fd = new FormDataExtended(button.form);
          const data = fd.object;
          const update = {
            enabled: !!data.enabled,
            fill: !!data.fill,
            radius: Number(data.radius) || 0,
            width: Number(data.width) || 1,
            opacity: Number(data.opacity),
            color: data.color
          };
          await token.document.setFlag(MODULE_ID, FLAG_KEY, update);
        }
      },
      {
        action: "cancel",
        label: "Abbrechen",
        icon: "fa-solid fa-xmark"
      }
    ]
  });
}
