import { View, Text } from 'react-native';

interface Section {
  heading?: string;
  paragraphs?: string[];
  listItems?: string[];
}

interface Props {
  lead?: string;
  sections: Section[];
}

export function LegalBody({ lead, sections }: Props) {
  return (
    <View style={{ backgroundColor: '#faf6ee', paddingHorizontal: 20, paddingVertical: 32 }}>
      {lead ? (
        <View style={{ borderLeftWidth: 3, borderLeftColor: '#0bb8ad', backgroundColor: '#f4ecd8', borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <Text style={{ fontSize: 16, color: '#0a0f14', lineHeight: 26 }}>{lead}</Text>
        </View>
      ) : null}
      {sections.map((s, i) => (
        <View key={i}>
          {s.heading ? (
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#0a0f14', marginTop: i > 0 ? 28 : 0, marginBottom: 10, paddingTop: i > 0 ? 20 : 0, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#e9dcb8' }}>
              {s.heading}
            </Text>
          ) : null}
          {s.paragraphs?.map((p, j) => (
            <Text key={j} style={{ fontSize: 15, color: '#4a5a6e', lineHeight: 25, marginBottom: 14 }}>{p}</Text>
          ))}
          {s.listItems?.map((item, j) => (
            <View key={j} style={{ flexDirection: 'row', marginBottom: 8 }}>
              <Text style={{ color: '#0bb8ad', marginRight: 8, marginTop: 1 }}>•</Text>
              <Text style={{ flex: 1, fontSize: 15, color: '#4a5a6e', lineHeight: 24 }}>{item}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
