import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const profilePath = path.join(root, "verification/config/stage1.profile.json");
const profile = JSON.parse(await fs.readFile(profilePath, "utf8"));

const candidateManifestPath = path.join(root, "verification/candidate/manifest.json");
const summaryPath = path.join(root, "verification/diff/metrics-summary.json");

const candidateManifest = JSON.parse(await fs.readFile(candidateManifestPath, "utf8"));
const candidateByTarget = new Map(candidateManifest.metrics.map((entry) => [entry.targetFrame, entry]));

const maxDelta = profile.maxMetricDelta;
const checks = [];

for (const reference of profile.referenceMetricCheckpoints) {
  const candidate = candidateByTarget.get(reference.frame);

  if (!candidate) {
    checks.push({ frame: reference.frame, pass: false, error: "Missing candidate checkpoint" });
    continue;
  }

  const deltas = {
    score: Math.abs((candidate.score ?? 0) - (reference.score ?? 0)),
    rifleAmmo: Math.abs((candidate.rifleAmmo ?? 0) - (reference.rifleAmmo ?? 0)),
    grenadeAmmo: Math.abs((candidate.grenadeAmmo ?? 0) - (reference.grenadeAmmo ?? 0)),
    damage: Math.abs((candidate.damage ?? 0) - (reference.damage ?? 0))
  };

  const pass =
    deltas.score <= maxDelta.score &&
    deltas.rifleAmmo <= maxDelta.rifleAmmo &&
    deltas.grenadeAmmo <= maxDelta.grenadeAmmo &&
    deltas.damage <= maxDelta.damage;

  checks.push({
    frame: reference.frame,
    pass,
    reference,
    candidate,
    deltas
  });
}

const pass = checks.every((check) => check.pass);
const summary = {
  generatedAt: new Date().toISOString(),
  pass,
  maxDelta,
  checks
};

await fs.mkdir(path.dirname(summaryPath), { recursive: true });
await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));

if (pass) {
  console.log("Gameplay metrics check passed");
} else {
  const failed = checks.filter((check) => !check.pass).length;
  console.error(`Gameplay metrics check failed (${failed} checkpoint(s))`);
  process.exitCode = 1;
}
