import { Stack } from 'expo-router';

export default function GroupsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Transparent scenes so the shared AppBackground (and the floating tab
        // bar's blur) render correctly in dark mode instead of over white.
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
