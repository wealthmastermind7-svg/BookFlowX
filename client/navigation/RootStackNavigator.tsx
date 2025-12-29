import React, { useState, useEffect, useCallback } from "react";
import { createNativeStackNavigator, NativeStackScreenProps } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import BookingFlowNavigator from "@/navigation/BookingFlowNavigator";
import ServiceEditorScreen from "@/screens/ServiceEditorScreen";
import QuickSaleScreen from "@/screens/QuickSaleScreen";
import OnboardingScreen, { checkOnboardingComplete } from "@/screens/OnboardingScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { HeaderButton } from "@react-navigation/elements";
import { useTheme } from "@/hooks/useTheme";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  BookingFlow: undefined;
  ServiceEditor: { serviceId?: string };
  QuickSale: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function OnboardingScreenWrapper() {
  const navigation = useNavigation<NativeStackScreenProps<RootStackParamList, "Onboarding">["navigation"]>();
  
  const handleComplete = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: "Main" }],
    });
  }, [navigation]);

  return <OnboardingScreen onComplete={handleComplete} />;
}

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const opaqueScreenOptions = useScreenOptions({ transparent: false });
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    async function checkOnboarding() {
      const complete = await checkOnboardingComplete();
      setShowOnboarding(!complete);
      setIsLoading(false);
    }
    checkOnboarding();
  }, []);

  if (isLoading) {
    return (
      <View style={[localStyles.loading, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={screenOptions} initialRouteName={showOnboarding ? "Onboarding" : "Main"}>
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreenWrapper}
        options={{ headerShown: false }}
      />
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
      <Stack.Screen
        name="QuickSale"
        component={QuickSaleScreen}
        options={({ navigation }) => ({
          ...opaqueScreenOptions,
          presentation: "modal",
          headerTitle: "Quick Sale",
          headerLeft: () => (
            <HeaderButton onPress={() => navigation.goBack()}>
              Close
            </HeaderButton>
          ),
        })}
      />
    </Stack.Navigator>
  );
}

const localStyles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
