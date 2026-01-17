import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CustomersScreen from "@/screens/CustomersScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type CustomersStackParamList = {
  CustomersList: undefined;
};

const Stack = createNativeStackNavigator<CustomersStackParamList>();

export default function CustomersStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator 
      screenOptions={{
        ...screenOptions,
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="CustomersList"
        component={CustomersScreen}
        options={{
          headerTitle: "Customers",
        }}
      />
    </Stack.Navigator>
  );
}
