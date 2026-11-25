(function () {
  const CFG = window.AERO_CONFIG;

  class AeroMultiplayer {
    constructor() {
      this.client = null;
      this.channel = null;
      this.myId = "p_" + Math.random().toString(36).slice(2, 10);
      this.connected = false;
      this.remotePlayers = new Map(); // id -> данные другого игрока
      this.sendTimer = 0;
    }

    init() {
      if (!window.supabase || !CFG.SUPABASE_URL || CFG.SUPABASE_URL.includes("YOUR_")) {
        console.log("AeroWorm: Supabase не настроен, запуск в офлайн-режиме с ботами.");
        return;
      }
      this.client = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY);
    }

    joinArena(playerWorm) {
      if (!this.client) return;
      this.leaveArena();

      this.channel = this.client.channel("aeroworm_arena_v1", {
        config: {
          broadcast: { self: false },
          presence: { key: this.myId }
        }
      });

      // Получаем позиции других игроков
      this.channel.on("broadcast", { event: "state" }, ({ payload }) => {
        if (!payload || payload.id === this.myId) return;
        this.remotePlayers.set(payload.id, {
          ...payload,
          lastSeen: performance.now()
        });
      });

      // Игрок погиб
      this.channel.on("broadcast", { event: "dead" }, ({ payload }) => {
        if (payload && payload.id) this.remotePlayers.delete(payload.id);
      });

      // Отслеживаем выход игроков
      this.channel.on("presence", { event: "leave" }, ({ key }) => {
        this.remotePlayers.delete(key);
      });

      this.channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          this.connected = true;
          await this.channel.track({
            id: this.myId,
            name: playerWorm.name,
            online_at: Date.now()
          });
        }
      });
    }

    sendState(playerWorm, dt) {
      if (!this.connected || !this.channel || !playerWorm || !playerWorm.alive) return;
      this.sendTimer += dt;
      if (this.sendTimer < 0.06) return; // ~16 раз в секунду (оптимально для мобильных)
      this.sendTimer = 0;

      // Отправляем сжатый массив сегментов (каждый 2-й) для экономии трафика
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

    leaveArena() {
      if (this.channel) {
        this.sendDead();
        this.channel.unsubscribe();
        this.channel = null;
      }
      this.connected = false;
      this.remotePlayers.clear();
    }
  }

  window.AeroMulti = new AeroMultiplayer();
})();
