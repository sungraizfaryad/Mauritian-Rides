import { loginSchema, registerSchema } from './auth';

describe('loginSchema', () => {
  it('accepts a valid email + password', () => {
    const r = loginSchema.safeParse({ email: 'a@b.com', password: 'secret12' });
    expect(r.success).toBe(true);
  });

  it('rejects a bad email', () => {
    const r = loginSchema.safeParse({ email: 'nope', password: 'secret12' });
    expect(r.success).toBe(false);
  });

  it('rejects a short password', () => {
    const r = loginSchema.safeParse({ email: 'a@b.com', password: '123' });
    expect(r.success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('accepts a rider registration', () => {
    const r = registerSchema.safeParse({
      persona: 'rider',
      displayName: 'Test User',
      email: 'a@b.com',
      password: 'secret12',
    });
    expect(r.success).toBe(true);
  });

  it('rejects an unknown persona', () => {
    const r = registerSchema.safeParse({
      persona: 'admin',
      displayName: 'X',
      email: 'a@b.com',
      password: 'secret12',
    });
    expect(r.success).toBe(false);
  });

  it('rejects an empty display name', () => {
    const r = registerSchema.safeParse({
      persona: 'driver',
      displayName: '',
      email: 'a@b.com',
      password: 'secret12',
    });
    expect(r.success).toBe(false);
  });
});
