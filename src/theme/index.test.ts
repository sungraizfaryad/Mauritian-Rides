import { colors, spacing, radius } from './index';

describe('theme tokens', () => {
  it('exposes the basalt and lagoon palettes', () => {
    expect(colors.basalt[900]).toBe('#1a1a1a');
    expect(colors.lagoon[500]).toBe('#00b4d8');
    expect(colors.amber[500]).toBe('#f59e0b');
    expect(colors.mur).toBe('#1a6b3f');
  });

  it('exposes a 5-step spacing scale', () => {
    expect(spacing).toEqual({ xs: 4, sm: 8, md: 16, lg: 24, xl: 40 });
  });

  it('exposes a radius scale with a pill value', () => {
    expect(radius.pill).toBe(999);
    expect(radius.md).toBe(12);
  });
});
