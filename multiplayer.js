(function () {
  const CFG = window.AERO_CONFIG;

  class AeroMultiplayer {
    constructor() {
      this.client = null;
      this.channel = null;
      this.myId = "p_" + Math.random().toString(36).slice(2, 10);
      this.connected = false;
      this.status = "offline"; // offline | connecting | online | error
      this.remotePlayers = new Map();
      this.sendTimer = 0;
    }

    init() {
      if (!window.supabase || !CFG.SUPABASE_URL || !CFG.SUPABASE_KEY) {
        this.status = "offline";
        return;
      }

      // Проверка, что ключи реально заменены
      if (
        CFG.SUPABASE_URL.includes("YOUR_") ||
        CFG.SUPABASE_URL.includes("ТВОЙ_") ||
        CFG.SUPABASE_KEY.includes("ВСТАВЬ_")
      ) {
        console.warn("AeroWorm: Вставь реальные SUPABASE_URL и SUPABASE_KEY в config.js");
        this.status = "offline";
        return;
      }

      // Автоматически убираем /rest/v1/ если вставили длинный URL
      const cleanUrl = CFG.SUPABASE_URL.replace(/\/rest\/v1\/?.*$/, "").replace(/\/$/, "");
      this.client = window.supabase.createClient(cleanUrl, CFG.SUPABASE_KEY.trim(), {
        realtime: { params: { eventsPerSecond: 20 } }
      });
    }

    joinArena(playerWorm) {
      if (!this.client) return;
      this.leaveArena();
      this.status = "connecting";

      this.channel = this.client.channel("aeroworm_global_room", {
        config: {
          broadcast: { self: false },
          presence: { key: this.myId }
        }
      });

      this.channel.on("broadcast", { event: "state" }, ({ payload }) => {
        if (!payload || payload.id === this.myId) return;
        this.remotePlayers.set(payload.id, {
          ...payload,
          lastSeen: performance.now()
        });
      });

      this.channel.on("broadcast", { event: "dead" }, ({ payload }) => {
        if (payload && payload.id) this.remotePlayers.delete(payload.id);
      });

      this.channel.on("presence", { event: "leave" }, ({ key }) => {
        this.remotePlayers.delete(key);
      });

      this.channel.subscribe(async (status, err) => {
        if (status === "SUBSCRIBED") {
          this.connected = true;
          this.status = "online";
          await this.channel.track({
            id: this.myId,
            name: playerWorm.name,
            online_at: Date.now()
          });
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          this.connected = false;
          this.status = "error";
          console.error("AeroWorm Realtime error:", status, err);
        }
      });
    }

    sendState(playerWorm, dt) {
      if (!this.connected || !this.channel || !playerWorm || !playerWorm.alive) return;
      this.sendTimer += dt;
      if (this.sendTimer < 0.055) return;
      this.sendTimer = 0;

      const compactSegs = [];
      for (let i = 0; i < playerWorm.segments.length; i += 2) {
        compactSegs.push([
          Math.round(playerWorm.segments[i].x),
          Math.round(playerWorm.segments[i].y)
        ]);
      }

      this.channel.send({
        type: "broadcast",
        event: "state",
        payload: {
          id: this.myId,
          name: playerWorm.name,
          angle: Number(playerWorm.angle.toFixed(2)),
          length: Math.floor(playerWorm.length),
          boosting: playerWorm.boosting,
          custom: playerWorm.custom,
          segs: compactSegs
        }
      });
    }

    sendDead() {
      if (!this.connected || !this.channel) return;
      this.channel.send({
        type: "broadcast",
        event: "dead",
        payload: { id: this.myId }
      });
    }

    cleanupStale() {
      const now = performance.now();
      for (const [id, p] of this.remotePlayers.entries()) {
        if (now - p.lastSeen > 5000) this.remotePlayers.delete(id);
      }
    }

    getRemoteCount() {
      this.cleanupStale();
      return this.remotePlayers.size;
    }

    getStatusIcon() {
      if (this.status === "online") return "🟢";
      if (this.status === "connecting") return "🟡";
      if (this.status === "error") return "🔴";
      return "⚪";
    }

    leaveArena() {
      if (this.channel) {
        this.sendDead();
        this.channel.unsubscribe();
        this.channel = null;
      }
      this.connected = false;
      this.status = "offline";
      this.remotePlayers.clear();
    }
  }

  window.AeroMulti = new AeroMultiplayer();
})();
