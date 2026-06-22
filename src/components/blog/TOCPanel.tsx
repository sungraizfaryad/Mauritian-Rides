import { useState } from 'react';
import { Animated, FlatList, Pressable, Text, View } from 'react-native';

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

interface Props {
  items: TOCItem[];
  activeId?: string;
  onItemPress?: (id: string) => void;
}

export function TOCPanel({ items, activeId, onItemPress }: Props) {
  const [open, setOpen] = useState(true);
  const [anim] = useState(() => new Animated.Value(1));

  function toggle() {
    Animated.timing(anim, {
      toValue: open ? 0 : 1,
      duration: 220,
      useNativeDriver: false,
    }).start();
    setOpen(!open);
  }

  if (!items.length) return null;

  const maxHeight = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 400] });

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(10,15,20,0.12)',
        backgroundColor: '#faf6ee',
        overflow: 'hidden',
      }}
    >
      {/* header row */}
      <Pressable
        onPress={toggle}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: open ? 1 : 0,
          borderBottomColor: 'rgba(10,15,20,0.08)',
        }}
      >
        <Text
          style={{
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 1.3,
            textTransform: 'uppercase',
            color: '#7d8ea3',
          }}
        >
          Contents
        </Text>
        <Text style={{ fontSize: 14, color: '#7d8ea3' }}>{open ? '−' : '+'}</Text>
      </Pressable>

      <Animated.View style={{ maxHeight, overflow: 'hidden' }}>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          style={{ paddingVertical: 4 }}
          renderItem={({ item, index }) => {
            const active = item.id === activeId;
            const isH3 = item.level === 3;
            return (
              <Pressable
                onPress={() => onItemPress?.(item.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  paddingHorizontal: 16,
                  paddingVertical: isH3 ? 6 : 8,
                  paddingLeft: isH3 ? 28 : 16,
                  backgroundColor: active ? 'rgba(11,184,173,0.08)' : 'transparent',
                  borderRadius: 8,
                  marginHorizontal: 4,
                  gap: 8,
                }}
              >
                {!isH3 && (
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: active ? '#0bb8ad' : 'rgba(11,184,173,0.1)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 1,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 9,
                        fontWeight: '700',
                        color: active ? '#fff' : '#0bb8ad',
                      }}
                    >
                      {index + 1}
                    </Text>
                  </View>
                )}
                <Text
                  style={{
                    flex: 1,
                    fontSize: isH3 ? 12 : 13,
                    color: active ? '#0bb8ad' : '#4a5a6e',
                    fontWeight: active ? '600' : '400',
                    lineHeight: 18,
                  }}
                >
                  {item.text}
                </Text>
              </Pressable>
            );
          }}
        />
      </Animated.View>
    </View>
  );
}
