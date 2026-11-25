(function () {
  const USERS_KEY = "aeroworm_users_v1";
  const SESSION_KEY = "aeroworm_session_v1";

  function simpleHash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16);
  }

  function loadUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY)) || {}; }
    catch { return {}; }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  // Гарантирует, что у старых аккаунтов появятся новые поля (виды и шапки)
  function normalizeProfile(p) {
    if (!p.unlocked) p.unlocked = {};
    p.unlocked.bodies   = p.unlocked.bodies   || ["worm"];
    p.unlocked.skins    = p.unlocked.skins    || ["aqua", "mint"];
    p.unlocked.hats     = p.unlocked.hats     || ["none"];
    p.unlocked.eyes     = p.unlocked.eyes     || ["kawaii"];
    p.unlocked.patterns = p.unlocked.patterns || ["gloss"];
    p.unlocked.auras    = p.unlocked.auras    || ["none"];

    if (!p.customization) p.customization = {};
    p.customization.body    = p.customization.body    || "worm";
    p.customization.skin    = p.customization.skin    || "aqua";
    p.customization.hat     = p.customization.hat     || "none";
    p.customization.eyes    = p.customization.eyes    || "kawaii";
    p.customization.pattern = p.customization.pattern || "gloss";
    p.customization.aura    = p.customization.aura    || "none";
    return p;
  }

  function createDefaultProfile(username, passwordHash, isGuest = false) {
    return normalizeProfile({
      username,
      passwordHash,
      isGuest,
      coins: isGuest ? 50 : 75,
      bestScore: 0
    });
  }

  let currentUser = null;

  window.AeroAuth = {
    init() {
      const savedName = localStorage.getItem(SESSION_KEY);
      if (savedName) {
        const users = loadUsers();
        if (users[savedName.toLowerCase()]) {
          currentUser = normalizeProfile(users[savedName.toLowerCase()]);
        }
      }
      return currentUser;
    },

    getUser() { return currentUser; },

    register(username, password, confirm) {
      const clean = username.trim();
      if (clean.length < 3 || clean.length > 16) return { ok: false, error: "Ник должен быть от 3 до 16 символов" };
      if (password.length < 4) return { ok: false, error: "Пароль минимум 4 символа" };
      if (password !== confirm) return { ok: false, error: "Пароли не совпадают" };

      const users = loadUsers();
      const key = clean.toLowerCase();
      if (users[key]) return { ok: false, error: "Такой ник уже занят" };

      const profile = createDefaultProfile(clean, simpleHash(password), false);
      users[key] = profile;
      saveUsers(users);
      currentUser = profile;
      localStorage.setItem(SESSION_KEY, key);
      return { ok: true, user: currentUser };
    },

    login(username, password) {
      const key = username.trim().toLowerCase();
      const users = loadUsers();
      const user = users[key];
      if (!user) return { ok: false, error: "Аккаунт не найден" };
      if (user.passwordHash !== simpleHash(password)) return { ok: false, error: "Неверный пароль" };

      currentUser = normalizeProfile(user);
      localStorage.setItem(SESSION_KEY, key);
      return { ok: true, user: currentUser };
    },

    loginAsGuest() {
      currentUser = createDefaultProfile("Гость", "", true);
      return currentUser;
    },

    logout() {
      currentUser = null;
      localStorage.removeItem(SESSION_KEY);
    },

    saveProfile() {
      if (!currentUser || currentUser.isGuest) return;
      const users = loadUsers();
      users[currentUser.username.toLowerCase()] = currentUser;
      saveUsers(users);
    },

    addMatchReward(score, coinsEarned) {
      if (!currentUser) return;
      currentUser.coins += coinsEarned;
      if (score > currentUser.bestScore) currentUser.bestScore = score;
      this.saveProfile();
    }
  };
})();
