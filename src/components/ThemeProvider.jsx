"use client";
import { useEffect, useState } from "react";

export default function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const saved = localStorage.getItem("theme") || "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    window.dispatchEvent(new CustomEvent('themechange', {
      detail: { theme }
    }));

    localStorage.setItem("theme", next);
  };

  return (
    <>
      <button
        onClick={toggle}
        className="theme-toggle"
        aria-label="Toggle theme"
        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? "☀" : "☽"}
      </button>
      {children}
    </>
  );
}
