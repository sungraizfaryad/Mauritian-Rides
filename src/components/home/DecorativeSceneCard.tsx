import { View, Text, Animated } from 'react-native';
import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from './GlassCard';

// Native approximation of the website's 3D hero scene.
// Layered 2D absolute Views — island oval, mountain peak, sun disc,
// two floating location pins (animated), floating fare + driver cards.
export function DecorativeSceneCard() {
  const [pin1] = useState(() => new Animated.Value(0));
  const [pin2] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const a1 = Animated.loop(
      Animated.sequence([
        Animated.timing(pin1, { toValue: -6, duration: 1200, useNativeDriver: true }),
        Animated.timing(pin1, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ]),
    );
    const a2 = Animated.loop(
      Animated.sequence([
        Animated.timing(pin2, { toValue: -4, duration: 900, useNativeDriver: true }),
        Animated.timing(pin2, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    a1.start();
    a2.start();
    return () => { a1.stop(); a2.stop(); };
  }, [pin1, pin2]);

  return (
    <View style={{ height: 280, position: 'relative', marginTop: 8 }}>
      {/* Sun disc */}
      <LinearGradient
        colors={['rgba(255,255,255,0.9)', 'rgba(248,148,40,0.3)', 'transparent']}
        style={{
          position: 'absolute', top: 10, right: 30,
          width: 80, height: 80, borderRadius: 40,
        }}
      />

      {/* Island — teal/sand oval */}
      <LinearGradient
        colors={['#0bb8ad', '#9ee8e0', '#f4ecd8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute', top: 60, left: '10%',
          width: '80%', height: 130, borderRadius: 100,
        }}
      />

      {/* Mountain peak */}
      <View
        style={{
          position: 'absolute', top: 52, left: '44%',
          width: 0, height: 0,
          borderLeftWidth: 24, borderRightWidth: 24, borderBottomWidth: 48,
          borderLeftColor: 'transparent', borderRightColor: 'transparent',
          borderBottomColor: '#243243',
        }}
      />

      {/* Location pin 1 (pickup) */}
      <Animated.View
        style={{
          position: 'absolute', top: 50, left: '25%',
          transform: [{ translateY: pin1 }],
        }}
      >
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#ee5a30', borderWidth: 2, borderColor: '#fff' }} />
          <View style={{ width: 2, height: 12, backgroundColor: '#ee5a30' }} />
        </View>
      </Animated.View>

      {/* Location pin 2 (dropoff) */}
      <Animated.View
        style={{
          position: 'absolute', top: 70, right: '20%',
          transform: [{ translateY: pin2 }],
        }}
      >
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#0bb8ad', borderWidth: 2, borderColor: '#fff' }} />
          <View style={{ width: 2, height: 12, backgroundColor: '#0bb8ad' }} />
        </View>
      </Animated.View>

      {/* Floating fare card */}
      <GlassCard
        style={{
          position: 'absolute', bottom: 10, left: 12,
          width: 160, transform: [{ rotate: '-4deg' }],
        }}
      >
        <View className="flex-row items-center mb-2 gap-2">
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ee5a30' }} />
          <View>
            <Text style={{ fontSize: 9, color: '#7d8ea3' }}>Pickup</Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#0f1720' }}>SSR Airport</Text>
          </View>
        </View>
        <View className="flex-row items-center mb-2 gap-2">
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#0bb8ad' }} />
          <View>
            <Text style={{ fontSize: 9, color: '#7d8ea3' }}>Dropoff</Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#0f1720' }}>Grand Baie</Text>
          </View>
        </View>
        <View style={{ borderTopWidth: 1, borderTopColor: '#e9dcb8', paddingTop: 6 }}>
          <Text style={{ fontSize: 9, color: '#7d8ea3', textTransform: 'uppercase', letterSpacing: 0.8 }}>Estimated</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f1720' }}>
            <Text style={{ fontSize: 11 }}>Rs </Text>1,450
          </Text>
        </View>
      </GlassCard>

      {/* Floating driver card */}
      <GlassCard
        style={{
          position: 'absolute', bottom: 30, right: 12,
          width: 155, transform: [{ rotate: '3deg' }],
        }}
      >
        <View className="flex-row items-center gap-2 mb-2">
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#0bb8ad' }} />
          <View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f1720' }}>Jean-Marc R.</Text>
            <Text style={{ fontSize: 10, color: '#7d8ea3' }}>★★★★★ · 842 trips</Text>
          </View>
        </View>
        <View className="flex-row justify-between">
          <Text style={{ fontSize: 10, color: '#7d8ea3' }}>TX 4528</Text>
          <Text style={{ fontSize: 10, color: '#089890', fontWeight: '600' }}>5 min away</Text>
        </View>
      </GlassCard>
    </View>
  );
}
