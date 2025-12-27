import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import BookingFlowNavigator from "@/navigation/BookingFlowNavigator";
import ServiceEditorScreen from "@/screens/ServiceEditorScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { HeaderButton } from "@react-navigation/elements";
import { useTheme } from "@/hooks/useTheme";

export type RootStackParamList = {
  Main: undefined;
  BookingFlow: undefined;
  ServiceEditor: { serviceId?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const opaqueScreenOptions = useScreenOptions({ transparent: false });
  const { theme } = useTheme();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BookingFlow"
        component={BookingFlowNavigator}
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="ServiceEditor"
        component={ServiceEditorScreen}
        options={({ navigation, route }) => ({
          ...opaqueScreenOptions,
          presentation: "modal",
          headerTitle: route.params?.serviceId ? "Edit Service" : "New Service",
          headerLeft: () => (
            <HeaderButton onPress={() => navigation.goBack()}>
              Cancel
            </HeaderButton>
          ),
          headerRight: () => (
            <HeaderButton
              onPress={() => {}}
              tintColor={theme.accent}
            >
              Save
            </HeaderButton>
          ),
        })}
      />
    </Stack.Navigator>
  );
}
