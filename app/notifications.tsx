import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/lib/auth/store';
import { useDriverMessages } from '@/features/driver/useDriverMessages';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const isDriver = session?.persona === 'driver';

  const { data: messages, isPending } = useDriverMessages(isDriver);

  const items = isDriver ? (messages ?? []) : [];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.hdr}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} testID="notif-back">
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>{t('notifications.title')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isPending ? (
          <ActivityIndicator color="#0bb8ad" style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <View style={styles.empty} testID="notif-empty">
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>{t('notifications.empty_heading')}</Text>
            <Text style={styles.emptySub}>{t('notifications.empty_sub')}</Text>
          </View>
        ) : (
          items.map((msg) => (
            <View key={msg.id} style={[styles.row, !msg.read && styles.rowUnread]}>
              <Text style={styles.rowSubject}>{msg.subject}</Text>
              <Text style={styles.rowBody} numberOfLines={2}>{msg.body}</Text>
              <Text style={styles.rowDate}>
                {new Date(msg.created_at).toLocaleDateString('en-MU', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0f14' },
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#243243',
  },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 20, color: '#0bb8ad' },
  title: { color: '#fff', fontSize: 16, fontWeight: '700' },
  content: { padding: 16, flexGrow: 1 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptySub: { color: '#7d8ea3', fontSize: 13, textAlign: 'center' },
  row: {
    backgroundColor: '#14202e',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#243243',
  },
  rowUnread: { borderColor: '#0bb8ad' },
  rowSubject: { color: '#fff', fontWeight: '600', marginBottom: 4 },
  rowBody: { color: '#7d8ea3', fontSize: 13, lineHeight: 18, marginBottom: 6 },
  rowDate: { color: '#4a5a6e', fontSize: 11 },
});
