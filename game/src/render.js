// Lumen Tide — every pixel is drawn here: sky, aurora, sea, entities, HUD, screens.
import { CONFIG } from './config.js';
import { STATE } from './world.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stars = [];
    // Three parallax star layers, built once.
    for (let layer = 0; layer < 3; layer++) {
      for (let i = 0; i < 46 - layer * 10; i++) {
        this.stars.push({
          x: Math.random() * CONFIG.width,
          y: Math.random() * CONFIG.seaLevel,
          r: 0.6 + Math.random() * (1.6 - layer * 0.35),
          tw: Math.random() * Math.PI * 2,
          sp: 0.4 + Math.random() * 1.2,
          layer,
        });
      }
    }
    this.auroraPhase = 0;
  }

  resize(cssW, cssH) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cssW = cssW;
    this.cssH = cssH;
  }

  // Fit the 1280x720 world into any window, letterboxed.
  viewTransform() {
    const w = this.cssW || CONFIG.width;
    const h = this.cssH || CONFIG.height;
    const s = Math.min(w / CONFIG.width, h / CONFIG.height);
    const ox = (w - CONFIG.width * s) / 2;
    const oy = (h - CONFIG.height * s) / 2;
    return { s, ox, oy };
  }

  render(world, now, input) {
    const ctx = this.ctx;
    const { s, ox, oy } = this.viewTransform();
    ctx.clearRect(0, 0, this.cssW, this.cssH);
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(s, s);
    if (world.shake > 0.5) {
      ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
    }
    this.drawSky(ctx, now);
    this.drawSea(ctx, now);
    this.drawMotes(ctx, world, now);
    this.drawWisps(ctx, world, now);
    if (world.boss) this.drawBoss(ctx, world, now);
    this.drawPlayer(ctx, world, now);
    this.drawParticles(ctx, world);
    this.drawFloaters(ctx, world);
    this.drawVignette(ctx);
    ctx.restore();

    // Screen-space overlays (HUD / menus) in world coordinates again.
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(s, s);
    if (world.state === STATE.PLAYING || world.state === STATE.PAUSED) this.drawHUD(ctx, world, now);
    if (world.state === STATE.PLAYING && now < world.waveBannerUntil) this.drawBanner(ctx, world, now);
    if (world.state === STATE.MENU) this.drawMenu(ctx, world, now);
    if (world.state === STATE.SHOP) this.drawShop(ctx, world, now);
    if (world.state === STATE.PAUSED) this.drawPaused(ctx, world);
    if (world.state === STATE.GAMEOVER) this.drawEnd(ctx, world, false);
    if (world.state === STATE.VICTORY) this.drawEnd(ctx, world, true);
    ctx.restore();
  }

  // ---------- background ----------

  drawSky(ctx, now) {
    const g = ctx.createLinearGradient(0, 0, 0, CONFIG.seaLevel);
    g.addColorStop(0, '#070a1e');
    g.addColorStop(0.45, '#141a3d');
    g.addColorStop(0.8, '#2a2a55');
    g.addColorStop(1, '#3d2b5e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.seaLevel + 2);

    // Moon with halo
    const mx = 1090, my = 92;
    const halo = ctx.createRadialGradient(mx, my, 10, mx, my, 120);
    halo.addColorStop(0, 'rgba(255, 246, 214, 0.55)');
    halo.addColorStop(0.4, 'rgba(255, 246, 214, 0.14)');
    halo.addColorStop(1, 'rgba(255, 246, 214, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(mx - 130, my - 130, 260, 260);
    ctx.fillStyle = '#fff6d6';
    ctx.beginPath(); ctx.arc(mx, my, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(214, 196, 150, 0.5)';
    ctx.beginPath(); ctx.arc(mx - 10, my - 6, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + 12, my + 10, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + 6, my - 14, 4, 0, Math.PI * 2); ctx.fill();

    // Stars
    for (const st of this.stars) {
      const a = 0.35 + 0.65 * Math.abs(Math.sin(now / 1000 * st.sp + st.tw));
      ctx.globalAlpha = a * (1 - st.layer * 0.22);
      ctx.fillStyle = '#dfe9ff';
      ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Aurora bands
    this.auroraPhase += 0.00012;
    const bands = [
      { y: 120, amp: 46, hue: 'rgba(64, 224, 180, 0.20)', w: 0.0016, ph: 0 },
      { y: 190, amp: 60, hue: 'rgba(120, 140, 255, 0.16)', w: 0.0011, ph: 2.1 },
      { y: 260, amp: 40, hue: 'rgba(190, 110, 255, 0.13)', w: 0.0021, ph: 4.4 },
    ];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of bands) {
      ctx.beginPath();
      ctx.moveTo(0, b.y);
      for (let x = 0; x <= CONFIG.width; x += 16) {
        const y = b.y + Math.sin(x * b.w + now / 1400 + b.ph) * b.amp
          + Math.sin(x * b.w * 2.7 + now / 900) * b.amp * 0.3;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(CONFIG.width, b.y + 150);
      ctx.lineTo(0, b.y + 150);
      ctx.closePath();
      ctx.fillStyle = b.hue;
      ctx.fill();
    }
    ctx.restore();
  }

  drawSea(ctx, now) {
    const g = ctx.createLinearGradient(0, CONFIG.seaLevel, 0, CONFIG.height);
    g.addColorStop(0, '#1b2a52');
    g.addColorStop(0.35, '#12203f');
    g.addColorStop(1, '#070a1a');
    ctx.fillStyle = g;
    ctx.fillRect(0, CONFIG.seaLevel, CONFIG.width, CONFIG.height - CONFIG.seaLevel);

    // Moon glitter path on the water
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) {
      const y = CONFIG.seaLevel + 8 + i * 4.4;
      const wob = Math.sin(now / 700 + i * 1.7) * (6 + i * 1.6);
      const wdt = 26 + i * 5;
      ctx.globalAlpha = 0.16 * (1 - i / 30);
      ctx.fillStyle = '#ffe9a8';
      ctx.fillRect(1090 - wdt / 2 + wob, y, wdt, 2.2);
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    // Wave lines
    ctx.strokeStyle = 'rgba(140, 190, 255, 0.20)';
    ctx.lineWidth = 1.5;
    for (let row = 0; row < 4; row++) {
      const y0 = CONFIG.seaLevel + 18 + row * 26;
      ctx.beginPath();
      for (let x = 0; x <= CONFIG.width; x += 14) {
        const y = y0 + Math.sin(x * 0.012 + now / 800 + row * 1.9) * 3.5;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  // ---------- entities ----------

  drawPlayer(ctx, world, now) {
    const p = world.player;
    if (world.state !== STATE.PLAYING && world.state !== STATE.PAUSED && world.state !== STATE.SHOP) return;
    const blink = p.isInvuln(now) && Math.floor(now / 90) % 2 === 0;
    if (blink) return;

    // Lantern glow
    const glow = ctx.createRadialGradient(p.x, p.y, 8, p.x, p.y, p.lanternRadius);
    glow.addColorStop(0, 'rgba(255, 214, 106, 0.34)');
    glow.addColorStop(0.55, 'rgba(255, 190, 90, 0.10)');
    glow.addColorStop(1, 'rgba(255, 190, 90, 0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.lanternRadius, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Trail
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const t of p.trail) {
      ctx.globalAlpha = (t.life / 0.35) * 0.35;
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath(); ctx.arc(t.x, t.y, 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    // Dash ring
    if (p.isDashing(now)) {
      ctx.strokeStyle = 'rgba(159, 216, 255, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius + 10, 0, Math.PI * 2); ctx.stroke();
    }

    // Skiff hull
    ctx.save();
    ctx.translate(p.x, p.y);
    const tilt = Math.max(-0.22, Math.min(0.22, p.vx * 0.00045));
    ctx.rotate(tilt);
    ctx.fillStyle = '#7a4a2b';
    ctx.beginPath();
    ctx.moveTo(-24, 2); ctx.quadraticCurveTo(0, 16, 24, 2);
    ctx.lineTo(18, 8); ctx.quadraticCurveTo(0, 20, -18, 8);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a06a3f';
    ctx.fillRect(-20, -2, 40, 5);
    // Mast + lantern
    ctx.strokeStyle = '#5d3a22';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, -34); ctx.stroke();
    const flick = 0.85 + Math.sin(now / 130) * 0.15;
    ctx.fillStyle = `rgba(255, 214, 106, ${flick})`;
    ctx.beginPath(); ctx.arc(0, -40, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3a2412';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -40, 8, 0, Math.PI * 2); ctx.stroke();
    // Sail
    ctx.fillStyle = 'rgba(240, 230, 200, 0.92)';
    ctx.beginPath();
    ctx.moveTo(2, -32); ctx.quadraticCurveTo(20, -20, 4, -6); ctx.closePath(); ctx.fill();
    ctx.restore();

    // Dash cooldown pip under the skiff
    if (!p.dashReady(now)) {
      const frac = 1 - (p.dashReadyAt - now) / p.dashCooldownMs;
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(p.x - 18, p.y + 26, 36, 4);
      ctx.fillStyle = '#9fd8ff';
      ctx.fillRect(p.x - 18, p.y + 26, 36 * Math.max(0, frac), 4);
    }
  }

  drawMotes(ctx, world, now) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const m of world.motes) {
      const pulse = 0.75 + Math.sin(now / 240 + m.phase) * 0.25;
      const col = m.isShard ? '255, 215, 106' : '143, 227, 255';
      const glow = ctx.createRadialGradient(m.x, m.y, 1, m.x, m.y, m.radius * 3.2);
      glow.addColorStop(0, `rgba(${col}, ${0.75 * pulse})`);
      glow.addColorStop(1, `rgba(${col}, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.radius * 3.2, 0, Math.PI * 2); ctx.fill();
      // Four-point star
      const r = m.radius * (m.isShard ? 1.25 : 1);
      ctx.fillStyle = m.isShard ? '#ffe9a8' : '#d8f6ff';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y - r);
      ctx.quadraticCurveTo(m.x, m.y, m.x + r, m.y);
      ctx.quadraticCurveTo(m.x, m.y, m.x, m.y + r);
      ctx.quadraticCurveTo(m.x, m.y, m.x - r, m.y);
      ctx.quadraticCurveTo(m.x, m.y, m.x, m.y - r);
      ctx.fill();
    }
    ctx.restore();
  }

  drawWisps(ctx, world, now) {
    ctx.save();
    for (const w of world.wisps) {
      const wob = Math.sin(now / 300 + w.phase) * 3;
      const g = ctx.createRadialGradient(w.x, w.y + wob, 2, w.x, w.y + wob, w.radius * 1.9);
      g.addColorStop(0, 'rgba(190, 130, 255, 0.85)');
      g.addColorStop(0.55, 'rgba(120, 60, 200, 0.45)');
      g.addColorStop(1, 'rgba(80, 30, 160, 0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(w.x, w.y + wob, w.radius * 1.9, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      // Smoky body
      ctx.fillStyle = 'rgba(60, 25, 110, 0.85)';
      ctx.beginPath(); ctx.arc(w.x, w.y + wob, w.radius, 0, Math.PI * 2); ctx.fill();
      // Angry eyes
      ctx.fillStyle = '#ff5d7a';
      ctx.beginPath(); ctx.arc(w.x - 6, w.y - 3 + wob, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(w.x + 6, w.y - 3 + wob, 2.6, 0, Math.PI * 2); ctx.fill();
      // Jagged mouth
      ctx.strokeStyle = '#ff8fa8';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(w.x - 7, w.y + 7 + wob);
      ctx.lineTo(w.x - 2, w.y + 4 + wob);
      ctx.lineTo(w.x + 2, w.y + 8 + wob);
      ctx.lineTo(w.x + 7, w.y + 5 + wob);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawBoss(ctx, world, now) {
    const b = world.boss;
    const flash = now < b.flashUntil;
    ctx.save();
    const g = ctx.createRadialGradient(b.x, b.y, 10, b.x, b.y, b.radius * 2.4);
    g.addColorStop(0, flash ? 'rgba(255,255,255,0.9)' : 'rgba(200, 140, 255, 0.7)');
    g.addColorStop(0.5, 'rgba(130, 60, 220, 0.4)');
    g.addColorStop(1, 'rgba(80, 30, 160, 0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.radius * 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = flash ? '#e8d5ff' : '#3a1568';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(200, 140, 255, 0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.stroke();
    // Crown of spikes
    ctx.fillStyle = '#c9a7ff';
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.42;
      const x1 = b.x + Math.cos(a) * b.radius * 0.95;
      const y1 = b.y + Math.sin(a) * b.radius * 0.95;
      const x2 = b.x + Math.cos(a) * (b.radius + 16);
      const y2 = b.y + Math.sin(a) * (b.radius + 16);
      ctx.beginPath();
      ctx.moveTo(x1 - 5, y1); ctx.lineTo(x2, y2); ctx.lineTo(x1 + 5, y1);
      ctx.closePath(); ctx.fill();
    }
    // Eyes
    ctx.fillStyle = '#ff2e63';
    ctx.beginPath(); ctx.arc(b.x - 20, b.y - 10, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(b.x + 20, b.y - 10, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(b.x - 18, b.y - 12, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(b.x + 22, b.y - 12, 2.4, 0, Math.PI * 2); ctx.fill();
    // Health pips
    for (let i = 0; i < CONFIG.boss.hits; i++) {
      ctx.fillStyle = i < b.hitsLeft ? '#ff2e63' : 'rgba(255,255,255,0.2)';
      ctx.beginPath(); ctx.arc(b.x - 24 + i * 24, b.y + b.radius + 18, 6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  drawParticles(ctx, world) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const pt of world.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  drawFloaters(ctx, world) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px Georgia, serif';
    for (const f of world.floaters) {
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  drawVignette(ctx) {
    const g = ctx.createRadialGradient(
      CONFIG.width / 2, CONFIG.height / 2, CONFIG.height * 0.45,
      CONFIG.width / 2, CONFIG.height / 2, CONFIG.height * 0.95,
    );
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(2,4,12,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  }

  // ---------- HUD & screens ----------

  panel(ctx, x, y, w, h, alpha) {
    ctx.fillStyle = `rgba(8, 12, 30, ${alpha === undefined ? 0.72 : alpha})`;
    ctx.strokeStyle = 'rgba(160, 190, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.fill(); ctx.stroke();
  }

  drawHUD(ctx, world, now) {
    const p = world.player;
    // Top-left: score + best
    ctx.textAlign = 'left';
    ctx.fillStyle = '#eaf3ff';
    ctx.font = 'bold 30px Georgia, serif';
    ctx.fillText(`Score  ${world.score.toLocaleString('en-US')}`, 24, 44);
    ctx.font = '16px Georgia, serif';
    ctx.fillStyle = 'rgba(234, 243, 255, 0.75)';
    ctx.fillText(`Best  ${world.best.toLocaleString('en-US')}`, 24, 68);
    // Top-center: wave
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(`WAVE ${world.wave} / ${CONFIG.waves.total}`, CONFIG.width / 2, 40);
    // Wave progress bar
    const quotaFrac = Math.min(1, world.waveMotesSpawned / Math.max(1, world.waveMotesQuota));
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(CONFIG.width / 2 - 90, 52, 180, 6);
    ctx.fillStyle = '#8fe3ff';
    ctx.fillRect(CONFIG.width / 2 - 90, 52, 180 * quotaFrac, 6);
    // Top-right: hull hearts + shards
    ctx.textAlign = 'right';
    let hx = CONFIG.width - 24;
    for (let i = 0; i < p.maxHull; i++) {
      ctx.font = '26px serif';
      ctx.fillText(i < p.hull ? '❤' : '♡', hx, 44);
      hx -= 32;
    }
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillStyle = '#ffd76a';
    ctx.fillText(`◆ ${world.shards}`, CONFIG.width - 24, 76);
    // Combo meter (bottom-left)
    if (world.combo >= 2) {
      const frac = Math.max(0, (world.comboUntil - now) / CONFIG.combo.windowMs);
      ctx.textAlign = 'left';
      ctx.font = 'bold 26px Georgia, serif';
      ctx.fillStyle = '#ffb3c8';
      ctx.fillText(`COMBO x${world.comboMult.toFixed(2)}  (${world.combo})`, 24, CONFIG.height - 24);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(24, CONFIG.height - 16, 160, 5);
      ctx.fillStyle = '#ff8fb0';
      ctx.fillRect(24, CONFIG.height - 16, 160 * frac, 5);
    }
    // Controls hint (bottom-right, fades after wave 1)
    if (world.wave <= 1 && world.time < 12000) {
      ctx.textAlign = 'right';
      ctx.font = '15px Georgia, serif';
      ctx.fillStyle = 'rgba(234, 243, 255, 0.6)';
      ctx.fillText('Move: mouse / WASD · Dash: Space / click · Pause: P · Mute: M', CONFIG.width - 24, CONFIG.height - 24);
    }
    // Boss bar
    if (world.boss) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 18px Georgia, serif';
      ctx.fillStyle = '#e8c9ff';
      ctx.fillText('THE STORM HERALD — dash through it!', CONFIG.width / 2, 92);
    }
  }

  drawBanner(ctx, world, now) {
    const frac = Math.max(0, (world.waveBannerUntil - now) / 2200);
    const alpha = Math.min(1, frac * 2);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.font = 'bold 44px Georgia, serif';
    ctx.fillStyle = '#fff3c4';
    ctx.shadowColor = 'rgba(255, 190, 90, 0.8)';
    ctx.shadowBlur = 24;
    ctx.fillText(world.waveBanner, CONFIG.width / 2, 250);
    ctx.restore();
  }

  drawMenu(ctx, world, now) {
    ctx.fillStyle = 'rgba(4, 6, 18, 0.45)';
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
    ctx.textAlign = 'center';
    // Title
    const bob = Math.sin(now / 600) * 6;
    ctx.font = 'bold 84px Georgia, serif';
    ctx.fillStyle = '#fff3c4';
    ctx.shadowColor = 'rgba(255, 190, 90, 0.9)';
    ctx.shadowBlur = 34;
    ctx.fillText('LUMEN TIDE', CONFIG.width / 2, 210 + bob);
    ctx.shadowBlur = 0;
    ctx.font = 'italic 24px Georgia, serif';
    ctx.fillStyle = '#bfe9ff';
    ctx.fillText('a lantern-skiff starlight harvest', CONFIG.width / 2, 252 + bob);
    // How to play panel
    this.panel(ctx, CONFIG.width / 2 - 330, 300, 660, 218);
    ctx.fillStyle = '#eaf3ff';
    ctx.font = '19px Georgia, serif';
    const lines = [
      'Steer your skiff with the mouse or WASD / arrow keys.',
      'Gather falling starlight — chains build your combo multiplier.',
      'Gold shards buy upgrades between waves. Spend them well.',
      'Void wisps burn your hull on touch. DASH (Space / click) to banish them.',
      'Every 5th wave the Storm Herald rises — dash through it 3 times.',
      'Survive all 10 waves and bring the Dawn.',
    ];
    lines.forEach((ln, i) => ctx.fillText(ln, CONFIG.width / 2, 334 + i * 30));
    // Start prompt
    const pulse = 0.6 + Math.sin(now / 350) * 0.4;
    ctx.globalAlpha = pulse;
    ctx.font = 'bold 26px Georgia, serif';
    ctx.fillStyle = '#ffd76a';
    ctx.fillText('Press ENTER or click to set sail', CONFIG.width / 2, 566);
    ctx.globalAlpha = 1;
    if (world.best > 0) {
      ctx.font = '18px Georgia, serif';
      ctx.fillStyle = 'rgba(234, 243, 255, 0.8)';
      ctx.fillText(`Best voyage: ${world.best.toLocaleString('en-US')}`, CONFIG.width / 2, 606);
    }
    ctx.font = '15px Georgia, serif';
    ctx.fillStyle = 'rgba(234, 243, 255, 0.55)';
    ctx.fillText('P pause · M mute · R restart', CONFIG.width / 2, 648);
  }

  drawShop(ctx, world) {
    ctx.fillStyle = 'rgba(4, 6, 18, 0.6)';
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
    ctx.textAlign = 'center';
    ctx.font = 'bold 40px Georgia, serif';
    ctx.fillStyle = '#fff3c4';
    ctx.fillText(`WAVE ${world.wave} CLEAR`, CONFIG.width / 2, 120);
    ctx.font = '20px Georgia, serif';
    ctx.fillStyle = '#ffd76a';
    ctx.fillText(`You hold ◆ ${world.shards} shards — spend them before the next wave`, CONFIG.width / 2, 156);
    const items = world.shopItems();
    const x0 = CONFIG.width / 2 - 300;
    items.forEach((it, i) => {
      const y = 196 + i * 62;
      const sel = i === world.shopSelection;
      const afford = world.shards >= it.cost && it.can;
      ctx.fillStyle = sel ? 'rgba(120, 150, 255, 0.30)' : 'rgba(8, 12, 30, 0.72)';
      ctx.strokeStyle = sel ? '#9fd8ff' : 'rgba(160, 190, 255, 0.35)';
      ctx.lineWidth = sel ? 2.5 : 1.5;
      ctx.beginPath(); ctx.roundRect(x0, y, 600, 50, 10); ctx.fill(); ctx.stroke();
      ctx.textAlign = 'left';
      ctx.font = 'bold 20px Georgia, serif';
      ctx.fillStyle = it.can ? '#eaf3ff' : 'rgba(234, 243, 255, 0.4)';
      ctx.fillText(it.label, x0 + 20, y + 32);
      // level pips
      for (let l = 0; l < it.max; l++) {
        ctx.fillStyle = l < it.level ? '#ffd76a' : 'rgba(255,255,255,0.2)';
        ctx.beginPath(); ctx.arc(x0 + 300 + l * 20, y + 25, 6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.textAlign = 'right';
      ctx.font = 'bold 20px Georgia, serif';
      ctx.fillStyle = !it.can ? 'rgba(234, 243, 255, 0.4)' : afford ? '#ffd76a' : '#ff8fa8';
      ctx.fillText(it.can ? `◆ ${it.cost}` : 'MAX', x0 + 580, y + 32);
    });
    ctx.textAlign = 'center';
    ctx.font = '19px Georgia, serif';
    ctx.fillStyle = '#bfe9ff';
    ctx.fillText('↑ ↓ choose · ENTER buy · SPACE set sail for the next wave', CONFIG.width / 2, 196 + items.length * 62 + 26);
    ctx.font = '16px Georgia, serif';
    ctx.fillStyle = 'rgba(234, 243, 255, 0.7)';
    ctx.fillText(`Score ${world.score.toLocaleString('en-US')} · Hull ${world.player.hull}/${world.player.maxHull} · Best combo x${world.bestCombo}`, CONFIG.width / 2, 196 + items.length * 62 + 56);
  }

  drawPaused(ctx) {
    ctx.fillStyle = 'rgba(4, 6, 18, 0.55)';
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
    ctx.textAlign = 'center';
    ctx.font = 'bold 48px Georgia, serif';
    ctx.fillStyle = '#eaf3ff';
    ctx.fillText('BECALMED', CONFIG.width / 2, 340);
    ctx.font = '20px Georgia, serif';
    ctx.fillStyle = '#bfe9ff';
    ctx.fillText('Press P to keep sailing', CONFIG.width / 2, 384);
  }

  drawEnd(ctx, world, victory) {
    ctx.fillStyle = victory ? 'rgba(20, 26, 8, 0.55)' : 'rgba(10, 4, 12, 0.6)';
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
    ctx.textAlign = 'center';
    ctx.font = 'bold 56px Georgia, serif';
    ctx.fillStyle = victory ? '#fff3c4' : '#ff8fa8';
    ctx.shadowColor = victory ? 'rgba(255, 190, 90, 0.9)' : 'rgba(255, 60, 100, 0.7)';
    ctx.shadowBlur = 26;
    ctx.fillText(victory ? 'THE DAWN BREAKS' : 'THE TIDE TOOK YOU', CONFIG.width / 2, 210);
    ctx.shadowBlur = 0;
    ctx.font = 'italic 22px Georgia, serif';
    ctx.fillStyle = '#bfe9ff';
    ctx.fillText(
      victory ? 'Ten waves weathered. The lantern burns on.' : 'Your lantern gutters out beneath the waves.',
      CONFIG.width / 2, 252,
    );
    this.panel(ctx, CONFIG.width / 2 - 260, 300, 520, 190);
    ctx.fillStyle = '#eaf3ff';
    ctx.font = 'bold 30px Georgia, serif';
    ctx.fillText(`Score  ${world.score.toLocaleString('en-US')}`, CONFIG.width / 2, 348);
    ctx.font = '19px Georgia, serif';
    ctx.fillStyle = 'rgba(234, 243, 255, 0.85)';
    ctx.fillText(`Best  ${world.best.toLocaleString('en-US')}  ·  Waves cleared  ${victory ? 10 : world.wave - 1}`, CONFIG.width / 2, 388);
    ctx.fillText(`Starlight caught  ${world.motesCaught}  ·  Wisps banished  ${world.wispsBanished}  ·  Best combo  ${world.bestCombo}`, CONFIG.width / 2, 420);
    if (world.score >= world.best && world.score > 0) {
      ctx.fillStyle = '#ffd76a';
      ctx.font = 'bold 20px Georgia, serif';
      ctx.fillText('★ New best voyage! ★', CONFIG.width / 2, 458);
    }
    const pulse = 0.6 + Math.sin(performance.now() / 350) * 0.4;
    ctx.globalAlpha = pulse;
    ctx.font = 'bold 24px Georgia, serif';
    ctx.fillStyle = '#ffd76a';
    ctx.fillText('Press R or click to sail again', CONFIG.width / 2, 552);
    ctx.globalAlpha = 1;
  }
}
