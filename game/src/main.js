// Lumen Tide — entry point: loop, state machine, menus, deterministic screenshots.
import { CONFIG } from './config.js';
import { mulberry32 } from './random.js';
import { SoundEngine } from './audio.js';
import { Input } from './input.js';
import { Renderer } from './render.js';
import { World, STATE } from './world.js';
import { Mote, Wisp, Boss, burst } from './entities.js';

const params = new URLSearchParams(window.location.search);
const seedParam = Number(params.get('seed') || 20261117);
const shot = params.get('shot'); // start | play | end — deterministic scene for screenshots

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const sound = new SoundEngine();
const input = new Input(canvas);
const renderer = new Renderer(canvas);
const world = new World(seedParam, sound);

function resize() {
  renderer.resize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);
resize();

function announce(msg) {
  if (statusEl) statusEl.textContent = msg;
}

// ---------- deterministic screenshot scenes ----------
function buildShotScene(kind) {
  const rng = mulberry32(seedParam);
  world.state = STATE.PLAYING;
  world.wave = kind === 'play' ? 4 : 1;
  world.score = kind === 'play' ? 2840 : kind === 'end' ? 12340 : 0;
  world.shards = kind === 'play' ? 17 : 0;
  world.best = 12340;
  world.combo = kind === 'play' ? 9 : 0;
  world.comboMult = kind === 'play' ? 3 : 1;
  world.comboUntil = performance.now() + 2000;
  world.motesCaught = kind === 'play' ? 61 : kind === 'end' ? 214 : 0;
  world.wispsBanished = kind === 'play' ? 12 : kind === 'end' ? 43 : 0;
  world.bestCombo = kind === 'play' ? 14 : kind === 'end' ? 22 : 0;
  world.waveMotesQuota = 26;
  world.waveMotesSpawned = kind === 'play' ? 18 : 0;
  world.player.x = 640; world.player.y = 430;
  world.player.hull = kind === 'end' ? 1 : 3;
  if (kind === 'start') {
    world.state = STATE.MENU;
    return;
  }
  if (kind === 'end') {
    world.state = STATE.VICTORY;
    return;
  }
  if (kind === 'shop') {
    world.state = STATE.SHOP;
    world.wave = 3;
    world.score = 5120;
    world.shards = 42;
    world.best = 12340;
    world.motesCaught = 98;
    world.wispsBanished = 19;
    world.bestCombo = 17;
    world.player.hull = 2;
    world.player.up.magnet = 1;
    world.player.up.dash = 1;
    world.shopSelection = 1;
    return;
  }
  // play: a busy mid-wave-4 scene, boss-free
  world.waveBanner = 'WAVE 4';
  world.waveBannerUntil = performance.now() + 60000;
  for (let i = 0; i < 14; i++) {
    const m = new Mote(rng, 4);
    m.y = 60 + rng() * 420;
    m.x = 60 + rng() * (CONFIG.width - 120);
    world.motes.push(m);
  }
  for (let i = 0; i < 6; i++) {
    const w = new Wisp(rng, 4);
    w.y = 80 + rng() * 320;
    w.x = 80 + rng() * (CONFIG.width - 160);
    world.wisps.push(w);
  }
  const boss = new Boss(rng);
  boss.x = 950; boss.y = 150; boss.hitsLeft = 2;
  world.boss = boss;
  burst(world.particles, 640, 430, '#8fe3ff', 16, 160);
  burst(world.particles, 950, 150, '#c9a7ff', 20, 200);
  world.floaters.push({ x: 700, y: 380, text: '+30', color: '#bfe9ff', life: 1.1, dead: false, update(dt) { this.y -= 42 * dt; this.life -= dt; if (this.life <= 0) this.dead = true; } });
}

// ---------- menu / shop input ----------
function handleMenuKeys() {
  const key = input.consumeKey();
  if (key === 'Enter' || key === ' ') {
    sound.ensure();
    world.startGame();
    announce('Sailing! Gather starlight, dodge the wisps.');
    return;
  }
  if (key === 'm' || key === 'M') sound.setMuted(!sound.muted);
  if (input.consumeClick()) {
    sound.ensure();
    world.startGame();
    announce('Sailing! Gather starlight, dodge the wisps.');
  }
}

function handleShopKeys() {
  const key = input.consumeKey();
  const items = world.shopItems();
  if (key === 'ArrowUp' || key === 'w' || key === 'W') {
    world.shopSelection = (world.shopSelection + items.length - 1) % items.length;
  } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
    world.shopSelection = (world.shopSelection + 1) % items.length;
  } else if (key === 'Enter') {
    world.buy(items[world.shopSelection].key);
  } else if (key === ' ' || key === 'Spacebar') {
    world.state = STATE.PLAYING;
    world.nextWave();
    announce(`Wave ${world.wave} begins.`);
  }
  if (input.consumeClick()) {
    // Click a shop row to buy it, click below the list to continue.
    const { s, ox, oy } = renderer.viewTransform();
    const mx = (input.mouse.x - ox) / s;
    const my = (input.mouse.y - oy) / s;
    let bought = false;
    items.forEach((it, i) => {
      const y = 196 + i * 62;
      if (mx >= CONFIG.width / 2 - 300 && mx <= CONFIG.width / 2 + 300 && my >= y && my <= y + 50) {
        world.shopSelection = i;
        world.buy(it.key);
        bought = true;
      }
    });
    if (!bought && my > 196 + items.length * 62) {
      world.state = STATE.PLAYING;
      world.nextWave();
    }
  }
}

function handleEndKeys() {
  const key = input.consumeKey();
  if (key === 'r' || key === 'R' || key === 'Enter' || key === ' ') {
    world.startGame();
    announce('Sailing again!');
    return;
  }
  if (input.consumeClick()) world.startGame();
}

// ---------- main loop ----------
let last = performance.now();
let shotDone = false;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (shot) {
    if (!shotDone) {
      buildShotScene(shot);
      shotDone = true;
    }
    // Frozen deterministic scene: render one frame, no updates.
    renderer.render(world, now, input);
    requestAnimationFrame(frame);
    return;
  }

  // Global keys
  const key = input.consumeKey();
  let handledGlobally = false;
  if (key === 'm' || key === 'M') { sound.setMuted(!sound.muted); handledGlobally = true; }
  if (key === 'p' || key === 'P') {
    if (world.state === STATE.PLAYING) { world.state = STATE.PAUSED; announce('Paused.'); }
    else if (world.state === STATE.PAUSED) { world.state = STATE.PLAYING; announce('Sailing on.'); }
    handledGlobally = true;
  }
  if ((key === 'r' || key === 'R') && (world.state === STATE.PLAYING || world.state === STATE.PAUSED)) {
    world.startGame();
    handledGlobally = true;
  }
  // Re-queue the key for state handlers that need it (Enter/Space/arrows in menus).
  if (key && !handledGlobally) input.anyKey = key;

  if (world.state === STATE.MENU) handleMenuKeys();
  else if (world.state === STATE.SHOP) handleShopKeys();
  else if (world.state === STATE.GAMEOVER || world.state === STATE.VICTORY) handleEndKeys();
  else input.consumeClick(); // clicks during play only dash (handled in world.update)

  world.update(dt, now, input);
  renderer.render(world, now, input);
  requestAnimationFrame(frame);
}

// First user gesture unlocks audio (browsers require it).
window.addEventListener('pointerdown', () => sound.ensure(), { once: true });
window.addEventListener('keydown', () => sound.ensure(), { once: true });

announce('Lumen Tide loaded. Press Enter to set sail.');
requestAnimationFrame(frame);
