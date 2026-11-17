// Lumen Tide — tuning constants. One place for every number that shapes play.
export const CONFIG = {
  width: 1280,
  height: 720,
  seaLevel: 596, // y where the night sea begins
  player: {
    radius: 20,
    accel: 2600,
    maxSpeed: 430,
    friction: 0.86, // per-frame velocity retention at 60fps, scaled by dt
    hull: 3,
    maxHull: 5,
    invulnMs: 1400,
    magnetBase: 90,
    dashSpeed: 980,
    dashTime: 0.16,
    dashCooldownMs: 1200,
    lanternBase: 150,
  },
  mote: {
    radius: 9,
    fallMin: 34,
    fallMax: 78,
    score: 10,
    shardChance: 0.22,
  },
  wisp: {
    radius: 17,
    speedMin: 55,
    speedMax: 130,
    scoreOnBanish: 25,
  },
  boss: {
    radius: 62,
    hits: 3,
    score: 500,
  },
  waves: {
    total: 10,
    durationMs: 34000,
    moteQuotaBase: 14,
    moteQuotaPerWave: 3,
  },
  shop: {
    hull: { cost: 30, label: '+1 Hull', max: 5 },
    magnet: { cost: 20, label: 'Wider Magnet', max: 4 },
    dash: { cost: 25, label: 'Quicker Dash', max: 3 },
    lantern: { cost: 20, label: 'Brighter Lantern', max: 4 },
    score: { cost: 35, label: 'Golden Catch x2', max: 2 },
  },
  combo: {
    windowMs: 2600,
    step: 0.25,
    cap: 4,
  },
};
