import { View, Text, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function PublicHome() {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center bg-basalt-900 px-6">
      <Text className="text-lagoon-300 text-3xl font-bold text-center">
        {t('public.hero_title')}
      </Text>
      <Link href="/(auth)/login" asChild>
        <Pressable className="mt-10 bg-amber-500 px-8 py-4 rounded-md">
          <Text className="text-basalt-900 text-lg font-semibold">
            {t('public.hero_cta')}
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}
