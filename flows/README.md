# Maestro E2E flows

Five flows covering the main user journeys. They are written but **not yet executed** — on-device run is deferred until a dev-client build and seeded test DB are ready.

## Prerequisites

- [Maestro CLI](https://maestro.mobile.dev/getting-started/installing-maestro) installed (`brew install maestro`)
- A dev-client build (`eas build --profile development`) installed on a physical device or simulator
- Test DB seeded with:
  - `rider@test.com` / `TestPassword1!` — rider account
  - `driver@test.com` / `TestPassword1!` — driver account (approved, plan with open ride cap)
  - At least one open ride in the driver feed
  - Driver at full cap for flow 03

## Running

```sh
# Run all flows
maestro test flows/

# Run a single flow
maestro test flows/01-rider-book.yaml
```

## Flows

| File | What it tests |
|---|---|
| `01-rider-book.yaml` | Rider picks up location, sets drop-off, confirms booking |
| `02-driver-accept.yaml` | Driver accepts open ride; live-share banner appears |
| `03-cap-exceeded.yaml` | Cap-reached banner visible on Plan tab |
| `04-plan-upgrade.yaml` | Upgrade entry point (Silver); MIPS browser step is manual — see note in file |
| `05-doc-upload.yaml` | Driver uploads licence from photo library |

Subflows in `subflows/` handle login for rider and driver roles.

## Notes

- Flow 04 opens an external browser (ASWebAuthenticationSession on iOS, CustomTabsIntent on Android). Maestro cannot automate that layer. Full payment round-trip (`mr://payment-return`) requires a MIPS sandbox redirect — coordinate with MIPS/MCB.
- For flow 05 on a simulator, seed a test image first: `xcrun simctl addmedia <device-udid> /path/to/test-doc.jpg`
