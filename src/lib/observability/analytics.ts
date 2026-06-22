import { getPostHog } from './posthog';

export type AnalyticsEvent =
  | 'booking_created'
  | 'booking_accepted'
  | 'booking_cancelled'
  | 'booking_completed'
  | 'plan_upgrade_started'
  | 'plan_upgrade_completed'
  | 'driver_doc_uploaded'
  | 'ride_feed_viewed'
  | 'ride_passed'
  | 'cap_warning_shown'
  | 'driver_location_streamed'
  | 'app_opened_from_deep_link';

export type TrackProps = Record<string, string | number | boolean | null>;

export function track(event: AnalyticsEvent, props?: TrackProps): void {
  getPostHog()?.capture(event, props);
}

export function identifyUser(userId: number, persona: 'rider' | 'driver'): void {
  getPostHog()?.identify(String(userId), { $set: { persona } });
}

export function setGuestPersona(): void {
  getPostHog()?.setPersonProperties({ persona: 'guest' });
}

export function resetIdentity(): void {
  getPostHog()?.reset();
}

export async function grantConsent(): Promise<void> {
  await getPostHog()?.optIn();
}

export async function revokeConsent(): Promise<void> {
  await getPostHog()?.optOut();
}
