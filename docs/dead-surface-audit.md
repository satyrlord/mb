# Dead Surface Audit Checklist

Use this checklist when reviewing for dead or unnecessary code surfaces.
Focus on reachability and ownership, not only lint/compile success.

## 1) Runtime Config Keys

- List keys in `config/*.cfg` and confirm each key is parsed in `src/`.
- Confirm each parsed key is actually consumed by runtime behavior.
- Flag keys that are parsed but only duplicate defaults with no runtime effect.
- Remove orphaned keys from docs when key support is removed.

## 2) DOM Surface

- For each `id`/class in `index.html`, find JS/CSS consumers.
- Flag SVG filters, hidden templates, and layers with no active references.
- Verify removed DOM nodes do not leave stale selectors in CSS/TS.

## 3) JavaScript/TypeScript Reachability

- Find exported symbols with no internal or external usage.
- Find init/bootstrap functions that are no longer called.
- Flag constants that only feed removed features.
- Check for fallback branches that can never execute.

## 4) CSS Surface

- Find keyframes with no `animation-name` consumers.
- Find CSS custom properties never read with `var(...)`.
- Find selector blocks targeting removed DOM ids/classes.
- Identify feature-specific effects that should be merged or removed.

## 5) Cross-Layer Coupling

- Confirm TS timing/config values align with CSS timing variables.
- Confirm config docs match current parser keys and value ranges.
- Confirm feature names are consistent across cfg, TS, CSS, and docs.

## 6) Validation and Test Gate

- Run `npm run validate` after any surface removal.
- Run targeted tests for updated config loaders and affected modules.
- Add/adjust tests when a config shape or parser contract changes.

## 7) Decision Rule

- Keep a surface only if it is both reachable and intentionally owned.
- If reachable but not needed by product direction, remove it.
- Prefer one control interface per effect family (avoid dual control paths).
