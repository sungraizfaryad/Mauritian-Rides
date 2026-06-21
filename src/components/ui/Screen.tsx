import type { ReactNode } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  testID?: string;
  /** Extra Tailwind classes for the inner content container. */
  contentClassName?: string;
}

export function Screen({ children, scroll = false, testID, contentClassName = '' }: ScreenProps) {
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

  return <SafeAreaView className="flex-1 bg-basalt-900">{inner}</SafeAreaView>;
}
