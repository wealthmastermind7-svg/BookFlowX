import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CalendarScreen from "@/screens/CalendarScreen";
import AvailabilityEditorScreen from "@/screens/AvailabilityEditorScreen";
import BlockedSlotsScreen from "@/screens/BlockedSlotsScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type CalendarStackParamList = {
  CalendarMain: undefined;
  AvailabilityEditor: undefined;
  BlockedSlots: { date: string };
};

const Stack = createNativeStackNavigator<CalendarStackParamList>();

export default function CalendarStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="CalendarMain"
        component={CalendarScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="AvailabilityEditor"
        component={AvailabilityEditorScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="BlockedSlots"
        component={BlockedSlotsScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
