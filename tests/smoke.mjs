import assert from "node:assert/strict";

class MockElement {
  constructor() {
    this.textContent = "";
    this.hidden = false;
    this.dataset = {};
    this.listeners = new Map();
    this.classList = {
      add() {},
      remove() {},
    };
  }

  addEventListener(type, callback) {
    this.listeners.set(type, callback);
  }

  focus() {}

  getBoundingClientRect() {
    return { left: 0, width: 960 };
  }

  setPointerCapture() {}
}

const gradient = { addColorStop() {} };
const drawingContext = {
  arc() {},
  beginPath() {},
  clearRect() {},
  closePath() {},
  createLinearGradient() {
    return gradient;
  },
  createRadialGradient() {
    return gradient;
  },
  drawImage() {},
  ellipse() {},
  fill() {},
  fillRect() {},
  fillText() {},
  lineTo() {},
  moveTo() {},
  restore() {},
  rotate() {},
  save() {},
  stroke() {},
  translate() {},
};

const canvas = new MockElement();
canvas.width = 960;
canvas.height = 600;
canvas.getContext = () => drawingContext;

const elements = new Map();
for (const selector of [
  "#score",
  "#wave",
  "#lives",
  "#systemStatus",
  "#gameOverlay",
  "#overlayKicker",
  "#overlayTitle",
  "#overlayText",
  "#primaryAction",
  "#waveMessage",
  "#moveLeft",
  "#moveRight",
  "#fire",
]) {
  elements.set(selector, new MockElement());
}
elements.set("#gameCanvas", canvas);

globalThis.document = {
  querySelector(selector) {
    return elements.get(selector);
  },
};

globalThis.window = {
  addEventListener() {},
  clearTimeout() {},
  matchMedia() {
    return { matches: false };
  },
  setTimeout() {
    return 1;
  },
};

globalThis.localStorage = {
  values: new Map(),
  getItem(key) {
    return this.values.get(key) ?? null;
  },
  setItem(key, value) {
    this.values.set(key, value);
  },
};

globalThis.requestAnimationFrame = () => 1;

globalThis.Image = class MockImage {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, callback) {
    this.listeners.set(type, callback);
  }

  set src(value) {
    this.source = value;
    queueMicrotask(() => this.listeners.get("load")?.());
  }
};

const { game, rectsOverlap } = await import("../src/game.js");

assert.equal(game.state, "ready");
game.start();
assert.equal(game.state, "playing");
assert.equal(game.wave, 1);
assert.equal(game.enemies.length, 21);

game.firePlayerShot();
assert.equal(game.projectiles.filter((projectile) => projectile.owner === "player").length, 1);

game.update(0.016);
game.render(0.016);

const startingLives = game.lives;
game.player.shieldTime = 2;
game.damagePlayer();
assert.equal(game.lives, startingLives);
assert.equal(game.player.shieldTime, 0);

game.player.invulnerableTime = 0;
game.damagePlayer();
assert.equal(game.lives, startingLives - 1);

game.enemies = [];
game.waveClearTimer = null;
game.updateWave(0.016);
assert.ok(game.waveClearTimer > 0);
game.updateWave(2);
assert.equal(game.wave, 2);
assert.ok(game.enemies.length > 0);

assert.equal(
  rectsOverlap(
    { x: 10, y: 10, width: 10, height: 10 },
    { x: 14, y: 14, width: 10, height: 10 },
  ),
  true,
);

console.log("Smoke test passed: start, render, firing, shield, damage, collision, and wave progression.");
