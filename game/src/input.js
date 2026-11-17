// Keyboard + mouse input. Mouse steers, keys steer too; Space/click dashes.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, inside: false };
    this.dashQueued = false;
    this.clickQueued = false;
    this.anyKey = null; // last keydown event, consumed by menus
    this._onKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (!e.repeat) {
        this.anyKey = e.key;
        if (e.key === ' ' || e.key === 'Spacebar') this.dashQueued = true;
      }
      this.keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    };
    this._onKeyUp = (e) => {
      this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    };
    this._onMouseMove = (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left;
      this.mouse.y = e.clientY - r.top;
      this.mouse.inside = true;
    };
    this._onMouseDown = (e) => {
      if (e.button === 0) { this.clickQueued = true; this.dashQueued = true; }
    };
    this._onBlur = () => { this.keys.clear(); };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('blur', this._onBlur);
  }

  consumeKey() {
    const k = this.anyKey;
    this.anyKey = null;
    return k;
  }

  consumeDash() {
    const d = this.dashQueued;
    this.dashQueued = false;
    return d;
  }

  consumeClick() {
    const c = this.clickQueued;
    this.clickQueued = false;
    return c;
  }

  // Normalised steering vector from WASD / arrows. Zero when no key held.
  steerVector() {
    let x = 0, y = 0;
    if (this.keys.has('a') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('w') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('s') || this.keys.has('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) { const inv = 1 / Math.hypot(x, y); x *= inv; y *= inv; }
    return { x, y };
  }
}
