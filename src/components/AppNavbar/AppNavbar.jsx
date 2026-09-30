"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AppNavbar.module.scss";

const NAV_ITEMS = [
  { href: "/", label: "📈 Interactive Chart" },
  { href: "/screener", label: "🔍 Signals Screener" },
  { href: "/optionchain", label: "📊 Option Chain" },
  { href: "/heatmap", label: "🗺️ Sector Heatmap" },
  { href: "/sentiment", label: "🌐 Market Sentiment" },
  { href: "/briefing", label: "🤖 AI Briefing" },
  { href: "/TradingView", label: "⚡ TradingView" },
  { href: "/TradingView/forex", label: "🌍 Forex Heatmap" },
];

/**
 * Determines whether a nav item link should be considered active.
 * Handles exact matching for "/" and "/TradingView" to prevent false positive highlighting on sub-routes.
 *
 * @param {string} currentPath Current pathname from Next.js router.
 * @param {string} href Target route href.
 * @returns {boolean} True if active.
 */
function checkIsActive(currentPath, href) {
  if (!currentPath) return false;
  if (href === "/") {
    return currentPath === "/";
  }
  if (href === "/TradingView") {
    return currentPath === "/TradingView";
  }
  return currentPath === href || currentPath.startsWith(href + "/");
}

/**
 * Unified Global Navigation Bar component used across all tools and pages.
 * Supports active route indicator, responsive mobile layout, custom page titles, and action slots.
 *
 * @param {object} props
 * @param {string} [props.title="Panarwala Stocks"] Page title displayed in the brand area.
 * @param {React.ReactNode} [props.icon] Optional icon displayed beside the brand title.
 * @param {React.ReactNode} [props.children] Optional action buttons rendered on the right.
 * @returns {JSX.Element}
 */
export default function AppNavbar({
  title = "Panarwala Stocks",
  icon = null,
  children = null,
}) {
  const pathname = usePathname();

  return (
    <nav className={styles.navbar} aria-label="Main Navigation">
      <Link href="/" className={styles.brand}>
        <h1>
          {icon}
          <span>{title}</span>
        </h1>
      </Link>

      <div className={styles.navLinks}>
        {NAV_ITEMS.map((item) => {
          const active = checkIsActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navPill} ${active ? styles.active : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {children && <div className={styles.extraActions}>{children}</div>}
    </nav>
  );
}
