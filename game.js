(function () {
  const CFG = window.AERO_CONFIG;

  function rand(min, max) { return Math.random() * (max - min) + min; }
  function distSq(x1, y1, x2, y2) { const dx = x1 - x2, dy = y1 - y2; return dx * dx + dy * dy; }

  class Worm {
    constructor(name, x, y, custom, isBot = false) {
      this.name = name;
      this.isBot = isBot;
      this.custom = custom;
      this.skin = CFG.SKINS.find(s => s.id === custom.skin) || CFG.SKINS[0];
      this.aura = CFG.AURAS.find(a => a.id === custom.aura) || CFG.AURAS[0];
      this.angle = rand(0, Math.PI * 2);
      this.targetAngle = this.angle;
      this.length = isBot ? rand(14, 34) : 14;
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
    get radius() { return Math.min(24, 11 + Math.sqrt(this.length) * 0.9); }
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

      this.pointerActive = false;
      this.joystick = { active: false, id: null, dx: 0, dy: 0 };
      this.boostInput = false;

      this.bindInputs();
      window.addEventListener("resize", () => this.resize());
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
      // Мышка на ПК
      this.canvas.addEventListener("mousemove", (e) => {
        if (!this.running || !this.player || this.joystick.active) return;
        const dx = e.clientX - this.width / 2;
        const dy = e.clientY - this.height / 2;
        this.player.targetAngle = Math.atan2(dy, dx);
      });

      this.canvas.addEventListener("mousedown", () => { if (this.running) this.boostInput = true; });
      window.addEventListener("mouseup", () => { this.boostInput = false; });

      window.addEventListener("keydown", (e) => {
        if (e.code === "Space" && this.running) {
          e.preventDefault();
          this.boostInput = true;
        }
      });
      window.addEventListener("keyup", (e) => {
        if (e.code === "Space") this.boostInput = false;
      });

      // Сенсорный джойстик
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
        if (dist > 6 && this.player) {
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

      // Кнопка ускорения на телефоне
      const boostBtn = document.getElementById("mobileBoostBtn");
      boostBtn.addEventListener("touchstart", (e) => { e.preventDefault(); this.boostInput = true; }, { passive: false });
      boostBtn.addEventListener("touchend", () => { this.boostInput = false; });
      boostBtn.addEventListener("touchcancel", () => { this.boostInput = false; });
    }

    start(user, onGameOver) {
      this.onGameOver = onGameOver;
      this.resize();
      this.worms = [];
      this.foods = [];
      this.particles = [];
      this.coinsEarned = 0;
      this.boostInput = false;

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
        r: value > 1 ? 8 : rand(5, 7),
        value,
        color: color || palette[Math.floor(Math.random() * palette.length)],
        phase: rand(0, Math.PI * 2)
      });
    }

    spawnPopParticles(x, y, color, count = 6) {
      for (let i = 0; i < count; i++) {
        const a = rand(0, Math.PI * 2);
        const sp = rand(40, 140);
        this.particles.push({
          x, y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          r: rand(3, 7),
          life: 0.45,
          color
        });
      }
    }

    loop(now) {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.lastTime) / 1000);
      this.lastTime = now;

      this.update(dt, now * 0.001);
      this.render(now * 0.001);

      this.rafId = requestAnimationFrame((t) => this.loop(t));
    }

    update(dt, time) {
      // Обновление червячков
      for (const w of this.worms) {
        if (!w.alive) continue;
        if (w.isBot) this.updateBotAI(w, dt);
        else w.boosting = this.boostInput && w.length > 12;

        // Плавный поворот
        let diff = w.targetAngle - w.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const maxTurn = CFG.TURN_SPEED * dt;
        w.angle += Math.max(-maxTurn, Math.min(maxTurn, diff));

        // Движение головы
        const speed = w.boosting ? CFG.BOOST_SPEED : CFG.BASE_SPEED;
        const head = w.head;
        head.x += Math.cos(w.angle) * speed * dt;
        head.y += Math.sin(w.angle) * speed * dt;

        // Ускорение тратит немного длины и оставляет капли
        if (w.boosting) {
          w.length -= 2.4 * dt;
          w.boostDropTimer += dt;
          if (w.boostDropTimer > 0.25) {
            w.boostDropTimer = 0;
            const tail = w.segments[w.segments.length - 1];
            this.spawnFood(tail.x, tail.y, 1, w.skin.colors[0]);
          }
          if (w.length <= 12) w.boosting = false;
        }

        // Следование сегментов (желейная цепочка)
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

        // Подгоняем число сегментов под длину
        const targetCount = Math.max(10, Math.floor(w.length));
        while (w.segments.length < targetCount) {
          const last = w.segments[w.segments.length - 1];
          w.segments.push({ x: last.x, y: last.y });
        }
        while (w.segments.length > targetCount) {
          w.segments.pop();
        }

        // Граница арены
        if (Math.hypot(head.x, head.y) > CFG.WORLD_RADIUS - w.radius) {
          this.killWorm(w);
        }
      }

      // Поедание капель
      for (let i = this.foods.length - 1; i >= 0; i--) {
        const f = this.foods[i];
        let eaten = false;
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
            eaten = true;
            break;
          }
        }
        if (eaten) continue;
      }

      while (this.foods.length < CFG.FOOD_COUNT) this.spawnFood();

      // Столкновения голова -> тело другого червячка
      for (const a of this.worms) {
        if (!a.alive) continue;
        for (const b of this.worms) {
          if (a === b || !b.alive) continue;
          const hitR = a.radius * 0.78 + b.radius * 0.78;
          const hitRSq = hitR * hitR;
          // Проверяем каждый 2-й сегмент для скорости на мобильных
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

      // Возрождение ботов
      this.worms = this.worms.filter(w => w.alive || w === this.player);
      while (this.worms.length < CFG.BOT_COUNT + 1) this.spawnBot();

      // Частицы
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) this.particles.splice(i, 1);
      }

      // Камера
      if (this.player && this.player.alive) {
        this.camera.x += (this.player.head.x - this.camera.x) * Math.min(1, dt * 8);
        this.camera.y += (this.player.head.y - this.camera.y) * Math.min(1, dt * 8);
        const targetZoom = Math.max(0.68, 1.05 - this.player.radius * 0.012);
        this.camera.zoom += (targetZoom - this.camera.zoom) * Math.min(1, dt * 3);
      }

      // Обновление HUD раз в 0.2 сек
      this.hudTimer += dt;
      if (this.hudTimer > 0.2) {
        this.hudTimer = 0;
        this.updateHUD();
      }
    }

    updateBotAI(bot, dt) {
      bot.aiTimer -= dt;
      const distFromCenter = Math.hypot(bot.head.x, bot.head.y);

      // Разворот от стены
      if (distFromCenter > CFG.WORLD_RADIUS - 220) {
        bot.targetAngle = Math.atan2(-bot.head.y, -bot.head.x);
        bot.boosting = false;
        return;
      }

      if (bot.aiTimer <= 0) {
        bot.aiTimer = rand(0.35, 1.1);
        // Ищем ближайшую еду
        let bestFood = null;
        let bestD = 360 * 360;
        for (let i = 0; i < this.foods.length; i += 2) {
          const f = this.foods[i];
          const d = distSq(bot.head.x, bot.head.y, f.x, f.y);
          if (d < bestD) { bestD = d; bestFood = f; }
        }
        if (bestFood) {
          bot.targetAngle = Math.atan2(bestFood.y - bot.head.y, bestFood.x - bot.head.x);
        } else {
          bot.targetAngle += rand(-0.9, 0.9);
        }
        bot.boosting = bot.length > 22 && Math.random() < 0.14;
      }
    }

    killWorm(w) {
      if (!w.alive) return;
      w.alive = false;
      this.spawnPopParticles(w.head.x, w.head.y, w.skin.colors[0], 10);

      // Превращаем тело в вкусные желейные сферы
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
      const list = document.getElementById("leaderboardList");
      list.innerHTML = sorted.map(w =>
        `<li class="${w === this.player ? "me" : ""}">${w.name} — ${w.score}</li>`
      ).join("");
    }

    render(time) {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;

      // Светлый аква-фон Frutiger Aero
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, "#d8f6ff");
      bgGrad.addColorStop(1, "#e6fff4");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(this.camera.zoom, this.camera.zoom);
      ctx.translate(-this.camera.x, -this.camera.y);

      const viewW = (w / this.camera.zoom) * 0.6 + 80;
      const viewH = (h / this.camera.zoom) * 0.6 + 80;

      // Лёгкая сетка-плитка
      this.drawGrid(ctx, viewW, viewH);

      // Граница арены (глянцевое кольцо)
      ctx.beginPath();
      ctx.arc(0, 0, CFG.WORLD_RADIUS, 0, Math.PI * 2);
      ctx.lineWidth = 14;
      ctx.strokeStyle = "rgba(14, 165, 233, 0.45)";
      ctx.stroke();

      // Капли еды (только видимые на экране)
      for (const f of this.foods) {
        if (Math.abs(f.x - this.camera.x) > viewW || Math.abs(f.y - this.camera.y) > viewH) continue;
        const pulse = 1 + Math.sin(time * 4 + f.phase) * 0.12;
        const r = f.r * pulse;

        // Мягкое свечение (быстрее shadowBlur)
        ctx.fillStyle = f.color + "38";
        ctx.beginPath();
        ctx.arc(f.x, f.y, r * 1.75, 0, Math.PI * 2);
        ctx.fill();

        // Желейный шарик
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
        ctx.fill();

        // Белый глянцевый блик
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.beginPath();
        ctx.arc(f.x - r * 0.3, f.y - r * 0.3, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }

      // Червячки
      for (const worm of this.worms) {
        if (worm.alive) this.drawWorm(ctx, worm, viewW, viewH, time);
      }

      // Частицы лопающихся пузырьков
      for (const p of this.particles) {
        ctx.globalAlpha = Math.max(0, p.life * 2);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.restore();
    }

    drawGrid(ctx, viewW, viewH) {
      const step = 90;
      const startX = Math.floor((this.camera.x - viewW) / step) * step;
      const endX = this.camera.x + viewW;
      const startY = Math.floor((this.camera.y - viewH) / step) * step;
      const endY = this.camera.y + viewH;

      ctx.strokeStyle = "rgba(14, 165, 233, 0.11)";
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

    drawWorm(ctx, worm, viewW, viewH, time) {
      const r = worm.radius;
      const colors = worm.skin.colors;
      const pattern = worm.custom.pattern;
      const segs = worm.segments;

      // Рисуем от хвоста к голове
      for (let i = segs.length - 1; i >= 0; i--) {
        const s = segs[i];
        if (Math.abs(s.x - this.camera.x) > viewW || Math.abs(s.y - this.camera.y) > viewH) continue;

        const segR = i > segs.length - 4 ? r * (0.65 + (segs.length - i) * 0.08) : r;
        const colorIdx = pattern === "stripes"
          ? Math.floor(i / 2) % colors.length
          : Math.floor(i / 5) % colors.length;

        // Аура или свечение при бусте
        if (worm.boosting || worm.aura.color) {
          ctx.fillStyle = (worm.aura.color || colors[0]) + "33";
          ctx.beginPath();
          ctx.arc(s.x, s.y, segR * 1.38, 0, Math.PI * 2);
          ctx.fill();
        }

        // Основа сегмента
        ctx.fillStyle = colors[colorIdx];
        ctx.beginPath();
        ctx.arc(s.x, s.y, segR, 0, Math.PI * 2);
        ctx.fill();

        // Узор «пузырьки»
        if (pattern === "bubbles" && i % 3 === 0) {
          ctx.strokeStyle = "rgba(255,255,255,0.65)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(s.x + segR * 0.22, s.y + segR * 0.15, segR * 0.28, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Фирменный желейный блик Frutiger Aero
        ctx.fillStyle = "rgba(255,255,255,0.52)";
        ctx.beginPath();
        ctx.ellipse(s.x - segR * 0.22, s.y - segR * 0.34, segR * 0.45, segR * 0.24, -0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Глазки на голове
      this.drawEyes(ctx, worm.head, worm.angle, r, worm.custom.eyes);

      // Ник над головой
      ctx.font = "700 13px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#06354d";
      ctx.fillText(worm.name, worm.head.x, worm.head.y - r - 10);
    }

    drawEyes(ctx, head, angle, r, eyeStyle) {
      ctx.save();
      ctx.translate(head.x, head.y);
      ctx.rotate(angle);

      const ex = r * 0.38;
      const ey = r * 0.42;

      if (eyeStyle === "cool") {
        // Глянцевые очки Y2K
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(ex - 4, -ey - 4, 8, ey * 2 + 8);
        ctx.fillStyle = "rgba(56,189,248,0.85)";
        ctx.fillRect(ex - 2, -ey - 2, 5, ey - 1);
        ctx.fillRect(ex - 2, 3, 5, ey - 1);
      } else {
        for (const side of [-1, 1]) {
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(ex, side * ey, r * 0.32, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = eyeStyle === "star" ? "#0284c7" : "#0f172a";
          ctx.beginPath();
          ctx.arc(ex + r * 0.1, side * ey, r * 0.16, 0, Math.PI * 2);
          ctx.fill();

          // Блик в глазу
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(ex + r * 0.14, side * ey - r * 0.06, r * 0.07, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }
  }

  window.AeroGame = new AeroGameEngine();
})();
