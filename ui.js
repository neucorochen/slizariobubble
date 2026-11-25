(function () {
  const CFG = window.AERO_CONFIG;
  const authScreen = document.getElementById("authScreen");
  const lobbyScreen = document.getElementById("lobbyScreen");
  const gameScreen = document.getElementById("gameScreen");
  const aeroBg = document.getElementById("aeroBg");

  let authMode = "login";
  let currentCustomTab = "skins";
  let previewCustom = null; // Временная примерка
  let selectedItem = null;  // Выбранная карточка для нижней кнопки
  let previewRaf = null;

  const TAB_MAP = {
    skins:    { list: CFG.SKINS,    field: "skin" },
    eyes:     { list: CFG.EYES,     field: "eyes" },
    patterns: { list: CFG.PATTERNS, field: "pattern" },
    auras:    { list: CFG.AURAS,    field: "aura" }
  };

  function showScreen(target) {
    [authScreen, lobbyScreen, gameScreen].forEach(s => s.classList.remove("active"));
    target.classList.add("active");
    aeroBg.style.display = target === gameScreen ? "none" : "block";

    if (target === lobbyScreen) startPreviewLoop();
    else stopPreviewLoop();
  }

  // Авторизация
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

    previewCustom = { ...user.customization };
    document.getElementById("lobbyUsername").textContent = user.username;
    document.getElementById("lobbyBest").textContent = user.bestScore;
    document.getElementById("lobbyCoins").textContent = user.coins;
    selectCurrentTabDefault();
    renderCustomGrid();
    showScreen(lobbyScreen);
  }

  function selectCurrentTabDefault() {
    const user = window.AeroAuth.getUser();
    const { list, field } = TAB_MAP[currentCustomTab];
    selectedItem = list.find(i => i.id === previewCustom[field]) || list[0];
  }

  // Переключение вкладок кастомизации
  document.querySelectorAll("[data-ctab]").forEach(btn => {
    btn.addEventListener("click", () => {
      window.AeroAudio.click();
      currentCustomTab = btn.dataset.ctab;
      document.querySelectorAll("[data-ctab]").forEach(b => b.classList.toggle("active", b === btn));
      selectCurrentTabDefault();
      renderCustomGrid();
    });
  });

  function renderCustomGrid() {
    const user = window.AeroAuth.getUser();
    const grid = document.getElementById("customGrid");
    const { list, field } = TAB_MAP[currentCustomTab];
    const unlocked = user.unlocked[currentCustomTab];

    grid.innerHTML = "";
    list.forEach(item => {
      const isOwned = unlocked.includes(item.id);
      const isEquipped = user.customization[field] === item.id;
      const isPreviewing = selectedItem && selectedItem.id === item.id;

      const card = document.createElement("div");
      card.className = `item-card ${isEquipped ? "equipped" : ""} ${isPreviewing && !isEquipped ? "previewing" : ""}`;

      const bgStyle = item.colors
        ? `background: linear-gradient(135deg, ${item.colors[0]}, ${item.colors[1] || item.colors[0]})`
        : `background: rgba(255,255,255,0.9)`;

      card.innerHTML = `
        <div class="swatch" style="${bgStyle}">${item.icon || ""}</div>
        <div class="item-name">${item.name}</div>
        <div class="item-price">${isEquipped ? "Надето ✓" : isOwned ? "Куплено" : `💧 ${item.price}`}</div>
      `;

      // Клик только примеряет предмет!
      card.addEventListener("click", () => {
        window.AeroAudio.click();
        selectedItem = item;
        previewCustom[field] = item.id;
        renderCustomGrid();
      });

      grid.appendChild(card);
    });

    updateActionFooter();
  }

  function updateActionFooter() {
    const user = window.AeroAuth.getUser();
    const { field } = TAB_MAP[currentCustomTab];
    const unlocked = user.unlocked[currentCustomTab];
    const item = selectedItem;
    if (!item) return;

    const isOwned = unlocked.includes(item.id);
    const isEquipped = user.customization[field] === item.id;

    // Показываем бейдж «Примерка», если на превью есть некупленный предмет
    const hasUnownedPreview = Object.keys(TAB_MAP).some(tab => {
      const f = TAB_MAP[tab].field;
      return !user.unlocked[tab].includes(previewCustom[f]);
    });
    document.getElementById("previewBadge").classList.toggle("hidden", !hasUnownedPreview);

    document.getElementById("selectedItemName").textContent = item.name;
    const statusEl = document.getElementById("selectedItemStatus");
    const btn = document.getElementById("customActionBtn");

    btn.className = "jelly-btn";
    btn.disabled = false;

    if (isEquipped) {
      statusEl.textContent = "Сейчас надето на червячке";
      btn.textContent = "Надето ✓";
      btn.classList.add("primary-btn");
      btn.disabled = true;
    } else if (isOwned) {
      statusEl.textContent = "Есть в твоей коллекции";
      btn.textContent = "Надеть";
      btn.classList.add("primary-btn");
    } else if (user.coins >= item.price) {
      statusEl.textContent = `Цена: 💧 ${item.price}`;
      btn.textContent = `Купить за 💧 ${item.price}`;
      btn.classList.add("buy-btn");
    } else {
      statusEl.textContent = `Не хватает ещё 💧 ${item.price - user.coins}`;
      btn.textContent = `Нужно 💧 ${item.price}`;
      btn.disabled = true;
    }
  }

  // Кнопка покупки / надевания внизу
  document.getElementById("customActionBtn").addEventListener("click", () => {
    const user = window.AeroAuth.getUser();
    const { field } = TAB_MAP[currentCustomTab];
    const unlocked = user.unlocked[currentCustomTab];
    const item = selectedItem;
    if (!item) return;

    if (unlocked.includes(item.id)) {
      user.customization[field] = item.id;
      window.AeroAuth.saveProfile();
      window.AeroAudio.click();
    } else if (user.coins >= item.price) {
      user.coins -= item.price;
      unlocked.push(item.id);
      user.customization[field] = item.id;
      window.AeroAuth.saveProfile();
      window.AeroAudio.buy();
      document.getElementById("lobbyCoins").textContent = user.coins;
    }
    renderCustomGrid();
  });

  // Живое 3D-превью
  function startPreviewLoop() {
    stopPreviewLoop();
    const canvas = document.getElementById("previewCanvas");
    const ctx = canvas.getContext("2d");

    function draw(now) {
      if (!previewCustom) return;
      window.AeroGame.drawPreviewWorm(ctx, canvas.width, canvas.height, previewCustom, now * 0.003);
      previewRaf = requestAnimationFrame(draw);
    }
    previewRaf = requestAnimationFrame(draw);
  }

  function stopPreviewLoop() {
    if (previewRaf) cancelAnimationFrame(previewRaf);
    previewRaf = null;
  }

  // Запуск игры (в бой идут только реально купленные и надетые вещи)
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

  document.getElementById("playBtn").addEventListener("click", () => { window.AeroAudio.click(); launchGame(); });
  document.getElementById("restartBtn").addEventListener("click", () => { window.AeroAudio.click(); launchGame(); });
  document.getElementById("backLobbyBtn").addEventListener("click", () => { window.AeroAudio.click(); openLobby(); });
  document.getElementById("exitGameBtn").addEventListener("click", () => {
    window.AeroAudio.click();
    window.AeroGame.stop();
    openLobby();
  });

  const existingUser = window.AeroAuth.init();
  if (existingUser) openLobby();
  else showScreen(authScreen);
})();
