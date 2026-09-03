const canvas = document.querySelector("#gameCanvas");
const context = canvas.getContext("2d");

const ui = {
  score: document.querySelector("#score"),
  wave: document.querySelector("#wave"),
  lives: document.querySelector("#lives"),
  status: document.querySelector("#systemStatus"),
  overlay: document.querySelector("#gameOverlay"),
  overlayKicker: document.querySelector("#overlayKicker"),
  overlayTitle: document.querySelector("#overlayTitle"),
  overlayText: document.querySelector("#overlayText"),
  primaryAction: document.querySelector("#primaryAction"),
  waveMessage: document.querySelector("#waveMessage"),
  moveLeft: document.querySelector("#moveLeft"),
  moveRight: document.querySelector("#moveRight"),
  fire: document.querySelector("#fire"),
};

const WORLD = {
  width: canvas.width,
  height: canvas.height,
  margin: 32,
};

const COLORS = {
  cyan: "#48dffc",
  violet: "#9f7cff",
  yellow: "#ffca58",
  red: "#ff647c",
  white: "#eff5ff",
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const random = (minimum, maximum) => minimum + Math.random() * (maximum - minimum);
const choose = (items) => items[Math.floor(Math.random() * items.length)];

function rectsOverlap(first, second) {
  return (
    first.x - first.width / 2 < second.x + second.width / 2 &&
    first.x + first.width / 2 > second.x - second.width / 2 &&
    first.y - first.height / 2 < second.y + second.height / 2 &&
    first.y + first.height / 2 > second.y - second.height / 2
  );
}

function setText(element, value) {
  const text = String(value);
  if (element.textContent !== text) element.textContent = text;
}

function loadImage(source) {
  return new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener("error", () => resolve(null), { once: true });
    image.src = source;
  });
}

class AudioSystem {
  constructor() {
    this.enabled = true;
    this.audioContext = null;
  }

  unlock() {
    if (!this.audioContext) {
      const BrowserAudioContext = window.AudioContext || window.webkitAudioContext;
      if (BrowserAudioContext) this.audioContext = new BrowserAudioContext();
    }

    if (this.audioContext?.state === "suspended") this.audioContext.resume();
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) this.unlock();
    return this.enabled;
  }

  tone({ frequency, duration = 0.08, type = "square", volume = 0.035, slide = 0 }) {
    if (!this.enabled) return;
    this.unlock();
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency + slide), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(this.audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  shoot() {
    this.tone({ frequency: 620, duration: 0.055, slide: -170, volume: 0.026 });
  }

  enemyShoot() {
    this.tone({ frequency: 180, duration: 0.09, type: "sawtooth", slide: 90, volume: 0.016 });
  }

  hit() {
    this.tone({ frequency: 115, duration: 0.16, type: "sawtooth", slide: -55, volume: 0.045 });
  }

  collect() {
    this.tone({ frequency: 540, duration: 0.16, type: "sine", slide: 460, volume: 0.045 });
  }

  wave() {
    this.tone({ frequency: 330, duration: 0.2, type: "triangle", slide: 330, volume: 0.04 });
  }
}

class InputManager {
  constructor() {
    this.keys = new Set();
    this.virtualKeys = new Set();

    window.addEventListener("keydown", (event) => {
      if (["ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
      this.keys.add(event.code);
    });

    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.code);
    });
  }

  isDown(...codes) {
    return codes.some((code) => this.keys.has(code) || this.virtualKeys.has(code));
  }

  setVirtual(code, active) {
    if (active) this.virtualKeys.add(code);
    else this.virtualKeys.delete(code);
  }

  clear() {
    this.keys.clear();
    this.virtualKeys.clear();
  }
}

class Starfield {
  constructor() {
    const count = reducedMotion ? 55 : 105;
    this.stars = Array.from({ length: count }, () => this.createStar(true));
  }

  createStar(initial = false) {
    const depth = random(0.2, 1);
    return {
      x: random(0, WORLD.width),
      y: initial ? random(0, WORLD.height) : -8,
      depth,
      radius: random(0.45, 1.7) * depth,
      alpha: random(0.28, 0.92),
    };
  }

  update(deltaTime, speedMultiplier = 1) {
    for (const star of this.stars) {
      star.y += (22 + 86 * star.depth) * speedMultiplier * deltaTime;
      if (star.y > WORLD.height + 6) Object.assign(star, this.createStar());
    }
  }

  draw(ctx) {
    ctx.save();
    for (const star of this.stars) {
      ctx.globalAlpha = star.alpha;
      ctx.fillStyle = star.depth > 0.72 ? "#a8efff" : "#c7d6ff";
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  burst(x, y, color, count = 12, force = 150) {
    const amount = reducedMotion ? Math.ceil(count / 2) : count;
    for (let index = 0; index < amount; index += 1) {
      const angle = random(0, Math.PI * 2);
      const speed = random(force * 0.35, force);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: random(0.28, 0.72),
        maxLife: 0,
        size: random(1.5, 4.2),
        color,
      });
      this.particles.at(-1).maxLife = this.particles.at(-1).life;
    }
  }

  trail(x, y) {
    if (reducedMotion || Math.random() > 0.62) return;
    this.particles.push({
      x: x + random(-10, 10),
      y,
      vx: random(-18, 18),
      vy: random(70, 130),
      life: random(0.18, 0.38),
      maxLife: 0,
      size: random(1.5, 3.6),
      color: choose([COLORS.cyan, "#6d8bff", COLORS.white]),
    });
    this.particles.at(-1).maxLife = this.particles.at(-1).life;
  }

  update(deltaTime) {
    for (const particle of this.particles) {
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      particle.vx *= 0.985;
      particle.vy *= 0.985;
      particle.life -= deltaTime;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const particle of this.particles) {
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

class Projectile {
  constructor({ x, y, velocityY, owner }) {
    this.x = x;
    this.y = y;
    this.velocityY = velocityY;
    this.owner = owner;
    this.width = owner === "player" ? 5 : 7;
    this.height = owner === "player" ? 22 : 16;
    this.dead = false;
  }

  update(deltaTime) {
    this.y += this.velocityY * deltaTime;
    if (this.y < -30 || this.y > WORLD.height + 30) this.dead = true;
  }

  draw(ctx) {
    const color = this.owner === "player" ? COLORS.cyan : COLORS.red;
    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
    ctx.globalAlpha = 0.45;
    ctx.fillRect(this.x - 1, this.y, 2, this.owner === "player" ? 24 : -18);
    ctx.restore();
  }
}

class Enemy {
  constructor({ x, y, row, column, wave, image }) {
    this.x = x;
    this.y = y;
    this.row = row;
    this.column = column;
    this.width = 54;
    this.height = 34;
    this.image = image;
    this.phase = random(0, Math.PI * 2);
    this.hitPoints = wave >= 4 && row === 0 ? 2 : 1;
    this.dead = false;
  }

  draw(ctx, time) {
    const hover = Math.sin(time * 3 + this.phase) * 2.3;
    const hitColor = this.hitPoints > 1 ? COLORS.yellow : COLORS.violet;

    ctx.save();
    ctx.translate(this.x, this.y + hover);
    ctx.shadowBlur = 20;
    ctx.shadowColor = hitColor;

    if (this.image) {
      ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);
    } else {
      ctx.fillStyle = hitColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 0.72;
    ctx.fillStyle = hitColor;
    ctx.fillRect(-15, 15, 30, 2);
    ctx.restore();
  }
}

class PowerUp {
  constructor({ x, y, type, image }) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.image = image;
    this.width = 34;
    this.height = 34;
    this.velocityY = 115;
    this.rotation = 0;
    this.dead = false;
  }

  update(deltaTime) {
    this.y += this.velocityY * deltaTime;
    this.rotation += deltaTime * 2.6;
    if (this.y > WORLD.height + 40) this.dead = true;
  }

  draw(ctx) {
    const color = this.type === "shield" ? COLORS.cyan : COLORS.yellow;
    const symbol = this.type === "shield" ? "S" : "R";

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.sin(this.rotation) * 0.08);
    ctx.shadowBlur = 24;
    ctx.shadowColor = color;

    if (this.image) ctx.drawImage(this.image, -17, -17, 34, 34);
    else {
      ctx.fillStyle = color;
      ctx.fillRect(-16, -16, 32, 32);
    }

    ctx.fillStyle = "#07101c";
    ctx.font = "900 14px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(symbol, 0, 1);
    ctx.restore();
  }
}

class Player {
  constructor(image) {
    this.image = image;
    this.width = 76;
    this.height = 72;
    this.x = WORLD.width / 2;
    this.y = WORLD.height - 66;
    this.speed = 470;
    this.cooldown = 0;
    this.rapidFireTime = 0;
    this.shieldTime = 0;
    this.invulnerableTime = 0;
  }

  update(deltaTime, input) {
    let direction = 0;
    if (input.isDown("ArrowLeft", "KeyA")) direction -= 1;
    if (input.isDown("ArrowRight", "KeyD")) direction += 1;

    this.x += direction * this.speed * deltaTime;
    this.x = clamp(this.x, WORLD.margin + this.width / 2, WORLD.width - WORLD.margin - this.width / 2);
    this.cooldown = Math.max(0, this.cooldown - deltaTime);
    this.rapidFireTime = Math.max(0, this.rapidFireTime - deltaTime);
    this.shieldTime = Math.max(0, this.shieldTime - deltaTime);
    this.invulnerableTime = Math.max(0, this.invulnerableTime - deltaTime);
  }

  draw(ctx, time) {
    if (this.invulnerableTime > 0 && Math.floor(time * 12) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    const flameLength = 13 + Math.sin(time * 26) * 5;
    const flame = ctx.createLinearGradient(0, 22, 0, 22 + flameLength);
    flame.addColorStop(0, COLORS.white);
    flame.addColorStop(0.35, COLORS.cyan);
    flame.addColorStop(1, "rgba(72, 108, 255, 0)");
    ctx.fillStyle = flame;
    ctx.beginPath();
    ctx.moveTo(-9, 21);
    ctx.lineTo(0, 22 + flameLength);
    ctx.lineTo(9, 21);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 24;
    ctx.shadowColor = COLORS.cyan;
    if (this.image) ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);
    else {
      ctx.fillStyle = COLORS.white;
      ctx.beginPath();
      ctx.moveTo(0, -36);
      ctx.lineTo(31, 30);
      ctx.lineTo(0, 18);
      ctx.lineTo(-31, 30);
      ctx.closePath();
      ctx.fill();
    }

    if (this.shieldTime > 0) {
      ctx.globalAlpha = 0.48 + Math.sin(time * 5) * 0.12;
      ctx.strokeStyle = COLORS.cyan;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(0, 0, 48, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

class Game {
  constructor(images) {
    this.images = images;
    this.input = new InputManager();
    this.audio = new AudioSystem();
    this.starfield = new Starfield();
    this.particles = new ParticleSystem();
    this.state = "ready";
    this.score = 0;
    this.wave = 1;
    this.lives = 3;
    this.player = new Player(images.player);
    this.enemies = [];
    this.projectiles = [];
    this.powerUps = [];
    this.fleetDirection = 1;
    this.fleetSpeed = 52;
    this.enemyShootTimer = 1;
    this.waveClearTimer = null;
    this.lastFrameTime = performance.now();
    this.shakeTime = 0;
    this.shakeStrength = 0;
    this.highScore = this.readHighScore();

    this.bindControls();
    this.updateHud();
    requestAnimationFrame((time) => this.loop(time));
  }

  readHighScore() {
    try {
      return Number.parseInt(localStorage.getItem("spacecraftDefenderHighScore") || "0", 10);
    } catch {
      return 0;
    }
  }

  saveHighScore() {
    this.highScore = Math.max(this.highScore, this.score);
    try {
      localStorage.setItem("spacecraftDefenderHighScore", String(this.highScore));
    } catch {
      // The game remains fully playable when storage is unavailable.
    }
  }

  bindControls() {
    ui.primaryAction.addEventListener("click", () => {
      if (this.state === "paused") this.resume();
      else this.start();
    });

    window.addEventListener("keydown", (event) => {
      if (event.repeat) return;

      if (event.code === "Enter" && ["ready", "game-over"].includes(this.state)) this.start();
      if (event.code === "KeyP" || event.code === "Escape") this.togglePause();
      if (event.code === "KeyM") {
        const enabled = this.audio.toggle();
        this.setStatus(enabled ? "Sound on" : "Muted", enabled ? "" : "warning");
      }
    });

    window.addEventListener("blur", () => {
      if (this.state === "playing") this.pause();
      this.input.clear();
    });

    this.bindHoldButton(ui.moveLeft, "ArrowLeft");
    this.bindHoldButton(ui.moveRight, "ArrowRight");
    this.bindHoldButton(ui.fire, "Space");

    let pointerActive = false;
    const movePlayerToPointer = (event) => {
      if (!pointerActive || this.state !== "playing") return;
      const bounds = canvas.getBoundingClientRect();
      const pointerX = ((event.clientX - bounds.left) / bounds.width) * WORLD.width;
      this.player.x = clamp(pointerX, WORLD.margin + this.player.width / 2, WORLD.width - WORLD.margin - this.player.width / 2);
    };

    canvas.addEventListener("pointerdown", (event) => {
      pointerActive = true;
      canvas.setPointerCapture?.(event.pointerId);
      movePlayerToPointer(event);
    });
    canvas.addEventListener("pointermove", movePlayerToPointer);
    canvas.addEventListener("pointerup", () => {
      pointerActive = false;
    });
    canvas.addEventListener("pointercancel", () => {
      pointerActive = false;
    });
  }

  bindHoldButton(button, code) {
    const activate = (event) => {
      event.preventDefault();
      this.audio.unlock();
      this.input.setVirtual(code, true);
      button.classList.add("is-active");
    };
    const release = () => {
      this.input.setVirtual(code, false);
      button.classList.remove("is-active");
    };

    button.addEventListener("pointerdown", activate);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("pointerleave", release);
  }

  start() {
    this.audio.unlock();
    this.score = 0;
    this.wave = 1;
    this.lives = 3;
    this.player = new Player(this.images.player);
    this.projectiles = [];
    this.powerUps = [];
    this.particles = new ParticleSystem();
    this.state = "playing";
    this.createWave();
    this.hideOverlay();
    this.updateHud();
    canvas.focus();
  }

  createWave() {
    this.enemies = [];
    this.projectiles = this.projectiles.filter((projectile) => projectile.owner === "player");
    this.fleetDirection = Math.random() > 0.5 ? 1 : -1;
    this.fleetSpeed = 45 + this.wave * 10;
    this.enemyShootTimer = 0.9;
    this.waveClearTimer = null;

    const rows = Math.min(4, 2 + this.wave);
    const columns = Math.min(10, 6 + this.wave);
    const horizontalGap = 76;
    const verticalGap = 56;
    const formationWidth = (columns - 1) * horizontalGap;
    const startX = (WORLD.width - formationWidth) / 2;

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        this.enemies.push(
          new Enemy({
            x: startX + column * horizontalGap,
            y: 88 + row * verticalGap,
            row,
            column,
            wave: this.wave,
            image: this.images.enemy,
          }),
        );
      }
    }

    this.showWaveMessage(`Wave ${String(this.wave).padStart(2, "0")}`);
    this.audio.wave();
  }

  pause() {
    if (this.state !== "playing") return;
    this.state = "paused";
    this.showOverlay({
      kicker: "Mission suspended",
      title: "Paused",
      text: "Your sector is holding. Resume when you are ready to continue the defence.",
      action: "Resume mission",
    });
    this.setStatus("Paused", "warning");
  }

  resume() {
    if (this.state !== "paused") return;
    this.state = "playing";
    this.hideOverlay();
    this.lastFrameTime = performance.now();
    canvas.focus();
  }

  togglePause() {
    if (this.state === "playing") this.pause();
    else if (this.state === "paused") this.resume();
  }

  endGame() {
    this.state = "game-over";
    this.saveHighScore();
    this.showOverlay({
      kicker: `High score ${String(this.highScore).padStart(6, "0")}`,
      title: "Signal lost",
      text: `You defended ${this.wave} wave${this.wave === 1 ? "" : "s"} and scored ${this.score.toLocaleString()} points. Recalibrate and try again.`,
      action: "Restart mission",
    });
    this.setStatus("Offline", "danger");
  }

  showOverlay({ kicker, title, text, action }) {
    setText(ui.overlayKicker, kicker);
    setText(ui.overlayTitle, title);
    setText(ui.overlayText, text);
    setText(ui.primaryAction, action);
    ui.overlay.hidden = false;
  }

  hideOverlay() {
    ui.overlay.hidden = true;
  }

  showWaveMessage(message) {
    setText(ui.waveMessage, message);
    ui.waveMessage.classList.add("is-visible");
    window.clearTimeout(this.waveMessageTimer);
    this.waveMessageTimer = window.setTimeout(() => ui.waveMessage.classList.remove("is-visible"), 900);
  }

  setStatus(message, tone = "") {
    setText(ui.status, message);
    ui.status.dataset.tone = tone;
  }

  updateHud() {
    setText(ui.score, String(this.score).padStart(6, "0"));
    setText(ui.wave, String(this.wave).padStart(2, "0"));
    setText(ui.lives, Array.from({ length: this.lives }, () => "●").join(" ") || "—");

    if (this.state === "playing") {
      if (this.player.shieldTime > 0) this.setStatus(`Shield ${Math.ceil(this.player.shieldTime)}s`);
      else if (this.player.rapidFireTime > 0) this.setStatus(`Rapid ${Math.ceil(this.player.rapidFireTime)}s`);
      else this.setStatus("Engaged");
    }
  }

  firePlayerShot() {
    if (this.player.cooldown > 0) return;

    this.projectiles.push(
      new Projectile({
        x: this.player.x,
        y: this.player.y - this.player.height / 2,
        velocityY: -720,
        owner: "player",
      }),
    );
    this.player.cooldown = this.player.rapidFireTime > 0 ? 0.095 : 0.22;
    this.audio.shoot();
  }

  fireEnemyShot() {
    const lowestByColumn = new Map();
    for (const enemy of this.enemies) {
      const current = lowestByColumn.get(enemy.column);
      if (!current || enemy.y > current.y) lowestByColumn.set(enemy.column, enemy);
    }

    const shooter = choose([...lowestByColumn.values()]);
    if (!shooter) return;

    this.projectiles.push(
      new Projectile({
        x: shooter.x,
        y: shooter.y + shooter.height / 2,
        velocityY: 245 + this.wave * 16,
        owner: "enemy",
      }),
    );
    this.audio.enemyShoot();
  }

  updateFleet(deltaTime) {
    if (!this.enemies.length) return;

    const minimumX = Math.min(...this.enemies.map((enemy) => enemy.x - enemy.width / 2));
    const maximumX = Math.max(...this.enemies.map((enemy) => enemy.x + enemy.width / 2));
    let movement = this.fleetDirection * this.fleetSpeed * deltaTime;

    if (minimumX + movement < WORLD.margin || maximumX + movement > WORLD.width - WORLD.margin) {
      this.fleetDirection *= -1;
      movement = this.fleetDirection * this.fleetSpeed * deltaTime;
      for (const enemy of this.enemies) enemy.y += 21;
      this.fleetSpeed *= 1.035;
    }

    for (const enemy of this.enemies) {
      enemy.x += movement;
      if (enemy.y + enemy.height / 2 >= this.player.y - 34) {
        this.lives = 0;
        this.particles.burst(this.player.x, this.player.y, COLORS.red, 32, 240);
        this.audio.hit();
        this.updateHud();
        this.endGame();
        return;
      }
    }
  }

  updateProjectiles(deltaTime) {
    for (const projectile of this.projectiles) projectile.update(deltaTime);

    for (const projectile of this.projectiles) {
      if (projectile.dead) continue;

      if (projectile.owner === "player") {
        const target = this.enemies.find((enemy) => rectsOverlap(projectile, enemy));
        if (!target) continue;

        projectile.dead = true;
        target.hitPoints -= 1;
        this.particles.burst(projectile.x, projectile.y, COLORS.violet, 7, 105);

        if (target.hitPoints <= 0) {
          target.dead = true;
          this.score += 100 + (3 - Math.min(target.row, 3)) * 25;
          this.particles.burst(target.x, target.y, COLORS.cyan, 18, 190);
          this.audio.hit();

          if (Math.random() < 0.13) {
            this.powerUps.push(
              new PowerUp({
                x: target.x,
                y: target.y,
                type: Math.random() > 0.5 ? "shield" : "rapid",
                image: this.images.powerUp,
              }),
            );
          }
        }
      } else if (this.player.invulnerableTime <= 0 && rectsOverlap(projectile, this.player)) {
        projectile.dead = true;
        this.damagePlayer();
      }
    }

    this.enemies = this.enemies.filter((enemy) => !enemy.dead);
    this.projectiles = this.projectiles.filter((projectile) => !projectile.dead);
  }

  damagePlayer() {
    if (this.player.shieldTime > 0) {
      this.player.shieldTime = 0;
      this.player.invulnerableTime = 0.45;
      this.particles.burst(this.player.x, this.player.y, COLORS.cyan, 20, 190);
      this.audio.collect();
      this.shake(0.14, 4);
      return;
    }

    this.lives -= 1;
    this.player.invulnerableTime = 1.45;
    this.particles.burst(this.player.x, this.player.y, COLORS.red, 28, 230);
    this.audio.hit();
    this.shake(0.28, 8);
    this.updateHud();

    if (this.lives <= 0) this.endGame();
  }

  updatePowerUps(deltaTime) {
    for (const powerUp of this.powerUps) {
      powerUp.update(deltaTime);
      if (!powerUp.dead && rectsOverlap(powerUp, this.player)) {
        powerUp.dead = true;
        if (powerUp.type === "shield") this.player.shieldTime = Math.max(this.player.shieldTime, 8);
        else this.player.rapidFireTime = Math.max(this.player.rapidFireTime, 7);
        this.score += 75;
        this.particles.burst(powerUp.x, powerUp.y, COLORS.yellow, 22, 170);
        this.audio.collect();
        this.updateHud();
      }
    }
    this.powerUps = this.powerUps.filter((powerUp) => !powerUp.dead);
  }

  updateWave(deltaTime) {
    if (this.enemies.length > 0) return;

    if (this.waveClearTimer === null) {
      this.waveClearTimer = 1.35;
      this.score += this.wave * 250;
      this.showWaveMessage("Sector clear");
      this.audio.wave();
      this.updateHud();
      return;
    }

    this.waveClearTimer -= deltaTime;
    if (this.waveClearTimer <= 0) {
      this.wave += 1;
      this.createWave();
      this.updateHud();
    }
  }

  shake(duration, strength) {
    if (reducedMotion) return;
    this.shakeTime = duration;
    this.shakeStrength = strength;
  }

  update(deltaTime) {
    this.starfield.update(deltaTime, 1 + this.wave * 0.035);
    this.player.update(deltaTime, this.input);
    this.particles.trail(this.player.x, this.player.y + 29);
    this.particles.update(deltaTime);

    if (this.input.isDown("Space")) this.firePlayerShot();

    this.updateFleet(deltaTime);
    if (this.state !== "playing") return;

    this.enemyShootTimer -= deltaTime;
    if (this.enemyShootTimer <= 0) {
      this.fireEnemyShot();
      this.enemyShootTimer = Math.max(0.34, 1.18 - this.wave * 0.055) + random(0.08, 0.42);
    }

    this.updateProjectiles(deltaTime);
    if (this.state !== "playing") return;
    this.updatePowerUps(deltaTime);
    this.updateWave(deltaTime);
    this.shakeTime = Math.max(0, this.shakeTime - deltaTime);
    this.updateHud();
  }

  drawBackground(ctx) {
    const background = ctx.createLinearGradient(0, 0, 0, WORLD.height);
    background.addColorStop(0, "#06091a");
    background.addColorStop(0.55, "#0a1028");
    background.addColorStop(1, "#071225");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    const nebula = ctx.createRadialGradient(770, 105, 10, 770, 105, 340);
    nebula.addColorStop(0, "rgba(122, 80, 220, 0.2)");
    nebula.addColorStop(0.45, "rgba(41, 103, 190, 0.08)");
    nebula.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = nebula;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    this.starfield.draw(ctx);

    ctx.save();
    ctx.strokeStyle = "rgba(72, 223, 252, 0.055)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= WORLD.width; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, WORLD.height * 0.62);
      ctx.lineTo(WORLD.width / 2 + (x - WORLD.width / 2) * 1.75, WORLD.height);
      ctx.stroke();
    }
    for (let y = WORLD.height * 0.66; y < WORLD.height; y += 34) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD.width, y);
      ctx.stroke();
    }
    ctx.restore();

    const horizon = ctx.createLinearGradient(0, WORLD.height - 80, 0, WORLD.height);
    horizon.addColorStop(0, "rgba(72, 223, 252, 0)");
    horizon.addColorStop(1, "rgba(72, 223, 252, 0.08)");
    ctx.fillStyle = horizon;
    ctx.fillRect(0, WORLD.height - 110, WORLD.width, 110);
  }

  render(time) {
    context.save();
    if (this.shakeTime > 0) {
      context.translate(random(-this.shakeStrength, this.shakeStrength), random(-this.shakeStrength, this.shakeStrength));
    }

    this.drawBackground(context);

    for (const powerUp of this.powerUps) powerUp.draw(context);
    for (const enemy of this.enemies) enemy.draw(context, time);
    for (const projectile of this.projectiles) projectile.draw(context);
    this.particles.draw(context);
    this.player.draw(context, time);

    const vignette = context.createRadialGradient(
      WORLD.width / 2,
      WORLD.height / 2,
      WORLD.height * 0.24,
      WORLD.width / 2,
      WORLD.height / 2,
      WORLD.height * 0.78,
    );
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.48)");
    context.fillStyle = vignette;
    context.fillRect(0, 0, WORLD.width, WORLD.height);
    context.restore();
  }

  loop(currentTime) {
    const deltaTime = Math.min((currentTime - this.lastFrameTime) / 1000, 0.034);
    this.lastFrameTime = currentTime;

    if (this.state === "playing") this.update(deltaTime);
    else if (this.state === "ready") this.starfield.update(deltaTime, 0.35);

    this.render(currentTime / 1000);
    requestAnimationFrame((time) => this.loop(time));
  }
}

const [player, enemy, powerUp] = await Promise.all([
  loadImage("assets/player-ship.png"),
  loadImage("assets/enemy-ufo.png"),
  loadImage("assets/power-up.png"),
]);

const game = new Game({ player, enemy, powerUp });

export { Enemy, Game, Player, PowerUp, Projectile, game, rectsOverlap };
