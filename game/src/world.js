// World: waves, spawning, collisions, scoring, combo, shop, boss fights.
import { CONFIG } from './config.js';
import { mulberry32, range } from './random.js';
import { Player, Mote, Wisp, Boss, Floater, burst } from './entities.js';

export const STATE = {
  MENU: 'menu',
  PLAYING: 'playing',
  SHOP: 'shop',
  PAUSED: 'paused',
  GAMEOVER: 'gameover',
  VICTORY: 'victory',
};

export class World {
  constructor(seed, sound) {
    this.seed = seed;
    this.rng = mulberry32(seed);
    this.sound = sound;
    this.state = STATE.MENU;
    this.player = new Player();
    this.motes = [];
    this.wisps = [];
    this.boss = null;
    this.particles = [];
    this.floaters = [];
    this.score = 0;
    this.shards = 0;
    this.wave = 0;
    this.waveT = 0;
    this.waveMotesSpawned = 0;
    this.waveMotesQuota = 0;
    this.moteTimer = 0;
    this.wispTimer = 0;
    this.combo = 0;
    this.comboMult = 1;
    this.comboUntil = 0;
    this.bestCombo = 0;
    this.motesCaught = 0;
    this.wispsBanished = 0;
    this.shake = 0;
    this.time = 0;
    this.waveBanner = '';
    this.waveBannerUntil = 0;
    this.bossDefeatedAt = 0;
    this.best = 0;
    try { this.best = Number(window.localStorage.getItem('lumen-tide-best') || 0) || 0; } catch (_) { this.best = 0; }
  }

  startGame() {
    this.player.reset();
    this.motes = []; this.wisps = []; this.boss = null;
    this.particles = []; this.floaters = [];
    this.score = 0; this.shards = 0;
    this.combo = 0; this.comboMult = 1; this.bestCombo = 0;
    this.motesCaught = 0; this.wispsBanished = 0;
    this.wave = 0;
    this.state = STATE.PLAYING;
    this.nextWave();
    this.sound.startMusic();
  }

  nextWave() {
    this.wave += 1;
    this.waveT = 0;
    this.waveMotesSpawned = 0;
    this.waveMotesQuota = CONFIG.waves.moteQuotaBase + this.wave * CONFIG.waves.moteQuotaPerWave;
    this.moteTimer = 0;
    this.wispTimer = 1200;
    if (this.wave % 5 === 0) {
      this.boss = new Boss(this.rng);
      this.waveBanner = `WAVE ${this.wave} — THE STORM HERALD`;
      this.sound.bossHit();
    } else {
      this.boss = null;
      this.waveBanner = `WAVE ${this.wave}`;
    }
    this.waveBannerUntil = this.time + 2200;
  }

  endWave() {
    const bonus = 50 * this.wave;
    this.score += bonus;
    this.floaters.push(new Floater(CONFIG.width / 2, CONFIG.height / 2 - 40, `WAVE CLEAR  +${bonus}`, '#ffd76a'));
    this.sound.waveClear();
    if (this.wave >= CONFIG.waves.total) {
      this.win();
      return;
    }
    this.state = STATE.SHOP;
    this.shopSelection = 0;
  }

  win() {
    this.state = STATE.VICTORY;
    this.saveBest();
    this.sound.victory();
  }

  lose() {
    this.state = STATE.GAMEOVER;
    this.saveBest();
    this.sound.gameOver();
    this.sound.stopMusic();
  }

  saveBest() {
    if (this.score > this.best) {
      this.best = this.score;
      try { window.localStorage.setItem('lumen-tide-best', String(this.best)); } catch (_) { /* storage unavailable */ }
    }
  }

  addScore(base, x, y) {
    const gained = Math.round(base * this.comboMult * this.player.scoreMult);
    this.score += gained;
    if (x !== undefined) this.floaters.push(new Floater(x, y, `+${gained}`, '#bfe9ff'));
    return gained;
  }

  bumpCombo(now) {
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.comboMult = Math.min(CONFIG.combo.cap, 1 + (this.combo - 1) * CONFIG.combo.step);
    this.comboUntil = now + CONFIG.combo.windowMs;
  }

  breakCombo() {
    this.combo = 0;
    this.comboMult = 1;
  }

  hurtPlayer(now) {
    if (this.player.isInvuln(now)) return;
    this.player.hull -= 1;
    this.player.invulnUntil = now + CONFIG.player.invulnMs;
    this.shake = 14;
    this.breakCombo();
    burst(this.particles, this.player.x, this.player.y, '#ff5d7a', 26, 260);
    this.sound.hit();
    if (this.player.hull <= 0) this.lose();
  }

  // Shop: entries are [key, label, cost, maxLevel, apply]
  shopItems() {
    const p = this.player;
    const s = CONFIG.shop;
    return [
      { key: 'hull', label: s.hull.label, cost: s.hull.cost, level: p.hull, max: s.hull.max, can: p.hull < s.hull.max },
      { key: 'magnet', label: s.magnet.label, cost: s.magnet.cost, level: p.up.magnet, max: s.magnet.max, can: p.up.magnet < s.magnet.max },
      { key: 'dash', label: s.dash.label, cost: s.dash.cost, level: p.up.dash, max: s.dash.max, can: p.up.dash < s.dash.max },
      { key: 'lantern', label: s.lantern.label, cost: s.lantern.cost, level: p.up.lantern, max: s.lantern.max, can: p.up.lantern < s.lantern.max },
      { key: 'score', label: s.score.label, cost: s.score.cost, level: p.up.score, max: s.score.max, can: p.up.score < s.score.max },
    ];
  }

  buy(key) {
    const item = this.shopItems().find((i) => i.key === key);
    if (!item || !item.can || this.shards < item.cost) { this.sound.denied(); return false; }
    this.shards -= item.cost;
    if (key === 'hull') this.player.hull += 1;
    else this.player.up[key] += 1;
    this.sound.buy();
    burst(this.particles, this.player.x, this.player.y, '#ffd76a', 18, 180);
    return true;
  }

  update(dt, now, input) {
    this.time += dt * 1000;
    if (this.state !== STATE.PLAYING) {
      this.updateAmbient(dt, now);
      return;
    }

    // Combo expiry
    if (this.combo > 0 && now > this.comboUntil) this.breakCombo();

    // --- Player steering: keys accelerate, mouse pulls the skiff ---
    const p = this.player;
    const steer = input.steerVector();
    if (steer.x !== 0 || steer.y !== 0) {
      p.vx += steer.x * CONFIG.player.accel * dt;
      p.vy += steer.y * CONFIG.player.accel * dt;
    } else if (input.mouse.inside) {
      const dx = input.mouse.x - p.x;
      const dy = input.mouse.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 6) {
        const pull = Math.min(1, dist / 220) * CONFIG.player.accel * 0.9;
        p.vx += (dx / dist) * pull * dt;
        p.vy += (dy / dist) * pull * dt;
      }
    }
    const damp = Math.pow(CONFIG.player.friction, dt * 60);
    p.vx *= damp; p.vy *= damp;
    const speed = Math.hypot(p.vx, p.vy);
    const max = p.isDashing(now) ? CONFIG.player.dashSpeed : p.maxSpeed;
    if (speed > max) { p.vx = (p.vx / speed) * max; p.vy = (p.vy / speed) * max; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.x = Math.max(p.radius, Math.min(CONFIG.width - p.radius, p.x));
    p.y = Math.max(p.radius, Math.min(CONFIG.height - p.radius, p.y));

    // Dash
    if (input.consumeDash() && p.dashReady(now) && !p.isDashing(now)) {
      const dir = speed > 40 ? { x: p.vx / speed, y: p.vy / speed } : p.dashDir;
      p.dashDir = dir;
      p.dashUntil = now + CONFIG.player.dashTime * 1000;
      p.dashReadyAt = now + p.dashCooldownMs;
      p.vx = dir.x * CONFIG.player.dashSpeed;
      p.vy = dir.y * CONFIG.player.dashSpeed;
      burst(this.particles, p.x, p.y, '#9fd8ff', 12, 200);
      this.sound.dash();
    }
    // Trail
    p.trail.push({ x: p.x, y: p.y, life: 0.35 });
    if (p.trail.length > 26) p.trail.shift();

    // --- Spawning ---
    this.waveT += dt * 1000;
    this.moteTimer -= dt * 1000;
    const moteInterval = Math.max(260, 900 - this.wave * 55);
    if (this.moteTimer <= 0 && this.waveMotesSpawned < this.waveMotesQuota) {
      this.moteTimer = moteInterval * range(this.rng, 0.7, 1.3);
      this.motes.push(new Mote(this.rng, this.wave));
      this.waveMotesSpawned += 1;
    }
    this.wispTimer -= dt * 1000;
    const wispInterval = Math.max(900, 2600 - this.wave * 160);
    if (this.wispTimer <= 0) {
      this.wispTimer = wispInterval * range(this.rng, 0.75, 1.25);
      this.wisps.push(new Wisp(this.rng, this.wave));
    }

    // --- Boss ---
    if (this.boss) {
      this.boss.update(dt, now, this.rng, (w) => this.wisps.push(w));
      // Dash strike on the boss
      if (p.isDashing(now)) {
        const d = Math.hypot(p.x - this.boss.x, p.y - this.boss.y);
        if (d < p.radius + this.boss.radius + 6 && now > (this.boss.lastHitAt || 0) + 500) {
          this.boss.lastHitAt = now;
          this.boss.hitsLeft -= 1;
          this.boss.flashUntil = now + 180;
          burst(this.particles, this.boss.x, this.boss.y, '#c9a7ff', 30, 320);
          this.shake = 10;
          if (this.boss.hitsLeft <= 0) {
            this.boss.dead = true;
            this.addScore(CONFIG.boss.score, this.boss.x, this.boss.y);
            this.wispsBanished += 1;
            burst(this.particles, this.boss.x, this.boss.y, '#e8d5ff', 60, 420);
            this.sound.banish();
            this.bossDefeatedAt = this.time;
            this.boss = null;
          } else {
            this.sound.bossHit();
          }
        }
      }
    }

    // --- Entities ---
    for (const m of this.motes) m.update(dt, now);
    for (const w of this.wisps) w.update(dt, now);
    this.motes = this.motes.filter((m) => !m.dead);
    this.wisps = this.wisps.filter((w) => !w.dead);

    // Magnet: motes drift toward the lantern
    for (const m of this.motes) {
      const dx = p.x - m.x, dy = p.y - m.y;
      const d = Math.hypot(dx, dy);
      if (d < p.magnetRadius && d > 1) {
        const pull = (1 - d / p.magnetRadius) * 340;
        m.x += (dx / d) * pull * dt;
        m.y += (dy / d) * pull * dt;
      }
    }

    // --- Collisions: collect motes ---
    for (const m of this.motes) {
      const d = Math.hypot(p.x - m.x, p.y - m.y);
      if (d < p.radius + m.radius + 6) {
        m.dead = true;
        this.motesCaught += 1;
        this.bumpCombo(now);
        this.addScore(CONFIG.mote.score, m.x, m.y);
        if (m.isShard) {
          this.shards += 1;
          this.sound.shard();
          burst(this.particles, m.x, m.y, '#ffd76a', 14, 220);
        } else {
          this.sound.pickup(this.comboMult);
          burst(this.particles, m.x, m.y, '#8fe3ff', 10, 170);
        }
      }
    }
    this.motes = this.motes.filter((m) => !m.dead);

    // --- Collisions: wisps ---
    for (const w of this.wisps) {
      const d = Math.hypot(p.x - w.x, p.y - w.y);
      if (d < p.radius + w.radius - 4) {
        if (p.isDashing(now)) {
          w.dead = true;
          this.wispsBanished += 1;
          this.bumpCombo(now);
          this.addScore(CONFIG.wisp.scoreOnBanish, w.x, w.y);
          burst(this.particles, w.x, w.y, '#c9a7ff', 22, 300);
          this.sound.banish();
        } else {
          this.hurtPlayer(now);
          w.dead = true; // the wisp spends itself on the hit
          if (this.state !== STATE.PLAYING) return;
        }
      }
    }
    this.wisps = this.wisps.filter((w) => !w.dead);

    // --- Wave end: quota met, field clear, boss gone ---
    const fieldClear = this.motes.length === 0 && this.wisps.length === 0 && !this.boss;
    const quotaDone = this.waveMotesSpawned >= this.waveMotesQuota;
    if ((quotaDone && fieldClear) || this.waveT > CONFIG.waves.durationMs + 20000) {
      this.endWave();
      return;
    }

    this.updateAmbient(dt, now);
  }

  updateAmbient(dt, now) {
    for (const pt of this.particles) pt.update(dt);
    this.particles = this.particles.filter((pt) => !pt.dead);
    for (const f of this.floaters) f.update(dt);
    this.floaters = this.floaters.filter((f) => !f.dead);
    for (const t of this.player.trail) t.life -= dt;
    this.player.trail = this.player.trail.filter((t) => t.life > 0);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 40);
  }
}
