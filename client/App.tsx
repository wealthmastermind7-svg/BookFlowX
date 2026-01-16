import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { api } from "@/lib/api";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PremiumProvider } from "@/contexts/PremiumContext";

export default function App() {
  useEffect(() => {
    // Load persisted business ID and business object on app startup
    (async () => {
      try {
        const businessId = await api.loadBusinessId();
        if (businessId) {
          // Ensure business object is loaded with all data (slug, etc)
          await api.getBusiness();
        }
      } catch (error) {
        console.error("Error loading app state:", error);
      }
    })();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <GestureHandlerRootView style={styles.root}>
            <KeyboardProvider>
              <PremiumProvider>
                <NavigationContainer>
                  <RootStackNavigator />
                </NavigationContainer>
              </PremiumProvider>
              <StatusBar style="auto" />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
