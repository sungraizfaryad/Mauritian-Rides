import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/lib/auth/store';

// Teal/navy header bar — logo left, bell + user icons right.
// User icon behaviour:
//   guest       → login screen
//   rider       → rider account/profile
//   driver      → driver account (feed/history/earnings + settings sub-stack)

function BellIcon() {
  return <Text style={styles.iconText}>🔔</Text>;
}

function UserIcon() {
  return <Text style={styles.iconText}>👤</Text>;
}

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const session = useAuthStore((s) => s.session);

  function onBell() {
    router.push('/notifications' as never);
  }

  function onUser() {
    if (!session) {
      router.push('/(auth)/login');
      return;
    }
    if (session.persona === 'driver') {
      router.push('/(driver)/account' as never);
    } else {
      router.push('/(rider)/account' as never);
    }
  }

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={() => router.push('/(public)')} style={styles.logoArea}>
        <Text style={styles.logoMark}>🚖</Text>
        <Text style={styles.logoText}>Mauritian Rides</Text>
      </Pressable>

      <View style={styles.actions}>
        {/* Bell only shown when logged in — guests have no notifications */}
        {session ? (
          <Pressable onPress={onBell} testID="header-bell" style={styles.iconBtn}>
            <BellIcon />
          </Pressable>
        ) : null}
        <Pressable onPress={onUser} testID="header-user" style={styles.iconBtn}>
          <UserIcon />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: '#0a4843',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  logoArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoMark: {
    fontSize: 22,
  },
  logoText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    padding: 8,
  },
  iconText: {
    fontSize: 20,
    color: '#fff',
  },
});
