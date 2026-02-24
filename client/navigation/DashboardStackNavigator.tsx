import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text } from "react-native";
import DashboardScreen from "@/screens/DashboardScreen";
import AIAssistantScreen from "@/screens/AIAssistantScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { HeaderButton } from "@react-navigation/elements";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useTheme } from "@/hooks/useTheme";

export type DashboardStackParamList = {
  Dashboard: undefined;
  AIAssistant: undefined;
};

const Stack = createNativeStackNavigator<DashboardStackParamList>();

export default function DashboardStackNavigator() {
  const screenOptions = useScreenOptions();
  const { theme } = useTheme();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="AIAssistant"
        component={AIAssistantScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
