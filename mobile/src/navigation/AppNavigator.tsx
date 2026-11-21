import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getAuthToken, onAuthChange } from '../api/client';

import { GlassTabBar } from '../components/navigation/GlassTabBar';
import { DashboardScreen } from '../screens/DashboardScreen';
import { DailyEntryScreen } from '../screens/DailyEntryScreen';
import { RecordsScreen } from '../screens/RecordsScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AuthScreen } from '../screens/AuthScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="DashboardTab" component={DashboardScreen} />
      <Tab.Screen name="RecordsTab" component={RecordsScreen} />
      <Tab.Screen name="DailyEntryTab" component={DailyEntryScreen} />
      <Tab.Screen name="ReportsTab" component={ReportsScreen} />
      <Tab.Screen name="SettingsTab" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export const AppNavigator: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!getAuthToken());

  useEffect(() => {
    const unsubscribe = onAuthChange((token) => {
      setIsAuthenticated(!!token);
    });
    return unsubscribe;
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth">
            {(props) => (
              <AuthScreen
                {...props}
                onLoginSuccess={() => setIsAuthenticated(true)}
              />
            )}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen
              name="DailyEntry"
              component={DailyEntryScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen name="Calendar" component={CalendarScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
