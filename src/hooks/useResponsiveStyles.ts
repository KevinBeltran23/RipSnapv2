// src/hooks/useResponsiveStyles.ts
import { useWindowDimensions } from 'react-native';
import { useCallback } from 'react'; // Import useCallback

// Base width for calculations (Pixel 6a)
const BASE_WIDTH = 393;
const BASE_HEIGHT = 873;

const MD_BREAKPOINT = 768;
const LG_BREAKPOINT = 1024;

// Hook to provide responsive utilities
export function useResponsiveStyles() {
  const { width, height } = useWindowDimensions();

  const scaleWidth = useCallback(
    (size: number) => {
      return (width / BASE_WIDTH) * size;
    },
    [width],
  );

  const scaleHeight = useCallback(
    (size: number) => {
      return (height / BASE_HEIGHT) * size;
    },
    [height],
  );

  const scaleFont = useCallback(
    (size: number, factor = 0.25) => {
      return size + (scaleWidth(size) - size) * factor;
    },
    [scaleWidth],
  );

  const proportionalSize = useCallback(
    (size: number) => {
      const scale = width / BASE_WIDTH;
      return size * scale;
    },
    [width],
  );

  const widthPercentage = useCallback(
    (percentage: string | number) => {
      const value =
        typeof percentage === 'string' ? parseFloat(percentage) : percentage;
      return width * (value / 100);
    },
    [width],
  );

  const heightPercentage = useCallback(
    (percentage: string | number) => {
      const value =
        typeof percentage === 'string' ? parseFloat(percentage) : percentage;
      const heightPx = height * (value / 100);
      return heightPx;
    },
    [height],
  );

  // Breakpoint flags
  const isSmallScreen = width < MD_BREAKPOINT;
  const isMediumScreen = width >= MD_BREAKPOINT && width < LG_BREAKPOINT;
  const isLargeScreen = width >= LG_BREAKPOINT;
  const isLandscape = width > height;

  return {
    width,
    height,
    isLandscape,
    scaleWidth,
    scaleHeight,
    scaleFont,
    proportionalSize,
    widthPercentage,
    heightPercentage,
    isSmallScreen,
    isMediumScreen,
    isLargeScreen,
  };
}
