import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ServicesScreen from "@/screens/ServicesScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type ServicesStackParamList = {
  ServicesList: undefined;
};

const Stack = createNativeStackNavigator<ServicesStackParamList>();

export default function ServicesStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="ServicesList"
        component={ServicesScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
