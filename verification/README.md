# Fidelity Verification Pipeline

This pipeline verifies browser output against ROM-emulated reference frames.

## What it does

1. `verify:reference`
- Runs the NES ROM through `jsnes`.
- Presses `START` at configured frames.
- Captures reference frames into `verification/reference/`.

2. `verify:candidate`
- Opens the browser build using Playwright.
- Starts the mission.
- Captures the same frame numbers from the game canvas into `verification/candidate/`.

3. `verify:diff`
- Compares each reference/candidate frame with `pixelmatch`.
- Writes diff images to `verification/diff/`.
- Fails if mismatch exceeds threshold in config.

4. `verify:metrics`
- Compares candidate gameplay checkpoint metrics (`score`, `rifleAmmo`, `grenadeAmmo`, `damage`) against ROM-derived checkpoints in config.
- Writes `verification/diff/metrics-summary.json`.

5. `verify:fidelity`
- Runs build + reference capture + candidate capture + diff in sequence.

## Setup

```bash
npm install
npx playwright install chromium
```

## Run

```bash
npm run verify:fidelity
```

## Configuration

`verification/config/stage1.profile.json` controls:
- ROM path
- scripted reference input events
- reference mission-start absolute frame
- frame numbers to capture (mission-relative)
- diff threshold and pass/fail ratio
- candidate app URL
- gameplay metric checkpoints and allowed deltas

## Outputs

- `verification/reference/frame-XXXX.png`
- `verification/candidate/frame-XXXX.png`
- `verification/diff/frame-XXXX.png`
- `verification/diff/summary.json`
- `verification/diff/metrics-summary.json`
