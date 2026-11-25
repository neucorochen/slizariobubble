(function () {
  const CFG = window.AERO_CONFIG;
  const SESSION_KEY = "aeroworm_session_v2";
  const TABLE = "aeroworm_users";

  let sb = null;
  let currentUser = null;

  function getClient() {
    if (sb) return sb;
    if (!window.supabase || !CFG.SUPABASE_URL || !CFG.SUPABASE_KEY) return null;
    if (CFG.SUPABASE_URL.includes("YOUR_") || CFG.SUPABASE_URL.includes("ТВОЙ_")) return null;

    const cleanUrl = CFG.SUPABASE_URL.replace(/\/rest\/v1\/?.*$/, "").replace(/\/$/, "");
    sb = window.supabase.createClient(cleanUrl, CFG.SUPABASE_KEY.trim());
    return sb;
  }

  function simpleHash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16);
  }

  function normalizeProfile(p) {
    if (!p.unlocked) p.unlocked = {};
    p.unlocked.bodies   = p.unlocked.bodies   || ["worm"];
    p.unlocked.skins    = p.unlocked.skins    || ["aqua", "mint"];
    p.unlocked.hats     = p.unlocked.hats     || ["none"];
    p.unlocked.eyes     = p.unlocked.eyes     || ["kawaii"];
    p.unlocked.patterns = p.unlocked.patterns || ["gloss"];
    p.unlocked.auras    = p.unlocked.auras    || ["none"];

    if (!p.customization) p.customization = {};
    p.customization.body         = p.customization.body         || "worm";
    p.customization.skin         = p.customization.skin         || "aqua";
    p.customization.hat          = p.customization.hat          || "none";
    p.customization.eyes         = p.customization.eyes         || "kawaii";
    p.customization.pattern      = p.customization.pattern      || "gloss";
    p.customization.aura         = p.customization.aura         || "none";
    p.customization.customColors = p.customization.customColors || ["#38bdf8", "#f472b6", "#4ade80"];
    return p;
  }

  function rowToProfile(row) {
    return normalizeProfile({
      username: row.username,
      passwordHash: row.password_hash,
      isGuest: false,
      coins: row.coins ?? 75,
      bestScore: row.best_score ?? 0,
      unlocked: row.unlocked,
      customization: row.customization
    });
  }

  window.AeroAuth = {
    async init() {
      const savedKey = localStorage.getItem(SESSION_KEY);
      const client = getClient();
      if (!savedKey || !client) return null;

      const { data, error } = await client
        .from(TABLE)
        .select("*")
        .eq("username_key", savedKey)
        .maybeSingle();

      if (!error && data) {
        currentUser = rowToProfile(data);
      }
      return currentUser;
    },

    getUser() {
      return currentUser;
    },

    async register(username, password, confirm) {
      const clean = username.trim();
      if (clean.length < 3 || clean.length > 16) return { ok: false, error: "Ник должен быть от 3 до 16 символов" };
      if (password.length < 4) return { ok: false, error: "Пароль минимум 4 символа" };
      if (password !== confirm) return { ok: false, error: "Пароли не совпадают" };

      const client = getClient();
      if (!client) return { ok: false, error: "База Supabase не настроена в config.js" };

      const key = clean.toLowerCase();
      const { data: existing } = await client
        .from(TABLE)
        .select("username_key")
        .eq("username_key", key)
        .maybeSingle();

      if (existing) return { ok: false, error: "Такой ник уже занят" };

      const profile = normalizeProfile({
        username: clean,
        passwordHash: simpleHash(password),
        isGuest: false,
        coins: 75,
        bestScore: 0
      });

      const { error } = await client.from(TABLE).insert({
        username_key: key,
        username: profile.username,
        password_hash: profile.passwordHash,
        coins: profile.coins,
        best_score: profile.bestScore,
        unlocked: profile.unlocked,
        customization: profile.customization
      });

      if (error) return { ok: false, error: "Ошибка базы: " + error.message };

      currentUser = profile;
      localStorage.setItem(SESSION_KEY, key);
      return { ok: true, user: currentUser };
    },

    async login(username, password) {
      const key = username.trim().toLowerCase();
      const client = getClient();
      if (!client) return { ok: false, error: "База Supabase не настроена в config.js" };

      const { data, error } = await client
        .from(TABLE)
        .select("*")
        .eq("username_key", key)
        .maybeSingle();

      if (error) return { ok: false, error: "Ошибка подключения к базе" };
      if (!data) return { ok: false, error: "Аккаунт не найден" };
      if (data.password_hash !== simpleHash(password)) return { ok: false, error: "Неверный пароль" };

      currentUser = rowToProfile(data);
      localStorage.setItem(SESSION_KEY, key);
      return { ok: true, user: currentUser };
    },

    loginAsGuest() {
      currentUser = normalizeProfile({
        username: "Гость",
        passwordHash: "",
        isGuest: true,
        coins: 50,
        bestScore: 0
      });
      return currentUser;
    },

    logout() {
      currentUser = null;
      localStorage.removeItem(SESSION_KEY);
    },

    async saveProfile() {
      if (!currentUser || currentUser.isGuest) return;
      const client = getClient();
      if (!client) return;

      await client
        .from(TABLE)
        .update({
          coins: currentUser.coins,
          best_score: currentUser.bestScore,
          unlocked: currentUser.unlocked,
          customization: currentUser.customization
        })
        .eq("username_key", currentUser.username.toLowerCase());
    },

    async addMatchReward(score, coinsEarned) {
      if (!currentUser) return;
      currentUser.coins += coinsEarned;
      if (score > currentUser.bestScore) currentUser.bestScore = score;
      await this.saveProfile();
    }
  };
})();
