import { useState, useEffect } from 'react';
import { getThemeColors } from './colorscheme.js';

export const useThemeColors = () => {
    const [colors, setColors] = useState(getThemeColors);

    useEffect(() => {
        const update = () => setColors(getThemeColors());
        window.addEventListener('themechange', update);
        return () => window.removeEventListener('themechange', update);
    }, []);

    return colors;
};