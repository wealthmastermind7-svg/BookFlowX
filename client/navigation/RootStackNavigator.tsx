import React, { useState, useEffect, useCallback } from "react";
import { createNativeStackNavigator, NativeStackScreenProps } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import BookingFlowNavigator from "@/navigation/BookingFlowNavigator";
import ServiceEditorScreen from "@/screens/ServiceEditorScreen";
import QuickSaleScreen from "@/screens/QuickSaleScreen";
import VoiceBookingScreen from "@/screens/VoiceBookingScreen";
import AgentTrainingScreen from "@/screens/AgentTrainingScreen";
import { VoiceAgentPaywall } from "@/components/VoiceAgentPaywall";
import OnboardingScreen, { checkOnboardingComplete } from "@/screens/OnboardingScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { HeaderButton } from "@react-navigation/elements";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { PaywallModal } from "@/components/PaywallModal";
import { usePremium } from "@/contexts/PremiumContext";

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  BookingFlow: undefined;
  ServiceEditor: { serviceId?: string };
  QuickSale: undefined;
  VoiceBooking: { businessSlug: string; businessName?: string };
  AgentTraining: { businessId: string; businessName: string };
  VoiceAgentPaywall: undefined;
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

function PaywallContainer() {
  const { paywallVisible, paywallType, hidePaywall, handleUpgrade, isLoading, offerings, restoreSubscription } = usePremium();
  return (
    <PaywallModal
      visible={paywallVisible}
      type={paywallType}
      onClose={hidePaywall}
      onUpgrade={handleUpgrade}
      isLoading={isLoading}
      offerings={offerings}
      onRestore={restoreSubscription}
    />
  );
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
    <>
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
        options={{
          headerShown: false,
          presentation: "modal",
        }}
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
              <Text>Close</Text>
            </HeaderButton>
          ),
        })}
      />
      <Stack.Screen
        name="VoiceBooking"
        component={VoiceBookingScreen}
        options={({ navigation }) => ({
          ...opaqueScreenOptions,
          presentation: "modal",
          headerTitle: "Voice Booking",
          headerLeft: () => (
            <HeaderButton onPress={() => navigation.goBack()}>
              <Text>Close</Text>
            </HeaderButton>
          ),
        })}
      />
      <Stack.Screen
        name="AgentTraining"
        component={AgentTrainingScreen}
        options={({ navigation }) => ({
          ...opaqueScreenOptions,
          headerTitle: "Train Agent",
          headerLeft: () => (
            <HeaderButton onPress={() => navigation.goBack()}>
              <Text style={{ color: theme.text }}>Back</Text>
            </HeaderButton>
          ),
        })}
      />
      <Stack.Screen
        name="VoiceAgentPaywall"
        component={VoiceAgentPaywall as any}
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
        }}
      />
    </Stack.Navigator>
    <PaywallContainer />
    </>
  );
}

const localStyles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
