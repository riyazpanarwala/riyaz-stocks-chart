import { EventEmitter } from "node:events";

const SHOONYA_WS_URL = "wss://api.shoonya.com/NorenWSTP/";
const HEARTBEAT_INTERVAL_MS = 25_000;
const IDLE_SHUTDOWN_MS = 30_000;

class ShoonyaStreamManager extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.status = "idle"; // "idle" | "connecting" | "connected" | "disconnected" | "error"
    this.errorMsg = null;
    this.heartbeatTimer = null;
    this.idleTimer = null;
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.subscribers = new Map(); // id -> { keys: Set<string>, onTick: Function, onStatus: Function }
    this.activeSubscriptions = new Set(); // Set of "EXCH|TOKEN"
    this.pendingSubscriptions = new Set();
  }

  getStatus() {
    return {
      status: this.status,
      isConnected: this.status === "connected",
      errorMsg: this.errorMsg,
    };
  }

  ensureConnected() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) {
      return;
    }

    const uid = process.env.SHOONYA_UID?.trim();
    const accessToken = process.env.SHOONYA_ACCESS_TOKEN?.trim();

    if (!uid || !accessToken) {
      this.status = "error";
      this.errorMsg = "Shoonya credentials not configured on server.";
      this.notifyStatus();
      return;
    }

    const WS = globalThis.WebSocket;
    if (!WS) {
      this.status = "error";
      this.errorMsg = "WebSocket is not supported in this Node.js environment.";
      this.notifyStatus();
      return;
    }

    this.status = "connecting";
    this.errorMsg = null;
    this.notifyStatus();

    try {
      const ws = new WS(SHOONYA_WS_URL);
      this.ws = ws;

      ws.onopen = () => {
        this.reconnectAttempts = 0;
        // Authenticate with Shoonya using server credentials
        try {
          ws.send(
            JSON.stringify({
              t: "a",
              uid,
              actid: uid,
              accesstoken: accessToken,
              source: "API",
            }),
          );
        } catch (err) {
          console.error("[ShoonyaStreamManager] Failed to send auth handshake:", err.message);
        }

        // Heartbeat
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = setInterval(() => {
          if (this.ws && this.ws.readyState === 1) {
            try {
              this.ws.send(JSON.stringify({ t: "h" }));
            } catch {
              // ignore
            }
          }
        }, HEARTBEAT_INTERVAL_MS);
      };

      ws.onmessage = (event) => {
        try {
          const raw = typeof event.data === "string" ? event.data : event.data?.toString();
          if (!raw) return;
          const data = JSON.parse(raw);

          // Auth response
          if (data.t === "ak") {
            if (data.s === "OK") {
              this.status = "connected";
              this.errorMsg = null;
              this.notifyStatus();
              this.syncSubscriptions();
            } else {
              this.status = "error";
              this.errorMsg = data.emsg || "Shoonya auth failed.";
              this.notifyStatus();
            }
            return;
          }

          // Heartbeat response
          if (data.t === "hk") return;

          // Market ticks
          if (data.t === "tk" || data.t === "tf") {
            const key = `${data.e}|${data.tk}`;
            const parsed = {
              type: data.t,
              exchange: data.e,
              token: data.tk,
              tradingSymbol: data.ts,
              ltp: data.lp != null ? parseFloat(data.lp) : undefined,
              open: data.o != null ? parseFloat(data.o) : undefined,
              high: data.h != null ? parseFloat(data.h) : undefined,
              low: data.l != null ? parseFloat(data.l) : undefined,
              close: data.c != null ? parseFloat(data.c) : undefined,
              volume: data.v != null ? parseInt(data.v, 10) : undefined,
              oi: data.oi != null ? parseInt(data.oi, 10) : undefined,
              bid: data.bp1 != null ? parseFloat(data.bp1) : undefined,
              ask: data.sp1 != null ? parseFloat(data.sp1) : undefined,
              time: data.ft ? Number(data.ft) * 1000 : Date.now(),
              percentChange: data.pc != null ? parseFloat(data.pc) : undefined,
              raw: data,
            };

            this.broadcastTick(key, parsed);
          }
        } catch (err) {
          console.warn("[ShoonyaStreamManager] Packet parse error:", err.message);
        }
      };

      ws.onerror = (err) => {
        console.warn("[ShoonyaStreamManager] Socket error:", err?.message || err);
        this.status = "error";
        this.errorMsg = "Shoonya socket encountered an error.";
        this.notifyStatus();
      };

      ws.onclose = () => {
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
        this.ws = null;
        this.activeSubscriptions.clear();

        if (this.subscribers.size > 0) {
          this.status = "disconnected";
          this.notifyStatus();
          // Exponential backoff reconnect
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10_000);
          this.reconnectAttempts += 1;
          this.reconnectTimer = setTimeout(() => {
            this.ensureConnected();
          }, delay);
        } else {
          this.status = "idle";
          this.notifyStatus();
        }
      };
    } catch (err) {
      this.status = "error";
      this.errorMsg = err.message || "Failed to initialize Shoonya socket.";
      this.notifyStatus();
    }
  }

  notifyStatus() {
    const payload = this.getStatus();
    for (const sub of this.subscribers.values()) {
      try {
        sub.onStatus(payload);
      } catch {
        // ignore subscriber errors
      }
    }
  }

  broadcastTick(key, tick) {
    for (const sub of this.subscribers.values()) {
      if (sub.keys.has(key)) {
        try {
          sub.onTick(tick);
        } catch {
          // ignore
        }
      }
    }
  }

  syncSubscriptions() {
    if (!this.ws || this.ws.readyState !== 1 || this.status !== "connected") {
      return;
    }

    // Determine all keys needed across all current subscribers
    const needed = new Set();
    for (const sub of this.subscribers.values()) {
      for (const k of sub.keys) {
        if (k) needed.add(k.trim());
      }
    }

    // Keys to subscribe
    const toSubscribe = [];
    for (const k of needed) {
      if (!this.activeSubscriptions.has(k)) {
        toSubscribe.push(k);
      }
    }

    // Keys to unsubscribe
    const toUnsubscribe = [];
    for (const k of this.activeSubscriptions) {
      if (!needed.has(k)) {
        toUnsubscribe.push(k);
      }
    }

    if (toUnsubscribe.length > 0) {
      try {
        this.ws.send(JSON.stringify({ t: "u", k: toUnsubscribe.join("#") }));
        for (const k of toUnsubscribe) this.activeSubscriptions.delete(k);
      } catch (err) {
        console.warn("[ShoonyaStreamManager] Failed to unsubscribe:", err.message);
      }
    }

    if (toSubscribe.length > 0) {
      try {
        this.ws.send(JSON.stringify({ t: "t", k: toSubscribe.join("#") }));
        for (const k of toSubscribe) this.activeSubscriptions.add(k);
      } catch (err) {
        console.warn("[ShoonyaStreamManager] Failed to subscribe:", err.message);
      }
    }
  }

  subscribe(subscriberId, rawKeys, onTick, onStatus) {
    const keyArray = Array.isArray(rawKeys)
      ? rawKeys
      : String(rawKeys || "").split("#");

    const cleanKeys = new Set(
      keyArray.map((k) => k?.trim()).filter(Boolean),
    );

    this.subscribers.set(subscriberId, {
      keys: cleanKeys,
      onTick,
      onStatus,
    });

    this.ensureConnected();

    if (this.status === "connected") {
      this.syncSubscriptions();
      onStatus(this.getStatus());
    } else {
      onStatus(this.getStatus());
    }

    return () => {
      this.unsubscribe(subscriberId);
    };
  }

  unsubscribe(subscriberId) {
    if (this.subscribers.delete(subscriberId)) {
      this.syncSubscriptions();
    }

    if (this.subscribers.size === 0) {
      // Schedule idle shutdown
      if (this.idleTimer) clearTimeout(this.idleTimer);
      this.idleTimer = setTimeout(() => {
        if (this.subscribers.size === 0 && this.ws) {
          try {
            this.ws.close();
          } catch {
            // ignore
          }
          this.ws = null;
          this.status = "idle";
          this.activeSubscriptions.clear();
        }
      }, IDLE_SHUTDOWN_MS);
    }
  }
}

// Preserve singleton across hot reloads in development
const globalRef = globalThis;
if (!globalRef.__shoonyaStreamManager) {
  globalRef.__shoonyaStreamManager = new ShoonyaStreamManager();
}

export const shoonyaStreamManager = globalRef.__shoonyaStreamManager;
