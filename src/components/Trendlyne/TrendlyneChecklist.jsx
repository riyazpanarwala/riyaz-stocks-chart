'use client';

import { useEffect, useState } from 'react';

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
    <div>
      <div style={{ width: "100%", display: "flex", justifyContent: "space-between" }}>
        <div style={{ width: "49%" }}>
          {/* Checklist Widget */}
          <blockquote
            className="trendlyne-widgets"
            style={{ width: "100%" }}
            data-get-url={`https://trendlyne.com/web-widget/checklist-widget/Poppins/${encodedSymbol}/?posCol=${posCol}&primaryCol=${primaryCol}&negCol=${negCol}&neuCol=${neuCol}`}
            data-theme={theme}
          />
        </div>

        <div style={{ width: "49%" }}>
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

       {/* Loading / Error State */}
      {!isLoaded && !loadError && (
        <div className="flex justify-center items-center py-12 bg-gray-50 rounded-lg border">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <p className="text-gray-600 text-sm">Loading Trendlyne Checklist...</p>
          </div>
        </div>
      )}

      {loadError && (
        <div className="flex justify-center items-center py-12 bg-gray-50 rounded-lg border">
          <p className="text-gray-600 text-sm">
            Unable to load Trendlyne widgets right now. Please try again later.
          </p>
        </div>
      )}
    </div>
  );
}
