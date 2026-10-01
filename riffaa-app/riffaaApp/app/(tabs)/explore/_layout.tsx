import { Stack } from 'expo-router';

export default function ExploreLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Scene must be transparent so the shared AppBackground shows through;
        // otherwise React Navigation paints it with the default (white) theme,
        // which is what made this tab stay light in dark mode.
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      {/* Explicitly lock index as the default landing screen */}
      <Stack.Screen name="index" />
      {/* Bind the dynamic profile template file */}
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
