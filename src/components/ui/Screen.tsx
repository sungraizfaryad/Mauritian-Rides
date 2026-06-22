import type { ReactNode } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  testID?: string;
  /** Extra Tailwind classes for the inner content container. */
  contentClassName?: string;
  /** Force dark navy background (driver screens). Default is sand-50. */
  dark?: boolean;
}

export function Screen({ children, scroll = false, testID, contentClassName = '', dark = false }: ScreenProps) {
  const inner = scroll ? (
    <ScrollView
      testID={testID}
      className="flex-1"
      contentContainerClassName={`px-6 py-4 ${contentClassName}`}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View testID={testID} className={`flex-1 px-6 py-4 ${contentClassName}`}>
      {children}
    </View>
  );

  return (
    <SafeAreaView className={`flex-1 ${dark ? 'bg-basalt-950' : 'bg-sand-50'}`}>
      {inner}
    </SafeAreaView>
  );
}
