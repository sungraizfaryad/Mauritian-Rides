import { colors, spacing, radius } from './index';

describe('theme tokens', () => {
  it('exposes the website teal/navy palette', () => {
    expect(colors.basalt[950]).toBe('#0a0f14');
    expect(colors.lagoon[500]).toBe('#0bb8ad');
    expect(colors.lagoon[400]).toBe('#2cd4c4');
    expect(colors.coral[600]).toBe('#ee5a30');
    expect(colors.sunset[400]).toBe('#ffb24a');
  });

  it('exposes sand, ink, and reef palettes', () => {
    expect(colors.sand[50]).toBe('#faf6ee');
    expect(colors.ink[600]).toBe('#4a5a6e');
    expect(colors.reef[500]).toBe('#e0395e');
  });

  it('exposes a 5-step spacing scale', () => {
    expect(spacing).toEqual({ xs: 4, sm: 8, md: 16, lg: 24, xl: 40 });
  });

  it('exposes a radius scale with a pill value and updated sizes', () => {
    expect(radius.pill).toBe(999);
    expect(radius.md).toBe(16);
    expect(radius.lg).toBe(24);
    expect(radius.xs).toBe(8);
  });
});
