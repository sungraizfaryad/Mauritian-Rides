export const colors = {
  basalt: { 950: '#0a0f14', 900: '#0f1720', 800: '#182330', 700: '#243243' },
  ink:    { 600: '#4a5a6e', 400: '#7d8ea3', 300: '#a8b5c4' },
  sand:   { 50: '#faf6ee', 100: '#f4ecd8', 200: '#e9dcb8' },
  lagoon: { 900: '#0a4843', 600: '#089890', 500: '#0bb8ad', 400: '#2cd4c4', 200: '#9ee8e0' },
  coral:  { 600: '#ee5a30', 500: '#ff7a54', 300: '#ffc0a0' },
  sunset: { 500: '#f89428', 400: '#ffb24a' },
  reef:   { 500: '#e0395e' },
  surface: '#ffffff',
  surfaceDim: '#faf6ee',
  danger: '#e0395e',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 } as const;

export const radius = { xs: 8, sm: 10, md: 16, lg: 24, xl: 32, '2xl': 44, pill: 999 } as const;

export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type Radius = typeof radius;
