"use client";

import { useState, useEffect } from "react";
import { browser } from "react-dom";

/**
 * Hook to retrieve and reactively track the current UI theme ("dark" | "light").
 * Synchronizes with document[data-theme], localStorage, and "themechange" custom events.
 * Uses React 19.3's browser() API to assert client-side execution.
 *
 * @returns {"dark" | "light"} The active theme.
 */
export function useActiveTheme() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    browser();

    // Initial check from document attribute or localStorage
    const docTheme = document.documentElement.getAttribute("data-theme");
    const savedTheme = localStorage.getItem("theme");
    const currentTheme = docTheme || savedTheme || "dark";
    setTheme(currentTheme === "light" ? "light" : "dark");

    const onThemeChange = (e) => {
      const next = e?.detail?.theme || document.documentElement.getAttribute("data-theme") || "dark";
      setTheme(next === "light" ? "light" : "dark");
    };

    window.addEventListener("themechange", onThemeChange);

    // Also observe attribute mutations on <html> in case it changes directly
    let observer = null;
    if (typeof MutationObserver !== "undefined") {
      observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type === "attributes" && m.attributeName === "data-theme") {
            const newTheme = document.documentElement.getAttribute("data-theme");
            setTheme(newTheme === "light" ? "light" : "dark");
          }
        }
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    }

    return () => {
      window.removeEventListener("themechange", onThemeChange);
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  return theme;
}

export default useActiveTheme;
