"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Custom React hook for live streaming market ticks from the server.
 * All Shoonya WebSocket authentication and credentials are kept strictly on the server.
 * The client connects to an internal Server-Sent Events (SSE) stream (/api/shoonya-stream).
 *
 * @param {Object} options
 * @param {boolean} [options.enabled=true] - Whether the stream should be active
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
      setStatus("idle");
      return;
    }

    setStatus("connecting");
    setErrorMsg(null);

    const streamUrl = `/api/shoonya-stream?k=${encodeURIComponent(targetKey)}`;
    const eventSource = new EventSource(streamUrl);

    eventSource.onopen = () => {
      // Stream connected to server
      setStatus("connected");
      setErrorMsg(null);
    };

    eventSource.addEventListener("status", (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status) {
          setStatus(data.status);
        }
        if (data.errorMsg) {
          setErrorMsg(data.errorMsg);
        }
      } catch (err) {
        console.warn("[useShoonyaWebSocket] Failed to parse status event:", err);
      }
    });

    eventSource.addEventListener("tick", (event) => {
      try {
        const tick = JSON.parse(event.data);
        setLastTick(tick);
        if (typeof onTickRef.current === "function") {
          onTickRef.current(tick);
        }
      } catch (err) {
        console.warn("[useShoonyaWebSocket] Failed to parse tick event:", err);
      }
    });

    eventSource.onerror = () => {
      // EventSource automatically attempts to reconnect on transient errors.
      // If readyState is CLOSED (2), connection permanently failed.
      if (eventSource.readyState === EventSource.CLOSED) {
        setStatus("error");
        setErrorMsg("Connection to server market stream was closed.");
      } else {
        setStatus("disconnected");
      }
    };

    return () => {
      eventSource.close();
      setStatus("idle");
    };
  }, [enabled, targetKey]);

  return {
    status, // "idle" | "connecting" | "connected" | "disconnected" | "error"
    isConnected: status === "connected",
    lastTick,
    errorMsg,
  };
}
