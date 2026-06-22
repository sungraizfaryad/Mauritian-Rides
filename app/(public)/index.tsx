import { View, Text, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function PublicHome() {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center bg-sand-50 px-6">
      <Text className="text-center text-3xl font-bold text-lagoon-500">
        {t('public.hero_title')}
      </Text>
      <Link href="/(auth)/login" asChild>
        <Pressable className="mt-10 rounded-full bg-lagoon-500 px-8 py-4">
          <Text className="text-lg font-semibold text-white">
            {t('public.hero_cta')}
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}
