import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Pressable,
} from "react-native";
import WebView from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

type Props = NativeStackScreenProps<any, "VoiceBooking">;

export default function VoiceBookingScreen({ route, navigation }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { businessSlug, businessName } = route.params || {};
  const webViewRef = useRef<WebView>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const voiceUrl = `${getApiUrl().replace(/\/$/, '')}/voice/${businessSlug}`;

  const handleWebViewError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    webViewRef.current?.reload();
  };

  if (Platform.OS === "web") {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.webFallback}>
          <ThemedText style={[styles.title, { color: theme.text }]}>
            VOICE ASSISTANT
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
            Voice assistant works best on mobile devices.
          </ThemedText>
          <Pressable
            style={[styles.openButton, { backgroundColor: theme.text }]}
            onPress={() => window.open(voiceUrl, "_blank")}
          >
            <Feather name="external-link" size={18} color={theme.backgroundRoot} />
            <ThemedText style={[styles.openButtonText, { color: theme.backgroundRoot }]}>
              Open Voice Assistant
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  if (hasError) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.errorContainer}>
          <Feather name="wifi-off" size={48} color={theme.textTertiary} />
          <ThemedText style={[styles.errorTitle, { color: theme.text }]}>
            Connection Error
          </ThemedText>
          <ThemedText style={[styles.errorText, { color: theme.textSecondary }]}>
            Unable to load voice assistant. Please check your connection.
          </ThemedText>
          <Pressable
            style={[styles.retryButton, { backgroundColor: theme.text }]}
            onPress={handleRetry}
          >
            <Feather name="refresh-cw" size={18} color={theme.backgroundRoot} />
            <ThemedText style={[styles.retryButtonText, { color: theme.backgroundRoot }]}>
              Try Again
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {isLoading && (
        <View style={[styles.loadingOverlay, { backgroundColor: theme.backgroundRoot }]}>
          <ActivityIndicator size="large" color={theme.text} />
          <ThemedText style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading assistant...
          </ThemedText>
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ uri: voiceUrl }}
        style={styles.webview}
        onLoadEnd={() => setIsLoading(false)}
        onError={handleWebViewError}
        onHttpError={handleWebViewError}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        scalesPageToFit={true}
        allowsFullscreenVideo={false}
        mediaCapturePermissionGrantType="grant"
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: "#000",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loadingText: {
    marginTop: Spacing.lg,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing["2xl"],
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "600",
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: Spacing["2xl"],
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 12,
    gap: Spacing.sm,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  webFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing["2xl"],
  },
  title: {
    fontSize: 36,
    fontWeight: "700",
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: Spacing["2xl"],
  },
  openButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 12,
    gap: Spacing.sm,
  },
  openButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
