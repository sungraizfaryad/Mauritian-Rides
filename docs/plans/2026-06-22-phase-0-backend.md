# Mobile Phase 0 — WordPress Backend Plan
**Date:** 2026-06-22  
**Branch:** `feature/mobile-phase0` (never merged to main while auto-deploy is on)  
**Theme root:** `wp-content/themes/mauritianrides/`

---

## Scope

Add JWT auth and the twelve new mobile endpoints to the existing WordPress backend without touching the website's cookie-auth flow. The website keeps working exactly as today. The native app gets a parallel auth lane.

**Files touched:**
- `inc/db.php` — 3 new tables + 2 new columns + helper functions + serialiser
- `inc/jwt.php` — NEW file: HS256 sign/verify + refresh token helpers + bearer middleware
- `inc/rest-api.php` — new routes inside the existing `rest_api_init` closure + new handlers
- `inc/push-notifications.php` — NEW file: Expo push fan-out on booking events
- `inc/cron.php` — two daily purge events appended
- `functions.php` — add `jwt` and `push-notifications` to module array; `init@99` already handles DB upgrades

---

## Decisions the human must confirm before building

1. **JWT secret location.** The `MR_JWT_SECRET` constant goes into `wp-config.php` on the server — never committed to git. Generate with `openssl rand -hex 32`. Local dev also needs it in the Local by Flywheel site's `wp-config.php`. Confirm this is acceptable (alternative: pull from WP option, but that's weaker security).

2. **Access/refresh token TTLs.** Plan: access token 15 minutes, refresh token 30 days with rotation. If the app's offline-first requirement needs a longer access TTL, say so now — shorter is safer but forces more refreshes.

3. **Rider WP user model.** App riders get a standard `subscriber` WP role at signup (new endpoint not in scope for Phase 0 — Phase 1 covers rider registration). For Phase 0, `GET /me/bookings` for riders returns rows where `rider_user_id = current user`. The existing anonymous web-booking flow is unaffected. Confirm: is rider login/signup out of scope for Phase 0, or needed now?

4. **App endpoint paths vs existing `/driver/me/*`.** The app uses `/me/*` and `/rides/*` which differ from the existing `/driver/me/*` paths the web dashboard uses. This plan registers new routes at the new paths — the old paths stay live for the website. Confirm you want two parallel route sets rather than migrating the web dashboard to the new paths.

5. **`passengers` column.** The app's `Booking` shape expects a `passengers` field. The DB has no such column — only `vehicle_type` (sedan/van). This plan adds `passengers TINYINT UNSIGNED DEFAULT NULL` via dbDelta and bumps the schema version. The column will be NULL for all existing web-created bookings. Confirm this is acceptable, or decide if `passengers` should be derived from `vehicle_type` instead.

6. **`pickup_lat/pickup_lng` null for web bookings.** Web bookings never populate these columns (the web form sends only label strings). The `/rides/feed` distance-sort degrades gracefully (NULL-coord bookings sort to the end). Confirm this is acceptable for Phase 0 rather than backfilling coordinates from the label via geocoding.

7. **Expo Push vs another push provider.** Plan uses Expo HTTP Push v2 (`exp.host/--/api/v2/push/send`). No Expo server token is needed for development builds; production requires an Expo access token. Confirm Expo is the push provider (the app is React Native/Expo per the mobile-app memory file).

8. **`fleet` plan.** The app spec lists `fleet` as a valid upgrade target. This plan adds fleet to `mr_packages_list()` but you must also create a WC product in wp-admin with `_mr_plan_slug = fleet` meta. Confirm the price/ride_limit (plan below uses MUR 3,500/month, unlimited rides).

9. **MIPS return URL for app-initiated upgrade orders.** When a driver taps "Upgrade" in the app, this plan creates a pending WC order and returns the order-pay URL. After MIPS payment, the existing `woocommerce_thankyou` hook redirects to `/driver-dashboard/?plan_upgraded=1`. For the app, that URL is opened in a browser — the driver lands on the dashboard page. A native deep-link return (`mr://payment-return`) is not in scope for Phase 0. Confirm this handoff UX is acceptable.

10. **`mr_booking_completed` action.** `mr_rest_complete_booking()` currently does not fire a `do_action` after completing a ride. This plan adds `do_action('mr_booking_completed', $booking)` so push notifications can send a BOOKING_UPDATE to the rider. Confirm this is acceptable (it changes the existing handler).

---

## Task 1 — Feature branch

```bash
cd "/Users/sungraizfaryad/Local Sites/mauritianrides/app/public"
git checkout main
git pull
git checkout -b feature/mobile-phase0
```

Verify: `git branch` shows `* feature/mobile-phase0`. Do not push this branch to remote while auto-deploy is active on main.

---

## Task 2 — MR_JWT_SECRET (manual, never committed)

On the **local** wp-config.php only (not production — that's a separate manual step on the server):

Generate the secret in terminal (do not put this in any file):
```bash
openssl rand -hex 32
```

Open `/Users/sungraizfaryad/Local Sites/mauritianrides/app/public/wp-config.php` in VS Code and add **before** `/* That's all, stop editing! */`:

```php
define( 'MR_JWT_SECRET', 'PASTE_YOUR_64_CHAR_HEX_HERE' );
```

Verify it's live:
```bash
wp eval "echo defined('MR_JWT_SECRET') ? 'ok' : 'MISSING';" \
  --path="/Users/sungraizfaryad/Local Sites/mauritianrides/app/public"
```

Must print `ok`. If it prints `MISSING`, the entire JWT layer will return 500s on every auth call.

---

## Task 3 — DB schema (inc/db.php)

Three changes: bump the version constant, add two columns and one index to the bookings table, add three new tables and their table-name helpers, add the booking serialiser.

### 3a — Bump version constant

In `inc/db.php`, change line 28:
```php
define( 'MR_BOOKINGS_DB_VERSION', '1.2.0' );
```
to:
```php
define( 'MR_BOOKINGS_DB_VERSION', '1.3.0' );
```

The three existing version-gated hooks in `functions.php` (`after_switch_theme`, `admin_init`, `init@99`) will automatically call `mr_db_install()` on the next request.

### 3b — Add columns to the existing bookings CREATE TABLE

Inside `mr_db_install()`, in the `CREATE TABLE {$table}` block, make these two additions:

After `vehicle_preference VARCHAR(80) DEFAULT NULL,` add:
```php
			passengers TINYINT UNSIGNED DEFAULT NULL,
```

After `rider_meta LONGTEXT DEFAULT NULL,` add:
```php
			rider_user_id BIGINT UNSIGNED DEFAULT NULL,
```

After `KEY scheduled_for (scheduled_for)` add:
```php
			KEY rider_user_id (rider_user_id)
```

dbDelta detects the missing columns and ALTERs the live table automatically — no manual SQL.

### 3c — Table-name helpers

Append after `mr_bookings_table()` (around line 49):

```php
function mr_refresh_tokens_table() {
	global $wpdb;
	return $wpdb->prefix . 'mr_refresh_tokens';
}

function mr_device_tokens_table() {
	global $wpdb;
	return $wpdb->prefix . 'mr_device_tokens';
}

function mr_ride_locations_table() {
	global $wpdb;
	return $wpdb->prefix . 'mr_ride_locations';
}
```

### 3d — Three new tables in mr_db_install()

Append after the existing `dbDelta( $sql );` + `update_option(...)` block:

```php
	// wp_mr_refresh_tokens — JWT refresh tokens, stored as SHA-256 hashes.
	$sql = "CREATE TABLE {$wpdb->prefix}mr_refresh_tokens (
	  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	  user_id BIGINT UNSIGNED NOT NULL,
	  token_hash VARCHAR(64) NOT NULL,
	  expires_at DATETIME NOT NULL,
	  rotated_at DATETIME DEFAULT NULL,
	  revoked TINYINT(1) NOT NULL DEFAULT 0,
	  PRIMARY KEY  (id),
	  UNIQUE KEY token_hash (token_hash),
	  KEY user_id (user_id),
	  KEY expires_at (expires_at)
	) {$charset};";
	dbDelta( $sql );

	// wp_mr_device_tokens — Expo push tokens per user.
	$sql = "CREATE TABLE {$wpdb->prefix}mr_device_tokens (
	  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	  user_id BIGINT UNSIGNED NOT NULL,
	  expo_token VARCHAR(200) NOT NULL,
	  platform VARCHAR(10) NOT NULL DEFAULT 'ios',
	  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	  PRIMARY KEY  (id),
	  UNIQUE KEY expo_token (expo_token),
	  KEY user_id (user_id)
	) {$charset};";
	dbDelta( $sql );

	// wp_mr_ride_locations — append-only GPS pings; purged daily by cron.
	$sql = "CREATE TABLE {$wpdb->prefix}mr_ride_locations (
	  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	  ride_id BIGINT UNSIGNED NOT NULL,
	  driver_id BIGINT UNSIGNED NOT NULL,
	  lat DECIMAL(10,7) NOT NULL,
	  lng DECIMAL(10,7) NOT NULL,
	  heading SMALLINT DEFAULT NULL,
	  accuracy DECIMAL(6,2) DEFAULT NULL,
	  recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	  PRIMARY KEY  (id),
	  KEY ride_id_recorded (ride_id, recorded_at)
	) {$charset};";
	dbDelta( $sql );
```

Note: the `update_option( 'mr_db_version', MR_BOOKINGS_DB_VERSION )` call already at the end of `mr_db_install()` handles the version write for all three tables — do not add extra calls.

### 3e — Add fleet plan to mr_packages_list()

In `mr_packages_list()`, after the `gold` array entry and before the closing `];`, add:

```php
		[
			'slug'             => 'fleet',
			'name'             => __( 'Fleet', 'mauritianrides' ),
			'price_mur'        => 3500,
			'price_yearly_mur' => 2800,
			'ride_limit'       => null,
			'perks'            => [
				__( 'Unlimited rides',              'mauritianrides' ),
				__( 'Fleet account (multi-driver)', 'mauritianrides' ),
				__( 'Dedicated account manager',    'mauritianrides' ),
				__( 'Priority phone support',       'mauritianrides' ),
			],
			'featured'         => false,
		],
```

You must also create a WC product in wp-admin for the fleet plan with `_mr_plan_slug = fleet` in its custom fields (same pattern as the silver/gold products).

### 3f — Booking serialiser

Append after `mr_driver_rides_this_month()`:

```php
/**
 * Shape a wp_mr_bookings row into the object the native app expects.
 * All column renames live here — never scattered across individual handlers.
 */
function mr_format_booking_for_app( $row ) {
	return [
		'id'          => (int)    $row->id,
		'ref'         => (string) $row->reference,
		'status'      => (string) $row->status,
		'pickup'      => (string) $row->pickup_label,
		'pickup_lat'  => isset( $row->pickup_lat )  && $row->pickup_lat  !== null ? (float) $row->pickup_lat  : null,
		'pickup_lng'  => isset( $row->pickup_lng )  && $row->pickup_lng  !== null ? (float) $row->pickup_lng  : null,
		'dropoff'     => (string) $row->dropoff_label,
		'passengers'  => isset( $row->passengers )  && $row->passengers  !== null ? (int)   $row->passengers  : null,
		'accepted_by' => isset( $row->accepted_by ) && $row->accepted_by !== null ? (int)   $row->accepted_by : null,
		'fare'        => round( (float) $row->fare_estimate_mur, 2 ),
		'created_at'  => (string) $row->created_at,
	];
}
```

**Verify Task 3:**
```bash
wp eval "mr_db_install();" \
  --path="/Users/sungraizfaryad/Local Sites/mauritianrides/app/public"

wp eval "global \$wpdb; print_r(\$wpdb->get_col('SHOW TABLES LIKE \"%mr_%\"'));" \
  --path="/Users/sungraizfaryad/Local Sites/mauritianrides/app/public"
# Must include mr_bookings, mr_refresh_tokens, mr_device_tokens, mr_ride_locations

wp eval "global \$wpdb; foreach(\$wpdb->get_results('DESCRIBE wp_mr_bookings') as \$r) echo \$r->Field.' ';\n" \
  --path="/Users/sungraizfaryad/Local Sites/mauritianrides/app/public" | grep -E "passengers|rider_user_id"
# Must print both column names
```

---

## Task 4 — JWT helpers and bearer middleware (inc/jwt.php, NEW file)

Create `inc/jwt.php`. This is a self-contained module — no dependency on any other inc file except the table helpers defined in Task 3.

Add `'jwt'` to the `$mr_modules` array in `functions.php`, **after `'auth'`**:
```php
	'auth',           // password reset page: stacked fields + auto-login
	'jwt',            // HS256 token issuance, bearer middleware, refresh token helpers
```

The file:

```php
<?php
/**
 * JWT authentication for the native app.
 *
 * Hand-rolled HS256 — no library dependency. Secret is MR_JWT_SECRET
 * in wp-config.php. Access tokens: 15-minute TTL. Refresh tokens: 30-day
 * TTL, stored as SHA-256 hashes in wp_mr_refresh_tokens with rotation on
 * each use.
 *
 * The bearer middleware hooks into `determine_current_user` at priority 20
 * (after WP's own cookie handler at priority 10). When a valid Bearer token
 * is present, it returns the token's user_id so wp_set_current_user() fires
 * automatically — making current_user_can(), get_current_user_id(), and
 * is_user_logged_in() work correctly for JWT callers without any changes to
 * existing permission_callbacks or handlers.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// ─── Encoding helpers ────────────────────────────────────────────────────── //

function mr_jwt_b64url_encode( string $data ): string {
	return rtrim( strtr( base64_encode( $data ), '+/', '-_' ), '=' );
}

function mr_jwt_b64url_decode( string $data ): string {
	return base64_decode( strtr( $data, '-_', '+/' ) );
}

// ─── Token issuance ──────────────────────────────────────────────────────── //

/**
 * Sign an HS256 access token for $user_id.
 * Returns the token string, or WP_Error if MR_JWT_SECRET is absent.
 *
 * @param int $user_id
 * @param int $ttl_seconds  Default 900 (15 min).
 * @return string|WP_Error
 */
function mr_jwt_sign( int $user_id, int $ttl_seconds = 900, string $persona = '', string $locale = '' ) {
	if ( ! defined( 'MR_JWT_SECRET' ) || MR_JWT_SECRET === '' ) {
		return new WP_Error( 'mr_jwt_no_secret', 'JWT secret not configured.', [ 'status' => 500 ] );
	}
	$now     = time();
	$header  = mr_jwt_b64url_encode( wp_json_encode( [ 'alg' => 'HS256', 'typ' => 'JWT' ] ) );
	// §5 of the app design spec requires persona + locale in the payload so
	// any consumer can read them without a DB round-trip.
	$claims  = [
		'sub'     => $user_id,
		'iat'     => $now,
		'exp'     => $now + $ttl_seconds,
	];
	if ( $persona !== '' ) $claims['persona'] = $persona;
	if ( $locale  !== '' ) $claims['locale']  = $locale;
	$payload = mr_jwt_b64url_encode( wp_json_encode( $claims ) );
	$sig = mr_jwt_b64url_encode(
		hash_hmac( 'sha256', $header . '.' . $payload, MR_JWT_SECRET, true )
	);
	return $header . '.' . $payload . '.' . $sig;
}

/**
 * Verify and decode a JWT string.
 * Returns the payload array on success, WP_Error on any failure.
 *
 * @param string $token
 * @return array|WP_Error
 */
function mr_jwt_verify( string $token ) {
	if ( ! defined( 'MR_JWT_SECRET' ) || MR_JWT_SECRET === '' ) {
		return new WP_Error( 'mr_jwt_no_secret', 'JWT secret not configured.', [ 'status' => 500 ] );
	}
	$parts = explode( '.', $token );
	if ( count( $parts ) !== 3 ) {
		return new WP_Error( 'mr_jwt_malformed', 'Malformed token.', [ 'status' => 401 ] );
	}
	[ $header, $payload_b64, $sig ] = $parts;
	$expected = mr_jwt_b64url_encode(
		hash_hmac( 'sha256', $header . '.' . $payload_b64, MR_JWT_SECRET, true )
	);
	if ( ! hash_equals( $expected, $sig ) ) {
		return new WP_Error( 'mr_jwt_invalid', 'Invalid token signature.', [ 'status' => 401 ] );
	}
	$payload = json_decode( mr_jwt_b64url_decode( $payload_b64 ), true );
	if ( ! is_array( $payload ) ) {
		return new WP_Error( 'mr_jwt_payload', 'Could not decode payload.', [ 'status' => 401 ] );
	}
	if ( empty( $payload['exp'] ) || (int) $payload['exp'] < time() ) {
		return new WP_Error( 'mr_jwt_expired', 'Token expired.', [ 'status' => 401 ] );
	}
	return $payload;
}

// ─── Refresh token helpers ────────────────────────────────────────────────── //

/**
 * Issue a refresh token: random 40-char opaque string, stored as SHA-256 hash.
 * Returns the raw token — caller must return it to the client (only once).
 */
function mr_jwt_create_refresh_token( int $user_id ): string {
	global $wpdb;
	$raw    = wp_generate_password( 40, false );
	$hash   = hash( 'sha256', $raw );
	$expiry = gmdate( 'Y-m-d H:i:s', strtotime( '+30 days' ) );
	$table  = mr_refresh_tokens_table();
	$wpdb->insert(
		$table,
		[ 'user_id' => $user_id, 'token_hash' => $hash, 'expires_at' => $expiry, 'revoked' => 0 ],
		[ '%d', '%s', '%s', '%d' ]
	);
	return $raw;
}

/**
 * Validate a raw refresh token.
 * Returns the DB row on success, false if not found / expired / revoked.
 */
function mr_jwt_find_refresh_token( string $raw ) {
	global $wpdb;
	$hash  = hash( 'sha256', $raw );
	$table = mr_refresh_tokens_table();
	$row   = $wpdb->get_row( $wpdb->prepare(
		"SELECT * FROM {$table} WHERE token_hash = %s AND revoked = 0 AND expires_at > %s LIMIT 1",
		$hash,
		gmdate( 'Y-m-d H:i:s' )
	) );
	return $row ?: false;
}

/**
 * Revoke a refresh token by row ID and stamp rotated_at.
 */
function mr_jwt_revoke_refresh_token( int $row_id ): void {
	global $wpdb;
	$wpdb->update(
		mr_refresh_tokens_table(),
		[ 'revoked' => 1, 'rotated_at' => gmdate( 'Y-m-d H:i:s' ) ],
		[ 'id' => $row_id ],
		[ '%d', '%s' ],
		[ '%d' ]
	);
}

/**
 * Revoke all refresh tokens for a user (account deletion / sign-out-all).
 */
function mr_jwt_revoke_all_for_user( int $user_id ): void {
	global $wpdb;
	$wpdb->update(
		mr_refresh_tokens_table(),
		[ 'revoked' => 1 ],
		[ 'user_id' => $user_id ],
		[ '%d' ],
		[ '%d' ]
	);
}

// ─── Bearer middleware ────────────────────────────────────────────────────── //

/**
 * Resolve JWT bearer tokens via the determine_current_user filter.
 *
 * Fires at priority 20 — after WP's own cookie auth at priority 10.
 * If an Authorization: Bearer header is present and valid, returns the
 * token's user_id so WP sets the global current user. The cookie auth
 * path is untouched (no Authorization header → return $user_id unchanged).
 *
 * This hook means every existing permission_callback using
 * current_user_can() and get_current_user_id() works for JWT callers
 * with zero code changes to existing handlers.
 */
add_filter( 'determine_current_user', function ( $user_id ) {
	// Only run on REST requests — avoids overhead on front-end page loads.
	if ( ! defined( 'REST_REQUEST' ) || ! REST_REQUEST ) return $user_id;

	$auth = isset( $_SERVER['HTTP_AUTHORIZATION'] )
		? (string) $_SERVER['HTTP_AUTHORIZATION']
		: '';
	// Some Apache configs strip Authorization; fall back to the redirect copy.
	if ( $auth === '' && isset( $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ) ) {
		$auth = (string) $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
	}
	if ( stripos( $auth, 'Bearer ' ) !== 0 ) return $user_id;

	$token = trim( substr( $auth, 7 ) );
	if ( $token === '' ) return $user_id;

	$payload = mr_jwt_verify( $token );
	if ( is_wp_error( $payload ) ) {
		// Store for rest_authentication_errors so the client gets a typed 401
		// rather than the generic "Sorry, you are not allowed to do that."
		global $mr_jwt_auth_error;
		$mr_jwt_auth_error = $payload;
		return 0;
	}

	$uid = isset( $payload['sub'] ) ? (int) $payload['sub'] : 0;
	if ( $uid < 1 || ! get_userdata( $uid ) ) return $user_id;

	return $uid;
}, 20 );

/**
 * Surface a stored JWT error through the REST authentication chain.
 * Without this an expired token looks like "not logged in" to the client.
 */
add_filter( 'rest_authentication_errors', function ( $result ) {
	if ( ! empty( $result ) ) return $result;
	global $mr_jwt_auth_error;
	if ( isset( $mr_jwt_auth_error ) && is_wp_error( $mr_jwt_auth_error ) ) {
		$err               = $mr_jwt_auth_error;
		$mr_jwt_auth_error = null;
		return $err;
	}
	return $result;
} );

// ─── Shared permission callbacks ──────────────────────────────────────────── //

/** Any valid logged-in user (driver or rider). */
function mr_jwt_auth_required(): bool {
	return is_user_logged_in();
}

/** Driver role required (has mr_accept_rides cap). */
function mr_jwt_driver_required(): bool {
	return current_user_can( 'mr_accept_rides' );
}
```

**Verify Task 4:**
```bash
wp eval "echo mr_jwt_sign(1);" \
  --path="/Users/sungraizfaryad/Local Sites/mauritianrides/app/public"
# Three-part dot-separated string.

wp eval "var_dump(mr_jwt_verify(mr_jwt_sign(1)));" \
  --path="/Users/sungraizfaryad/Local Sites/mauritianrides/app/public"
# Array with sub=1, exp ~15 min from now.

wp eval "\$t = mr_jwt_sign(1); \$bad = \$t . 'x'; var_dump(mr_jwt_verify(\$bad));" \
  --path="/Users/sungraizfaryad/Local Sites/mauritianrides/app/public"
# WP_Error with code mr_jwt_invalid.
```

---

## Task 5 — Auth endpoints: /auth/token, /auth/refresh, /auth/revoke (inc/rest-api.php)

### 5a — Register routes

Add inside the existing `add_action('rest_api_init', ...)` closure, before the closing `} );`:

```php
	/* ── App auth ─────────────────────────────────────────────── */

	register_rest_route( 'mr/v1', '/auth/token', [
		'methods'             => 'POST',
		'permission_callback' => '__return_true',
		'callback'            => 'mr_rest_auth_token',
		'args'                => [
			'email'    => [ 'type' => 'string',  'required' => false ],
			'username' => [ 'type' => 'string',  'required' => false ],
			'password' => [ 'type' => 'string',  'required' => true  ],
		],
	] );

	register_rest_route( 'mr/v1', '/auth/refresh', [
		'methods'             => 'POST',
		'permission_callback' => '__return_true',
		'callback'            => 'mr_rest_auth_refresh',
		'args'                => [
			'refresh_token' => [ 'type' => 'string', 'required' => true ],
		],
	] );

	register_rest_route( 'mr/v1', '/auth/revoke', [
		'methods'             => 'POST',
		'permission_callback' => '__return_true',
		'callback'            => 'mr_rest_auth_revoke',
		'args'                => [
			'refresh_token' => [ 'type' => 'string', 'required' => true ],
		],
	] );
```

### 5b — Handlers

Add after the closing `} );` of `rest_api_init`:

```php
function mr_rest_auth_token( WP_REST_Request $req ) {
	// 3 requests per minute per IP — brute-force guard.
	if ( ! mr_rest_rate_limit_check( 'auth_token', 3, MINUTE_IN_SECONDS ) ) {
		return new WP_Error( 'mr_rate_limit', 'Too many login attempts. Try again in a minute.', [ 'status' => 429 ] );
	}

	$email_raw    = (string) $req->get_param( 'email' );
	$username_raw = (string) $req->get_param( 'username' );
	$password     = (string) $req->get_param( 'password' );

	// Sanitise the login field correctly: sanitize_email() for the email branch
	// (sanitize_text_field strips `<`/`>` which are spec-valid in localparts),
	// sanitize_text_field() for the username branch.
	if ( $email_raw !== '' ) {
		$login = sanitize_email( $email_raw );
	} elseif ( $username_raw !== '' ) {
		$login = sanitize_text_field( $username_raw );
	} else {
		$login = '';
	}

	if ( $login === '' || $password === '' ) {
		return new WP_Error( 'mr_bad_creds', 'Email or username and password are required.', [ 'status' => 400 ] );
	}

	$user = is_email( $login )
		? get_user_by( 'email', $login )
		: get_user_by( 'login', $login );

	if ( ! $user ) {
		return new WP_Error( 'mr_invalid_creds', 'Invalid credentials.', [ 'status' => 401 ] );
	}

	// Use wp_check_password() directly rather than wp_authenticate() to avoid
	// the `authenticate` filter chain. wp_authenticate() runs every registered
	// plugin including 2FA — if a 2FA plugin is installed after Phase 0 ships
	// it would start requiring TOTP codes from the app, silently breaking auth.
	// wp_check_password() verifies the bcrypt hash only, which is what we need.
	if ( ! wp_check_password( $password, $user->user_pass, $user->ID ) ) {
		return new WP_Error( 'mr_invalid_creds', 'Invalid credentials.', [ 'status' => 401 ] );
	}

	// Block suspended drivers.
	if ( mr_user_is_driver( $user ) && mr_driver_status( $user->ID ) === 'suspended' ) {
		return new WP_Error( 'mr_suspended', 'Your account is suspended. Contact support.', [ 'status' => 403 ] );
	}

	$persona = mr_user_is_driver( $user ) ? 'driver' : 'rider';
	$plan    = $persona === 'driver' ? ( get_user_meta( $user->ID, 'mr_driver_plan', true ) ?: 'free' ) : null;
	$locale  = get_user_locale( $user->ID );
	// Pass persona + locale into the token so §5 of the spec is satisfied.
	$access  = mr_jwt_sign( $user->ID, 15 * MINUTE_IN_SECONDS, $persona, $locale );
	if ( is_wp_error( $access ) ) return $access;

	$refresh = mr_jwt_create_refresh_token( $user->ID );

	return [
		'access_token'  => $access,
		'refresh_token' => $refresh,
		'expires_in'    => 900,
		'persona'       => $persona,
		'user_id'       => $user->ID,
		'display_name'  => $user->display_name,
		'locale'        => $locale,
		'plan'          => $plan,
	];
}

function mr_rest_auth_refresh( WP_REST_Request $req ) {
	$raw = (string) $req->get_param( 'refresh_token' );
	$row = mr_jwt_find_refresh_token( $raw );
	if ( ! $row ) {
		return new WP_Error( 'mr_invalid_token', 'Refresh token invalid or expired.', [ 'status' => 401 ] );
	}

	// Rotate: revoke old, issue new pair.
	mr_jwt_revoke_refresh_token( (int) $row->id );

	$access = mr_jwt_sign( (int) $row->user_id, 15 * MINUTE_IN_SECONDS );
	if ( is_wp_error( $access ) ) return $access;

	$refresh = mr_jwt_create_refresh_token( (int) $row->user_id );

	return [
		'access_token'  => $access,
		'refresh_token' => $refresh,
		'expires_in'    => 900,
	];
}

function mr_rest_auth_revoke( WP_REST_Request $req ) {
	$row = mr_jwt_find_refresh_token( (string) $req->get_param( 'refresh_token' ) );
	if ( $row ) {
		mr_jwt_revoke_refresh_token( (int) $row->id );
	}
	// Always 204 — do not leak whether the token existed.
	return new WP_REST_Response( null, 204 );
}
```

**Verify Task 5:**

Replace `driver@example.com` and `password` with a real driver account in your local DB.
```bash
TOKEN=$(curl -s -X POST https://mauritianrides.local/wp-json/mr/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"email":"driver@example.com","password":"password"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
echo "Got token: ${TOKEN:0:30}..."

# Rate limit test — 4th attempt must be 429
for i in 1 2 3 4; do
  curl -s -X POST https://mauritianrides.local/wp-json/mr/v1/auth/token \
    -H "Content-Type: application/json" \
    -d '{"email":"x@x.com","password":"wrong"}' \
    --insecure -w " HTTP %{http_code}\n" -o /dev/null
done
```

---

## Task 6 — /me endpoints (inc/rest-api.php)

### 6a — Register routes

Add inside `rest_api_init`:

```php
	/* ── /me ──────────────────────────────────────────────────── */

	register_rest_route( 'mr/v1', '/me', [
		'methods'             => 'GET',
		'permission_callback' => 'mr_jwt_auth_required',
		'callback'            => 'mr_rest_me',
	] );

	register_rest_route( 'mr/v1', '/me/cap', [
		'methods'             => 'GET',
		'permission_callback' => 'mr_jwt_driver_required',
		'callback'            => 'mr_rest_me_cap',
	] );

	register_rest_route( 'mr/v1', '/me/bookings', [
		'methods'             => 'GET',
		'permission_callback' => 'mr_jwt_auth_required',
		'callback'            => 'mr_rest_me_bookings',
	] );

	register_rest_route( 'mr/v1', '/me/device-token', [
		'methods'             => 'POST',
		'permission_callback' => 'mr_jwt_auth_required',
		'callback'            => 'mr_rest_me_device_token',
		'args'                => [
			'token'    => [ 'type' => 'string', 'required' => true  ],
			'platform' => [ 'type' => 'string', 'required' => false, 'default' => 'ios' ],
		],
	] );

	// DELETE /me/device-token — unregister on logout so the user stops receiving
	// push notifications. Required by the spec (§6 table) for the logout flow.
	register_rest_route( 'mr/v1', '/me/device-token', [
		'methods'             => 'DELETE',
		'permission_callback' => 'mr_jwt_auth_required',
		'callback'            => 'mr_rest_me_delete_device_token',
		'args'                => [
			'token' => [ 'type' => 'string', 'required' => true ],
		],
	] );

	register_rest_route( 'mr/v1', '/me/upgrade-url', [
		'methods'             => 'GET',
		'permission_callback' => 'mr_jwt_driver_required',
		'callback'            => 'mr_rest_me_upgrade_url',
		'args'                => [
			'plan' => [ 'type' => 'string', 'required' => true ],
		],
	] );

	register_rest_route( 'mr/v1', '/me/account', [
		'methods'             => 'DELETE',
		'permission_callback' => 'mr_jwt_auth_required',
		'callback'            => 'mr_rest_me_delete_account',
		'args'                => [
			// current_pass required — prevents a stolen 15-min token from wiping the account.
			'current_pass' => [ 'type' => 'string', 'required' => true ],
		],
	] );
```

### 6b — Handlers

```php
function mr_rest_me( WP_REST_Request $req ) {
	$user_id = get_current_user_id();
	$user    = get_userdata( $user_id );
	$role    = mr_user_is_driver( $user ) ? 'driver' : 'rider';

	$out = [
		'user_id'      => $user_id,
		'display_name' => $user->display_name,
		'role'         => $role,
		'locale'       => get_user_locale( $user_id ),
		// avatar: spec §6 includes this field; app profile card renders it.
		'avatar'       => get_avatar_url( $user_id, [ 'size' => 96, 'default' => 'mystery' ] ),
	];

	if ( $role === 'driver' ) {
		// mr_driver_doc_completion() returns key 'all_complete'; we rename to
		// 'all_docs_complete' here so the app shape is self-explanatory.
		// Do NOT change the helper's return shape — it's used elsewhere.
		$completion               = mr_driver_doc_completion( $user_id );
		$out['status']            = mr_driver_status( $user_id );
		$out['missing_docs']      = $completion['missing'];
		$out['photo_missing']     = $completion['photo_missing'];
		$out['all_docs_complete'] = $completion['all_complete'];
	}

	return $out;
}

function mr_rest_me_cap( WP_REST_Request $req ) {
	return mr_driver_cap_state( get_current_user_id() );
}

function mr_rest_me_bookings( WP_REST_Request $req ) {
	$user_id = get_current_user_id();
	$user    = get_userdata( $user_id );

	if ( mr_user_is_driver( $user ) ) {
		$rows = mr_bookings_for_driver( $user_id, 50 );
	} else {
		global $wpdb;
		$table = mr_bookings_table();
		$rows  = $wpdb->get_results( $wpdb->prepare(
			"SELECT * FROM {$table} WHERE rider_user_id = %d ORDER BY created_at DESC LIMIT 50",
			$user_id
		) );
	}

	return array_map( 'mr_format_booking_for_app', (array) $rows );
}

function mr_rest_me_device_token( WP_REST_Request $req ) {
	global $wpdb;
	$user_id = get_current_user_id();
	$token   = sanitize_text_field( (string) $req->get_param( 'token' ) );
	$plat    = sanitize_key( (string) $req->get_param( 'platform' ) );

	if ( ! preg_match( '/^Expo(nent)?PushToken\[.+\]$/', $token ) ) {
		return new WP_Error( 'mr_bad_token', 'Invalid Expo push token format.', [ 'status' => 400 ] );
	}

	$table    = mr_device_tokens_table();
	$existing = $wpdb->get_var( $wpdb->prepare(
		"SELECT id FROM {$table} WHERE expo_token = %s LIMIT 1",
		$token
	) );

	if ( $existing ) {
		$wpdb->update(
			$table,
			[ 'user_id' => $user_id, 'platform' => $plat ],
			[ 'id' => (int) $existing ],
			[ '%d', '%s' ],
			[ '%d' ]
		);
	} else {
		$wpdb->insert(
			$table,
			[ 'user_id' => $user_id, 'expo_token' => $token, 'platform' => $plat, 'created_at' => gmdate( 'Y-m-d H:i:s' ) ],
			[ '%d', '%s', '%s', '%s' ]
		);
	}

	return new WP_REST_Response( null, 204 );
}

function mr_rest_me_delete_device_token( WP_REST_Request $req ) {
	global $wpdb;
	$user_id = get_current_user_id();
	$token   = sanitize_text_field( (string) $req->get_param( 'token' ) );
	$table   = mr_device_tokens_table();

	// Only delete if the token belongs to this user — prevents one user from
	// unregistering another user's device.
	$wpdb->delete(
		$table,
		[ 'user_id' => $user_id, 'expo_token' => $token ],
		[ '%d', '%s' ]
	);

	// Always 204 — don't leak whether the token existed.
	return new WP_REST_Response( null, 204 );
}

function mr_rest_me_upgrade_url( WP_REST_Request $req ) {
	$slug  = sanitize_key( (string) $req->get_param( 'plan' ) );
	$valid = array_column( mr_packages_list(), 'slug' );

	if ( ! in_array( $slug, $valid, true ) || $slug === 'free' ) {
		return new WP_Error( 'mr_bad_plan', 'Unknown or non-upgradeable plan slug.', [ 'status' => 400 ] );
	}

	$product_id = mr_plan_product_id( $slug );
	if ( ! $product_id ) {
		return new WP_Error( 'mr_no_product', 'No WooCommerce product found for this plan. Create it in wp-admin first.', [ 'status' => 404 ] );
	}

	if ( ! function_exists( 'wc_create_order' ) ) {
		return new WP_Error( 'mr_wc_missing', 'WooCommerce is not active.', [ 'status' => 500 ] );
	}

	$user_id = get_current_user_id();

	// Avoid creating a duplicate pending order for the same driver + plan.
	$existing_orders = wc_get_orders( [
		'customer_id' => $user_id,
		'status'      => [ 'pending' ],
		'meta_key'    => '_mr_app_order',
		'meta_value'  => $slug,
		'limit'       => 1,
	] );
	if ( ! empty( $existing_orders ) ) {
		return [ 'url' => $existing_orders[0]->get_checkout_payment_url() ];
	}

	$order = wc_create_order( [ 'customer_id' => $user_id ] );
	$order->add_product( wc_get_product( $product_id ), 1 );
	$order->update_meta_data( '_mr_app_order', $slug );
	$order->set_status( 'pending' );
	$order->calculate_totals();
	$order->save();

	// NOTE: get_checkout_payment_url() returns the standard WC order-pay URL,
	// which remains valid indefinitely while the order is pending. It is NOT
	// nonce-signed or time-limited. The spec (§8) calls for a short-lived signed
	// URL — that is a Phase 1 task (add a signed token query param with a 30-min
	// TTL verified by the order-pay page template). For Phase 0 this is accepted
	// risk, documented as a known limitation below.
	return [ 'url' => $order->get_checkout_payment_url() ];
}

function mr_rest_me_delete_account( WP_REST_Request $req ) {
	$user_id = get_current_user_id();

	// Never let an admin delete themselves via the app endpoint.
	if ( current_user_can( 'manage_options' ) ) {
		return new WP_Error( 'mr_not_allowed', 'Administrator accounts cannot be deleted via this endpoint.', [ 'status' => 403 ] );
	}

	// Require password re-confirmation. A stolen 15-minute access token is
	// otherwise sufficient to permanently delete the account (Apple/Google
	// require deletion but do not require it to be trivially irrevocable).
	$current_pass = (string) $req->get_param( 'current_pass' );
	if ( $current_pass === '' ) {
		return new WP_Error( 'mr_password_required', 'current_pass is required to delete an account.', [ 'status' => 400 ] );
	}
	$user = get_userdata( $user_id );
	if ( ! wp_check_password( $current_pass, $user->user_pass, $user_id ) ) {
		return new WP_Error( 'mr_invalid_pass', 'Current password is incorrect.', [ 'status' => 403 ] );
	}

	// Revoke all JWT refresh tokens so existing sessions die immediately.
	mr_jwt_revoke_all_for_user( $user_id );

	global $wpdb;

	// Remove device tokens.
	$wpdb->delete( mr_device_tokens_table(), [ 'user_id' => $user_id ], [ '%d' ] );

	// Cancel any pending WC upgrade orders so they don't become orphaned rows
	// pointing to a deleted customer_id.
	if ( function_exists( 'wc_get_orders' ) ) {
		$pending_orders = wc_get_orders( [
			'customer_id' => $user_id,
			'status'      => [ 'pending', 'on-hold' ],
			'meta_key'    => '_mr_app_order',
			'limit'       => -1,
		] );
		foreach ( $pending_orders as $order ) {
			$order->update_status( 'cancelled', 'Account deleted by user.' );
		}
	}

	// Anonymise booking rows where this driver was the accepted driver.
	$bt = mr_bookings_table();
	$wpdb->query( $wpdb->prepare(
		"UPDATE {$bt} SET accepted_by = NULL WHERE accepted_by = %d",
		$user_id
	) );

	// Anonymise booking rows where this user was the rider.
	$wpdb->query( $wpdb->prepare(
		"UPDATE {$bt} SET rider_name = 'Deleted', rider_phone = '', rider_email = NULL, rider_meta = NULL, rider_user_id = NULL WHERE rider_user_id = %d",
		$user_id
	) );

	require_once ABSPATH . 'wp-admin/includes/user.php';
	wp_delete_user( $user_id );

	return new WP_REST_Response( null, 204 );
}
```

**Verify Task 6:**
```bash
curl -s https://mauritianrides.local/wp-json/mr/v1/me \
  -H "Authorization: Bearer $TOKEN" --insecure | python3 -m json.tool

curl -s https://mauritianrides.local/wp-json/mr/v1/me/cap \
  -H "Authorization: Bearer $TOKEN" --insecure | python3 -m json.tool

curl -s https://mauritianrides.local/wp-json/mr/v1/me/bookings \
  -H "Authorization: Bearer $TOKEN" --insecure | python3 -m json.tool

curl -s -X POST https://mauritianrides.local/wp-json/mr/v1/me/device-token \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"token":"ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]","platform":"ios"}' \
  --insecure -w "\nHTTP %{http_code}"
# Must be 204

curl -s -X DELETE https://mauritianrides.local/wp-json/mr/v1/me/device-token \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"token":"ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"}' \
  --insecure -w "\nHTTP %{http_code}"
# Must be 204 (idempotent — same response if token didn't exist)

curl -s "https://mauritianrides.local/wp-json/mr/v1/me/upgrade-url?plan=silver" \
  -H "Authorization: Bearer $TOKEN" --insecure | python3 -m json.tool
# Must contain a url key with an order-pay URL

# Account delete — no password → 400
curl -s -X DELETE https://mauritianrides.local/wp-json/mr/v1/me/account \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --insecure | python3 -m json.tool
# Must be 400 with code mr_password_required

# Account delete — wrong password → 403
curl -s -X DELETE https://mauritianrides.local/wp-json/mr/v1/me/account \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"current_pass":"wrongpassword"}' \
  --insecure -w "\nHTTP %{http_code}"
# Must be 403
```

---

## Task 7 — /rides/feed and /rides/{id}/location (inc/rest-api.php)

The existing `/driver/me/bookings` stays live for the web dashboard. These are new routes at new paths for the app.

### 7a — Register routes

Add inside `rest_api_init`:

```php
	/* ── Rides (app-only) ─────────────────────────────────────── */

	register_rest_route( 'mr/v1', '/rides/feed', [
		'methods'             => 'GET',
		'permission_callback' => 'mr_jwt_driver_required',
		'callback'            => 'mr_rest_rides_feed',
		'args'                => [
			'lat' => [ 'type' => 'number', 'required' => false ],
			'lng' => [ 'type' => 'number', 'required' => false ],
		],
	] );

	register_rest_route( 'mr/v1', '/rides/(?P<id>\d+)/location', [
		'methods'             => 'POST',
		'permission_callback' => 'mr_jwt_driver_required',
		'callback'            => 'mr_rest_ride_location_write',
		'args'                => [
			'lat'      => [ 'type' => 'number',  'required' => true  ],
			'lng'      => [ 'type' => 'number',  'required' => true  ],
			'heading'  => [ 'type' => 'integer', 'required' => false ],
			'accuracy' => [ 'type' => 'number',  'required' => false ],
		],
	] );

	register_rest_route( 'mr/v1', '/rides/(?P<id>\d+)/location', [
		'methods'             => 'GET',
		'permission_callback' => 'mr_jwt_auth_required',
		'callback'            => 'mr_rest_ride_location_read',
	] );
```

### 7b — Handlers

```php
function mr_rest_rides_feed( WP_REST_Request $req ) {
	$user_id = get_current_user_id();

	$cap = mr_driver_cap_state( $user_id );
	if ( $cap['reached'] ) {
		return [
			'bookings'    => [],
			'cap_reached' => true,
			'plan'        => $cap['plan'],
			'used'        => $cap['used'],
			'limit'       => $cap['limit'],
			'reset_at'    => $cap['reset_at'],
			'packages'    => mr_packages_list(),
		];
	}

	if ( ! mr_driver_is_available_now( $user_id ) ) {
		return [ 'bookings' => [], 'cap_reached' => false, 'note' => 'Outside availability schedule.' ];
	}

	$rows       = mr_open_bookings_for_driver( $user_id, 40 );
	$driver_lat = $req->get_param( 'lat' ) !== null ? (float) $req->get_param( 'lat' ) : null;
	$driver_lng = $req->get_param( 'lng' ) !== null ? (float) $req->get_param( 'lng' ) : null;

	if ( $driver_lat !== null && $driver_lng !== null && ! empty( $rows ) ) {
		usort( $rows, function ( $a, $b ) use ( $driver_lat, $driver_lng ) {
			$da = mr_haversine_km( $driver_lat, $driver_lng, (float) $a->pickup_lat, (float) $a->pickup_lng );
			$db = mr_haversine_km( $driver_lat, $driver_lng, (float) $b->pickup_lat, (float) $b->pickup_lng );
			return $da <=> $db;
		} );
	}

	return [
		'bookings'    => array_map( 'mr_format_booking_for_app', (array) $rows ),
		'cap_reached' => false,
		'plan'        => $cap['plan'],
		'used'        => $cap['used'],
		'limit'       => $cap['limit'],
		'reset_at'    => $cap['reset_at'],
	];
}

/**
 * Haversine great-circle distance in km.
 * Returns INF when either lat/lng is zero or null so bookings with no
 * coordinates sort to the end rather than clustering at origin.
 */
function mr_haversine_km( float $lat1, float $lng1, float $lat2, float $lng2 ): float {
	if ( ! $lat2 || ! $lng2 ) return INF;
	$r  = 6371;
	$dl = deg2rad( $lat2 - $lat1 );
	$dm = deg2rad( $lng2 - $lng1 );
	$a  = sin( $dl / 2 ) ** 2 + cos( deg2rad( $lat1 ) ) * cos( deg2rad( $lat2 ) ) * sin( $dm / 2 ) ** 2;
	return $r * 2 * asin( sqrt( $a ) );
}

function mr_rest_ride_location_write( WP_REST_Request $req ) {
	$ride_id   = (int) $req->get_param( 'id' );
	$driver_id = get_current_user_id();

	// Ownership check FIRST — before any booking data is exposed.
	// A valid JWT driver can otherwise enumerate accepted booking IDs by
	// probing this endpoint and watching for 404 vs 409 differences.
	$booking = mr_get_booking( $ride_id );
	if ( ! $booking ) {
		// Return 403, not 404 — don't confirm whether the ride ID exists.
		return new WP_Error( 'mr_forbidden', 'You are not the assigned driver for this ride.', [ 'status' => 403 ] );
	}
	if ( (int) $booking->accepted_by !== $driver_id ) {
		return new WP_Error( 'mr_not_yours', 'You are not the assigned driver for this ride.', [ 'status' => 403 ] );
	}
	// Status check after ownership is confirmed — this is safe to reveal.
	if ( $booking->status !== 'accepted' ) {
		return new WP_Error( 'mr_bad_state', 'Ride is not active.', [ 'status' => 409 ] );
	}

	// Rate limit per ride+driver: 10 writes per 10 seconds.
	// WP transients on MySQL have no atomic CAS semantics, so concurrent bursts
	// can race past this check before any set_transient commits. This is an
	// approximation — a well-behaved client self-throttles to 1/s, and bursts
	// only risk table bloat (not a privacy breach). Redis/Memcached would give
	// true atomicity; accepted as known limitation for Phase 0.
	$key   = 'mr_rl_loc_' . $ride_id . '_' . $driver_id;
	$count = (int) get_transient( $key );
	if ( $count >= 10 ) {
		return new WP_Error( 'mr_rate_limit', 'GPS updates too frequent.', [ 'status' => 429 ] );
	}
	set_transient( $key, $count + 1, 10 );

	global $wpdb;
	$heading  = $req->get_param( 'heading' )  !== null ? (int)   $req->get_param( 'heading' )  : null;
	$accuracy = $req->get_param( 'accuracy' ) !== null ? (float) $req->get_param( 'accuracy' ) : null;

	$data    = [ 'ride_id' => $ride_id, 'driver_id' => $driver_id, 'lat' => (float) $req->get_param( 'lat' ), 'lng' => (float) $req->get_param( 'lng' ), 'recorded_at' => gmdate( 'Y-m-d H:i:s' ) ];
	$formats = [ '%d', '%d', '%f', '%f', '%s' ];

	if ( $heading !== null )  { $data['heading']  = $heading;  $formats[] = '%d'; }
	if ( $accuracy !== null ) { $data['accuracy'] = $accuracy; $formats[] = '%f'; }

	$wpdb->insert( mr_ride_locations_table(), $data, $formats );

	return new WP_REST_Response( null, 204 );
}

function mr_rest_ride_location_read( WP_REST_Request $req ) {
	$ride_id = (int) $req->get_param( 'id' );
	$user_id = get_current_user_id();

	$booking = mr_get_booking( $ride_id );

	// Ownership gate BEFORE any data is returned, and BEFORE the 404 branch.
	// Returning 404 for a booking the caller is not party to would confirm the
	// ID exists; returning a uniform 403 prevents enumeration by any authed user.
	$is_driver = $booking && (int) $booking->accepted_by === $user_id;
	$is_rider  = $booking && (int) $booking->rider_user_id === $user_id;
	$is_admin  = current_user_can( 'manage_options' );

	if ( ! $booking || ( ! $is_driver && ! $is_rider && ! $is_admin ) ) {
		return new WP_Error( 'mr_forbidden', 'Not a party to this ride.', [ 'status' => 403 ] );
	}

	global $wpdb;
	$row = $wpdb->get_row( $wpdb->prepare(
		"SELECT lat, lng, heading, accuracy, recorded_at FROM " . mr_ride_locations_table() . " WHERE ride_id = %d ORDER BY recorded_at DESC LIMIT 1",
		$ride_id
	) );

	if ( ! $row ) {
		return new WP_Error( 'mr_not_found', 'No location data yet.', [ 'status' => 404 ] );
	}

	return [
		'lat'         => (float)  $row->lat,
		'lng'         => (float)  $row->lng,
		'heading'     => $row->heading  !== null ? (int)   $row->heading  : null,
		'accuracy'    => $row->accuracy !== null ? (float) $row->accuracy : null,
		'recorded_at' => $row->recorded_at,
	];
}
```

**Verify Task 7:**
```bash
curl -s "https://mauritianrides.local/wp-json/mr/v1/rides/feed?lat=-20.1619&lng=57.4989" \
  -H "Authorization: Bearer $TOKEN" --insecure | python3 -m json.tool

# GPS write — replace 1 with an accepted booking ID
curl -s -X POST https://mauritianrides.local/wp-json/mr/v1/rides/1/location \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lat":-20.1619,"lng":57.4989,"heading":180,"accuracy":5.0}' \
  --insecure -w "\nHTTP %{http_code}"
# 204

curl -s https://mauritianrides.local/wp-json/mr/v1/rides/1/location \
  -H "Authorization: Bearer $TOKEN" --insecure | python3 -m json.tool
```

---

## Task 8 — Driver-cancel and document upload aliases (inc/rest-api.php)

The existing `/bookings/{id}/accept` and `/bookings/{id}/complete` already work for JWT-authed drivers because `determine_current_user` sets the WP current user before their `current_user_can()` permission callbacks fire. No code change needed for those two routes.

**Known race condition (accepted risk):** `mr_rest_accept_booking()` reads `mr_driver_cap_state()` then calls `mr_claim_booking()`. These are not atomic. Two simultaneous requests from the same driver can both pass the cap check before either increments the counter, allowing one extra ride above the cap limit. The DB-level `UPDATE ... WHERE status='open'` ensures only one driver wins the claim (409 for the loser), but the per-driver same-connection race is real. True fix requires `SELECT ... FOR UPDATE` on the cap counter or an atomic increment before the claim. For Phase 0 this is accepted risk — free-tier drivers can get one extra ride in an extreme race scenario, not a security issue. Phase 1: wrap cap check + claim in a DB transaction.

**App UX note on driver cancel:** `mr_rest_driver_cancel_booking()` requires `booking->status === 'accepted'`. If a booking was auto-reopened by cron (status flipped back to `'open'`) before the driver cancels, the endpoint returns 409 `'Only accepted bookings can be released.'`. The app must handle this 409 gracefully (e.g., show "Booking already released") rather than treating it as an unexpected error.

**Two changes needed:**

### 8a — Driver cancel at the app's expected path

The existing driver cancel is at `/driver/me/bookings/{id}/cancel`. The app spec calls `POST /bookings/{id}/cancel` for the driver. The problem: that path already exists as the public rider-cancel route (token-based, no auth required). The paths conflict.

Resolution: register a separate app path at `/rides/{id}/cancel` for the driver. Add inside `rest_api_init`:

```php
	// App driver self-cancel — re-opens booking for another driver.
	// Separate path from the rider cancel route (/bookings/{id}/cancel)
	// which uses a per-booking token rather than JWT.
	register_rest_route( 'mr/v1', '/rides/(?P<id>\d+)/cancel', [
		'methods'             => 'POST',
		'permission_callback' => 'mr_jwt_driver_required',
		'callback'            => 'mr_rest_driver_cancel_booking',
		'args'                => [
			'reason' => [ 'type' => 'string', 'required' => false ],
		],
	] );
```

The handler `mr_rest_driver_cancel_booking` already exists and calls `mr_reopen_booking()` — exactly the right behaviour.

### 8b — Document upload at app path

The web uses `/driver/me/documents/{slug}`; the app spec calls `/drivers/documents/{slug}`. Register an alias inside `rest_api_init`:

```php
	// App alias for driver document upload. Reuses the existing handler.
	register_rest_route( 'mr/v1', '/drivers/documents/(?P<slug>[a-z_]+)', [
		'methods'             => 'POST',
		'permission_callback' => function () { return current_user_can( 'mr_edit_own_docs' ); },
		'callback'            => 'mr_rest_upload_driver_document',
	] );
```

### 8c — Fire mr_booking_completed action

In `mr_rest_complete_booking()` (around line 667 in the current file), after the `if ( ! mr_complete_booking( $id ) )` guard, add before the return:

```php
	$completed = mr_get_booking( $id );
	do_action( 'mr_booking_completed', $completed );
```

This allows push-notifications.php to send BOOKING_UPDATE status=completed to the rider.

**Verify Task 8:**
```bash
# Accept a booking with the JWT token
curl -s -X POST https://mauritianrides.local/wp-json/mr/v1/bookings/1/accept \
  -H "Authorization: Bearer $TOKEN" --insecure | python3 -m json.tool
# 200 with booking data, or 409 if already accepted, or 402 if cap hit.

# Driver cancel via new path
curl -s -X POST https://mauritianrides.local/wp-json/mr/v1/rides/1/cancel \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"driver_cancel_test"}' \
  --insecure | python3 -m json.tool

# Document upload (multipart)
curl -s -X POST https://mauritianrides.local/wp-json/mr/v1/drivers/documents/nid \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test_doc.jpg" \
  --insecure | python3 -m json.tool
```

---

## Task 9 — Expo push notifications (inc/push-notifications.php, NEW file)

Create the file. Add `'push-notifications'` to the `$mr_modules` array in `functions.php` after `'email-dispatch'`:

```php
	'email-dispatch', // send to eligible + available drivers
	'push-notifications', // Expo push — RIDE_OFFER + BOOKING_UPDATE
```

The file content:

```php
<?php
/**
 * Expo push notifications.
 *
 * Attaches to existing mr_booking_* actions at priority 15 — after email
 * dispatch at priority 10, so push never blocks or delays email delivery.
 * Uses non-blocking wp_remote_post() so a push failure never aborts the
 * booking flow (same pattern as whatsapp.php).
 *
 * Expo HTTP Push v2: https://docs.expo.dev/push-notifications/sending-notifications/
 * Fan-out in batches of 100 (Expo API limit per request).
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Fetch Expo tokens for a list of user IDs.
 *
 * @param int[] $user_ids
 * @return string[]
 */
function mr_push_tokens_for_users( array $user_ids ): array {
	if ( empty( $user_ids ) ) return [];
	global $wpdb;
	$table = mr_device_tokens_table();
	// intval map makes this safe: every element is cast to int before it reaches
	// the query string. $wpdb->prepare() cannot parametrise IN lists of arbitrary
	// length, so this is the accepted WP pattern for integer-only IN clauses.
	// IMPORTANT: if this function signature ever changes to accept non-integer IDs
	// (e.g. string tokens), switch to a prepare()-based loop or placeholders.
	$in = implode( ',', array_map( 'intval', $user_ids ) );
	return (array) $wpdb->get_col( "SELECT expo_token FROM {$table} WHERE user_id IN ({$in})" );
	// Phase 1: after fan-out, check Expo receipt API (exp.host/--/api/v2/push/getReceipts)
	// and remove DeviceNotRegistered tokens — without this, dead tokens accumulate
	// in wp_mr_device_tokens indefinitely.
}

/**
 * Send Expo push messages. $messages is an array of Expo message objects.
 * Fans out in batches of 100 with non-blocking HTTP.
 *
 * @param array[] $messages
 */
function mr_push_send( array $messages ): void {
	if ( empty( $messages ) ) return;
	foreach ( array_chunk( $messages, 100 ) as $batch ) {
		wp_remote_post( 'https://exp.host/--/api/v2/push/send', [
			'blocking' => false,
			'headers'  => [ 'Content-Type' => 'application/json', 'Accept' => 'application/json' ],
			'body'     => wp_json_encode( $batch ),
			'timeout'  => 5,
		] );
	}
}

/**
 * RIDE_OFFER — push to all eligible approved drivers when a booking is created.
 * Reuses mr_eligible_drivers_for_dispatch() from email-dispatch.php (which
 * loads before this file in the module array).
 */
add_action( 'mr_booking_created', function ( $booking ) {
	if ( ! $booking || ! function_exists( 'mr_eligible_drivers_for_dispatch' ) ) return;

	$drivers = mr_eligible_drivers_for_dispatch( $booking );
	if ( empty( $drivers ) ) return;

	$tokens = mr_push_tokens_for_users( wp_list_pluck( $drivers, 'ID' ) );
	if ( empty( $tokens ) ) return;

	$messages = [];
	foreach ( $tokens as $tok ) {
		$messages[] = [
			'to'    => $tok,
			'title' => __( 'New ride request', 'mauritianrides' ),
			'body'  => $booking->pickup_label,
			'data'  => [ 'type' => 'RIDE_OFFER', 'booking_id' => (int) $booking->id ],
		];
	}
	mr_push_send( $messages );
}, 15 );

// Re-broadcast when a booking is returned to the pool (driver timeout or self-cancel).
add_action( 'mr_booking_auto_reopened', function ( $booking, $prev_driver_id, $reason ) {
	do_action( 'mr_booking_created', $booking );
}, 15, 3 );

/**
 * BOOKING_UPDATE — push to the rider when a driver accepts.
 */
add_action( 'mr_booking_accepted', function ( $booking, $driver_user_id ) {
	$rider_id = isset( $booking->rider_user_id ) ? (int) $booking->rider_user_id : 0;
	if ( ! $rider_id ) return;

	$tokens = mr_push_tokens_for_users( [ $rider_id ] );
	if ( empty( $tokens ) ) return;

	$driver   = get_userdata( $driver_user_id );
	$name     = $driver ? $driver->display_name : __( 'Your driver', 'mauritianrides' );
	$messages = [];
	foreach ( $tokens as $tok ) {
		$messages[] = [
			'to'    => $tok,
			'title' => __( 'Driver on the way', 'mauritianrides' ),
			'body'  => $name . ' ' . __( 'has accepted your ride.', 'mauritianrides' ),
			'data'  => [ 'type' => 'BOOKING_UPDATE', 'booking_id' => (int) $booking->id, 'status' => 'accepted' ],
		];
	}
	mr_push_send( $messages );
}, 15, 2 );

/**
 * BOOKING_UPDATE — push to the rider on cancellation.
 */
add_action( 'mr_booking_cancelled', function ( $booking, $reason ) {
	$rider_id = isset( $booking->rider_user_id ) ? (int) $booking->rider_user_id : 0;
	if ( ! $rider_id ) return;

	$tokens = mr_push_tokens_for_users( [ $rider_id ] );
	if ( empty( $tokens ) ) return;

	$messages = [];
	foreach ( $tokens as $tok ) {
		$messages[] = [
			'to'    => $tok,
			'title' => __( 'Booking cancelled', 'mauritianrides' ),
			'body'  => __( 'Your booking has been cancelled.', 'mauritianrides' ),
			'data'  => [ 'type' => 'BOOKING_UPDATE', 'booking_id' => (int) $booking->id, 'status' => 'cancelled' ],
		];
	}
	mr_push_send( $messages );
}, 15, 2 );

/**
 * BOOKING_UPDATE — push to the rider when ride is completed.
 * Requires mr_booking_completed action (added to mr_rest_complete_booking in Task 8c).
 */
add_action( 'mr_booking_completed', function ( $booking ) {
	$rider_id = isset( $booking->rider_user_id ) ? (int) $booking->rider_user_id : 0;
	if ( ! $rider_id ) return;

	$tokens = mr_push_tokens_for_users( [ $rider_id ] );
	if ( empty( $tokens ) ) return;

	$messages = [];
	foreach ( $tokens as $tok ) {
		$messages[] = [
			'to'    => $tok,
			'title' => __( 'Ride complete', 'mauritianrides' ),
			'body'  => __( 'Thank you for riding with Mauritian Rides.', 'mauritianrides' ),
			'data'  => [ 'type' => 'BOOKING_UPDATE', 'booking_id' => (int) $booking->id, 'status' => 'completed' ],
		];
	}
	mr_push_send( $messages );
}, 15 );
```

**Verify Task 9:**
```bash
wp eval "echo function_exists('mr_push_send') ? 'ok' : 'missing';" \
  --path="/Users/sungraizfaryad/Local Sites/mauritianrides/app/public"
# ok

wp eval "echo function_exists('mr_push_tokens_for_users') ? 'ok' : 'missing';" \
  --path="/Users/sungraizfaryad/Local Sites/mauritianrides/app/public"
# ok
```

---

## Task 10 — Cron purge events (inc/cron.php)

Append after the existing `mr_sweep_stale_accepts` block:

```php
/**
 * Daily purge: expired/revoked JWT refresh tokens + stale GPS pings.
 * Uses WP's built-in 'daily' schedule (no custom interval needed).
 */
add_action( 'init', function () {
	// Use time() so the event fires on the next WP-Cron run rather than
	// an hour into the future. On busy sites, init fires frequently and
	// time() + HOUR_IN_SECONDS would keep being rescheduled, delaying
	// the first execution indefinitely.
	if ( ! wp_next_scheduled( 'mr_purge_expired_tokens' ) ) {
		wp_schedule_event( time(), 'daily', 'mr_purge_expired_tokens' );
	}
	if ( ! wp_next_scheduled( 'mr_purge_ride_locations' ) ) {
		wp_schedule_event( time(), 'daily', 'mr_purge_ride_locations' );
	}
}, 100 );

add_action( 'switch_theme', function () {
	foreach ( [ 'mr_purge_expired_tokens', 'mr_purge_ride_locations' ] as $hook ) {
		$ts = wp_next_scheduled( $hook );
		if ( $ts ) wp_unschedule_event( $ts, $hook );
	}
} );

add_action( 'mr_purge_expired_tokens', function () {
	if ( ! function_exists( 'mr_refresh_tokens_table' ) ) return;
	global $wpdb;
	// Table name comes from mr_refresh_tokens_table() which returns
	// $wpdb->prefix . 'mr_refresh_tokens' — no user input, no injection risk.
	// $wpdb->prepare() cannot parametrise table names, so raw concatenation is
	// the correct pattern here (same as dbDelta internals). Keep this comment if
	// the function is ever refactored to accept external input.
	// Keep rotated tokens for 1 hour to cover token-refresh races before purging.
	$table = mr_refresh_tokens_table();
	$wpdb->query(
		"DELETE FROM {$table}" .
		" WHERE (expires_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR))" .
		"    OR (revoked = 1 AND (rotated_at IS NULL OR rotated_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR)))"
	);
} );

add_action( 'mr_purge_ride_locations', function () {
	if ( ! function_exists( 'mr_ride_locations_table' ) ) return;
	global $wpdb;
	// Same safe-concatenation pattern — table name only, no user input.
	// Note: this purges rows older than 25 hours from GPS insert time, not
	// 24 hours from ride-end as the spec (§7) requires. A strict implementation
	// would JOIN to wp_mr_bookings on completed_at/cancelled_at. The 25h window
	// is a pragmatic approximation: for a ride completed at hour 3, GPS data is
	// retained until at least hour 25 — well past the 24h spec window. The only
	// edge case is a booking active for >1 hour where early GPS pings could be
	// purged slightly before 24h from ride-end. Accepted as known limitation;
	// Phase 1 can tighten with a JOIN. LIMIT 1000 mirrors stale-accepts pattern.
	$table = mr_ride_locations_table();
	$wpdb->query(
		"DELETE FROM {$table}" .
		" WHERE recorded_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 25 HOUR) LIMIT 1000"
	);
} );
```

**Verify Task 10:**
```bash
wp cron event list \
  --path="/Users/sungraizfaryad/Local Sites/mauritianrides/app/public" | grep mr_purge
# Must list mr_purge_expired_tokens and mr_purge_ride_locations

wp cron event run mr_purge_expired_tokens \
  --path="/Users/sungraizfaryad/Local Sites/mauritianrides/app/public"
# Should complete without fatal errors

wp cron event run mr_purge_ride_locations \
  --path="/Users/sungraizfaryad/Local Sites/mauritianrides/app/public"
```

---

## Task 11 — Regression: website cookie auth

This is the most important check — confirm the JWT middleware does not break the existing web flows.

```bash
# 1. Confirm no PHP fatal errors anywhere
wp eval "echo 'PHP OK';" \
  --path="/Users/sungraizfaryad/Local Sites/mauritianrides/app/public"

# 2. Cookie-authed driver feed still works (no Authorization header)
# Log in as a driver in the browser at mauritianrides.local,
# copy the wordpress_logged_in_ cookie, then:
curl -s https://mauritianrides.local/wp-json/mr/v1/driver/me/bookings \
  -b "wordpress_logged_in_XXXX=your_cookie_value" \
  --insecure | python3 -m json.tool
# Must return feed data, not a 401.

# 3. Expired/bad JWT returns structured 401, not generic WP error
curl -s https://mauritianrides.local/wp-json/mr/v1/me \
  -H "Authorization: Bearer bad.token.here" \
  --insecure | python3 -m json.tool
# Must include code: "mr_jwt_invalid"

# 4. No Authorization header on a public route — no interference
curl -s https://mauritianrides.local/wp-json/mr/v1/packages --insecure | python3 -m json.tool
# Must return packages list without any auth error.
```

---

## Pre-merge Checklist

- [ ] On `feature/mobile-phase0`, not `main`
- [ ] `MR_JWT_SECRET` defined in local wp-config.php (never committed)
- [ ] `MR_BOOKINGS_DB_VERSION` is `'1.3.0'` in inc/db.php
- [ ] `mr_db_version` option = `1.3.0`: `wp option get mr_db_version`
- [ ] All four tables exist: `wp eval "global \$wpdb; var_export(\$wpdb->get_col('SHOW TABLES LIKE \"%mr_%\"'));"`
- [ ] `passengers` and `rider_user_id` columns on `wp_mr_bookings`
- [ ] `inc/jwt.php` in module array, no fatal on load
- [ ] `inc/push-notifications.php` in module array, no fatal on load
- [ ] 13 new routes visible (including DELETE /me/device-token): `wp eval "foreach(rest_get_server()->get_routes() as \$r => \$_) { if(str_contains(\$r,'mr/v1')) echo \$r.'\n'; }"`
- [ ] `/auth/token` returns full shape: access_token, refresh_token, expires_in, persona, user_id, display_name, locale, plan
- [ ] `/auth/refresh` rotates token (old token rejected after use)
- [ ] `/auth/revoke` returns 204
- [ ] `/me` returns user_id, role, locale + driver fields when applicable
- [ ] `POST /me/device-token` writes to `wp_mr_device_tokens`
- [ ] `DELETE /me/device-token` removes the row and returns 204
- [ ] `DELETE /me/account` without `current_pass` returns 400; with wrong password returns 403; with correct password returns 204
- [ ] `/me/upgrade-url?plan=silver` returns `{url: "https://.../?order-pay=...&key=..."}`
- [ ] GPS write returns 204; read returns lat/lng/recorded_at
- [ ] `/rides/feed` returns bookings array
- [ ] Rate limit on `/auth/token` fires at attempt 4
- [ ] Existing `/driver/me/bookings` still works with cookie auth (regression)
- [ ] `wp_mr_ride_locations` and `wp_mr_refresh_tokens` appear in `wp cron event list` purge
- [ ] **Do not push to main**

---

## Known Gaps / Out of Scope for Phase 0

These are real gaps confirmed by the research — document them as Phase 1 items:

- **Rider registration endpoint.** No `POST /auth/register` for riders. App signup for riders is out of scope for Phase 0.
- **`pickup_lat/pickup_lng` always null for web-created bookings.** The web booking form sends only label strings. Distance-sort in `/rides/feed` falls back to FIFO (NULL coords sort to end via `mr_haversine_km` returning INF). Phase 1: add geocoding to the booking create handler.
- **MIPS deep-link return.** After upgrade payment, the browser lands on `/driver-dashboard/?plan_upgraded=1`, not a native deep-link. A thin `/upgrade-complete` WordPress page template that reads the order status and 302s to `mr://payment-return?...` is a Phase 1 task. Also requires updating the MIPS merchant dashboard's allowed return URL.
- **`mr_eligible_drivers_for_dispatch()` has a hardcoded free-tier cap check** (`plan === 'free' && rides >= 5`) rather than calling `mr_driver_cap_state()`. This means gold/silver drivers are correctly included but the cap value is not read from `mr_packages_list()`. Phase 1: refactor to call `mr_driver_cap_state()`. The push fan-out inherits this bug since it calls the same function.
- **`woocommerce_order_status_processing` re-fires `woocommerce_payment_complete` unconditionally** (line 118–120 in payment.php). This means COD orders created via `/me/upgrade-url` also activate plans immediately. Intentional for now.
- **Upgrade URL is not time-limited.** `/me/upgrade-url` returns the standard WC order-pay URL which is valid indefinitely. The spec (§8) calls for a short-lived signed URL. Phase 1: add a signed token query param (HMAC + timestamp, 30-min TTL) verified by a thin order-pay page template filter.
- **Dead Expo push tokens accumulate.** `mr_push_tokens_for_users()` does not filter revoked/expired tokens. After fan-out, Expo returns `DeviceNotRegistered` receipts for uninstalled apps; these are not processed. Phase 1: add receipt-check cron using `exp.host/--/api/v2/push/getReceipts` and delete stale tokens from `wp_mr_device_tokens`.
- **Anonymous rider push notifications.** Push only reaches riders who are WP users (have `rider_user_id` on their booking). Riders who booked anonymously via the web get email + WhatsApp only. Phase 2 (rider app) will address this.

---

## Production Deploy Notes (when this branch is ready to merge)

1. Add `MR_JWT_SECRET` to production `wp-config.php` before merging — the app will fail to authenticate if the constant is absent.
2. **Run DB upgrade via WP-CLI on the server** before the deploy goes live:
   ```bash
   wp eval 'mr_db_install();' --path="/path/to/production/wp"
   ```
   Do NOT rely on `admin_init` visiting wp-admin. If the theme auto-deploys before the DB is upgraded, the first REST call to `mr/v1` will try to use `mr_refresh_tokens_table()` before that table exists and return a DB error. WP-CLI ensures the tables are created before any traffic hits the new code.
3. Confirm `mr_db_version` = `1.3.0` on production: `wp option get mr_db_version`.
4. Create the `fleet` WC product in wp-admin with `_mr_plan_slug = fleet` custom field meta.
5. Do not push to `main` on git until steps 1–4 are done on the server — the auto-deploy will immediately serve the new code before the DB is upgraded.
