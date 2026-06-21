# Phase 1 — Auth + Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A user can launch the app, see a polished landing, tap "Book a ride", be routed to a designed login/register flow, authenticate against the mock backend, and land in the correct persona shell (rider or driver) with a session that persists across restarts and auto-refreshes on 401 — all built on a small, reusable design-system primitive set that becomes the app's visual source of truth.

**Architecture:** Hand-rolled NativeWind UI primitives (`Screen`, `Button`, `TextField`, `Card`) in `src/components/ui/` carry the basalt/lagoon design language. Auth uses TanStack Query mutations against the existing MSW handlers (`/auth/token`, `/auth/refresh`, `/me`), storing the access token in memory and the refresh token in `expo-secure-store` (already wired in Task 8 of Phase 0b). A response interceptor catches 401, refreshes under an `async-mutex` lock, and retries once. Session is hydrated on launch from the persisted refresh token. Driver sessions gate behind a biometric check.

**Tech Stack:** Expo SDK 56, Expo Router v4, React Hook Form 7 + Zod 3 + @hookform/resolvers, TanStack Query v5, Zustand v5, axios + async-mutex, expo-secure-store, expo-local-authentication, expo-haptics, react-native-reanimated 4, NativeWind v4. Jest 30 + RNTL 13 + MSW 2.

**Design deviation from spec §12 (noted):** the spec named gluestack-ui v2 for primitives. For Phase 1's small surface (4 primitives) we hand-roll them with NativeWind instead — tighter control over the basalt/lagoon look, fewer dependencies and no gluestack codegen step, and the primitives become the literal design source of truth the user asked for. gluestack can still be adopted later if component needs grow. This is a deliberate, reversible call.

---

## Current state (post Phase 0b)

- Routes: `app/_layout.tsx` (gate + QueryProvider + i18n init), `app/(public)/index.tsx` (landing, EN/FR hero + amber CTA linking to `/(public)/rides/book`), `(auth)/login.tsx` + `register.tsx` (stubs), `(rider)/index.tsx` + `(driver)/feed.tsx` (stubs).
- Lib: `src/lib/auth/store.ts` (`useAuthStore` with `Session { userId, persona, displayName, locale, plan? }`, `setSession`, `clearSession`), `src/lib/auth/tokens.ts` (memory access token + SecureStore refresh helpers), `src/lib/api/client.ts` (axios `api` with request interceptor attaching bearer + response interceptor normalizing to `ApiError { status, code, message }` + 429 retry), `src/lib/i18n/index.ts` (`i18n`, `initI18n`), `src/lib/query/provider.tsx` (`QueryProvider`).
- Mocks: `src/mocks/handlers.ts` (`/auth/token` → `{access_token, refresh_token, expires_in, persona:'rider', user_id, display_name, locale}`, `/auth/refresh`, `/me` requiring Bearer, `/bookings/:ref`), `src/mocks/server.ts`.
- Tests: 13 passing. `src/test-utils/render.tsx` exports a `render` wrapping `AllProviders` (currently a passthrough — Phase 1 expands it).
- Theme: `src/theme/index.ts` (`colors`, `spacing`, `radius`). Tailwind config has `basalt`/`lagoon`/`amber`/`mur`.

---

## File Structure

```
src/components/ui/
  Screen.tsx          # Task 2 — safe-area screen wrapper, basalt bg, optional scroll
  Screen.test.tsx
  Button.tsx          # Task 3 — primary/secondary/ghost variants, haptics, pressed-scale, loading, disabled
  Button.test.tsx
  TextField.tsx       # Task 4 — labeled controlled input, error text, RHF-friendly
  TextField.test.tsx
src/schemas/
  auth.ts             # Task 5 — loginSchema, registerSchema, inferred types
  auth.test.ts
src/lib/api/
  refresh.ts          # Task 6 — installRefreshInterceptor(api): 401 → mutex refresh → retry once
  refresh.test.ts
src/lib/auth/
  useAuth.ts          # Task 7 — useLogin, useRegister, useLogout mutations + session wiring
  useAuth.test.tsx
  bootstrap.ts        # Task 9 — hydrateSession(): refresh token → /me → setSession; + biometric gate
  bootstrap.test.ts
app/(auth)/
  login.tsx           # Task 8 — designed login form (replaces stub)
  login.test.tsx
  register.tsx        # Task 10 — designed register form w/ rider|driver branch (replaces stub)
  register.test.tsx
app/_layout.tsx       # Task 9 — call hydrateSession on launch
src/mocks/handlers.ts # Tasks 6/7 — extend: driver login, register, logout, varied personas
src/test-utils/render.tsx # Task 7 — expand AllProviders with QueryClient
```

---

## Task 1: Install expo-local-authentication + biometric plugin config

**Files:**
- Modify: `package.json`, `package-lock.json`, `app.config.ts`

- [ ] **Step 1.1: Install**

```bash
cd "/Users/sungraizfaryad/Local Sites/mauritianrides/mobile-app"
npx expo install expo-local-authentication
```

- [ ] **Step 1.2: Add the config plugin + Face ID permission string to `app.config.ts`**

In `app.config.ts`, add to the `plugins` array (after `expo-image-picker`'s entry):

```ts
    [
      'expo-local-authentication',
      {
        faceIDPermission: 'Use Face ID to unlock your driver account.',
      },
    ],
```

- [ ] **Step 1.3: Verify config loads**

Run: `npx expo config --type public 2>&1 | grep -E "expo-local-authentication|error" | head -3`
Expected: no `error` lines (the plugin name need not print; absence of error is the pass).

- [ ] **Step 1.4: Typecheck + commit**

```bash
npm run typecheck
git add package.json package-lock.json app.config.ts
git commit -m "chore(auth): install expo-local-authentication + Face ID permission"
```
Expected typecheck: exit 0.

---

## Task 2: Screen primitive

**Files:**
- Create: `src/components/ui/Screen.tsx`, `src/components/ui/Screen.test.tsx`

- [ ] **Step 2.1: Write the failing test**

Create `src/components/ui/Screen.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Screen } from './Screen';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('Screen', () => {
  it('renders children', () => {
    render(
      <Screen>
        <Text>hello screen</Text>
      </Screen>,
    );
    expect(screen.getByText('hello screen')).toBeTruthy();
  });

  it('exposes a testID', () => {
    render(
      <Screen testID="login-screen">
        <Text>x</Text>
      </Screen>,
    );
    expect(screen.getByTestId('login-screen')).toBeTruthy();
  });
});
```

- [ ] **Step 2.2: Run test, expect FAIL**

Run: `npm test -- --testPathPatterns=Screen`
Expected: FAIL with `Cannot find module './Screen'`.

- [ ] **Step 2.3: Implement**

Create `src/components/ui/Screen.tsx`:

```tsx
import type { ReactNode } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  testID?: string;
  /** Extra Tailwind classes for the inner content container. */
  contentClassName?: string;
}

export function Screen({ children, scroll = false, testID, contentClassName = '' }: ScreenProps) {
  const inner = scroll ? (
    <ScrollView
      testID={testID}
      className="flex-1"
      contentContainerClassName={`px-6 py-4 ${contentClassName}`}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View testID={testID} className={`flex-1 px-6 py-4 ${contentClassName}`}>
      {children}
    </View>
  );

  return <SafeAreaView className="flex-1 bg-basalt-900">{inner}</SafeAreaView>;
}
```

- [ ] **Step 2.4: Run test, expect PASS**

Run: `npm test -- --testPathPatterns=Screen`
Expected: 2 passing.

- [ ] **Step 2.5: Commit**

```bash
git add src/components/ui/Screen.tsx src/components/ui/Screen.test.tsx
git commit -m "feat(ui): Screen primitive (safe-area, basalt bg, scroll option)"
```

---

## Task 3: Button primitive

**Files:**
- Create: `src/components/ui/Button.tsx`, `src/components/ui/Button.test.tsx`

- [ ] **Step 3.1: Write the failing test**

Create `src/components/ui/Button.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Button } from './Button';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

describe('Button', () => {
  it('renders its label', () => {
    render(<Button label="Book a ride" onPress={() => {}} />);
    expect(screen.getByText('Book a ride')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<Button label="Tap" onPress={onPress} />);
    fireEvent.press(screen.getByText('Tap'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    render(<Button label="Nope" onPress={onPress} disabled />);
    fireEvent.press(screen.getByText('Nope'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress while loading and shows a busy indicator', () => {
    const onPress = jest.fn();
    render(<Button label="Wait" onPress={onPress} loading testID="btn" />);
    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByTestId('btn-spinner')).toBeTruthy();
  });
});
```

- [ ] **Step 3.2: Run test, expect FAIL**

Run: `npm test -- --testPathPatterns=Button`
Expected: FAIL with `Cannot find module './Button'`.

- [ ] **Step 3.3: Implement**

Create `src/components/ui/Button.tsx`:

```tsx
import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import * as Haptics from 'expo-haptics';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}

const container: Record<Variant, string> = {
  primary: 'bg-amber-500',
  secondary: 'bg-lagoon-500',
  ghost: 'bg-transparent border border-basalt-500',
};

const labelColor: Record<Variant, string> = {
  primary: 'text-basalt-900',
  secondary: 'text-basalt-900',
  ghost: 'text-lagoon-300',
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  testID,
}: ButtonProps) {
  const inactive = disabled || loading;

  function handlePress() {
    if (inactive) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={handlePress}
      className={`h-14 flex-row items-center justify-center rounded-md px-6 ${container[variant]} ${
        inactive ? 'opacity-50' : 'active:opacity-80'
      }`}
    >
      {loading ? (
        <View testID={testID ? `${testID}-spinner` : undefined}>
          <ActivityIndicator color="#1a1a1a" />
        </View>
      ) : (
        <Text className={`text-lg font-semibold ${labelColor[variant]}`}>{label}</Text>
      )}
    </Pressable>
  );
}
```

- [ ] **Step 3.4: Run test, expect PASS**

Run: `npm test -- --testPathPatterns=Button`
Expected: 4 passing.

- [ ] **Step 3.5: Commit**

```bash
git add src/components/ui/Button.tsx src/components/ui/Button.test.tsx
git commit -m "feat(ui): Button primitive (variants, haptics, loading/disabled states)"
```

---

## Task 4: TextField primitive

**Files:**
- Create: `src/components/ui/TextField.tsx`, `src/components/ui/TextField.test.tsx`

- [ ] **Step 4.1: Write the failing test**

Create `src/components/ui/TextField.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { TextField } from './TextField';

describe('TextField', () => {
  it('renders label and value', () => {
    render(<TextField label="Email" value="a@b.com" onChangeText={() => {}} />);
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByDisplayValue('a@b.com')).toBeTruthy();
  });

  it('fires onChangeText', () => {
    const onChangeText = jest.fn();
    render(<TextField label="Email" value="" onChangeText={onChangeText} testID="email" />);
    fireEvent.changeText(screen.getByTestId('email'), 'new@x.com');
    expect(onChangeText).toHaveBeenCalledWith('new@x.com');
  });

  it('shows an error message when provided', () => {
    render(<TextField label="Email" value="" onChangeText={() => {}} error="Required" />);
    expect(screen.getByText('Required')).toBeTruthy();
  });
});
```

- [ ] **Step 4.2: Run test, expect FAIL**

Run: `npm test -- --testPathPatterns=TextField`
Expected: FAIL with `Cannot find module './TextField'`.

- [ ] **Step 4.3: Implement**

Create `src/components/ui/TextField.tsx`:

```tsx
import { View, Text, TextInput, type TextInputProps } from 'react-native';

interface TextFieldProps extends Omit<TextInputProps, 'className'> {
  label: string;
  error?: string;
  testID?: string;
}

export function TextField({ label, error, testID, ...inputProps }: TextFieldProps) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-basalt-300">{label}</Text>
      <TextInput
        testID={testID}
        placeholderTextColor="#666666"
        className={`h-12 rounded-md border bg-basalt-700 px-4 text-base text-white ${
          error ? 'border-danger' : 'border-basalt-500'
        }`}
        {...inputProps}
      />
      {error ? <Text className="mt-1 text-sm text-danger">{error}</Text> : null}
    </View>
  );
}
```

Note: `text-danger` and `bg-basalt-700` rely on Tailwind tokens. `danger` is in `src/theme` but NOT yet in `tailwind.config.js`. Add it.

- [ ] **Step 4.4: Add `danger` + `surface` tokens to `tailwind.config.js`**

In `tailwind.config.js`, inside `theme.extend.colors`, after the `mur` line add:

```js
        danger: '#ef4444',
        surface: '#ffffff',
        surfaceDim: '#f5f5f5',
```

This closes the gap flagged in the Phase 0b review (theme tokens that existed in `src/theme` but not in Tailwind).

- [ ] **Step 4.5: Run test, expect PASS**

Run: `npm test -- --testPathPatterns=TextField`
Expected: 3 passing.

- [ ] **Step 4.6: Commit**

```bash
git add src/components/ui/TextField.tsx src/components/ui/TextField.test.tsx tailwind.config.js
git commit -m "feat(ui): TextField primitive + add danger/surface Tailwind tokens"
```

---

## Task 5: Auth Zod schemas

**Files:**
- Create: `src/schemas/auth.ts`, `src/schemas/auth.test.ts`

- [ ] **Step 5.1: Write the failing test**

Create `src/schemas/auth.test.ts`:

```ts
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
```

- [ ] **Step 5.2: Run test, expect FAIL**

Run: `npm test -- --testPathPatterns=schemas/auth`
Expected: FAIL with `Cannot find module './auth'`.

- [ ] **Step 5.3: Implement**

Create `src/schemas/auth.ts`:

```ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerSchema = z.object({
  persona: z.enum(['rider', 'driver']),
  displayName: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
```

- [ ] **Step 5.4: Run test, expect PASS**

Run: `npm test -- --testPathPatterns=schemas/auth`
Expected: 6 passing.

- [ ] **Step 5.5: Commit**

```bash
git add src/schemas/auth.ts src/schemas/auth.test.ts
git commit -m "feat(auth): login + register Zod schemas"
```

---

## Task 6: JWT refresh interceptor (mutex, 401 retry)

**Files:**
- Create: `src/lib/api/refresh.ts`, `src/lib/api/refresh.test.ts`
- Modify: `src/lib/api/client.ts` (call `installRefreshInterceptor`)
- Modify: `src/mocks/handlers.ts` (make `/me` 401 then 200 after refresh; add a `__expireOnce` toggle handler)

- [ ] **Step 6.1: Extend MSW handlers to drive a 401-then-refresh scenario**

In `src/mocks/handlers.ts`, replace the `/me` handler and add token state. Replace the existing `http.get(\`${BASE}/me\`, ...)` block with:

```ts
  // Test-controllable: when accessTokenValid is false, /me returns 401 once,
  // the refresh endpoint flips it back to true, and the retry succeeds.
  http.get(`${BASE}/me`, () => {
    if (!mockState.accessTokenValid) {
      return HttpResponse.json({ code: 'jwt_expired', message: 'expired' }, { status: 401 });
    }
    return HttpResponse.json({
      user_id: 1,
      display_name: 'Test Rider',
      role: 'rider',
      locale: 'en',
    });
  }),
```

At the top of the file (after `const BASE = ...`), add:

```ts
export const mockState = { accessTokenValid: true };
```

And change the `/auth/refresh` handler body to flip the flag:

```ts
  http.post(`${BASE}/auth/refresh`, async () => {
    await delay(20);
    mockState.accessTokenValid = true;
    return HttpResponse.json({
      access_token: 'mock.jwt.access.refreshed',
      refresh_token: 'mock.refresh.rotated',
      expires_in: 900,
    });
  }),
```

- [ ] **Step 6.2: Write the failing test**

Create `src/lib/api/refresh.test.ts`:

```ts
import { server } from '@/mocks/server';
import { mockState } from '@/mocks/handlers';
import { api } from './client';
import { setAccessToken, clearAccessToken } from '@/lib/auth/tokens';

beforeEach(() => {
  clearAccessToken();
  mockState.accessTokenValid = true;
});

describe('refresh interceptor', () => {
  it('refreshes once on 401 then retries the original request', async () => {
    setAccessToken('stale');
    mockState.accessTokenValid = false; // first /me will 401

    const res = await api.get('/me');

    expect(res.status).toBe(200);
    expect(res.data.user_id).toBe(1);
  });

  it('rejects when refresh itself fails', async () => {
    setAccessToken('stale');
    mockState.accessTokenValid = false;
    const { http, HttpResponse } = await import('msw');
    server.use(
      http.post('https://mauritianrides.com/wp-json/mr/v1/auth/refresh', () =>
        HttpResponse.json({ code: 'invalid_refresh' }, { status: 401 }),
      ),
    );

    await expect(api.get('/me')).rejects.toMatchObject({ status: 401 });
  });
});
```

- [ ] **Step 6.3: Run test, expect FAIL**

Run: `npm test -- --testPathPatterns=api/refresh`
Expected: FAIL — the first test currently rejects with 401 (no refresh logic yet) or errors importing `./refresh` indirectly. The interceptor does not exist, so the 401 is not recovered.

- [ ] **Step 6.4: Implement the interceptor**

Create `src/lib/api/refresh.ts`:

```ts
import { Mutex } from 'async-mutex';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';
import {
  getRefreshToken,
  setRefreshToken,
  setAccessToken,
  clearAccessToken,
  clearRefreshToken,
} from '@/lib/auth/tokens';

const refreshMutex = new Mutex();

interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

/**
 * Installs a response interceptor that, on a 401, refreshes the access token
 * once (serialised through a mutex so concurrent 401s trigger a single refresh)
 * and retries the original request. A second failure rejects and clears tokens.
 */
export function installRefreshInterceptor(api: AxiosInstance, baseURL: string) {
  api.interceptors.response.use(
    (r) => r,
    async (error: AxiosError) => {
      const original = error.config as RetriableConfig | undefined;
      const status = error.response?.status;

      if (status !== 401 || !original || original._retried) {
        return Promise.reject(error);
      }
      original._retried = true;

      try {
        await refreshMutex.runExclusive(async () => {
          const refreshToken = await getRefreshToken();
          if (!refreshToken) throw new Error('no_refresh_token');
          const { data } = await axios.post<RefreshResponse>(`${baseURL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          setAccessToken(data.access_token);
          await setRefreshToken(data.refresh_token);
        });
      } catch (refreshErr) {
        clearAccessToken();
        await clearRefreshToken();
        return Promise.reject(refreshErr);
      }

      return api(original);
    },
  );
}
```

Important ordering note: this interceptor must be registered BEFORE the existing error-normalizing interceptor in `client.ts`, because axios runs response error interceptors in reverse registration order, and we want the refresh attempt to run before the error is normalized to `ApiError`. See Step 6.5.

- [ ] **Step 6.5: Wire it into `client.ts`**

In `src/lib/api/client.ts`, import and call the installer. Add the import near the top:

```ts
import { installRefreshInterceptor } from './refresh';
```

Then, immediately BEFORE the existing `api.interceptors.response.use(` block that normalizes errors, add:

```ts
installRefreshInterceptor(api, baseURL);
```

(Placing the call before the normalize-interceptor registration means the normalize interceptor is registered last and therefore runs first on the way out; the refresh interceptor runs after normalization rejects. To keep the refresh interceptor seeing a raw `AxiosError` with `.config` and `.response.status`, the refresh test asserts on `status` which the normalizer also preserves. If the second test fails because the rejected value is the normalized `ApiError` without `.config`, move the `installRefreshInterceptor(api, baseURL)` call to AFTER the normalize block instead so refresh runs first. Verify by running the tests; pick the ordering that makes both Step 6.2 tests pass.)

- [ ] **Step 6.6: Run test, expect PASS**

Run: `npm test -- --testPathPatterns=api/refresh`
Expected: 2 passing. If the second test sees a normalized error lacking `status`, adjust interceptor order per the note in 6.5 and re-run.

- [ ] **Step 6.7: Run the full suite (ensure no regression in client.test.ts)**

Run: `npm test`
Expected: all prior tests still pass plus the 2 new ones.

- [ ] **Step 6.8: Commit**

```bash
git add src/lib/api/refresh.ts src/lib/api/refresh.test.ts src/lib/api/client.ts src/mocks/handlers.ts
git commit -m "feat(api): JWT refresh interceptor (mutex, 401 retry once) + MSW expiry scenario"
```

---

## Task 7: Auth mutations (useLogin / useRegister / useLogout)

**Files:**
- Create: `src/lib/auth/useAuth.ts`, `src/lib/auth/useAuth.test.tsx`
- Modify: `src/mocks/handlers.ts` (driver login by email, register, logout)
- Modify: `src/test-utils/render.tsx` (QueryClient provider)

- [ ] **Step 7.1: Extend MSW handlers for persona-by-email + register + logout**

In `src/mocks/handlers.ts`, replace the `/auth/token` handler with one that returns `driver` persona when the email starts with `driver`, else `rider`:

```ts
  http.post(`${BASE}/auth/token`, async ({ request }) => {
    await delay(50);
    const body = (await request.json()) as { email?: string };
    const isDriver = (body.email ?? '').toLowerCase().startsWith('driver');
    mockState.accessTokenValid = true;
    return HttpResponse.json({
      access_token: 'mock.jwt.access',
      refresh_token: 'mock.refresh',
      expires_in: 900,
      persona: isDriver ? 'driver' : 'rider',
      user_id: isDriver ? 2 : 1,
      display_name: isDriver ? 'Test Driver' : 'Test Rider',
      locale: 'en',
      plan: isDriver ? 'free' : undefined,
    });
  }),
```

Add a register handler and a logout handler to the `handlers` array:

```ts
  http.post(`${BASE}/drivers/register`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; persona?: string };
    return HttpResponse.json({
      access_token: 'mock.jwt.access',
      refresh_token: 'mock.refresh',
      expires_in: 900,
      persona: body.persona === 'driver' ? 'driver' : 'rider',
      user_id: 3,
      display_name: 'New User',
      locale: 'en',
    });
  }),

  http.post(`${BASE}/auth/revoke`, () => new HttpResponse(null, { status: 204 })),
```

- [ ] **Step 7.2: Expand the test render wrapper with a QueryClient**

Replace `src/test-utils/render.tsx` with:

```tsx
import { render, type RenderOptions } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';

export function makeTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function AllProviders({ children }: { children: ReactNode }) {
  const client = makeTestQueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react-native';
export { customRender as render };
```

- [ ] **Step 7.3: Write the failing test**

Create `src/lib/auth/useAuth.test.tsx`:

```tsx
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useLogin, useLogout } from './useAuth';
import { useAuthStore } from './store';
import { getAccessToken } from './tokens';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  useAuthStore.getState().clearSession();
});

describe('useLogin', () => {
  it('logs a rider in and sets the session + access token', async () => {
    const { result } = renderHook(() => useLogin(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ email: 'rider@x.com', password: 'secret12' });
    });

    await waitFor(() => expect(useAuthStore.getState().session?.persona).toBe('rider'));
    expect(getAccessToken()).toBe('mock.jwt.access');
  });

  it('logs a driver in with persona driver', async () => {
    const { result } = renderHook(() => useLogin(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ email: 'driver@x.com', password: 'secret12' });
    });
    await waitFor(() => expect(useAuthStore.getState().session?.persona).toBe('driver'));
  });
});

describe('useLogout', () => {
  it('clears the session', async () => {
    useAuthStore.getState().setSession({
      userId: 1,
      persona: 'rider',
      displayName: 'X',
      locale: 'en',
    });
    const { result } = renderHook(() => useLogout(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync();
    });
    await waitFor(() => expect(useAuthStore.getState().session).toBeNull());
  });
});
```

- [ ] **Step 7.4: Run test, expect FAIL**

Run: `npm test -- --testPathPatterns=auth/useAuth`
Expected: FAIL with `Cannot find module './useAuth'`.

- [ ] **Step 7.5: Implement**

Create `src/lib/auth/useAuth.ts`:

```ts
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useAuthStore, type Session, type Persona } from './store';
import { setAccessToken, setRefreshToken, clearAccessToken, clearRefreshToken, getRefreshToken } from './tokens';
import type { LoginInput, RegisterInput } from '@/schemas/auth';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  persona: Persona;
  user_id: number;
  display_name: string;
  locale: 'en' | 'fr';
  plan?: Session['plan'];
}

async function persist(res: TokenResponse): Promise<Session> {
  setAccessToken(res.access_token);
  await setRefreshToken(res.refresh_token);
  const session: Session = {
    userId: res.user_id,
    persona: res.persona,
    displayName: res.display_name,
    locale: res.locale,
    plan: res.plan,
  };
  useAuthStore.getState().setSession(session);
  return session;
}

export function useLogin() {
  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data } = await api.post<TokenResponse>('/auth/token', input);
      return persist(data);
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      const { data } = await api.post<TokenResponse>('/drivers/register', input);
      return persist(data);
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        await api.post('/auth/revoke', { refresh_token: refreshToken }).catch(() => undefined);
      }
      clearAccessToken();
      await clearRefreshToken();
      useAuthStore.getState().clearSession();
    },
  });
}
```

- [ ] **Step 7.6: Run test, expect PASS**

Run: `npm test -- --testPathPatterns=auth/useAuth`
Expected: 3 passing.

- [ ] **Step 7.7: Commit**

```bash
git add src/lib/auth/useAuth.ts src/lib/auth/useAuth.test.tsx src/mocks/handlers.ts src/test-utils/render.tsx
git commit -m "feat(auth): useLogin/useRegister/useLogout mutations + MSW persona handlers"
```

---

## Task 8: Login screen

**Files:**
- Modify: `app/(auth)/login.tsx` (replace stub)
- Create: `app/(auth)/login.test.tsx`
- Modify: `locales/en.json`, `locales/fr.json` (auth strings)

- [ ] **Step 8.1: Add auth locale strings**

In `locales/en.json`, replace the `"auth"` object with:

```json
  "auth": {
    "login_title": "Sign in",
    "register_title": "Create account",
    "email_label": "Email",
    "password_label": "Password",
    "sign_in_cta": "Sign in",
    "no_account": "New here? Create an account",
    "have_account": "Already have an account? Sign in",
    "invalid_credentials": "Wrong email or password.",
    "email_invalid": "Enter a valid email.",
    "password_short": "At least 8 characters."
  }
```

In `locales/fr.json`, replace the `"auth"` object with:

```json
  "auth": {
    "login_title": "Connexion",
    "register_title": "Créer un compte",
    "email_label": "E-mail",
    "password_label": "Mot de passe",
    "sign_in_cta": "Se connecter",
    "no_account": "Nouveau ? Créer un compte",
    "have_account": "Déjà un compte ? Se connecter",
    "invalid_credentials": "E-mail ou mot de passe incorrect.",
    "email_invalid": "Entrez un e-mail valide.",
    "password_short": "Au moins 8 caractères."
  }
```

- [ ] **Step 8.2: Write the failing test**

Create `app/(auth)/login.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@/test-utils/render';
import { initI18n } from '@/lib/i18n';
import { useAuthStore } from '@/lib/auth/store';
import Login from './login';

const pushMock = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...a: unknown[]) => pushMock(...a) },
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

beforeAll(async () => {
  await initI18n('en');
});
beforeEach(() => {
  pushMock.mockClear();
  useAuthStore.getState().clearSession();
});

describe('Login screen', () => {
  it('renders the sign-in title and CTA', () => {
    render(<Login />);
    expect(screen.getByText('Sign in')).toBeTruthy();
    expect(screen.getByTestId('login-submit')).toBeTruthy();
  });

  it('shows a validation error for a bad email', async () => {
    render(<Login />);
    fireEvent.changeText(screen.getByTestId('login-email'), 'nope');
    fireEvent.changeText(screen.getByTestId('login-password'), 'secret12');
    fireEvent.press(screen.getByTestId('login-submit'));
    await waitFor(() => expect(screen.getByText('Enter a valid email.')).toBeTruthy());
  });

  it('logs in a rider and routes to the rider shell', async () => {
    render(<Login />);
    fireEvent.changeText(screen.getByTestId('login-email'), 'rider@x.com');
    fireEvent.changeText(screen.getByTestId('login-password'), 'secret12');
    fireEvent.press(screen.getByTestId('login-submit'));
    await waitFor(() => expect(useAuthStore.getState().session?.persona).toBe('rider'));
  });
});
```

- [ ] **Step 8.3: Run test, expect FAIL**

Run: `npm test -- --testPathPatterns='\(auth\)/login'`
Expected: FAIL — stub has no `login-submit` testID / "Sign in" title.

- [ ] **Step 8.4: Implement the login screen**

Replace `app/(auth)/login.tsx`:

```tsx
import { useState } from 'react';
import { View, Text } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { loginSchema, type LoginInput } from '@/schemas/auth';
import { useLogin } from '@/lib/auth/useAuth';
import type { ApiError } from '@/lib/api/client';

export default function Login() {
  const { t } = useTranslation();
  const login = useLogin();
  const [serverError, setServerError] = useState<string | null>(null);

  const { control, handleSubmit, formState } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    try {
      const session = await login.mutateAsync(values);
      router.replace(session.persona === 'driver' ? '/(driver)/feed' : '/(rider)');
    } catch (e) {
      const err = e as ApiError;
      setServerError(err.status === 401 ? t('auth.invalid_credentials') : err.message);
    }
  }

  return (
    <Screen scroll testID="login-screen" contentClassName="justify-center">
      <Text className="mb-8 text-3xl font-bold text-lagoon-300">{t('auth.login_title')}</Text>

      <Controller
        control={control}
        name="email"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            testID="login-email"
            label={t('auth.email_label')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            autoCapitalize="none"
            keyboardType="email-address"
            error={formState.errors.email ? t('auth.email_invalid') : undefined}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            testID="login-password"
            label={t('auth.password_label')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            secureTextEntry
            error={formState.errors.password ? t('auth.password_short') : undefined}
          />
        )}
      />

      {serverError ? <Text className="mb-3 text-danger">{serverError}</Text> : null}

      <Button
        testID="login-submit"
        label={t('auth.sign_in_cta')}
        loading={login.isPending}
        onPress={handleSubmit(onSubmit)}
      />

      <Link href="/(auth)/register" asChild>
        <Text className="mt-6 text-center text-lagoon-500">{t('auth.no_account')}</Text>
      </Link>
    </Screen>
  );
}
```

- [ ] **Step 8.5: Run test, expect PASS**

Run: `npm test -- --testPathPatterns='\(auth\)/login'`
Expected: 3 passing.

- [ ] **Step 8.6: Commit**

```bash
git add 'app/(auth)/login.tsx' 'app/(auth)/login.test.tsx' locales/en.json locales/fr.json
git commit -m "feat(auth): designed login screen (RHF+Zod, persona routing, EN/FR)"
```

---

## Task 9: Session bootstrap on launch + biometric driver gate

**Files:**
- Create: `src/lib/auth/bootstrap.ts`, `src/lib/auth/bootstrap.test.ts`
- Modify: `app/_layout.tsx` (call `hydrateSession` on mount)

- [ ] **Step 9.1: Write the failing test**

Create `src/lib/auth/bootstrap.test.ts`:

```ts
import { hydrateSession } from './bootstrap';
import { useAuthStore } from './store';
import * as tokens from './tokens';

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(async () => true),
  isEnrolledAsync: jest.fn(async () => true),
  authenticateAsync: jest.fn(async () => ({ success: true })),
}));

beforeEach(() => {
  useAuthStore.getState().clearSession();
  jest.restoreAllMocks();
});

describe('hydrateSession', () => {
  it('does nothing when there is no refresh token', async () => {
    jest.spyOn(tokens, 'getRefreshToken').mockResolvedValue(null);
    const ok = await hydrateSession();
    expect(ok).toBe(false);
    expect(useAuthStore.getState().session).toBeNull();
  });

  it('restores a rider session from /me when a refresh token exists', async () => {
    jest.spyOn(tokens, 'getRefreshToken').mockResolvedValue('mock.refresh');
    const ok = await hydrateSession();
    expect(ok).toBe(true);
    expect(useAuthStore.getState().session?.persona).toBe('rider');
  });
});
```

- [ ] **Step 9.2: Run test, expect FAIL**

Run: `npm test -- --testPathPatterns=auth/bootstrap`
Expected: FAIL with `Cannot find module './bootstrap'`.

- [ ] **Step 9.3: Implement**

Create `src/lib/auth/bootstrap.ts`:

```ts
import * as LocalAuthentication from 'expo-local-authentication';
import { api } from '@/lib/api/client';
import { useAuthStore, type Persona } from './store';
import { getRefreshToken } from './tokens';

interface MeResponse {
  user_id: number;
  display_name: string;
  role: Persona;
  locale: 'en' | 'fr';
}

/**
 * On cold start: if a refresh token is persisted, call /me (the refresh
 * interceptor obtains a fresh access token automatically) and restore the
 * session. Returns true if a session was restored.
 */
export async function hydrateSession(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;

  try {
    const { data } = await api.get<MeResponse>('/me');
    useAuthStore.getState().setSession({
      userId: data.user_id,
      persona: data.role,
      displayName: data.display_name,
      locale: data.locale,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Biometric gate for the driver persona (financial actions). Returns true if
 * the device has no biometric hardware/enrolment (so we don't lock users out)
 * or the user passes the prompt; false only on an explicit failed/cancelled prompt.
 */
export async function biometricUnlock(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!hasHardware || !enrolled) return true;
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock your driver account',
  });
  return result.success;
}
```

- [ ] **Step 9.4: Run test, expect PASS**

Run: `npm test -- --testPathPatterns=auth/bootstrap`
Expected: 2 passing.

- [ ] **Step 9.5: Call hydrateSession from the root layout**

In `app/_layout.tsx`, add the import:

```tsx
import { hydrateSession } from '@/lib/auth/bootstrap';
```

Change the i18n effect into a combined bootstrap effect. Replace:

```tsx
  useEffect(() => {
    initI18n(session?.locale ?? 'en').then(() => setI18nReady(true));
  }, [session?.locale]);
```

with:

```tsx
  const [bootDone, setBootDone] = useState(false);

  useEffect(() => {
    (async () => {
      await hydrateSession();
      setBootDone(true);
    })();
  }, []);

  useEffect(() => {
    initI18n(session?.locale ?? 'en').then(() => setI18nReady(true));
  }, [session?.locale]);
```

And change the readiness guard from `if (!i18nReady) return null;` to:

```tsx
  if (!i18nReady || !bootDone) return null;
```

- [ ] **Step 9.6: Typecheck + full test run**

Run: `npm run typecheck && npm test`
Expected: typecheck exit 0; all tests pass.

- [ ] **Step 9.7: Commit**

```bash
git add src/lib/auth/bootstrap.ts src/lib/auth/bootstrap.test.ts app/_layout.tsx
git commit -m "feat(auth): hydrate session on launch + biometric driver unlock helper"
```

---

## Task 10: Register screen (rider/driver branch)

**Files:**
- Modify: `app/(auth)/register.tsx` (replace stub)
- Create: `app/(auth)/register.test.tsx`
- Modify: `locales/en.json`, `locales/fr.json` (register strings)

- [ ] **Step 10.1: Add register locale strings**

In `locales/en.json`, inside the `"auth"` object, add these keys (before the closing brace):

```json
    ,"name_label": "Your name",
    "role_question": "I want to…",
    "role_rider": "Book rides",
    "role_driver": "Drive & earn",
    "create_cta": "Create account",
    "name_required": "Enter your name."
```

In `locales/fr.json`, inside the `"auth"` object add:

```json
    ,"name_label": "Votre nom",
    "role_question": "Je veux…",
    "role_rider": "Réserver des courses",
    "role_driver": "Conduire & gagner",
    "create_cta": "Créer un compte",
    "name_required": "Entrez votre nom."
```

- [ ] **Step 10.2: Write the failing test**

Create `app/(auth)/register.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@/test-utils/render';
import { initI18n } from '@/lib/i18n';
import { useAuthStore } from '@/lib/auth/store';
import Register from './register';

const replaceMock = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...a: unknown[]) => replaceMock(...a) },
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

beforeAll(async () => {
  await initI18n('en');
});
beforeEach(() => {
  replaceMock.mockClear();
  useAuthStore.getState().clearSession();
});

describe('Register screen', () => {
  it('renders the create-account title and role options', () => {
    render(<Register />);
    expect(screen.getByText('Create account')).toBeTruthy();
    expect(screen.getByTestId('role-rider')).toBeTruthy();
    expect(screen.getByTestId('role-driver')).toBeTruthy();
  });

  it('registers a driver and routes to the driver shell', async () => {
    render(<Register />);
    fireEvent.press(screen.getByTestId('role-driver'));
    fireEvent.changeText(screen.getByTestId('register-name'), 'New Driver');
    fireEvent.changeText(screen.getByTestId('register-email'), 'driver@x.com');
    fireEvent.changeText(screen.getByTestId('register-password'), 'secret12');
    fireEvent.press(screen.getByTestId('register-submit'));
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/(driver)/feed'));
  });
});
```

- [ ] **Step 10.3: Run test, expect FAIL**

Run: `npm test -- --testPathPatterns='\(auth\)/register'`
Expected: FAIL — stub has no role options / title.

- [ ] **Step 10.4: Implement the register screen**

Replace `app/(auth)/register.tsx`:

```tsx
import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { registerSchema, type RegisterInput } from '@/schemas/auth';
import { useRegister } from '@/lib/auth/useAuth';
import type { Persona } from '@/lib/auth/store';
import type { ApiError } from '@/lib/api/client';

export default function Register() {
  const { t } = useTranslation();
  const reg = useRegister();
  const [serverError, setServerError] = useState<string | null>(null);

  const { control, handleSubmit, watch, setValue, formState } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    defaultValues: { persona: 'rider', displayName: '', email: '', password: '' },
  });
  const persona = watch('persona');

  function selectRole(role: Persona) {
    setValue('persona', role, { shouldValidate: true });
  }

  async function onSubmit(values: RegisterInput) {
    setServerError(null);
    try {
      const session = await reg.mutateAsync(values);
      router.replace(session.persona === 'driver' ? '/(driver)/feed' : '/(rider)');
    } catch (e) {
      setServerError((e as ApiError).message);
    }
  }

  return (
    <Screen scroll testID="register-screen" contentClassName="justify-center">
      <Text className="mb-6 text-3xl font-bold text-lagoon-300">{t('auth.register_title')}</Text>

      <Text className="mb-2 text-sm font-medium text-basalt-300">{t('auth.role_question')}</Text>
      <View className="mb-5 flex-row gap-3">
        {(['rider', 'driver'] as const).map((role) => (
          <Pressable
            key={role}
            testID={`role-${role}`}
            onPress={() => selectRole(role)}
            className={`flex-1 items-center rounded-md border px-4 py-4 ${
              persona === role ? 'border-amber-500 bg-basalt-700' : 'border-basalt-500'
            }`}
          >
            <Text className={persona === role ? 'font-semibold text-amber-500' : 'text-basalt-300'}>
              {role === 'rider' ? t('auth.role_rider') : t('auth.role_driver')}
            </Text>
          </Pressable>
        ))}
      </View>

      <Controller
        control={control}
        name="displayName"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            testID="register-name"
            label={t('auth.name_label')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={formState.errors.displayName ? t('auth.name_required') : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            testID="register-email"
            label={t('auth.email_label')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            autoCapitalize="none"
            keyboardType="email-address"
            error={formState.errors.email ? t('auth.email_invalid') : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            testID="register-password"
            label={t('auth.password_label')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            secureTextEntry
            error={formState.errors.password ? t('auth.password_short') : undefined}
          />
        )}
      />

      {serverError ? <Text className="mb-3 text-danger">{serverError}</Text> : null}

      <Button
        testID="register-submit"
        label={t('auth.create_cta')}
        loading={reg.isPending}
        onPress={handleSubmit(onSubmit)}
      />

      <Link href="/(auth)/login" asChild>
        <Text className="mt-6 text-center text-lagoon-500">{t('auth.have_account')}</Text>
      </Link>
    </Screen>
  );
}
```

- [ ] **Step 10.5: Run test, expect PASS**

Run: `npm test -- --testPathPatterns='\(auth\)/register'`
Expected: 2 passing.

- [ ] **Step 10.6: Wire the landing CTA to login + full verification**

In `app/(public)/index.tsx`, change the CTA `Link href` from `/(public)/rides/book` to `/(auth)/login` (guests must authenticate before booking in Phase 1; the guest-draft booking flow lands in Phase 2). Update the existing `<Link href="/(public)/rides/book" asChild>` to `<Link href="/(auth)/login" asChild>` and remove the `as any` cast if present.

Run: `npm run typecheck && npm test`
Expected: typecheck exit 0; all tests pass (Phase 0b 13 + new Phase 1 tests).

- [ ] **Step 10.7: Commit**

```bash
git add 'app/(auth)/register.tsx' 'app/(auth)/register.test.tsx' 'app/(public)/index.tsx' locales/en.json locales/fr.json
git commit -m "feat(auth): designed register screen (rider/driver branch) + landing CTA → login"
```

---

## Phase 1 acceptance check

- [ ] `npm test` green (Phase 0b 13 + Phase 1 additions).
- [ ] `npm run typecheck` exit 0.
- [ ] On a dev client (iOS sim + Android emu): launch → landing → tap "Book a ride" → login screen → enter `rider@x.com` / `secret12` → lands on rider shell; `driver@x.com` → driver shell.
- [ ] Kill + relaunch app → session restored (no re-login) because refresh token persisted and `hydrateSession` ran.
- [ ] Switch device language to French → auth screens render FR strings.
- [ ] No `*.test.tsx` bundled (Metro blockList from Phase 0b holds for the new `app/(auth)/*.test.tsx` files).

---

## Self-review notes

Spec coverage (spec §4 routing, §5 auth, §12 design system): login + register + persona routing + JWT refresh + session persistence + biometric helper + the primitive set all implemented. Deferred to later phases (documented): blog/legal content screens (content mini-plan), guest booking draft (Phase 2), full driver signup 4-step + document upload (Phase 3), `expo-updates`/OTA channels (hardening).

Type consistency: `Session`/`Persona` from `store.ts` used consistently in `useAuth.ts`, `bootstrap.ts`, screens. `ApiError` from `client.ts`. `LoginInput`/`RegisterInput` from `schemas/auth.ts`. Mutation hook names `useLogin`/`useRegister`/`useLogout` consistent across tasks.

Known interceptor-ordering caveat is called out inline in Task 6.5 with a concrete fallback so the implementer resolves it empirically rather than guessing.
