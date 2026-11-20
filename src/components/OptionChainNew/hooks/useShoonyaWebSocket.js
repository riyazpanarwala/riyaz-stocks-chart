"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// Cached session across renders and hook re-mounts
let sessionCache = null;
let sessionFetchPromise = null;

async function getShoonyaWsSession() {
  if (sessionCache?.token && sessionCache?.uid) {
    return sessionCache;
  }
  if (!sessionFetchPromise) {
    sessionFetchPromise = fetch("/api/shoonya-ws", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        sessionFetchPromise = null;
        if (data?.ok && data?.token && data?.uid) {
          sessionCache = data;
          return data;
        }
        return null;
      })
      .catch((err) => {
        sessionFetchPromise = null;
        console.warn("Could not fetch Shoonya WS session:", err.message);
        return null;
      });
  }
  return sessionFetchPromise;
}

/**
 * Custom React hook for live streaming market ticks via Shoonya WebSocket.
 * Supports both single instrument subscription (exchange + token)
 * and multi-instrument subscriptions (tokenKeys array or # separated string).
 *
 * @param {Object} options
 * @param {boolean} [options.enabled=true] - Whether the socket should be active
 * @param {string} [options.exchange] - e.g. "NFO", "BFO", "MCX", "NSE"
 * @param {string|number} [options.token] - Instrument token e.g. "64451"
 * @param {string[]|string} [options.tokenKeys] - Multi-token keys e.g. ["NFO|64451", "NFO|64452", "NSE|26000"]
 * @param {Function} [options.onTick] - Callback fired on each tick
 */
export function useShoonyaWebSocket({
  enabled = true,
  exchange,
  token,
  tokenKeys,
  onTick,
} = {}) {
  const [status, setStatus] = useState("idle"); // "idle" | "connecting" | "connected" | "disconnected" | "error"
  const [lastTick, setLastTick] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const onTickRef = useRef(onTick);
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  const wsRef = useRef(null);
  const heartbeatTimerRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const activeSubRef = useRef(null);
  const isAuthenticatedRef = useRef(false);

  // Normalize single token or multi-token keys into Shoonya's hash-separated format
  const targetKey = useMemo(() => {
    if (Array.isArray(tokenKeys) && tokenKeys.length > 0) {
      return tokenKeys.filter(Boolean).join("#");
    }
    if (typeof tokenKeys === "string" && tokenKeys.trim()) {
      return tokenKeys.trim();
    }
    if (exchange && token) {
      return `${exchange}|${token}`;
    }
    return null;
  }, [tokenKeys, exchange, token]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !targetKey) {
      // Unsubscribe if active
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && activeSubRef.current) {
        try {
          wsRef.current.send(JSON.stringify({ t: "u", k: activeSubRef.current }));
        } catch {
          // ignore
        }
        activeSubRef.current = null;
      }
      setStatus("idle");
      return;
    }

    let isCancelled = false;

    async function connect() {
      // If already connected and authenticated, just switch subscription
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && isAuthenticatedRef.current) {
        if (activeSubRef.current !== targetKey) {
          if (activeSubRef.current) {
            try {
              wsRef.current.send(JSON.stringify({ t: "u", k: activeSubRef.current }));
            } catch {
              // ignore
            }
          }
          wsRef.current.send(JSON.stringify({ t: "t", k: targetKey }));
          activeSubRef.current = targetKey;
          setStatus("connected");
        }
        return;
      }

      setStatus("connecting");
      setErrorMsg(null);

      const session = await getShoonyaWsSession();
      if (isCancelled) return;

      if (!session?.token || !session?.uid) {
        setStatus("error");
        setErrorMsg("Shoonya credentials not configured.");
        return;
      }

      try {
        const wsUrl = session.wsUrl || "wss://api.shoonya.com/NorenWSTP/";
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isCancelled) {
            ws.close();
            return;
          }
          reconnectAttemptsRef.current = 0;
          // Send Shoonya authentication handshake
          ws.send(
            JSON.stringify({
              t: "a",
              uid: session.uid,
              actid: session.uid,
              accesstoken: session.token,
              source: "API",
            }),
          );

          // Setup periodic heartbeat every 25 seconds
          if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
          heartbeatTimerRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(JSON.stringify({ t: "h" }));
              } catch {
                // ignore
              }
            }
          }, 25_000);
        };

        ws.onmessage = (event) => {
          if (isCancelled) return;
          try {
            const data = JSON.parse(event.data);

            // Auth response
            if (data.t === "ak") {
              if (data.s === "OK") {
                isAuthenticatedRef.current = true;
                setStatus("connected");
                // Subscribe to active instruments
                if (targetKey) {
                  ws.send(JSON.stringify({ t: "t", k: targetKey }));
                  activeSubRef.current = targetKey;
                }
              } else {
                isAuthenticatedRef.current = false;
                setStatus("error");
                setErrorMsg(data.emsg || "Shoonya WebSocket auth failed.");
              }
              return;
            }

            // Heartbeat response
            if (data.t === "hk") {
              return;
            }

            // Market ticks: 'tk' (snapshot quote) or 'tf' (touchline feed update)
            if (data.t === "tk" || data.t === "tf") {
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

              setLastTick(parsed);
              if (typeof onTickRef.current === "function") {
                onTickRef.current(parsed);
              }
            }
          } catch (err) {
            console.warn("Failed to parse Shoonya WS packet:", err);
          }
        };

        ws.onerror = (err) => {
          if (isCancelled) return;
          console.warn("Shoonya WebSocket error:", err);
          setStatus("error");
        };

        ws.onclose = () => {
          isAuthenticatedRef.current = false;
          activeSubRef.current = null;
          if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);

          if (!isCancelled) {
            setStatus("disconnected");
            // Schedule reconnect if still mounted & enabled
            const attempts = reconnectAttemptsRef.current;
            const delay = Math.min(1000 * Math.pow(2, attempts), 10_000);
            reconnectAttemptsRef.current += 1;
            reconnectTimerRef.current = setTimeout(() => {
              if (!isCancelled) connect();
            }, delay);
          }
        };
      } catch (err) {
        if (!isCancelled) {
          setStatus("error");
          setErrorMsg(err.message || "Failed to establish WebSocket.");
        }
      }
    }

    connect();

    return () => {
      isCancelled = true;
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);

      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN && activeSubRef.current) {
          try {
            wsRef.current.send(JSON.stringify({ t: "u", k: activeSubRef.current }));
          } catch {
            // ignore
          }
        }
        wsRef.current.close();
        wsRef.current = null;
      }
      activeSubRef.current = null;
      isAuthenticatedRef.current = false;
    };
  }, [enabled, targetKey]);

  return {
    status, // "idle" | "connecting" | "connected" | "disconnected" | "error"
    isConnected: status === "connected",
    lastTick,
    errorMsg,
  };
}
