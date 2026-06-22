import { Pressable, Text } from 'react-native';

interface Props {
  label: string;
  active: boolean;
  onPress: () => void;
}

export function CategoryChip({ label, active, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? '#0bb8ad' : 'rgba(11,184,173,0.35)',
        backgroundColor: active ? '#0bb8ad' : 'transparent',
        marginRight: 8,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: active ? '#fff' : '#0bb8ad',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
