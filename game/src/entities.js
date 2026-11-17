// Entities: the skiff, starlight motes, void wisps, the Storm Herald, particles.
import { CONFIG } from './config.js';
import { range } from './random.js';

export class Player {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = CONFIG.width / 2;
    this.y = CONFIG.height * 0.62;
    this.vx = 0;
    this.vy = 0;
    this.radius = CONFIG.player.radius;
    this.hull = CONFIG.player.hull;
    this.invulnUntil = 0;
    this.dashUntil = 0;
    this.dashReadyAt = 0;
    this.dashDir = { x: 0, y: -1 };
    this.trail = [];
    // Upgrades (bought with shards between waves)
    this.up = { magnet: 0, dash: 0, lantern: 0, score: 0 };
  }

  get magnetRadius() { return CONFIG.player.magnetBase + this.up.magnet * 45; }
  get lanternRadius() { return CONFIG.player.lanternBase + this.up.lantern * 35; }
  get maxHull() { return CONFIG.player.maxHull; }
  get dashCooldownMs() { return Math.max(500, CONFIG.player.dashCooldownMs - this.up.dash * 220); }
  get scoreMult() { return 1 + this.up.score * 1; } // Golden Catch doubles per level
  get maxSpeed() { return CONFIG.player.maxSpeed + this.up.dash * 18; }

  isDashing(now) { return now < this.dashUntil; }
  isInvuln(now) { return now < this.invulnUntil; }
  dashReady(now) { return now >= this.dashReadyAt; }
}

export class Mote {
  constructor(rng, wave) {
    this.x = range(rng, 30, CONFIG.width - 30);
    this.y = -20 - rng() * 120;
    this.vy = range(rng, CONFIG.mote.fallMin, CONFIG.mote.fallMax) * (1 + wave * 0.04);
    this.vx = range(rng, -14, 14);
    this.radius = CONFIG.mote.radius;
    this.isShard = rng() < CONFIG.mote.shardChance;
    this.hue = this.isShard ? 45 : range(rng, 185, 215); // shards are gold, motes are cyan
    this.phase = rng() * Math.PI * 2;
    this.spin = range(rng, 0.5, 1.6);
    this.dead = false;
  }

  update(dt, now) {
    this.y += this.vy * dt;
    this.x += this.vx * dt + Math.sin(now / 700 + this.phase) * 12 * dt;
    if (this.y > CONFIG.height + 30 || this.x < -40 || this.x > CONFIG.width + 40) this.dead = true;
  }
}

export class Wisp {
  constructor(rng, wave, x, y) {
    this.x = x !== undefined ? x : range(rng, 40, CONFIG.width - 40);
    this.y = y !== undefined ? y : -30;
    this.vy = range(rng, CONFIG.wisp.speedMin, CONFIG.wisp.speedMax) * (1 + wave * 0.05);
    this.vx = range(rng, -46, 46);
    this.radius = CONFIG.wisp.radius;
    this.phase = rng() * Math.PI * 2;
    this.wobble = range(rng, 20, 55);
    this.dead = false;
  }

  update(dt, now) {
    this.y += this.vy * dt;
    this.x += (this.vx + Math.sin(now / 500 + this.phase) * this.wobble) * dt;
    if (this.y > CONFIG.height + 40) this.dead = true;
  }
}

// The Storm Herald: a great wisp that sweeps the sky. Banished by 3 dash strikes.
export class Boss {
  constructor(rng) {
    this.x = CONFIG.width / 2;
    this.y = 130;
    this.radius = CONFIG.boss.radius;
    this.hitsLeft = CONFIG.boss.hits;
    this.dir = rng() < 0.5 ? 1 : -1;
    this.speed = 150;
    this.phase = 0;
    this.spawnTimer = 0;
    this.flashUntil = 0;
    this.dead = false;
  }

  update(dt, now, rng, spawnWisp) {
    this.x += this.dir * this.speed * dt;
    if (this.x < 110) { this.x = 110; this.dir = 1; }
    if (this.x > CONFIG.width - 110) { this.x = CONFIG.width - 110; this.dir = -1; }
    this.y = 130 + Math.sin(now / 900) * 34;
    this.phase += dt;
    this.spawnTimer -= dt * 1000;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 2400;
      spawnWisp(new Wisp(rng, 5, this.x + (rng() - 0.5) * 120, this.y + 50));
    }
  }
}

export class Particle {
  constructor(x, y, vx, vy, life, size, color) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.life = life; this.maxLife = life; this.size = size; this.color = color;
    this.dead = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.98; this.vy *= 0.98;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }
}

export class Floater {
  constructor(x, y, text, color) {
    this.x = x; this.y = y; this.text = text; this.color = color;
    this.life = 1.1; this.dead = false;
  }

  update(dt) {
    this.y -= 42 * dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }
}

export function burst(particles, x, y, color, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = (0.3 + Math.random() * 0.7) * speed;
    particles.push(new Particle(
      x, y, Math.cos(a) * s, Math.sin(a) * s,
      0.5 + Math.random() * 0.5, 2 + Math.random() * 3.5, color,
    ));
  }
}
