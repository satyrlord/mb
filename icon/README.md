# Icon Resources

This folder is the canonical home for icon-pack resources and external icon assets.

## Purpose

- Store non-code icon assets used by icon packs.
- Track licensing and attribution for third-party resources.
- Keep pack-level metadata and provenance in one place.

## Files

- `ICON_SOURCES.md`: approved source catalog and import policy.
- `ATTRIBUTION.csv`: per-asset license attribution records.
- `icon-pack-catalog.json`: canonical list of current in-game
  icon packs and symbols.

## Notes

The current packs in `src/icons.ts` use Unicode glyphs and OpenMoji SVG files.
`npm run icons:sync` creates the matching catalog and inventory. Add an
attribution row in `ATTRIBUTION.csv` for each imported SVG file.
