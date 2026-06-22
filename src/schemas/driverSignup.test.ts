import { step1Schema, step2Schema, step3Schema, step4Schema } from './driverSignup';

function sanitiseNID(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 13);
}

function sanitisePlate(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9 ]/g, '');
}

describe('NID sanitiser', () => {
  it('uppercases', () => expect(sanitiseNID('r150785m4321k')).toBe('R150785M4321K'));
  it('strips non-alphanumeric', () => expect(sanitiseNID('R15-078!5M')).toBe('R150785M'));
  it('caps at 13 chars', () => expect(sanitiseNID('ABCDEFGHIJKLMNOP')).toHaveLength(13));
});

describe('Plate sanitiser', () => {
  it('uppercases', () => expect(sanitisePlate('tx 4528')).toBe('TX 4528'));
  it('strips non-alphanum non-space', () => expect(sanitisePlate('TX-4528!')).toBe('TX4528'));
  it('keeps spaces', () => expect(sanitisePlate('TX 4528')).toBe('TX 4528'));
});

describe('step1Schema', () => {
  const valid = { firstname: 'Ana', surname: 'Bissessur', email: 'ana@test.com', mobile: '57001234' };

  it('accepts valid data', () => expect(step1Schema.safeParse(valid).success).toBe(true));
  it('rejects missing email', () => expect(step1Schema.safeParse({ ...valid, email: '' }).success).toBe(false));
  it('rejects invalid email', () => expect(step1Schema.safeParse({ ...valid, email: 'notanemail' }).success).toBe(false));
  it('rejects invalid mobile (no 5 prefix)', () => expect(step1Schema.safeParse({ ...valid, mobile: '1234567' }).success).toBe(false));
  it('accepts mobile starting with 5', () => expect(step1Schema.safeParse({ ...valid, mobile: '57001234' }).success).toBe(true));
});

describe('step2Schema', () => {
  const valid = { nid: 'R150785M4321K', dob: '1990-06-15', address: '5 Royal Road' };

  it('accepts valid data', () => expect(step2Schema.safeParse(valid).success).toBe(true));
  it('rejects NID shorter than 13', () => expect(step2Schema.safeParse({ ...valid, nid: 'R150785M432' }).success).toBe(false));
  it('rejects NID longer than 13', () => expect(step2Schema.safeParse({ ...valid, nid: 'R150785M4321KX' }).success).toBe(false));
  it('accepts exactly 13 chars', () => expect(step2Schema.safeParse({ ...valid, nid: 'AAABBBCCC1234' }).success).toBe(true));
  it('rejects special chars in NID', () => expect(step2Schema.safeParse({ ...valid, nid: 'R150785M4321!' }).success).toBe(false));
});

describe('step3Schema', () => {
  const valid = {
    vehicle_make: 'Toyota', vehicle_model: 'Corolla', vehicle_year: 2019,
    vehicle_colour: 'White', vehicle_plate: 'TX 4528', vehicle_capacity: '4' as const,
  };

  it('accepts valid data', () => expect(step3Schema.safeParse(valid).success).toBe(true));
  it('rejects year < 2012', () => expect(step3Schema.safeParse({ ...valid, vehicle_year: 2011 }).success).toBe(false));
  it('accepts year 2012', () => expect(step3Schema.safeParse({ ...valid, vehicle_year: 2012 }).success).toBe(true));
  it('accepts current year', () => {
    const currentYear = new Date().getFullYear();
    expect(step3Schema.safeParse({ ...valid, vehicle_year: currentYear }).success).toBe(true);
  });
  it('rejects future year', () => {
    const futureYear = new Date().getFullYear() + 1;
    expect(step3Schema.safeParse({ ...valid, vehicle_year: futureYear }).success).toBe(false);
  });
});

describe('step4Schema', () => {
  it('rejects both false', () => {
    expect(step4Schema.safeParse({ consent_verify: false, consent_commission: false }).success).toBe(false);
  });
  it('rejects one false', () => {
    expect(step4Schema.safeParse({ consent_verify: true, consent_commission: false }).success).toBe(false);
  });
  it('accepts both true', () => {
    expect(step4Schema.safeParse({ consent_verify: true, consent_commission: true }).success).toBe(true);
  });
});
