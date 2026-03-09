import { useState, useEffect } from 'react';

interface BreakpointConfig {
  mobile?: number;
  tablet?: number;
  laptop?: number;
  desktop?: number;
}

const DEFAULT_COLUMNS: BreakpointConfig = {
  mobile: 2,
  tablet: 3,
  laptop: 4,
  desktop: 5,
};

export function useResponsiveColumns(config: BreakpointConfig = DEFAULT_COLUMNS) {
  const [columns, setColumns] = useState(config.desktop || 4);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 768) setColumns(config.mobile || 2);
      else if (w < 1024) setColumns(config.tablet || 3);
      else if (w < 1280) setColumns(config.laptop || 4);
      else setColumns(config.desktop || 5);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [config.mobile, config.tablet, config.laptop, config.desktop]);

  return columns;
}

export function useBreakpoint() {
  const [bp, setBp] = useState<'mobile' | 'tablet' | 'laptop' | 'desktop'>('desktop');

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 768) setBp('mobile');
      else if (w < 1024) setBp('tablet');
      else if (w < 1280) setBp('laptop');
      else setBp('desktop');
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return bp;
}
