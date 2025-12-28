import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SettingsScreen from "@/screens/SettingsScreen";
import SharePreviewScreen from "@/screens/SharePreviewScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type SettingsStackParamList = {
  SettingsMain: undefined;
  SharePreview: {
    businessName: string;
    bookingUrl: string;
    slug: string;
  };
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{
          headerTitle: "Settings",
        }}
      />
      <Stack.Screen
        name="SharePreview"
        component={SharePreviewScreen}
        options={{
          headerTitle: "Share Preview",
        }}
      />
    </Stack.Navigator>
  );
}
