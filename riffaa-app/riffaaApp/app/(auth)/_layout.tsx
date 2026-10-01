import { Stack } from 'expo-router';

/** Auth group: shares the app backdrop, no native header. */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    />
  );
}
