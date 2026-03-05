# Icon Pack Generator

This project includes a local TypeScript script that fetches free SVG icon
metadata from the web and generates pack proposals with a 60% emoji / 40% SVG
ratio.

## Run Locally in VS Code

```bash
npm run icons:generate-packs
```

You can also run with a deterministic seed:

```bash
npx tsx ./tools/generate-icon-packs.ts \
 --config ./config/icon-pack-generator.json \
 --seed 42
```

## What It Generates

- `artifacts/generated-icon-packs.json`
- `artifacts/generated-icon-assets.json`
- `artifacts/generated-icon-attribution.csv`

## Source and Ratio Configuration

Edit `config/icon-pack-generator.json` to control:

- pack target list
- keyword mapping per pack
- source metadata endpoints (free web icon sources)
- ratio (`emojiRatio`, `svgRatio`)
- per-pack icon count (`iconsPerPack`)
- SVG download behavior (`autoDownloadSvg`)

## Integration Notes

- Generated outputs are proposals so you can review before promotion.
- Downloaded SVG files are saved in `icon/openmoji/svg/` by default.
- Attribution rows are emitted to a separate generated CSV for easy merge.
