/**
 * Shiny's Token Aura Rings
 * A minimal, from-scratch replacement for the discontinued "Token Aura Rings"
 * module, rebuilt for Foundry VTT v14.
 *
 * v1.3.2
 * - Any number of rings per token (add/remove in the config dialog), dialog
 *   starts with zero rings until you click "Add Ring"
 * - Per ring: radius (scene distance units, measured from the token's edge
 *   outward), color, line width, line opacity, optional fill + fill opacity,
 *   GM-only visibility
 * - Configured via a button on the Token HUD (same extension point already
 *   used by Shiny's Custom Status Effects)
 * - Config dialog: collapsible ring cards laid out two per row in a fixed
 *   width, bordered grid, a scrollable list so the Save/Cancel buttons stay
 *   reachable with many rings, and a live preview on the canvas while
 *   editing
 * - Rings are drawn as a child of the token's own PIXI container, so
 *   Foundry's normal visibility/fog-of-war handling for the token
 *   automatically applies to the rings too (no extra visibility logic
 *   needed)
 * - Whole script is wrapped in an IIFE so its top-level consts don't collide
 *   with other classic (non-ESM) module scripts sharing the same global
 *   scope (this bit us once already, see README)
 */

(() => {

const MODULE_ID = "shinys-token-aura-rings";
const FLAG_KEY = "auras";
const LEGACY_FLAG_KEY = "aura"; // v1.0.x stored a single aura object here

const DEFAULT_RING = {
  enabled: true,
  radius: 10,
  color: "#ff0000",
  width: 3,
  lineOpacity: 1,
  fill: false,
  fillOpacity: 0.35,
  gmOnly: false
};

const STYLE_TAG_ID = `${MODULE_ID}-styles`;

/**
 * The dialog layout (grid columns, fixed width, ring card borders) is
 * injected here as a <style> tag instead of only relying on the external
 * styles/*.css file. Foundry/browsers cache stylesheet files aggressively
 * by URL, and a Forge-hosted world doesn't always pick up a freshly pushed
 * .css file even after the module itself updates to a new version. A
 * <style> tag created here is rebuilt from this script every time it loads
 * (and this script *does* reliably reload on update), and because it's
 * appended after the module's own stylesheet link, it wins any cascade tie
 * regardless of what the cached .css contains.
 */
function injectStyles() {
  document.getElementById(STYLE_TAG_ID)?.remove();

  const style = document.createElement("style");
  style.id = STYLE_TAG_ID;
  style.textContent = `
    .shinys-aura-ring-form {
      width: 660px !important;
      max-width: 90vw !important;
    }
    .shinys-aura-ring-form #shinys-aura-rings-list {
      display: grid !important;
      grid-template-columns: repeat(2, 1fr) !important;
      align-items: start;
      gap: 0.75em;
      max-height: 55vh;
      overflow-y: auto;
      padding: 4px 4px 4px 0;
      margin-bottom: 0.5em;
    }
    .shinys-aura-ring-form .shinys-aura-rings-empty {
      text-align: center;
      opacity: 0.7;
      margin: 0.5em 0 1em;
    }
    .shinys-aura-ring-form .aura-ring-row {
      border: 1px solid var(--color-border-light-tertiary, #782e22) !important;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.15);
      padding: 0 0.75em 0.5em;
    }
    .shinys-aura-ring-form .aura-ring-row summary {
      list-style: none;
      cursor: pointer;
      padding: 0.5em 0;
    }
    .shinys-aura-ring-form .aura-ring-row summary::-webkit-details-marker {
      display: none;
    }
    .shinys-aura-ring-form .aura-ring-row .summary-row {
      display: flex !important;
      align-items: center;
      justify-content: space-between;
      gap: 0.5em;
      font-weight: bold;
    }
    .shinys-aura-ring-form .aura-ring-row .ring-title {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .shinys-aura-ring-form .aura-ring-row .chevron {
      display: inline-block;
      transition: transform 0.15s ease;
    }
    .shinys-aura-ring-form .aura-ring-row[open] .chevron {
      transform: rotate(90deg);
    }
    .shinys-aura-ring-form .aura-ring-row .remove-ring {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      gap: 0.35em;
      padding: 0.3em 0.6em;
      background: rgba(120, 46, 34, 0.6);
      border: 1px solid var(--color-border-light-tertiary, #782e22);
      border-radius: 4px;
      cursor: pointer;
      white-space: nowrap;
      font-weight: normal;
    }
    .shinys-aura-ring-form .aura-ring-row .remove-ring:hover {
      background: rgba(180, 40, 20, 0.9);
    }
    .shinys-aura-ring-form .ring-body {
      padding-top: 0.25em;
    }
    .shinys-aura-ring-form .form-group {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75em;
      margin-bottom: 0.4em;
    }
    .shinys-aura-ring-form .form-fields {
      flex: 1;
      display: flex;
      justify-content: flex-end;
    }
    .shinys-aura-ring-form input[type="number"],
    .shinys-aura-ring-form input[type="range"] {
      width: 100%;
    }
    .shinys-aura-ring-form #shinys-add-ring {
      width: 100%;
    }
    .shinys-aura-ring-toggle.active i {
      color: #ff6400;
      text-shadow: 0 0 8px #ff6400;
    }
  `;
  document.head.appendChild(style);
}

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing`);
  injectStyles();
});

/* -------------------------------------------- */
/*  Helpers                                      */
/* -------------------------------------------- */

/** Reads the ring list for a token, falling back to the old v1.0.x single-aura flag if present. */
function getAuras(tokenDoc) {
  let auras = tokenDoc.getFlag(MODULE_ID, FLAG_KEY);
  if (!auras) {
    const legacy = tokenDoc.getFlag(MODULE_ID, LEGACY_FLAG_KEY);
    auras = legacy ? [legacy] : [];
  }
  return auras.map((a) => foundry.utils.mergeObject(DEFAULT_RING, a, { inplace: false }));
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

function drawAuraRings(token) {
  if (!token?.document) return;

  if (!token.auraRingGraphics || token.auraRingGraphics.destroyed) {
    token.auraRingGraphics = new PIXI.Graphics();
    token.auraRingGraphics.eventMode = "none";
    // index 0 => below the token's own artwork/mesh
    token.addChildAt(token.auraRingGraphics, 0);
  }

  const gfx = token.auraRingGraphics;
  gfx.clear();

  // A dialog that's currently open for this token can push an unsaved
  // preview here; use that instead of the persisted flags while it exists.
  const auras = token._auraRingPreview ?? getAuras(token.document);
  if (!auras.length) return;

  const ppu = pixelsPerUnit();
  const baseRadius = Math.max(token.w, token.h) / 2;
  const cx = token.w / 2;
  const cy = token.h / 2;

  for (const aura of auras) {
    if (!aura.enabled || !aura.radius) continue;
    if (aura.gmOnly && !game.user.isGM) continue;

    const outerRadius = baseRadius + (Number(aura.radius) * ppu);

    let color;
    try {
      color = Color.from(aura.color).valueOf();
    } catch (err) {
      color = 0xff0000;
    }

    gfx.lineStyle(Number(aura.width) || 1, color, Number(aura.lineOpacity ?? 1));
    if (aura.fill) gfx.beginFill(color, Number(aura.fillOpacity ?? 0.35));
    gfx.drawCircle(cx, cy, outerRadius);
    if (aura.fill) gfx.endFill();
  }
}

Hooks.on("refreshToken", (token) => drawAuraRings(token));

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

  const auras = getAuras(token.document);

  const button = document.createElement("div");
  button.classList.add("control-icon", "shinys-aura-ring-toggle");
  if (auras.some((a) => a.enabled)) button.classList.add("active");
  button.dataset.action = "auraRings";
  button.title = "Configure Aura Rings";
  button.innerHTML = `<i class="fa-solid fa-ring"></i>`;
  button.addEventListener("click", (event) => {
    event.preventDefault();
    openAuraRingsDialog(token);
  });

  col.appendChild(button);
});

/* -------------------------------------------- */
/*  Config dialog                                */
/* -------------------------------------------- */

function ringRowTemplate(aura, label, units) {
  return `
    <details class="aura-ring-row">
      <summary>
        <div class="summary-row">
          <span class="ring-title"><span class="chevron">&#9656;</span> ${label}</span>
          <button type="button" class="remove-ring" title="Remove this ring">
            <i class="fa-solid fa-trash"></i> Remove Ring
          </button>
        </div>
      </summary>
      <div class="ring-body">
        <div class="form-group">
          <label>Enabled</label>
          <div class="form-fields"><input type="checkbox" data-field="enabled" ${aura.enabled ? "checked" : ""}></div>
        </div>
        <div class="form-group">
          <label>GM only</label>
          <div class="form-fields"><input type="checkbox" data-field="gmOnly" ${aura.gmOnly ? "checked" : ""}></div>
        </div>
        <div class="form-group">
          <label>Radius (${units})</label>
          <div class="form-fields"><input type="number" data-field="radius" value="${aura.radius}" step="1"></div>
        </div>
        <div class="form-group">
          <label>Color</label>
          <div class="form-fields"><input type="color" data-field="color" value="${aura.color}"></div>
        </div>
        <div class="form-group">
          <label>Line width (px)</label>
          <div class="form-fields"><input type="number" data-field="width" value="${aura.width}" min="1" step="1"></div>
        </div>
        <div class="form-group">
          <label>Line opacity</label>
          <div class="form-fields"><input type="range" data-field="lineOpacity" min="0" max="1" step="0.05" value="${aura.lineOpacity}"></div>
        </div>
        <div class="form-group">
          <label>Fill</label>
          <div class="form-fields"><input type="checkbox" data-field="fill" ${aura.fill ? "checked" : ""}></div>
        </div>
        <div class="form-group">
          <label>Fill opacity</label>
          <div class="form-fields"><input type="range" data-field="fillOpacity" min="0" max="1" step="0.05" value="${aura.fillOpacity}"></div>
        </div>
      </div>
    </details>
  `;
}

/** Reads the current, unsaved state of every ring row in the dialog form. */
function readRowsAsAuras(form) {
  const rows = form.querySelectorAll(".aura-ring-row");
  return Array.from(rows).map((row) => ({
    enabled: row.querySelector('[data-field="enabled"]').checked,
    gmOnly: row.querySelector('[data-field="gmOnly"]').checked,
    radius: Number(row.querySelector('[data-field="radius"]').value) || 0,
    color: row.querySelector('[data-field="color"]').value,
    width: Number(row.querySelector('[data-field="width"]').value) || 1,
    lineOpacity: Number(row.querySelector('[data-field="lineOpacity"]').value),
    fill: row.querySelector('[data-field="fill"]').checked,
    fillOpacity: Number(row.querySelector('[data-field="fillOpacity"]').value)
  }));
}

async function openAuraRingsDialog(token) {
  const initial = getAuras(token.document);
  const units = canvas.scene?.grid?.units || "";

  let ringCount = initial.length;
  let dialogInstance = null;

  const clearPreview = () => {
    delete token._auraRingPreview;
    drawAuraRings(token);
  };

  const content = `
    <form class="shinys-aura-ring-form">
      <div id="shinys-aura-rings-list">
        ${initial.map((a, i) => ringRowTemplate(a, `Ring ${i + 1}`, units)).join("")}
      </div>
      <p class="shinys-aura-rings-empty" ${initial.length ? 'hidden' : ''}>No rings yet, click "Add Ring" below.</p>
      <button type="button" id="shinys-add-ring"><i class="fa-solid fa-plus"></i> Add Ring</button>
    </form>
  `;

  await foundry.applications.api.DialogV2.wait({
    window: { title: `Aura Rings: ${token.document.name}`, resizable: true },
    position: { width: 640 },
    content,
    render: (event, dialog) => {
      dialogInstance = dialog;
      const root = dialog.element;

      // Belt-and-suspenders: force the window frame itself wide via an
      // inline style, which wins over any stylesheet (cached or not).
      root.style.width = "680px";

      // Looked up fresh on every call instead of cached once here: the
      // "render" callback can fire before the content HTML is actually
      // attached under `root`, so a cached reference taken immediately
      // would be null and crash every later click/input handler with it.
      const updatePreview = () => {
        const form = root.querySelector(".shinys-aura-ring-form");
        const list = root.querySelector("#shinys-aura-rings-list");
        if (!form || !list) return; // not attached yet, nothing to do
        token._auraRingPreview = readRowsAsAuras(form);
        drawAuraRings(token);
        const emptyNotice = root.querySelector(".shinys-aura-rings-empty");
        if (emptyNotice) emptyNotice.hidden = list.querySelectorAll(".aura-ring-row").length > 0;
      };

      // Event delegation: handles both the initial rows and any rows
      // added later, without needing to (re)bind listeners per row.
      root.addEventListener("click", (ev) => {
        const removeBtn = ev.target.closest(".remove-ring");
        const addBtn = ev.target.closest("#shinys-add-ring");
        if (!removeBtn && !addBtn) return;

        const list = root.querySelector("#shinys-aura-rings-list");
        if (!list) return;

        if (removeBtn) {
          // Stop the parent <summary> from also toggling open/closed.
          ev.preventDefault();
          removeBtn.closest(".aura-ring-row")?.remove();
          updatePreview();
        } else if (addBtn) {
          ringCount += 1;
          const wrapper = document.createElement("div");
          wrapper.innerHTML = ringRowTemplate(foundry.utils.deepClone(DEFAULT_RING), `Ring ${ringCount}`, units);
          list.appendChild(wrapper.firstElementChild);
          updatePreview();
        }
      });

      // Live preview: redraw on the canvas as soon as any field changes.
      root.addEventListener("input", updatePreview);

      // Initial preview matches the persisted state, so nothing visibly
      // changes until the user actually edits something. Deferred one
      // frame so the content is guaranteed to be attached by the time it
      // runs; updatePreview's own guard makes this safe either way.
      requestAnimationFrame(updatePreview);

      // However the dialog closes (Save, Cancel, Escape, the X button),
      // drop the preview override so refreshToken falls back to the real,
      // persisted flags again.
      Hooks.once("closeDialogV2", (app) => {
        if (app === dialogInstance) clearPreview();
      });
    },
    buttons: [
      {
        action: "save",
        label: "Save",
        icon: "fa-solid fa-check",
        default: true,
        callback: async (event, button) => {
          const auras = readRowsAsAuras(button.form);
          await token.document.setFlag(MODULE_ID, FLAG_KEY, auras);
          if (token.document.getFlag(MODULE_ID, LEGACY_FLAG_KEY) !== undefined) {
            await token.document.unsetFlag(MODULE_ID, LEGACY_FLAG_KEY);
          }
          clearPreview();
        }
      },
      {
        action: "cancel",
        label: "Cancel",
        icon: "fa-solid fa-xmark",
        callback: () => clearPreview()
      }
    ]
  });
}

})();
