import { Tabs } from 'expo-router';
import { FloatingTabBar } from '../../components/layout/FloatingTabBar';
import { translate } from '../../services/i18n';

function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
    >
      <Tabs.Screen name="home" options={{ title: translate('home') }} />
      <Tabs.Screen name="courses" options={{ title: translate('courses') }} />
      <Tabs.Screen name="groups" options={{ title: translate('groups') }} />
      <Tabs.Screen name="schedule" options={{ title: translate('schedule') }} />
      <Tabs.Screen name="profile" options={{ title: translate('profile') }} />
      {/* Reachable from Home/Profile; hidden from the bar. */}
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}

export default TabsLayout;
