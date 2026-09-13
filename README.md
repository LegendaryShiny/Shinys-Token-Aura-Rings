# Shiny's Token Aura Rings

Eigenes, schlankes Foundry-VTT-v14-Modul als Ersatz für das nicht mehr funktionierende
["Token Aura Ring"](https://foundryvtt.com/packages/token-aura-ring) von AnthonyEdmonds
(zuletzt nur bis Foundry v13 verifiziert).

## Funktionsumfang v1.0.0

- Ein konfigurierbarer Ring pro Token
- Radius in Scene-Distanzeinheiten (z. B. ft), gemessen vom Tokenrand nach außen
- Farbe, Linienbreite, optionale Füllung mit eigener Deckkraft
- Konfiguration über einen neuen Button im Token-HUD (rechte Spalte, Ring-Icon)
- Der Ring hängt als Kind-Objekt am Token selbst → Sichtbarkeit/Fog of War/Tokenbewegung
  funktionieren automatisch mit, ohne zusätzliche Logik

Bewusst **nicht** enthalten (ggf. für v2, falls gewünscht): mehrere Ringe pro Token,
Winkel/Bögen, rollenbasierte Sichtbarkeit ("nur GM sieht es"), Live-Vorschau während
der Eingabe, grid-basierte Formen.

## Technische Hinweise (für dich beim Debuggen)

- Hook `refreshToken` zeichnet den Ring bei jedem Refresh neu (Position, Größe, Update) —
  analog zu den Hook-Timing-Learnings aus dem Status-Effects-Modul, aber hier gibt es
  laut Recherche keine bekannte Breaking Change zwischen v13 und v14 bei diesem Hook.
- Daten liegen als Token-Flag unter `flags.shinys-token-aura-rings.aura`.
- Radius-Umrechnung: `canvas.grid.size / canvas.scene.grid.distance` ergibt Pixel pro
  Distanzeinheit.
- Der Ring wird als `PIXI.Graphics` an Index 0 des Token-Containers eingefügt (unterhalb
  der eigentlichen Token-Grafik).
- Token-HUD-Erweiterung nutzt denselben `html?.jquery ? html[0] : html`-Trick wie dein
  Status-Effects-Modul, falls Foundry mal jQuery, mal ein natives HTMLElement liefert.
- Dialog nutzt `foundry.applications.api.DialogV2.wait(...)` (v13/v14-Standard-API).

**Noch nicht live getestet** — bitte wie gewohnt in einer Session ausprobieren und
Ergebnisse zurückmelden, dann iterieren wir. Mögliche Stolpersteine, auf die ich nicht
100% verifizieren konnte, ohne es live zu sehen:

1. Ob `.col.right` / `.col-right` in deiner Foundry-v14-Version noch die richtige Klasse
   für die rechte HUD-Spalte ist.
2. Ob `fa-solid fa-ring` als Font-Awesome-Icon in deiner Version verfügbar ist (sonst
   z. B. `fa-solid fa-circle-notch` verwenden).

## Setup / Installation (gleicher Workflow wie beim Status-Effects-Modul)

1. Neues GitHub-Repo anlegen, z. B. `LegendaryShiny/Shinys-Token-Aura-Rings`, Branch `main`.
2. Diese Dateien in den Repo-Root hochladen (`module.json`, `scripts/`, `styles/`, `README.md`).
3. Falls dein Repo-Name/Owner von `LegendaryShiny/Shinys-Token-Aura-Rings` abweicht: die
   `url`, `manifest` und `download`-Felder in `module.json` entsprechend anpassen (beide
   zeigen wie gewohnt auf `raw.githubusercontent.com/.../refs/heads/main/...`).
4. Optional: `shinys-token-aura-rings.zip` mit allen Dateien erstellen und im Repo-Root
   ablegen (für den `download`-Link), analog zu deinem anderen Modul.
5. In Foundry/Forge über die Manifest-URL installieren.
6. Modul aktivieren, Token auswählen, im Token-HUD auf das neue Ring-Icon klicken,
   Radius/Farbe einstellen, speichern.

## Repo-Dateistruktur

```
module.json
scripts/shinys-token-aura-rings.js
styles/shinys-token-aura-rings.css
README.md
```
