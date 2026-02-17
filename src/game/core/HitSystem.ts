export type HitTarget = {
  x: number;
  y: number;
  radius: number;
  depth: number;
  isCivilian: boolean;
  alive: boolean;
  scoreValue: number;
  applyDamage: (damage: number) => boolean;
};

export type HitResult = {
  hit: boolean;
  killed: boolean;
  civilian: boolean;
  target?: HitTarget;
};

export class HitSystem {
  public resolve(
    crosshairX: number,
    crosshairY: number,
    radius: number,
    damage: number,
    targets: HitTarget[]
  ): HitResult {
    const candidates = targets
      .filter((target) => target.alive)
      .map((target) => {
        const dx = target.x - crosshairX;
        const dy = target.y - crosshairY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return { target, distance };
      })
      .filter(({ target, distance }) => distance <= radius + target.radius)
      .sort((a, b) => {
        if (a.target.depth !== b.target.depth) {
          return b.target.depth - a.target.depth;
        }
        return a.distance - b.distance;
      });

    if (candidates.length === 0) {
      return { hit: false, killed: false, civilian: false };
    }

    const selected = candidates[0].target;
    const killed = selected.applyDamage(damage);

    return {
      hit: true,
      killed,
      civilian: selected.isCivilian,
      target: selected
    };
  }
}
