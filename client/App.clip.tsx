import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import { displayOverlay } from "react-native-app-clip";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import AppClipScreen from "@/screens/AppClipScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";

SplashScreen.preventAutoHideAsync();

export default function AppClip() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [businessSlug, setBusinessSlug] = useState<string | undefined>();
  const [ownerToken, setOwnerToken] = useState<string | undefined>();

  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync({
          "CormorantGaramond-Bold": "https://fonts.gstatic.com/s/cormorantgaramond/v16/co3bmZ5slBy45EDMId_3S6v7X_bdN_W5beV_W7Vf.ttf",
          "CormorantGaramond-Medium": "https://fonts.gstatic.com/s/cormorantgaramond/v16/co3bmZ5slBy45EDMId_3S6v7X_bdN_W5beV_W7Vf.ttf",
          "CormorantGaramond-SemiBold": "https://fonts.gstatic.com/s/cormorantgaramond/v16/co3bmZ5slBy45EDMId_3S6v7X_bdN_W5beV_W7Vf.ttf",
          "Inter-Regular": "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZJhjp-EkQ.ttf",
          "Inter-SemiBold": "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZJhjp-EkQ.ttf",
          "Inter-Light": "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuEOTAZJhjp-EkQ.ttf",
          "JetBrainsMono-Regular": "https://fonts.gstatic.com/s/jetbrainsmono/v18/t64v84mS_S4oY6F9YI3PZ_W_V-3N9S0-9Lw.ttf",
        });

        const url = await Linking.getInitialURL();
        if (url) {
          parseDeepLink(url);
        }
      } catch (e) {
        console.warn(e);
      } finally {
        setFontsLoaded(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();

    const subscription = Linking.addEventListener("url", ({ url }) => {
      parseDeepLink(url);
    });

    return () => subscription.remove();
  }, []);

  const parseDeepLink = (url: string) => {
    try {
      const parsed = Linking.parse(url);
      if (parsed.path) {
        const pathParts = parsed.path.split("/");
        if (pathParts[0] === "owner" && parsed.queryParams?.token) {
          setOwnerToken(parsed.queryParams.token as string);
          setBusinessSlug(pathParts[1]);
        } else if (pathParts[0] === "book") {
          setBusinessSlug(pathParts[1]);
        } else {
          setBusinessSlug(pathParts[0]);
        }
      }
    } catch (e) {
      console.warn("Error parsing deep link:", e);
    }
  };

  const handleInstallFullApp = () => {
    displayOverlay();
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <GestureHandlerRootView style={styles.root}>
            <AppClipScreen
              businessSlug={businessSlug}
              ownerToken={ownerToken}
              onInstallFullApp={handleInstallFullApp}
            />
            <StatusBar style="auto" />
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
