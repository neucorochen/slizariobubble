(function () {
  const CFG = window.AERO_CONFIG;
  const authScreen = document.getElementById("authScreen");
  const lobbyScreen = document.getElementById("lobbyScreen");
  const gameScreen = document.getElementById("gameScreen");
  const aeroBg = document.getElementById("aeroBg");

  let authMode = "login";
  let currentCustomTab = "bodies";
  let previewCustom = null;
  let selectedItem = null;
  let previewRaf = null;

  const TAB_MAP = {
    bodies:   { list: CFG.BODIES,   field: "body" },
    skins:    { list: CFG.SKINS,    field: "skin" },
    hats:     { list: CFG.HATS,     field: "hat" },
    eyes:     { list: CFG.EYES,     field: "eyes" },
    patterns: { list: CFG.PATTERNS, field: "pattern" },
    auras:    { list: CFG.AURAS,    field: "aura" }
  };

  function playSfx(name) {
    if (window.AeroAudio && window.AeroAudio[name]) window.AeroAudio[name]();
  }

  function showScreen(target) {
    [authScreen, lobbyScreen, gameScreen].forEach(s => s && s.classList.remove("active"));
    if (target) target.classList.add("active");
    if (aeroBg) aeroBg.style.display = target === gameScreen ? "none" : "block";

    if (target === lobbyScreen) startPreviewLoop();
    else stopPreviewLoop();
  }

  document.querySelectorAll("[data-auth-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      playSfx("click");
      authMode = btn.dataset.authTab;
      document.querySelectorAll("[data-auth-tab]").forEach(b => b.classList.toggle("active", b === btn));
      document.getElementById("confirmPassGroup").classList.toggle("hidden", authMode === "login");
      document.getElementById("authSubmitBtn").textContent =
        authMode === "login" ? "Войти в аккаунт" : "Создать аккаунт";
      document.getElementById("authError").textContent = "";
    });
  });

  document.getElementById("authForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("authSubmitBtn");
    const errEl = document.getElementById("authError");
    const u = document.getElementById("authUsername").value;
    const p = document.getElementById("authPassword").value;
    const c = document.getElementById("authConfirm").value;

    btn.disabled = true;
    errEl.textContent = "Подключение...";

    const res = authMode === "login"
      ? await window.AeroAuth.login(u, p)
      : await window.AeroAuth.register(u, p, c);

    btn.disabled = false;

    if (!res.ok) {
      errEl.textContent = res.error;
      return;
    }
    errEl.textContent = "";
    playSfx("buy");
    openLobby();
  });

  document.getElementById("guestBtn").addEventListener("click", () => {
    playSfx("click");
    window.AeroAuth.loginAsGuest();
    openLobby();
  });

  document.getElementById("logoutBtn").addEventListener("click", () => {
    playSfx("click");
    window.AeroAuth.logout();
    document.getElementById("authForm").reset();
    showScreen(authScreen);
  });

  document.getElementById("soundToggleBtn").addEventListener("click", (e) => {
    if (!window.AeroAudio) return;
    const muted = window.AeroAudio.toggleMute();
    e.currentTarget.textContent = muted ? "🔇" : "🔊";
  });

  ["cc1", "cc2", "cc3"].forEach((id, idx) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener("input", () => {
      if (!previewCustom) return;
      previewCustom.customColors[idx] = input.value;
      const user = window.AeroAuth.getUser();
      if (user && user.unlocked.skins.includes("custom")) {
        user.customization.customColors[idx] = input.value;
        window.AeroAuth.saveProfile();
      }
    });
  });

  function openLobby() {
    const user = window.AeroAuth.getUser();
    if (!user) return showScreen(authScreen);

    previewCustom = {
      ...user.customization,
      customColors: [...(user.customization.customColors || ["#38bdf8", "#f472b6", "#4ade80"])]
    };

    ["cc1", "cc2", "cc3"].forEach((id, idx) => {
      const el = document.getElementById(id);
      if (el) el.value = previewCustom.customColors[idx];
    });

    document.getElementById("lobbyUsername").textContent = user.username;
    document.getElementById("lobbyBest").textContent = user.bestScore;
    document.getElementById("lobbyCoins").textContent = user.coins;
    selectCurrentTabDefault();
    renderCustomGrid();
    showScreen(lobbyScreen);
  }

  function selectCurrentTabDefault() {
    const { list, field } = TAB_MAP[currentCustomTab];
    selectedItem = list.find(i => i.id === previewCustom[field]) || list[0];
  }

  document.querySelectorAll("[data-ctab]").forEach(btn => {
    btn.addEventListener("click", () => {
      playSfx("click");
      currentCustomTab = btn.dataset.ctab;
      document.querySelectorAll("[data-ctab]").forEach(b => b.classList.toggle("active", b === btn));
      selectCurrentTabDefault();
      renderCustomGrid();
    });
  });

  const resetBtn = document.getElementById("resetPreviewBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      const user = window.AeroAuth.getUser();
      playSfx("click");
      previewCustom = { ...user.customization, customColors: [...user.customization.customColors] };
      selectCurrentTabDefault();
      renderCustomGrid();
    });
  }

  function renderCustomGrid() {
    const user = window.AeroAuth.getUser();
    const grid = document.getElementById("customGrid");
    const { list, field } = TAB_MAP[currentCustomTab];
    const unlocked = user.unlocked[currentCustomTab];

    grid.innerHTML = "";
    list.forEach(item => {
      const isOwned = unlocked.includes(item.id);
      const isEquipped = user.customization[field] === item.id;
      const isPreviewing = previewCustom[field] === item.id;

      const card = document.createElement("div");
      card.className = `item-card ${isEquipped ? "equipped" : ""} ${isPreviewing && !isEquipped ? "previewing" : ""}`;

      const bgStyle = item.colors
        ? `background: linear-gradient(135deg, ${item.colors[0]}, ${item.colors[1] || item.colors[0]})`
        : `background: rgba(255,255,255,0.92)`;

      card.innerHTML = `
        <div class="swatch" style="${bgStyle}">${item.icon || ""}</div>
        <div class="item-name">${item.name}</div>
        <div class="item-price">${isEquipped ? "Надето ✓" : isOwned ? "Куплено" : `💧 \${item.price}`}</div>
      `;

      card.addEventListener("click", () => {
        playSfx("click");
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

    const colorBar = document.getElementById("customColorBar");
    if (colorBar) {
      colorBar.classList.toggle("hidden", !(currentCustomTab === "skins" && item.isCustom));
    }

    const isDiffFromEquipped = Object.keys(TAB_MAP).some(tab => {
      const f = TAB_MAP[tab].field;
      return previewCustom[f] !== user.customization[f];
    });
    const prevCtrl = document.getElementById("previewControls");
    if (prevCtrl) prevCtrl.classList.toggle("hidden", !isDiffFromEquipped);

    document.getElementById("selectedItemName").textContent = item.name;
    const statusEl = document.getElementById("selectedItemStatus");
    const btn = document.getElementById("customActionBtn");

    btn.className = "jelly-btn";
    btn.disabled = false;

    if (isEquipped) {
      statusEl.textContent = "Сейчас надето на питомце";
      btn.textContent = "Надето ✓";
      btn.classList.add("primary-btn");
      btn.disabled = true;
    } else if (isOwned) {
      statusEl.textContent = "Есть в твоей коллекции";
      btn.textContent = "Надеть";
      btn.classList.add("primary-btn");
    } else if (user.coins >= item.price) {
      statusEl.textContent = `Примерка • Цена: 💧 ${item.price}`;
      btn.textContent = `Купить за 💧 ${item.price}`;
      btn.classList.add("buy-btn");
    } else {
      statusEl.textContent = `Примерка • Не хватает 💧 ${item.price - user.coins}`;
      btn.textContent = `Нужно 💧 ${item.price}`;
      btn.disabled = true;
    }
  }

  document.getElementById("customActionBtn").addEventListener("click", () => {
    const user = window.AeroAuth.getUser();
    const { field } = TAB_MAP[currentCustomTab];
    const unlocked = user.unlocked[currentCustomTab];
    const item = selectedItem;
    if (!item) return;

    if (unlocked.includes(item.id)) {
      user.customization[field] = item.id;
      if (item.isCustom) user.customization.customColors = [...previewCustom.customColors];
      window.AeroAuth.saveProfile();
      playSfx("click");
    } else if (user.coins >= item.price) {
      user.coins -= item.price;
      unlocked.push(item.id);
      user.customization[field] = item.id;
      if (item.isCustom) user.customization.customColors = [...previewCustom.customColors];
      window.AeroAuth.saveProfile();
      playSfx("buy");
      document.getElementById("lobbyCoins").textContent = user.coins;
    }
    renderCustomGrid();
  });

  function startPreviewLoop() {
    stopPreviewLoop();
    const canvas = document.getElementById("previewCanvas");
    if (!canvas) return;
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

  document.getElementById("playBtn").addEventListener("click", () => { playSfx("click"); launchGame(); });
  document.getElementById("restartBtn").addEventListener("click", () => { playSfx("click"); launchGame(); });
  document.getElementById("backLobbyBtn").addEventListener("click", () => { playSfx("click"); openLobby(); });
  document.getElementById("exitGameBtn").addEventListener("click", () => {
    playSfx("click");
    window.AeroGame.stop();
    openLobby();
  });

  (async () => {
    const existingUser = await window.AeroAuth.init();
    if (existingUser) openLobby();
    else showScreen(authScreen);
  })();
})();
