import { View, Text, Pressable, Animated } from 'react-native';
import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  heading: string;
  subheading: string;
  bookLabel: string;
  driveLabel: string;
  onBook: () => void;
  onDrive: () => void;
}

// CTA section matching the website's warm dark gradient band.
// Base: deep plum→rust→sunset; floating orb Views; TAXI badge with blink.
export function CTABand({ heading, subheading, bookLabel, driveLabel, onBook, onDrive }: Props) {
  const [blink] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [blink]);

  return (
    <LinearGradient
      colors={['#2a1630', '#7a2240', '#ee5a30', '#f89428']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ overflow: 'hidden' }}
    >
      {/* Decorative orbs */}
      <View
        style={{
          position: 'absolute', top: -30, left: -30,
          width: 120, height: 120, borderRadius: 60,
          backgroundColor: 'rgba(238,90,48,0.25)',
        }}
      />
      <View
        style={{
          position: 'absolute', top: 20, right: -20,
          width: 80, height: 80, borderRadius: 40,
          backgroundColor: 'rgba(248,148,40,0.2)',
        }}
      />
      <View
        style={{
          position: 'absolute', top: '50%', left: 10,
          width: 50, height: 50, borderRadius: 25,
          backgroundColor: 'rgba(224,57,94,0.15)',
        }}
      />

      {/* Floating stat cards */}
      <View
        className="absolute"
        style={{ top: 20, right: 20 }}
      >
        <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>Verified drivers</Text>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>1,240+</Text>
        </View>
      </View>

      <View className="px-6 pt-16 pb-12 items-center">
        {/* TAXI badge */}
        <LinearGradient
          colors={['#f89428', '#ffb24a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', marginBottom: 24, alignSelf: 'center' }}
        >
          <Animated.View
            style={{
              width: 7, height: 7, borderRadius: 3.5,
              backgroundColor: '#2a1630', marginRight: 7,
              opacity: blink,
            }}
          />
          <Text style={{ color: '#2a1630', fontWeight: '800', fontSize: 13, letterSpacing: 2 }}>
            TAXI
          </Text>
        </LinearGradient>

        <Text
          className="text-3xl text-white text-center font-bold mb-3"
          style={{ lineHeight: 36 }}
        >
          {heading}
        </Text>
        <Text className="text-sm text-center mb-8" style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 20 }}>
          {subheading}
        </Text>

        <View className="gap-3 w-full">
          <Pressable
            onPress={onBook}
            className="rounded-pill py-4 items-center"
            style={{ backgroundColor: '#0f1720' }}
          >
            <Text className="font-bold text-white text-base">{bookLabel}</Text>
          </Pressable>
          <Pressable
            onPress={onDrive}
            className="rounded-pill py-4 items-center border border-white"
            style={{ backgroundColor: 'transparent' }}
          >
            <Text className="font-semibold text-white text-base">{driveLabel}</Text>
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}
