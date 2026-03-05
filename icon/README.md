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

Current in-game icon packs are Unicode glyph resources defined in `src/icons.ts`.
When adding non-Unicode assets (SVG/PNG/etc), place the files under this
folder and add corresponding attribution rows.
