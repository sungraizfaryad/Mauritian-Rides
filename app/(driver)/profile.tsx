import { Screen } from '@/components/ui/Screen';
import { ProfileForm } from '@/components/driver/ProfileForm';
import { useAuthStore } from '@/lib/auth/store';

export default function ProfileScreen() {
  const session = useAuthStore((s) => s.session);
  const setSession = useAuthStore((s) => s.setSession);

  const displayName = session?.displayName ?? '';
  // email/phone not in session — backend reconciliation gap (GET /driver/me returns them; add to Session type in a future pass)
  const email = '';
  const phone = '';

  function onSaved(name: string) {
    if (!session) return;
    setSession({ ...session, displayName: name });
  }

  return (
    <Screen dark scroll testID="profile-screen">
      <ProfileForm
        displayName={displayName}
        email={email}
        phone={phone}
        onSaved={onSaved}
      />
    </Screen>
  );
}
