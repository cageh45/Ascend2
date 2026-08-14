import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen from '../screens/HomeScreen';
import SkillTreeScreen from '../screens/SkillTreeScreen';
import RaidScreen from '../screens/RaidScreen';
import ProfileScreen from '../screens/ProfileScreen';
import FriendsScreen from '../screens/FriendsScreen';
import AnimatedTabBar from './AnimatedTabBar';
import { MainTabParamList } from './types';
import { FEATURES } from '../config/features';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ title: 'Home' }}
      />

      <Tab.Screen
        name="SkillsTab"
        component={SkillTreeScreen}
        options={{ title: 'Skills' }}
      />

      <Tab.Screen
        name="RaidTab"
        component={RaidScreen}
        options={{ title: 'Raid' }}
      />

      {FEATURES.multiplayer && (
        <Tab.Screen
          name="FriendsTab"
          component={FriendsScreen}
          options={{ title: 'Friends' }}
        />
      )}

      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}
