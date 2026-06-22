import { useState } from 'react';
import { Text, View } from 'react-native';

// react-native-webview is a native module that requires a dev client rebuild.
// We import it lazily so the archive works in Expo Go / before rebuild.
let WebView: React.ComponentType<{
  source: { html: string };
  scrollEnabled: boolean;
  onMessage: (e: { nativeEvent: { data: string } }) => void;
  injectedJavaScript: string;
  style: object;
  originWhitelist: string[];
  onError: () => void;
}> | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  WebView = require('react-native-webview').WebView;
} catch {
  WebView = null;
}

const INJECTED_CSS = `
  body {
    font-family: -apple-system, 'Manrope', sans-serif;
    font-size: 16px;
    line-height: 1.75;
    color: #243243;
    margin: 0;
    padding: 0 16px 40px;
    background: #faf6ee;
    word-break: break-word;
  }
  h2 {
    font-size: 22px;
    font-weight: 700;
    color: #0f1720;
    margin: 32px 0 12px;
    line-height: 1.25;
  }
  h3 {
    font-size: 17px;
    font-weight: 700;
    color: #0f1720;
    margin: 24px 0 10px;
  }
  p { margin: 0 0 18px; }
  ul, ol { margin: 0 0 18px 20px; padding: 0; }
  li { margin-bottom: 6px; }
  strong { color: #0f1720; }
  a { color: #0bb8ad; text-decoration: none; }
  img { max-width: 100%; height: auto; border-radius: 12px; display: block; margin: 16px 0; }
  figure { margin: 24px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 8px 10px; border: 1px solid rgba(10,15,20,0.12); text-align: left; }
  th { background: #182330; color: #fff; font-weight: 600; }
  tr:nth-child(even) td { background: rgba(0,0,0,0.025); }
  blockquote { margin: 24px 0; padding: 12px 16px; border-left: 3px solid #0bb8ad; color: #4a5a6e; }
  hr { border: none; border-top: 1px solid rgba(10,15,20,0.12); margin: 32px 0; }
`;

const HEIGHT_SCRIPT = `
  (function() {
    function postHeight() {
      window.ReactNativeWebView.postMessage(String(document.body.scrollHeight));
    }
    postHeight();
    setTimeout(postHeight, 500);
    setTimeout(postHeight, 1500);
  })();
  true;
`;

function buildHtml(content: string) {
  return `<!DOCTYPE html><html><head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <style>${INJECTED_CSS}</style>
  </head><body>${content}</body></html>`;
}

interface Props {
  content: string;
}

export function ArticleWebView({ content }: Props) {
  // initial height estimate so the ScrollView reserves space immediately
  const estimate = Math.max(600, Math.round(content.length / 5));
  const [height, setHeight] = useState(estimate);
  const [error, setError] = useState(false);

  if (!WebView) {
    // fallback until dev client is rebuilt with the native module
    return (
      <View
        style={{
          margin: 16,
          padding: 20,
          borderRadius: 12,
          backgroundColor: '#f4ecd8',
          borderWidth: 1,
          borderColor: 'rgba(10,15,20,0.12)',
        }}
      >
        <Text style={{ fontSize: 13, color: '#7d8ea3', textAlign: 'center' }}>
          Article content requires a dev client rebuild.
        </Text>
        <Text style={{ fontSize: 11, color: '#a8b5c4', textAlign: 'center', marginTop: 4 }}>
          Run: npx expo run:ios / run:android
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ margin: 16, padding: 16, borderRadius: 12, backgroundColor: '#f4ecd8' }}>
        <Text style={{ fontSize: 13, color: '#7d8ea3', textAlign: 'center' }}>
          Could not load article content.
        </Text>
      </View>
    );
  }

  const WV = WebView;
  return (
    <WV
      source={{ html: buildHtml(content) }}
      scrollEnabled={false}
      onMessage={(e) => {
        const h = Number(e.nativeEvent.data);
        if (h > 100) setHeight(h);
      }}
      injectedJavaScript={HEIGHT_SCRIPT}
      style={{ width: '100%', height }}
      originWhitelist={['*']}
      onError={() => setError(true)}
    />
  );
}
