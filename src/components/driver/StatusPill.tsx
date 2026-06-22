import { View, Text } from 'react-native';

type PillVariant = 'missing' | 'pending' | 'approved' | 'rejected';

const STYLES: Record<PillVariant, { bg: string; text: string; label: string }> = {
  missing:  { bg: 'bg-coral-500/20',  text: 'text-coral-400',  label: 'Missing'  },
  pending:  { bg: 'bg-amber-500/20',  text: 'text-amber-400',  label: 'Pending'  },
  approved: { bg: 'bg-lagoon-500/20', text: 'text-lagoon-400', label: 'Approved' },
  rejected: { bg: 'bg-coral-500/20',  text: 'text-coral-400',  label: 'Rejected' },
};

interface StatusPillProps {
  variant: PillVariant;
  testID?: string;
}

export function StatusPill({ variant, testID }: StatusPillProps) {
  const s = STYLES[variant] ?? STYLES.missing;
  return (
    <View testID={testID} className={`self-start rounded-full px-2 py-0.5 ${s.bg}`}>
      <Text className={`text-[10px] font-bold uppercase tracking-wider ${s.text}`}>
        {s.label}
      </Text>
    </View>
  );
}
