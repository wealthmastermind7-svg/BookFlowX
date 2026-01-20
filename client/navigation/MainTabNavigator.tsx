import React, { useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import DashboardStackNavigator from "@/navigation/DashboardStackNavigator";
import CalendarStackNavigator from "@/navigation/CalendarStackNavigator";
import ServicesStackNavigator from "@/navigation/ServicesStackNavigator";
import CustomersStackNavigator from "@/navigation/CustomersStackNavigator";
import SettingsStackNavigator from "@/navigation/SettingsStackNavigator";
import { useTheme } from "@/hooks/useTheme";
import { FloatingMascot } from "@/components/FloatingMascot";

export type MainTabParamList = {
  DashboardTab: undefined;
  CalendarTab: undefined;
  ServicesTab: undefined;
  CustomersTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_TO_SCREEN_NAME: Record<string, string> = {
  DashboardTab: "Dashboard",
  CalendarTab: "Calendar",
  ServicesTab: "Services",
  CustomersTab: "Customers",
  SettingsTab: "Settings",
};

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();
  const [currentTabName, setCurrentTabName] = useState("Dashboard");

  return (
    <View style={{ flex: 1 }}>
    <Tab.Navigator
      screenListeners={{
        state: (e) => {
          const state = e.data.state;
          if (state && state.routes && state.index !== undefined) {
            const routeName = state.routes[state.index]?.name;
            const screenName = TAB_TO_SCREEN_NAME[routeName] || "Dashboard";
            setCurrentTabName(screenName);
          }
        },
      }}
      initialRouteName="DashboardTab"
      screenOptions={{
        tabBarActiveTintColor: theme.tabIconSelected,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: theme.backgroundRoot,
          }),
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardStackNavigator}
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CalendarTab"
        component={CalendarStackNavigator}
        options={{
          title: "Calendar",
          tabBarIcon: ({ color, size }) => (
            <Feather name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ServicesTab"
        component={ServicesStackNavigator}
        options={{
          title: "Services",
          tabBarIcon: ({ color, size }) => (
            <Feather name="grid" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CustomersTab"
        component={CustomersStackNavigator}
        options={{
          title: "Customers",
          tabBarIcon: ({ color, size }) => (
            <Feather name="users" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStackNavigator}
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Feather name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
    <FloatingMascot screenName={currentTabName} />
    </View>
  );
}
