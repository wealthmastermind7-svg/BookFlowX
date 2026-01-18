import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { api } from "@/lib/api";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PremiumProvider } from "@/contexts/PremiumContext";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, setFontsLoaded] = React.useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Load fonts
        await Font.loadAsync({
          "CormorantGaramond-Bold": "https://fonts.gstatic.com/s/cormorantgaramond/v16/co3bmZ5slBy45EDMId_3S6v7X_bdN_W5beV_W7Vf.ttf",
          "CormorantGaramond-Medium": "https://fonts.gstatic.com/s/cormorantgaramond/v16/co3bmZ5slBy45EDMId_3S6v7X_bdN_W5beV_W7Vf.ttf", // Fallback to bold if medium not easily found or same
          "CormorantGaramond-SemiBold": "https://fonts.gstatic.com/s/cormorantgaramond/v16/co3bmZ5slBy45EDMId_3S6v7X_bdN_W5beV_W7Vf.ttf",
          "Inter-Regular": "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZJhjp-EkQ.ttf",
          "Inter-SemiBold": "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZJhjp-EkQ.ttf",
          "Inter-Light": "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuEOTAZJhjp-EkQ.ttf",
          "JetBrainsMono-Regular": "https://fonts.gstatic.com/s/jetbrainsmono/v18/t64v84mS_S4oY6F9YI3PZ_W_V-3N9S0-9Lw.ttf",
        });

        // Load persisted business ID and business object
        const businessId = await api.loadBusinessId();
        if (businessId) {
          await api.getBusiness();
        }
      } catch (e) {
        console.warn(e);
      } finally {
        setFontsLoaded(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

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
