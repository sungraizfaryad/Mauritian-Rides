import { View } from 'react-native';

interface Props {
  step: 1 | 2 | 3;
  total?: number;
}

// Rectangular segment progress bar matching page-book.css exactly.
// Each segment: 24×4px, border-radius 2, gap 6.
// inactive=sand, active=coral, done=lagoon.
export function StepDots({ step, total = 2 }: Props) {
  const segments = Array.from({ length: total }, (_, i) => i + 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
      {segments.map((n) => {
        const color =
          n < step ? '#0bb8ad' :
          n === step ? '#ee5a30' :
          '#e8dcc8';
        return (
          <View
            key={n}
            style={{ width: 24, height: 4, borderRadius: 2, backgroundColor: color }}
          />
        );
      })}
    </View>
  );
}
