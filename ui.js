(function () {
  const CFG = window.AERO_CONFIG;
  const authScreen = document.getElementById("authScreen");
  const lobbyScreen = document.getElementById("lobbyScreen");
  const gameScreen = document.getElementById("gameScreen");
  const aeroBg = document.getElementById("aeroBg");

  let authMode = "login";
  let currentCustomTab = "skins";
  let previewRaf = null;

  function showScreen(target) {
    [authScreen, lobbyScreen, gameScreen].forEach(s => s.classList.remove("active"));
    target.classList.add("active");
    aeroBg.style.display = target === gameScreen ? "none" : "block";

    if (target === lobbyScreen) startPreviewLoop();
    else stopPreviewLoop();
  }

  // Переключение Вход / Регистрация
  document.querySelectorAll("[data-auth-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      window.AeroAudio.click();
      authMode = btn.dataset.authTab;
      document.querySelectorAll("[data-auth-tab]").forEach(b => b.classList.toggle("active", b === btn));
      document.getElementById("confirmPassGroup").classList.toggle("hidden", authMode === "login");
      document.getElementById("authSubmitBtn").textContent =
        authMode === "login" ? "Войти в аккаунт" : "Создать аккаунт";
      document.getElementById("authError").textContent = "";
    });
  });

  document.getElementById("authForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const u = document.getElementById("authUsername").value;
    const p = document.getElementById("authPassword").value;
    const c = document.getElementById("authConfirm").value;

    const res = authMode === "login"
      ? window.AeroAuth.login(u, p)
      : window.AeroAuth.register(u, p, c);

    if (!res.ok) {
      document.getElementById("authError").textContent = res.error;
      return;
    }
    window.AeroAudio.buy();
    openLobby();
  });

  document.getElementById("guestBtn").addEventListener("click", () => {
    window.AeroAudio.click();
    window.AeroAuth.loginAsGuest();
    openLobby();
  });

  document.getElementById("logoutBtn").addEventListener("click", () => {
    window.AeroAudio.click();
    window.AeroAuth.logout();
    document.getElementById("authForm").reset();
    showScreen(authScreen);
  });

  document.getElementById("soundToggleBtn").addEventListener("click", (e) => {
    const muted = window.AeroAudio.toggleMute();
    e.currentTarget.textContent = muted ? "🔇" : "🔊";
  });

  function openLobby() {
    const user = window.AeroAuth.getUser();
    if (!user) return showScreen(authScreen);

    document.getElementById("lobbyUsername").textContent = user.username;
    document.getElementById("lobbyBest").textContent = user.bestScore;
    document.getElementById("lobbyCoins").textContent = user.coins;
    renderCustomGrid();
    showScreen(lobbyScreen);
  }

  // Вкладки кастомизации
  document.querySelectorAll("[data-ctab]").forEach(btn => {
    btn.addEventListener("click", () => {
      window.AeroAudio.click();
      currentCustomTab = btn.dataset.ctab;
      document.querySelectorAll("[data-ctab]").forEach(b => b.classList.toggle("active", b === btn));
      renderCustomGrid();
    });
  });

  function renderCustomGrid() {
    const user = window.AeroAuth.getUser();
    const grid = document.getElementById("customGrid");
    const map = {
      skins:    { list: CFG.SKINS,    field: "skin" },
      eyes:     { list: CFG.EYES,     field: "eyes" },
      patterns: { list: CFG.PATTERNS, field: "pattern" },
      auras:    { list: CFG.AURAS,    field: "aura" }
    };

    const { list, field } = map[currentCustomTab];
    const unlocked = user.unlocked[currentCustomTab];

    grid.innerHTML = "";
    list.forEach(item => {
      const isOwned = unlocked.includes(item.id);
      const isSelected = user.customization[field] === item.id;

      const card = document.createElement("div");
      card.className = `item-card ${isSelected ? "selected" : ""}`;

      const bgStyle = item.colors
        ? `background: linear-gradient(135deg, ${item.colors[0]}, ${item.colors[1] || item.colors[0]})`
        : `background: rgba(255,255,255,0.85)`;

      card.innerHTML = `
        <div class="swatch" style="${bgStyle}">${item.icon || ""}</div>
        <div class="item-name">${item.name}</div>
        <div class="item-price">${isSelected ? "Выбрано" : isOwned ? "Надеть" : `💧 ${item.price}`}</div>
      `;

      card.addEventListener("click", () => {
        if (isOwned) {
          user.customization[field] = item.id;
          window.AeroAuth.saveProfile();
          window.AeroAudio.click();
          renderCustomGrid();
        } else if (user.coins >= item.price) {
          user.coins -= item.price;
          unlocked.push(item.id);
          user.customization[field] = item.id;
          window.AeroAuth.saveProfile();
          window.AeroAudio.buy();
          document.getElementById("lobbyCoins").textContent = user.coins;
          renderCustomGrid();
        } else {
          card.style.transform = "scale(0.92)";
          setTimeout(() => card.style.transform = "", 150);
        }
      });

      grid.appendChild(card);
    });
  }

  // Живое анимированное превью червячка в лобби
  function startPreviewLoop() {
    stopPreviewLoop();
    const canvas = document.getElementById("previewCanvas");
    const ctx = canvas.getContext("2d");

    function draw(now) {
      const user = window.AeroAuth.getUser();
      if (!user) return;
      const t = now * 0.003;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const skin = CFG.SKINS.find(s => s.id === user.customization.skin) || CFG.SKINS[0];
      const aura = CFG.AURAS.find(a => a.id === user.customization.aura) || CFG.AURAS[0];
      const pattern = user.customization.pattern;

      const count = 16;
      for (let i = count - 1; i >= 0; i--) {
        const x = 250 - i * 13;
        const y = 85 + Math.sin(t - i * 0.45) * 20;
        const r = i > count - 4 ? 14 : 18;
        const cIdx = pattern === "stripes" ? Math.floor(i / 2) % skin.colors.length : Math.floor(i / 4) % skin.colors.length;

        if (aura.color) {
          ctx.fillStyle = aura.color + "38";
          ctx.beginPath();
          ctx.arc(x, y, r * 1.4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = skin.colors[cIdx];
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        if (pattern === "bubbles" && i % 3 === 0) {
          ctx.strokeStyle = "rgba(255,255,255,0.75)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x + 4, y + 3, 4.5, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = "rgba(255,255,255,0.58)";
        ctx.beginPath();
        ctx.ellipse(x - 4, y - 6, 8, 4, -0.4, 0, Math.PI * 2);
        ctx.fill();

        if (i === 0) {
          window.AeroGame.drawEyes(ctx, { x, y }, Math.cos(t) * 0.25, r, user.customization.eyes);
        }
      }

      previewRaf = requestAnimationFrame(draw);
    }

    previewRaf = requestAnimationFrame(draw);
  }

  function stopPreviewLoop() {
    if (previewRaf) cancelAnimationFrame(previewRaf);
    previewRaf = null;
  }

  // Запуск и окончание игры
  function launchGame() {
    const user = window.AeroAuth.getUser();
    document.getElementById("gameOverModal").classList.add("hidden");
    showScreen(gameScreen);

    window.AeroGame.start(user, (score, coins) => {
      window.AeroAuth.addMatchReward(score, coins);
      document.getElementById("finalScore").textContent = score;
      document.getElementById("finalCoins").textContent = coins;
      document.getElementById("gameOverModal").classList.remove("hidden");
    });
  }

  document.getElementById("playBtn").addEventListener("click", () => {
    window.AeroAudio.click();
    launchGame();
  });

  document.getElementById("restartBtn").addEventListener("click", () => {
    window.AeroAudio.click();
    launchGame();
  });

  document.getElementById("backLobbyBtn").addEventListener("click", () => {
    window.AeroAudio.click();
    openLobby();
  });

  document.getElementById("exitGameBtn").addEventListener("click", () => {
    window.AeroAudio.click();
    window.AeroGame.stop();
    openLobby();
  });

  // Старт приложения
  const existingUser = window.AeroAuth.init();
  if (existingUser) openLobby();
  else showScreen(authScreen);
})();
