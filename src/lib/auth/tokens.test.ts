import { getAccessToken, setAccessToken, clearAccessToken } from './tokens';

describe('access token memory storage', () => {
  beforeEach(() => clearAccessToken());

  it('starts as null', () => {
    expect(getAccessToken()).toBeNull();
  });

  it('round-trips a set value', () => {
    setAccessToken('jwt.value.here');
    expect(getAccessToken()).toBe('jwt.value.here');
  });

  it('clears on demand', () => {
    setAccessToken('jwt.value.here');
    clearAccessToken();
    expect(getAccessToken()).toBeNull();
  });
});
