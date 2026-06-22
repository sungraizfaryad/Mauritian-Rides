import en from '../../../locales/en.json';
import fr from '../../../locales/fr.json';

const flat = (o: Record<string, unknown>, p = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flat(v as Record<string, unknown>, `${p}${k}.`) : [`${p}${k}`],
  );

describe('rider i18n', () => {
  it('en and fr have identical key sets', () => {
    expect(flat(en).sort()).toEqual(flat(fr).sort());
  });
  it('includes the booking namespace', () => {
    expect(flat(en)).toEqual(
      expect.arrayContaining(['booking.title', 'booking.confirm_cta', 'tracker.title']),
    );
  });
  it('includes the driver namespace in both EN and FR', () => {
    const requiredDriverKeys = [
      'driver.feed_title',
      'driver.accept_cta',
      'driver.cap_reached',
      'driver.race_lost',
      'driver.docs_title',
      'driver.plan_title',
      'driver.upgrade_cta',
      'driver.live_share_active',
      'driver.driver_label',
    ];
    expect(flat(en)).toEqual(expect.arrayContaining(requiredDriverKeys));
    expect(flat(fr)).toEqual(expect.arrayContaining(requiredDriverKeys));
  });

  it('includes the account namespace in both EN and FR', () => {
    const required = [
      'account.title',
      'account.delete_cta',
      'account.delete_confirm_title',
      'account.delete_confirm_body',
      'account.delete_confirm_yes',
      'account.deleting',
      'account.delete_failed',
      'account.password_label',
      'account.password_required',
      'account.wrong_password',
    ];
    expect(flat(en)).toEqual(expect.arrayContaining(required));
    expect(flat(fr)).toEqual(expect.arrayContaining(required));
  });

  it('includes the consent namespace in both EN and FR', () => {
    const required = ['consent.title', 'consent.body', 'consent.accept', 'consent.decline'];
    expect(flat(en)).toEqual(expect.arrayContaining(required));
    expect(flat(fr)).toEqual(expect.arrayContaining(required));
  });
});
