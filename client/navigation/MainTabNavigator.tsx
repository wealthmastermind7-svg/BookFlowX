import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DashboardStackNavigator from "@/navigation/DashboardStackNavigator";
import CalendarStackNavigator from "@/navigation/CalendarStackNavigator";
import ServicesStackNavigator from "@/navigation/ServicesStackNavigator";
import CustomersStackNavigator from "@/navigation/CustomersStackNavigator";
import SettingsStackNavigator from "@/navigation/SettingsStackNavigator";
import { useTheme } from "@/hooks/useTheme";

export type MainTabParamList = {
  DashboardTab: undefined;
  CalendarTab: undefined;
  ServicesTab: undefined;
  CustomersTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
    <Tab.Navigator
      initialRouteName="DashboardTab"
      screenOptions={{
        tabBarActiveTintColor: theme.tabIconSelected,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.OS === "ios" ? "transparent" : "#FAF7F2",
          borderTopWidth: 1,
          borderTopColor: "#E8DDD0",
          elevation: 0,
          height: 66 + Math.max(insets.bottom, 8),
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint="light"
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
        listeners={({ navigation }) => ({
          tabPress: (event) => {
            event.preventDefault();
            navigation.getParent()?.navigate("BookingFlow");
          },
        })}
        options={{
           title: "New",
           tabBarAccessibilityLabel: "Create a new viewing",
           tabBarIcon: () => (
              <View style={styles.newButton}><Feather name="plus" size={26} color="#FFFFFF" /></View>
          ),
        }}
      />
      <Tab.Screen
        name="CustomersTab"
        component={CustomersStackNavigator}
        options={{
           title: "Clients",
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
    </View>
  );
}

const styles = StyleSheet.create({
  newButton: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: "#C17F3E",
    alignItems: "center", justifyContent: "center", marginTop: -20,
    borderWidth: 4, borderColor: "#FAF7F2",
  },
});
