# Data Safety — Mauritian Rides

Both App Store and Google Play declarations are derived from this document. Keep this as the single source of truth before each submission review.

## Data collected

| Data type | Collected | Required | Purpose | Linked to user | Retention |
|---|---|---|---|---|---|
| Precise location | Yes | Yes | Live ride tracking (driver position shared with assigned rider only) | Yes, during active ride | Deleted within 24 hours of ride completion |
| Name / email | Yes | Yes | Account creation and display | Yes | Until account deletion |
| Government-issued ID (driver only) | Yes | Yes | Driver identity verification and onboarding | Yes | Retained for compliance; deletable on request |
| App activity (booking interactions) | Yes | Yes | Core booking functionality | Yes | Until account deletion |
| Crash logs | Yes | No | App stability via Sentry (anonymous, EU region) | No | 90 days |
| Analytics events | Opt-in only | No | Aggregate product analytics via PostHog EU (pseudonymous) | Conditional on opt-in | 12 months |

## Encryption

All data is encrypted in transit (HTTPS/TLS). Android enforces `cleartextTrafficPermitted="false"` via `network_security_config.xml`. iOS App Transport Security is active by default (no `NSAllowsArbitraryLoads` override).

## Account deletion

Users can delete their account at any time via Account tab → Delete account. This calls `DELETE /me/account`, which removes the user row, revokes all refresh tokens, and schedules deletion of ride history within 24 hours. The in-app deletion path satisfies Apple App Store Review Guideline 5.1.1(v) and Google Play's account deletion policy.

## Third-party sharing

- Sentry (crash reporting, anonymous, eu.sentry.io — EU data region)
- PostHog Cloud EU (analytics, pseudonymous, opt-in only)
- MIPS / MCB (payment processing via external browser — no payment data enters the app)

## Apple App Store specific

Privacy nutrition label answers:
- Precise Location: App Functionality
- Name/Email: App Functionality
- Crash Data: Diagnostics, not linked to user
- Analytics: Analytics, linked to user (only if user opted in; declare conservatively as linked)
- Financial info: Not collected (payment external via MIPS)

## Google Play specific

Data safety questionnaire answers:
- Precise location: Yes, required, not optional. Purpose: App functionality (live ride tracking).
- Name/email: Yes, required.
- Government-issued ID (driver only): Yes. Purpose: Identity verification for driver onboarding. Retention: compliance-based, user-requestable deletion.
- App activity: Yes, required.
- Crash logs: Yes, optional, not shared with third parties.
- Financial info: No (MIPS handles payment externally, no financial data enters the app).
