import { View, type ViewProps } from 'react-native';

interface Props extends ViewProps {
  children: React.ReactNode;
}

// Reusable glass-panel card — white at 70% opacity, subtle border.
export function GlassCard({ children, style, ...rest }: Props) {
  return (
    <View
      style={[
        {
          backgroundColor: 'rgba(255,255,255,0.7)',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.6)',
          padding: 16,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
