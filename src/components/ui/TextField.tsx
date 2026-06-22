import { View, Text, TextInput, type TextInputProps } from 'react-native';

interface TextFieldProps extends Omit<TextInputProps, 'className'> {
  label: string;
  error?: string;
  testID?: string;
}

export function TextField({ label, error, testID, ...inputProps }: TextFieldProps) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-ink-600">{label}</Text>
      <TextInput
        testID={testID}
        placeholderTextColor="#7d8ea3"
        className={`h-12 rounded-r-md border bg-sand-50 px-4 text-base text-basalt-950 ${
          error ? 'border-danger' : 'border-sand-200'
        }`}
        {...inputProps}
      />
      {error ? <Text className="mt-1 text-sm text-danger">{error}</Text> : null}
    </View>
  );
}
