(function () {
  const CFG = window.AERO_CONFIG;

  function rand(min, max) { return Math.random() * (max - min) + min; }
  function distSq(x1, y1, x2, y2) { const dx = x1 - x2, dy = y1 - y2; return dx * dx + dy * dy; }

  // Кэш 3D-желейных спрайтов (высокое качество + 60 FPS на телефоне)
  const jellyCache = new Map();
  const foodCache = new Map();

  function getJellySegmentSprite(color, pattern) {
    const key = `${color}_${pattern}`;
    if (jellyCache.has(key)) return jellyCache.get(key);

    const size = 64;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    const cx = size / 2, cy = size / 2, r = 27;

    // 1. Объёмная основа (3D-сфера)
    const baseGrad = ctx.createRadialGradient(cx - r * 0.32, cy - r * 0.35, r * 0.1, cx, cy, r);
    baseGrad.addColorStop(0, "#ffffff");
    baseGrad.addColorStop(0.28, color);
    baseGrad.addColorStop(0.85, color);
    baseGrad.addColorStop(1, "rgba(0, 35, 65, 0.55)");

    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // 2. Нижний рефлекс (эффект прозрачного желе)
    const bounceGrad = ctx.createRadialGradient(cx, cy + r * 0.52, 2, cx, cy + r * 0.45, r * 0.65);
    bounceGrad.addColorStop(0, "rgba(255,255,255,0.68)");
    bounceGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = bounceGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2);
    ctx.fill();

    // 3. Узор внутри желе
    if (pattern === "bubbles") {
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx + 8, cy + 6, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx - 10, cy + 9, 3.5, 0, Math.PI * 2);
      ctx.stroke();
    } else if (pattern === "sparkle") {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(cx + 9, cy + 7, 2.5, 0, Math.PI * 2);
      ctx.arc(cx - 8, cy + 10, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Глянцевый полумесяц сверху (главный элемент Frutiger Aero)
    const glossGrad = ctx.createLinearGradient(cx, cy - r, cx, cy);
    glossGrad.addColorStop(0, "rgba(255,255,255,0.92)");
    glossGrad.addColorStop(1, "rgba(255,255,255,0.06)");
    ctx.fillStyle = glossGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy - r * 0.44, r * 0.66, r * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5. Тонкий стеклянный ободок
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 0.8, 0, Math.PI * 2);
    ctx.stroke();

    jellyCache.set(key, c);
    return c;
  }

  function getFoodOrbSprite(color, isBig) {
    const key = `${color}_${isBig ? 1 : 0}`;
    if (foodCache.has(key)) return foodCache.get(key);

    const size = 48;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    const cx = size / 2, cy = size / 2;
    const r = isBig ? 14 : 11;

    // Внешнее мягкое свечение
    const glow = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, size / 2);
    glow.addColorStop(0, color + "aa");
    glow.addColorStop(0.6, color + "33");
    glow.addColorStop(1, color + "00");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Прозрачная желейная капля-сфера
    const orb = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r);
    orb.addColorStop(0, "#ffffff");
    orb.addColorStop(0.45, color);
    orb.addColorStop(1, "rgba(255,255,255,0.85)");
    ctx.fillStyle = orb;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Блик-звёздочка
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.28, cy - r * 0.32, r * 0.36, r * 0.22, -0.5, 0, Math.PI * 2);
    ctx.fill();

    foodCache.set(key, c);
    return c;
  }

  class Worm {
    constructor(name, x, y, custom, isBot = false) {
      this.name = name;
      this.isBot = isBot;
      this.custom = custom;
      this.skin = CFG.SKINS.find(s => s.id === custom.skin) || CFG.SKINS[0];
      this.aura = CFG.AURAS.find(a => a.id === custom.aura) || CFG.AURAS[0];
      this.angle = rand(0, Math.PI * 2);
      this.targetAngle = this.angle;
      this.length = isBot ? rand(15, 36) : 15;
      this.boosting = false;
      this.alive = true;
      this.boostDropTimer = 0;
      this.aiTimer = 0;

      this.segments = [];
      const segCount = Math.floor(this.length);
      for (let i = 0; i < segCount; i++) {
        this.segments.push({
          x: x - Math.cos(this.angle) * i * CFG.SEGMENT_SPACING,
          y: y - Math.sin(this.angle) * i * CFG.SEGMENT_SPACING
        });
      }
    }

    get head() { return this.segments[0]; }
    get radius() { return Math.min(26, 12 + Math.sqrt(this.length) * 0.92); }
    get score() { return Math.floor(this.length); }
  }

  class AeroGameEngine {
    constructor() {
      this.canvas = document.getElementById("gameCanvas");
      this.ctx = this.canvas.getContext("2d", { alpha: false });
      this.running = false;
      this.rafId = null;
      this.lastTime = 0;
      this.width = 0;
      this.height = 0;
      this.dpr = 1;

      this.worms = [];
      this.player = null;
      this.foods = [];
      this.particles = [];
      this.camera = { x: 0, y: 0, zoom: 1 };
      this.coinsEarned = 0;
      this.hudTimer = 0;

      this.mouse = { x: 0, y: 0, active: false };
      this.joystick = { active: false, id: null };
      this.boostKeys = { mouse: false, space: false, shift: false, touch: false };

      this.bindInputs();
      window.addEventListener("resize", () => this.resize());
    }

    get isBoostingInput() {
      return this.boostKeys.mouse || this.boostKeys.space || this.boostKeys.shift || this.boostKeys.touch;
    }

    resize() {
      this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.canvas.width = Math.floor(this.width * this.dpr);
      this.canvas.height = Math.floor(this.height * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    bindInputs() {
      // Отзывчивая мышь по всему окну
      window.addEventListener("pointermove", (e) => {
        if (e.pointerType !== "mouse" || !this.running) return;
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        this.mouse.active = true;
      });

      window.addEventListener("mousedown", (e) => {
        if (this.running && e.button === 0) this.boostKeys.mouse = true;
      });
      window.addEventListener("mouseup", () => { this.boostKeys.mouse = false; });

      // Ускорение на Пробел и Shift
      window.addEventListener("keydown", (e) => {
        if (!this.running) return;
        if (e.code === "Space") { e.preventDefault(); this.boostKeys.space = true; }
        if (e.code === "ShiftLeft" || e.code === "ShiftRight") { this.boostKeys.shift = true; }
      });
      window.addEventListener("keyup", (e) => {
        if (e.code === "Space") this.boostKeys.space = false;
        if (e.code === "ShiftLeft" || e.code === "ShiftRight") this.boostKeys.shift = false;
      });

      // Сенсорный джойстик (активен только на телефонах/планшетах)
      const zone = document.getElementById("joystickZone");
      const base = document.getElementById("joystickBase");
      const knob = document.getElementById("joystickKnob");
      const maxDist = 36;

      const updateStick = (touch) => {
        const rect = base.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        let dx = touch.clientX - cx;
        let dy = touch.clientY - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > maxDist) {
          dx = (dx / dist) * maxDist;
          dy = (dy / dist) * maxDist;
        }
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        if (dist > 5 && this.player) {
          this.player.targetAngle = Math.atan2(dy, dx);
        }
      };

      zone.addEventListener("touchstart", (e) => {
        e.preventDefault();
        const t = e.changedTouches[0];
        this.joystick.active = true;
        this.joystick.id = t.identifier;
        updateStick(t);
      }, { passive: false });

      zone.addEventListener("touchmove", (e) => {
        e.preventDefault();
        for (const t of e.changedTouches) {
          if (t.identifier === this.joystick.id) updateStick(t);
        }
      }, { passive: false });

      const endStick = (e) => {
        for (const t of e.changedTouches) {
          if (t.identifier === this.joystick.id) {
            this.joystick.active = false;
            this.joystick.id = null;
            knob.style.transform = "translate(0px, 0px)";
          }
        }
      };
      zone.addEventListener("touchend", endStick);
      zone.addEventListener("touchcancel", endStick);

      const boostBtn = document.getElementById("mobileBoostBtn");
      boostBtn.addEventListener("touchstart", (e) => { e.preventDefault(); this.boostKeys.touch = true; }, { passive: false });
      boostBtn.addEventListener("touchend", () => { this.boostKeys.touch = false; });
      boostBtn.addEventListener("touchcancel", () => { this.boostKeys.touch = false; });
    }

    start(user, onGameOver) {
      this.onGameOver = onGameOver;
      this.resize();
      this.worms = [];
      this.foods = [];
      this.particles = [];
      this.coinsEarned = 0;
      this.boostKeys = { mouse: false, space: false, shift: false, touch: false };
      this.mouse.active = false;

      const startPos = this.randomPointInWorld(CFG.WORLD_RADIUS * 0.55);
      this.player = new Worm(user.username, startPos.x, startPos.y, { ...user.customization }, false);
      this.worms.push(this.player);

      for (let i = 0; i < CFG.BOT_COUNT; i++) this.spawnBot();
      for (let i = 0; i < CFG.FOOD_COUNT; i++) this.spawnFood();

      this.camera.x = this.player.head.x;
      this.camera.y = this.player.head.y;
      this.running = true;
      this.lastTime = performance.now();
      this.loop(this.lastTime);
    }

    stop() {
      this.running = false;
      if (this.rafId) cancelAnimationFrame(this.rafId);
    }

    randomPointInWorld(maxR) {
      const a = rand(0, Math.PI * 2);
      const r = Math.sqrt(Math.random()) * maxR;
      return { x: Math.cos(a) * r, y: Math.sin(a) * r };
    }

    spawnBot() {
      const pos = this.randomPointInWorld(CFG.WORLD_RADIUS * 0.8);
      const skin = CFG.SKINS[Math.floor(Math.random() * CFG.SKINS.length)];
      const eyes = CFG.EYES[Math.floor(Math.random() * CFG.EYES.length)];
      const pattern = CFG.PATTERNS[Math.floor(Math.random() * CFG.PATTERNS.length)];
      const aura = CFG.AURAS[Math.floor(Math.random() * CFG.AURAS.length)];
      const name = CFG.BOT_NAMES[Math.floor(Math.random() * CFG.BOT_NAMES.length)];
      this.worms.push(new Worm(name, pos.x, pos.y, {
        skin: skin.id, eyes: eyes.id, pattern: pattern.id, aura: aura.id
      }, true));
    }

    spawnFood(x, y, value = 1, color = null) {
      const pos = (x !== undefined) ? { x, y } : this.randomPointInWorld(CFG.WORLD_RADIUS - 60);
      const palette = ["#38bdf8", "#4ade80", "#f472b6", "#fbbf24", "#a78bfa", "#2dd4bf"];
      this.foods.push({
        x: pos.x,
        y: pos.y,
        r: value > 1 ? 11 : rand(7.5, 9.5),
        value,
        color: color || palette[Math.floor(Math.random() * palette.length)],
        phase: rand(0, Math.PI * 2)
      });
    }

    spawnPopParticles(x, y, color, count = 8) {
      for (let i = 0; i < count; i++) {
        const a = rand(0, Math.PI * 2);
        const sp = rand(45, 160);
        this.particles.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          r: rand(3.5, 7.5), life: 0.45, color
        });
      }
    }

    loop(now) {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.lastTime) / 1000);
      this.lastTime = now;

      this.update(dt);
      this.render(now * 0.001);

      this.rafId = requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
      // Точный пересчёт угла к курсору каждый кадр (относительно реальной позиции головы на экране)
      if (this.player && this.player.alive && this.mouse.active && !this.joystick.active) {
        const headScreenX = (this.player.head.x - this.camera.x) * this.camera.zoom + this.width / 2;
        const headScreenY = (this.player.head.y - this.camera.y) * this.camera.zoom + this.height / 2;
        const dx = this.mouse.x - headScreenX;
        const dy = this.mouse.y - headScreenY;
        if (dx * dx + dy * dy > 16) {
          this.player.targetAngle = Math.atan2(dy, dx);
        }
      }

      for (const w of this.worms) {
        if (!w.alive) continue;
        if (w.isBot) this.updateBotAI(w, dt);
        else w.boosting = this.isBoostingInput && w.length > 12;

        // Быстрый и плавный поворот
        let diff = w.targetAngle - w.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const maxTurn = CFG.TURN_SPEED * dt;
        w.angle += Math.max(-maxTurn, Math.min(maxTurn, diff));

        const speed = w.boosting ? CFG.BOOST_SPEED : CFG.BASE_SPEED;
        const head = w.head;
        head.x += Math.cos(w.angle) * speed * dt;
        head.y += Math.sin(w.angle) * speed * dt;

        if (w.boosting) {
          w.length -= 2.3 * dt;
          w.boostDropTimer += dt;
          if (w.boostDropTimer > 0.24) {
            w.boostDropTimer = 0;
            const tail = w.segments[w.segments.length - 1];
            this.spawnFood(tail.x, tail.y, 1, w.skin.colors[0]);
          }
          if (w.length <= 12) w.boosting = false;
        }

        for (let i = 1; i < w.segments.length; i++) {
          const prev = w.segments[i - 1];
          const curr = w.segments[i];
          const dx = prev.x - curr.x;
          const dy = prev.y - curr.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d > CFG.SEGMENT_SPACING) {
            curr.x = prev.x - (dx / d) * CFG.SEGMENT_SPACING;
            curr.y = prev.y - (dy / d) * CFG.SEGMENT_SPACING;
          }
        }

        const targetCount = Math.max(10, Math.floor(w.length));
        while (w.segments.length < targetCount) {
          const last = w.segments[w.segments.length - 1];
          w.segments.push({ x: last.x, y: last.y });
        }
        while (w.segments.length > targetCount) w.segments.pop();

        if (Math.hypot(head.x, head.y) > CFG.WORLD_RADIUS - w.radius) {
          this.killWorm(w);
        }
      }

      // Поедание желейных сфер
      for (let i = this.foods.length - 1; i >= 0; i--) {
        const f = this.foods[i];
        for (const w of this.worms) {
          if (!w.alive) continue;
          const eatR = w.radius + f.r + 8;
          if (distSq(w.head.x, w.head.y, f.x, f.y) < eatR * eatR) {
            w.length += f.value * 0.45;
            if (w === this.player) {
              this.coinsEarned += f.value > 1 ? 2 : 0;
              window.AeroAudio.pop();
            }
            this.foods.splice(i, 1);
            break;
          }
        }
      }

      while (this.foods.length < CFG.FOOD_COUNT) this.spawnFood();

      // Столкновения
      for (const a of this.worms) {
        if (!a.alive) continue;
        for (const b of this.worms) {
          if (a === b || !b.alive) continue;
          const hitR = a.radius * 0.78 + b.radius * 0.78;
          const hitRSq = hitR * hitR;
          for (let i = 2; i < b.segments.length; i += 2) {
            const seg = b.segments[i];
            if (distSq(a.head.x, a.head.y, seg.x, seg.y) < hitRSq) {
              this.killWorm(a);
              break;
            }
          }
          if (!a.alive) break;
        }
      }

      this.worms = this.worms.filter(w => w.alive || w === this.player);
      while (this.worms.length < CFG.BOT_COUNT + 1) this.spawnBot();

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) this.particles.splice(i, 1);
      }

      if (this.player && this.player.alive) {
        this.camera.x += (this.player.head.x - this.camera.x) * Math.min(1, dt * 10);
        this.camera.y += (this.player.head.y - this.camera.y) * Math.min(1, dt * 10);
        const targetZoom = Math.max(0.68, 1.05 - this.player.radius * 0.012);
        this.camera.zoom += (targetZoom - this.camera.zoom) * Math.min(1, dt * 3);
      }

      this.hudTimer += dt;
      if (this.hudTimer > 0.2) {
        this.hudTimer = 0;
        this.updateHUD();
      }
    }

    updateBotAI(bot, dt) {
      bot.aiTimer -= dt;
      if (Math.hypot(bot.head.x, bot.head.y) > CFG.WORLD_RADIUS - 240) {
        bot.targetAngle = Math.atan2(-bot.head.y, -bot.head.x);
        bot.boosting = false;
        return;
      }
      if (bot.aiTimer <= 0) {
        bot.aiTimer = rand(0.35, 1.0);
        let bestFood = null;
        let bestD = 380 * 380;
        for (let i = 0; i < this.foods.length; i += 2) {
          const f = this.foods[i];
          const d = distSq(bot.head.x, bot.head.y, f.x, f.y);
          if (d < bestD) { bestD = d; bestFood = f; }
        }
        bot.targetAngle = bestFood
          ? Math.atan2(bestFood.y - bot.head.y, bestFood.x - bot.head.x)
          : bot.targetAngle + rand(-0.9, 0.9);
        bot.boosting = bot.length > 22 && Math.random() < 0.14;
      }
    }

    killWorm(w) {
      if (!w.alive) return;
      w.alive = false;
      this.spawnPopParticles(w.head.x, w.head.y, w.skin.colors[0], 12);

      for (let i = 0; i < w.segments.length; i += 3) {
        const s = w.segments[i];
        this.spawnFood(s.x + rand(-10, 10), s.y + rand(-10, 10), 2.2, w.skin.colors[i % w.skin.colors.length]);
      }

      if (w === this.player) {
        window.AeroAudio.burst();
        const totalCoins = Math.floor(w.score / 5) + this.coinsEarned;
        this.stop();
        if (this.onGameOver) this.onGameOver(w.score, totalCoins);
      }
    }

    updateHUD() {
      if (!this.player) return;
      const liveCoins = Math.floor(this.player.score / 5) + this.coinsEarned;
      document.getElementById("hudScore").textContent = this.player.score;
      document.getElementById("hudCoins").textContent = `+${liveCoins}`;

      const sorted = [...this.worms].filter(w => w.alive).sort((a, b) => b.score - a.score).slice(0, 5);
      document.getElementById("leaderboardList").innerHTML = sorted.map(w =>
        `<li class="${w === this.player ? "me" : ""}">${w.name} — ${w.score}</li>`
      ).join("");
    }

    render(time) {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;

      // Глубокий аква-фон Frutiger Aero
      const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.3, 40, w * 0.5, h * 0.5, Math.max(w, h) * 0.85);
      bgGrad.addColorStop(0, "#eefcff");
      bgGrad.addColorStop(0.55, "#c8f1ff");
      bgGrad.addColorStop(1, "#b8f7e4");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(this.camera.zoom, this.camera.zoom);
      ctx.translate(-this.camera.x, -this.camera.y);

      const viewW = (w / this.camera.zoom) * 0.6 + 90;
      const viewH = (h / this.camera.zoom) * 0.6 + 90;

      this.drawGrid(ctx, viewW, viewH);

      // Глянцевая граница арены
      ctx.beginPath();
      ctx.arc(0, 0, CFG.WORLD_RADIUS, 0, Math.PI * 2);
      ctx.lineWidth = 18;
      ctx.strokeStyle = "rgba(14, 165, 233, 0.35)";
      ctx.stroke();
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.stroke();

      // Объёмные желейные сферы вместо плоских точек
      for (const f of this.foods) {
        if (Math.abs(f.x - this.camera.x) > viewW || Math.abs(f.y - this.camera.y) > viewH) continue;
        const bob = Math.sin(time * 3.2 + f.phase) * 2.5;
        const pulse = 1 + Math.sin(time * 4 + f.phase) * 0.1;
        const sprite = getFoodOrbSprite(f.color, f.value > 1);
        const drawSize = f.r * 3.8 * pulse;
        ctx.drawImage(sprite, f.x - drawSize / 2, f.y + bob - drawSize / 2, drawSize, drawSize);
      }

      for (const worm of this.worms) {
        if (worm.alive) this.drawWorm(ctx, worm, viewW, viewH);
      }

      for (const p of this.particles) {
        ctx.globalAlpha = Math.max(0, p.life * 2);
        const sprite = getFoodOrbSprite(p.color, false);
        const s = p.r * 3.5;
        ctx.drawImage(sprite, p.x - s / 2, p.y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;

      ctx.restore();
    }

    drawGrid(ctx, viewW, viewH) {
      const step = 100;
      const startX = Math.floor((this.camera.x - viewW) / step) * step;
      const endX = this.camera.x + viewW;
      const startY = Math.floor((this.camera.y - viewH) / step) * step;
      const endY = this.camera.y + viewH;

      ctx.strokeStyle = "rgba(14, 165, 233, 0.13)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = startX; x <= endX; x += step) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
      }
      for (let y = startY; y <= endY; y += step) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
      }
      ctx.stroke();
    }

    drawWorm(ctx, worm, viewW, viewH) {
      const r = worm.radius;
      const colors = worm.skin.colors;
      const pattern = worm.custom.pattern;
      const segs = worm.segments;

      for (let i = segs.length - 1; i >= 0; i--) {
        const s = segs[i];
        if (Math.abs(s.x - this.camera.x) > viewW || Math.abs(s.y - this.camera.y) > viewH) continue;

        const segR = i > segs.length - 4 ? r * (0.62 + (segs.length - i) * 0.09) : r;
        const colorIdx = pattern === "stripes"
          ? Math.floor(i / 2) % colors.length
          : Math.floor(i / 5) % colors.length;

        // Аура / свечение при ускорении
        if (worm.boosting || worm.aura.color) {
          ctx.fillStyle = (worm.aura.color || colors[0]) + "36";
          ctx.beginPath();
          ctx.arc(s.x, s.y, segR * 1.42, 0, Math.PI * 2);
          ctx.fill();
        }

        // 3D-желейный спрайт сегмента
        const sprite = getJellySegmentSprite(colors[colorIdx], pattern);
        const drawSize = segR * 2.38;
        ctx.drawImage(sprite, s.x - drawSize / 2, s.y - drawSize / 2, drawSize, drawSize);
      }

      this.drawEyes(ctx, worm.head, worm.angle, r, worm.custom.eyes);

      // Ник с белой обводкой
      ctx.font = "800 13px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.strokeText(worm.name, worm.head.x, worm.head.y - r - 11);
      ctx.fillStyle = "#05334a";
      ctx.fillText(worm.name, worm.head.x, worm.head.y - r - 11);
    }

    // 6 уникальных стилей глаз
    drawEyes(ctx, head, angle, r, eyeStyle) {
      ctx.save();
      ctx.translate(head.x, head.y);
      ctx.rotate(angle);

      const ex = r * 0.36;
      const ey = r * 0.44;

      if (eyeStyle === "cool") {
        // Глянцевые Y2K очки-визор
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.roundRect(ex - 5, -ey - 6, 11, (ey + 6) * 2, 5);
        ctx.fill();
        const visor = ctx.createLinearGradient(ex - 4, -ey, ex + 5, ey);
        visor.addColorStop(0, "#7dd3fc");
        visor.addColorStop(0.5, "#0284c7");
        visor.addColorStop(1, "#34d399");
        ctx.fillStyle = visor;
        ctx.beginPath();
        ctx.roundRect(ex - 3, -ey - 3, 7, ey - 1, 3);
        ctx.roundRect(ex - 3, 4, 7, ey - 1, 3);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fillRect(ex - 1, -ey - 1, 2.5, 5);
        ctx.fillRect(ex - 1, 6, 2.5, 5);
      } else {
        for (const side of [-1, 1]) {
          const y = side * ey;

          if (eyeStyle === "kawaii") {
            // Большие аниме-глазки + розовый румянец
            ctx.fillStyle = "rgba(244, 114, 182, 0.48)";
            ctx.beginPath();
            ctx.ellipse(ex - r * 0.16, y + side * r * 0.16, r * 0.18, r * 0.12, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#0f172a";
            ctx.beginPath();
            ctx.arc(ex, y, r * 0.32, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(ex + r * 0.1, y - r * 0.1, r * 0.12, 0, Math.PI * 2);
            ctx.arc(ex - r * 0.08, y + r * 0.08, r * 0.06, 0, Math.PI * 2);
            ctx.fill();
          } else if (eyeStyle === "aero") {
            // Стеклянные аква-линзы
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(ex, y, r * 0.34, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#0ea5e9";
            ctx.beginPath();
            ctx.arc(ex + r * 0.08, y, r * 0.21, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#082f49";
            ctx.beginPath();
            ctx.arc(ex + r * 0.1, y, r * 0.1, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "rgba(255,255,255,0.9)";
            ctx.beginPath();
            ctx.arc(ex + r * 0.14, y - r * 0.09, r * 0.08, 0, Math.PI * 2);
            ctx.fill();
          } else if (eyeStyle === "cat") {
            // Кошачьи с вертикальным зрачком
            ctx.fillStyle = "#fef08a";
            ctx.strokeStyle = "#05334a";
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.arc(ex, y, r * 0.33, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = "#0f172a";
            ctx.beginPath();
            ctx.ellipse(ex + r * 0.08, y, r * 0.08, r * 0.24, 0, 0, Math.PI * 2);
            ctx.fill();
          } else if (eyeStyle === "star") {
            // Белый глаз + голубая звезда внутри
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(ex, y, r * 0.34, 0, Math.PI * 2);
            ctx.fill();

            this.drawStar(ctx, ex + r * 0.06, y, 5, r * 0.22, r * 0.1, "#0284c7");
          } else if (eyeStyle === "heart") {
            // Розовые сердечки
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(ex, y, r * 0.34, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#ec4899";
            const hs = r * 0.14;
            ctx.beginPath();
            ctx.arc(ex + hs * 0.5, y - hs * 0.5, hs, 0, Math.PI * 2);
            ctx.arc(ex + hs * 0.5, y + hs * 0.5, hs, 0, Math.PI * 2);
            ctx.lineTo(ex - hs * 1.1, y);
            ctx.fill();
          }
        }
      }

      ctx.restore();
    }

    drawStar(ctx, cx, cy, spikes, outerR, innerR, color) {
      let rot = (Math.PI / 2) * 3;
      const step = Math.PI / spikes;
      ctx.beginPath();
      ctx.moveTo(cx, cy - outerR);
      for (let i = 0; i < spikes; i++) {
        ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
        rot += step;
        ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
        rot += step;
      }
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }

    // Метод для живого превью в лобби (использует те же 3D-спрайты)
    drawPreviewWorm(ctx, width, height, custom, time) {
      ctx.clearRect(0, 0, width, height);
      const skin = CFG.SKINS.find(s => s.id === custom.skin) || CFG.SKINS[0];
      const aura = CFG.AURAS.find(a => a.id === custom.aura) || CFG.AURAS[0];
      const pattern = custom.pattern;

      const count = 17;
      for (let i = count - 1; i >= 0; i--) {
        const x = width * 0.78 - i * 14;
        const y = height * 0.52 + Math.sin(time - i * 0.42) * 22;
        const r = i > count - 4 ? 15 : 20;
        const cIdx = pattern === "stripes"
          ? Math.floor(i / 2) % skin.colors.length
          : Math.floor(i / 4) % skin.colors.length;

        if (aura.color) {
          ctx.fillStyle = aura.color + "38";
          ctx.beginPath();
          ctx.arc(x, y, r * 1.42, 0, Math.PI * 2);
          ctx.fill();
        }

        const sprite = getJellySegmentSprite(skin.colors[cIdx], pattern);
        const drawSize = r * 2.38;
        ctx.drawImage(sprite, x - drawSize / 2, y - drawSize / 2, drawSize, drawSize);

        if (i === 0) {
          this.drawEyes(ctx, { x, y }, Math.cos(time) * 0.25, r, custom.eyes);
        }
      }
    }
  }

  window.AeroGame = new AeroGameEngine();
})();
