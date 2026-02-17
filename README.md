# Operation Wolf (NES) Browser Clone

Phaser 3 + TypeScript implementation of a near-1:1 **Stage 1** Operation Wolf clone for desktop browsers.

This game implementation was built entirely by Codex.

## Controls

- `Arrow Keys`: move crosshair
- `X`: fire active weapon (`B` button)
- `Z`: quick grenade (`A` button)
- `Enter`: Start (pause / return after outcome)
- `Right Shift`: Select (cycle active weapon)

## Development

```bash
npm install
npm run dev
```

## Build and test

```bash
npm run test
npm run build
```

## ROM asset extraction (build-time)

1. Place ROM locally (example: `rom/operation_wolf_rom.nes`)
2. Run:

```bash
OW_ROM_PATH=rom/operation_wolf_rom.nes npm run extract-assets
```

This generates:

- `public/generated/chr-sheet.png`
- `public/generated/sprites.json`

No runtime ROM upload is required.

## Fidelity verification

Run automated ROM-vs-browser visual verification:

```bash
npx playwright install chromium
npm run verify:fidelity
```

See `verification/README.md` for details and thresholds.
