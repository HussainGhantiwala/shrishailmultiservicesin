/**
 * Centralized Design System & Theme Tokens
 * Matches existing Tailwind CSS config & brand palette
 */

export const THEME = {
  colors: {
    primary: {
      DEFAULT: '#2563EB', // Blue 600
      hover: '#1D4ED8',   // Blue 700
      light: '#EFF6FF',   // Blue 50
      border: '#BFDBFE',  // Blue 200
    },
    secondary: {
      DEFAULT: '#0F172A', // Slate 900
      muted: '#64748B',   // Slate 500
      border: '#E2E8F0',  // Slate 200
      bg: '#F8FAFC',      // Slate 50
    },
    success: {
      DEFAULT: '#10B981', // Emerald 500
      bg: '#ECFDF5',      // Emerald 50
      text: '#065F46',    // Emerald 800
    },
    warning: {
      DEFAULT: '#F59E0B', // Amber 500
      bg: '#FFFBEB',      // Amber 50
      text: '#92400E',    // Amber 800
    },
    danger: {
      DEFAULT: '#EF4444', // Red 500
      bg: '#FEF2F2',      // Red 50
      text: '#991B1B',    // Red 800
    },
  },
  borderRadius: {
    sm: 'rounded-md',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    full: 'rounded-full',
  },
  shadows: {
    xs: 'shadow-xs',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  },
  transitions: {
    default: 'transition-all duration-200 ease-in-out',
    fast: 'transition-all duration-150 ease-in-out',
  },
};
