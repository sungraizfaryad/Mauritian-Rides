// Jest mock — react-native-webview is a native module, not available in the test runner.
import { View } from 'react-native';

export const WebView = View;
export default { WebView: View };
