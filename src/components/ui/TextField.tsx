import { View, Text, TextInput, type TextInputProps } from 'react-native';

interface TextFieldProps extends Omit<TextInputProps, 'className'> {
  label: string;
  error?: string;
  testID?: string;
}

export function TextField({ label, error, testID, ...inputProps }: TextFieldProps) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-basalt-300">{label}</Text>
      <TextInput
        testID={testID}
        placeholderTextColor="#666666"
        className={`h-12 rounded-md border bg-basalt-700 px-4 text-base text-white ${
          error ? 'border-danger' : 'border-basalt-500'
        }`}
        {...inputProps}
      />
      {error ? <Text className="mt-1 text-sm text-danger">{error}</Text> : null}
    </View>
  );
}
