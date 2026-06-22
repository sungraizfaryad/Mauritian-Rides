import { ScrollView, Pressable, Text, View } from 'react-native';
import { LOCATIONS, type Location } from '@/constants/locations';

interface Props {
  onSelect: (pickup: Location, dropoff: Location) => void;
}

const AIRPORT = 'SSR International Airport';

const CHIPS: Array<{ label: string; dropoff: string }> = [
  { label: 'Airport → Le Touessrok', dropoff: 'Belle Mare' },
  { label: 'Airport → Saint Géran', dropoff: 'One&Only Le Saint Géran' },
  { label: 'Airport → LUX* Grand Baie', dropoff: 'Grand Baie' },
  { label: 'Airport → Constance', dropoff: 'Constance Belle Mare Plage' },
  { label: 'Airport → Paradis', dropoff: 'Le Morne' },
];

function findLocation(name: string): Location | undefined {
  return LOCATIONS.find((l) => l.name.toLowerCase().includes(name.toLowerCase()));
}

export function QuickPickChip({ onSelect }: Props) {
  const airport = findLocation(AIRPORT);
  if (!airport) return null;

  const chips = CHIPS.map((c) => ({ ...c, dropoffLoc: findLocation(c.dropoff) }))
    .filter((c) => c.dropoffLoc != null);

  if (!chips.length) return null;

  return (
    <View style={{ marginTop: 10, marginBottom: 4 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
        {chips.map((c) => (
          <Pressable
            key={c.label}
            onPress={() => onSelect(airport, c.dropoffLoc!)}
            style={({ pressed }) => ({
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: '#0bb8ad',
              backgroundColor: pressed ? '#e6f7f6' : '#fff',
            })}
          >
            <Text style={{ fontSize: 12, color: '#0a4843', fontWeight: '500' }}>{c.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
