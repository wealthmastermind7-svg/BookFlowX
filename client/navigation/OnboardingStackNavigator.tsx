import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import OnboardingScreen from "@/screens/onboarding/OnboardingScreen";

export type OnboardingStackParamList = {
  OnboardingFlow: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

interface OnboardingStackNavigatorProps {
  onComplete: () => void;
}

export default function OnboardingStackNavigator({
  onComplete,
}: OnboardingStackNavigatorProps) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="OnboardingFlow"
        component={() => <OnboardingScreen onComplete={onComplete} />}
      />
    </Stack.Navigator>
  );
}
