"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

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
      detail: { theme: next },
    }));

    localStorage.setItem("theme", next);
  };

  return (
    <>
      <motion.button
        onClick={toggle}
        className="theme-toggle"
        aria-label="Toggle theme"
        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        whileHover={{ scale: 1.08, rotate: 8 }}
        whileTap={{ scale: 0.9, rotate: -8 }}
      >
        {theme === "dark" ? "☀" : "☽"}
      </motion.button>
      {children}
    </>
  );
}
