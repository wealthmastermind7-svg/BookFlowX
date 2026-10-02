import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import RentalsScreen from "@/screens/RentalsScreen";
import RentalDetailScreen from "@/screens/RentalDetailScreen";
import InspectionReportScreen from "@/screens/InspectionReportScreen";

export type RentalsStackParamList = {
  RentalsMain: undefined;
  RentalDetail: { propertyId: string };
  InspectionReport: { propertyId: string; reportId?: string; type?: "move_in" | "routine" | "move_out"; date?: string };
};
const Stack = createNativeStackNavigator<RentalsStackParamList>();
export default function RentalsStackNavigator() {
  const options = useScreenOptions();
  return <Stack.Navigator screenOptions={options}>
    <Stack.Screen name="RentalsMain" component={RentalsScreen} options={{ headerShown: false }} />
    <Stack.Screen name="RentalDetail" component={RentalDetailScreen} options={{ headerTitle: "Property" }} />
    <Stack.Screen name="InspectionReport" component={InspectionReportScreen} options={{ headerTitle: "Inspection report" }} />
  </Stack.Navigator>;
}