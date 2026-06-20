export const colors = {
  basalt: { 900: '#1a1a1a', 700: '#333333', 500: '#666666', 300: '#999999' },
  lagoon: { 700: '#0077b6', 500: '#00b4d8', 300: '#90e0ef', 100: '#caf0f8' },
  amber: { 500: '#f59e0b' },
  mur: '#1a6b3f',
  surface: '#ffffff',
  surfaceDim: '#f5f5f5',
  danger: '#ef4444',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 } as const;

export const radius = { sm: 6, md: 12, lg: 20, pill: 999 } as const;

export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type Radius = typeof radius;
