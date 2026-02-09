import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SelectServiceScreen from "@/screens/booking/SelectServiceScreen";
import SelectTimeScreen from "@/screens/booking/SelectTimeScreen";
import CheckoutScreen from "@/screens/booking/CheckoutScreen";
import ConfirmationScreen from "@/screens/booking/ConfirmationScreen";

export type BookingFlowParamList = {
  SelectService: undefined;
  SelectTime: { serviceId: string };
  Checkout: { serviceId: string; timeSlotId: string };
  Confirmation: { bookingId: string; paymentStatus?: string; requiresPayment?: boolean };
};

const Stack = createNativeStackNavigator<BookingFlowParamList>();

export default function BookingFlowNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="SelectService" component={SelectServiceScreen} />
      <Stack.Screen name="SelectTime" component={SelectTimeScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen
        name="Confirmation"
        component={ConfirmationScreen}
        options={{
          gestureEnabled: false,
          animation: "fade",
        }}
      />
    </Stack.Navigator>
  );
}
