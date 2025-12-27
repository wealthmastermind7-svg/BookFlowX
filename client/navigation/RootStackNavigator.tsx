import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import BookingFlowNavigator from "@/navigation/BookingFlowNavigator";
import OnboardingStackNavigator from "@/navigation/OnboardingStackNavigator";
import ServiceEditorScreen from "@/screens/ServiceEditorScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { HeaderButton } from "@react-navigation/elements";
import { useTheme } from "@/hooks/useTheme";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  BookingFlow: undefined;
  ServiceEditor: { serviceId?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const opaqueScreenOptions = useScreenOptions({ transparent: false });
  const { theme } = useTheme();
  const { showOnboarding, isLoading, completeOnboarding } = useOnboardingStatus();

  if (isLoading) {
    return null;
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {showOnboarding ? (
        <Stack.Screen
          name="Onboarding"
          component={() => (
            <OnboardingStackNavigator onComplete={completeOnboarding} />
          )}
          options={{ headerShown: false }}
        />
      ) : (
        <>
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
        </>
      )}
    </Stack.Navigator>
  );
}
