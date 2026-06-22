import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';

interface Props {
  url: string;
  title: string;
}

function ShareBtn({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 14, color: '#fff' }}>{label}</Text>
    </Pressable>
  );
}

export function ShareRow({ url, title }: Props) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const encoded = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  async function copy() {
    await Clipboard.setStringAsync(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <ShareBtn
        label="f"
        onPress={() =>
          Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${encoded}`)
        }
      />
      <ShareBtn
        label="𝕏"
        onPress={() =>
          Linking.openURL(
            `https://twitter.com/intent/tweet?url=${encoded}&text=${encodedTitle}`,
          )
        }
      />
      <Pressable
        onPress={copy}
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: copied ? '#0bb8ad' : 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          borderColor: copied ? '#0bb8ad' : 'rgba(255,255,255,0.18)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 13, color: '#fff' }}>🔗</Text>
      </Pressable>
      {copied && (
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
          {t('blog.copied_toast')}
        </Text>
      )}
    </View>
  );
}
