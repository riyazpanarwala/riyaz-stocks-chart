'use client';

import { useEffect, useState } from 'react';
import styles from './TrendlyneTabs.module.css'; // <-- your custom CSS file

export default function TrendlyneChecklist({
  symbol = 'JPPOWER',
  theme = 'light',
  primaryCol = '006AFF',
  posCol = '00A25B',
  negCol = 'EB3B00',
  neuCol = 'F7941E'
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    // Check if script is already loaded
    if (document.querySelector('script[src*="tl-widgets.js"]')) {
      setIsLoaded(true);
      return;
    }

    // Load the Trendlyne widget script
    const script = document.createElement('script');
    script.src = 'https://cdn-static.trendlyne.com/static/js/webwidgets/tl-widgets.js';
    script.async = true;
    script.charset = 'utf-8';

    script.onload = () => {
      console.log('Trendlyne widgets script loaded');
      setIsLoaded(true);
      setLoadError(false);
    };

    script.onerror = () => {
      console.error('Failed to load Trendlyne widgets script');
      setLoadError(true);
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup on component unmount
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const encodedSymbol = encodeURIComponent(symbol);

  return (
    <div className={styles.container}>
      <div className={styles.mainDiv}>
        <div className={styles.quoteWidget}>
          {/* Checklist Widget */}
          <blockquote
            className="trendlyne-widgets"
            style={{ width: "100%" }}
            data-get-url={`https://trendlyne.com/web-widget/checklist-widget/Poppins/${encodedSymbol}/?posCol=${posCol}&primaryCol=${primaryCol}&negCol=${negCol}&neuCol=${neuCol}`}
            data-theme={theme}
          />
        </div>

        <div className={styles.quoteWidget}>
          {/* SWOT Widget */}
          <blockquote
            className="trendlyne-widgets"
            style={{ width: "100%" }}
            data-get-url={`https://trendlyne.com/web-widget/swot-widget/Poppins/${encodedSymbol}/?posCol=${posCol}&primaryCol=${primaryCol}&negCol=${negCol}&neuCol=${neuCol}`}
            data-theme={theme}
          />
        </div>
      </div>

      {/* IPO Widget */}
      {/*
      <blockquote
        className="trendlyne-widgets w-full"
        data-get-url={`https://trendlyne.com/web-widget/ipo-widget/Poppins/?posCol=${posCol}&primaryCol=${primaryCol}&negCol=${negCol}&neuCol=${neuCol}`}
        data-theme={theme}
      />*/}

       {/* Loading */}
      {!isLoaded && !loadError && (
        <div className={styles.loadingBox}>
          <div className={styles.spinner}></div>
          <p>Loading Trendlyne Widgets...</p>
        </div>
      )}

      {/* Error */}
      {loadError && (
        <div className={styles.errorBox}>
          <p>Unable to load Trendlyne widgets. Please try again later.</p>
        </div>
      )}
    </div>
  );
}
