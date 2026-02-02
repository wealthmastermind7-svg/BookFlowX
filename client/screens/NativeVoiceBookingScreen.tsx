import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { useVapiCall } from "@/hooks/useVapiCall";
import { getApiUrl } from "@/lib/query-client";

type Props = NativeStackScreenProps<any, "NativeVoiceBooking">;

export default function NativeVoiceBookingScreen({ route, navigation }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { businessSlug, businessName } = route.params || {};

  const [publicKey, setPublicKey] = useState<string>("");
  const [isLoadingKey, setIsLoadingKey] = useState(true);
  const [keyError, setKeyError] = useState<string | null>(null);

  const {
    isConnected,
    isConnecting,
    isSpeaking,
    transcript,
    error,
    toggleCall,
  } = useVapiCall({
    businessSlug,
    publicKey,
  });

  useEffect(() => {
    async function fetchPublicKey() {
      try {
        const url = new URL("/api/vapi/public-key", getApiUrl());
        const response = await fetch(url.toString());
        if (!response.ok) throw new Error("Failed to fetch public key");
        const data = await response.json();
        setPublicKey(data.publicKey);
      } catch (err: any) {
        setKeyError(err.message);
      } finally {
        setIsLoadingKey(false);
      }
    }
    fetchPublicKey();
  }, []);

  const handleToggleCall = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleCall();
  };

  if (Platform.OS === "web") {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centeredContent}>
          <ThemedText style={[styles.title, { color: theme.text }]}>
            VOICE BOOKING
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
            Voice booking requires microphone access.{"\n"}Please use the mobile app.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (isLoadingKey) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centeredContent}>
          <ActivityIndicator size="large" color={theme.text} />
          <ThemedText style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading voice assistant...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (keyError || !publicKey) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centeredContent}>
          <Feather name="alert-circle" size={48} color={theme.textTertiary} />
          <ThemedText style={[styles.errorTitle, { color: theme.text }]}>
            Configuration Error
          </ThemedText>
          <ThemedText style={[styles.errorText, { color: theme.textSecondary }]}>
            Voice booking is not available at this time.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={20}
        >
          <Feather name="x" size={24} color={theme.text} />
        </Pressable>
        <ThemedText style={[styles.businessName, { color: theme.text }]}>
          {businessName || "Voice Booking"}
        </ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.mainContent}>
        <View style={styles.statusContainer}>
          {isConnected ? (
            <>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isSpeaking ? "#ff4444" : "#00cc66" },
                ]}
              />
              <ThemedText style={[styles.statusText, { color: theme.textSecondary }]}>
                {isSpeaking ? "Assistant Speaking" : "Listening..."}
              </ThemedText>
            </>
          ) : isConnecting ? (
            <>
              <ActivityIndicator size="small" color={theme.text} />
              <ThemedText style={[styles.statusText, { color: theme.textSecondary }]}>
                Connecting...
              </ThemedText>
            </>
          ) : (
            <ThemedText style={[styles.statusText, { color: theme.textSecondary }]}>
              Tap to start voice booking
            </ThemedText>
          )}
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <ThemedText style={styles.errorBannerText}>{error}</ThemedText>
          </View>
        )}

        <ScrollView
          style={styles.transcriptContainer}
          contentContainerStyle={styles.transcriptContent}
          showsVerticalScrollIndicator={false}
        >
          {transcript.length === 0 ? (
            <ThemedText style={[styles.transcriptPlaceholder, { color: theme.textTertiary }]}>
              {isConnected
                ? "Conversation will appear here..."
                : "Start a call to speak with the booking assistant"}
            </ThemedText>
          ) : (
            transcript.map((msg, index) => (
              <View
                key={index}
                style={[
                  styles.messageBubble,
                  msg.role === "user"
                    ? [styles.userBubble, { backgroundColor: theme.text }]
                    : [styles.assistantBubble, { backgroundColor: theme.backgroundDefault }],
                ]}
              >
                <ThemedText
                  style={[
                    styles.messageText,
                    { color: msg.role === "user" ? theme.backgroundRoot : theme.text },
                  ]}
                >
                  {msg.text}
                </ThemedText>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <Pressable
          onPress={handleToggleCall}
          disabled={isConnecting}
          style={({ pressed }) => [
            styles.callButton,
            {
              backgroundColor: isConnected ? "#ff4444" : theme.text,
              opacity: pressed || isConnecting ? 0.7 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
          ]}
        >
          <Feather
            name={isConnected ? "phone-off" : "mic"}
            size={32}
            color={isConnected ? "#fff" : theme.backgroundRoot}
          />
        </Pressable>
        <ThemedText style={[styles.callButtonLabel, { color: theme.textSecondary }]}>
          {isConnected ? "End Call" : isConnecting ? "Connecting..." : "Start Call"}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  businessName: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 16,
  },
  errorBanner: {
    backgroundColor: "rgba(255, 68, 68, 0.1)",
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  errorBannerText: {
    color: "#ff4444",
    fontSize: 14,
    textAlign: "center",
  },
  transcriptContainer: {
    flex: 1,
  },
  transcriptContent: {
    paddingBottom: Spacing.xl,
  },
  transcriptPlaceholder: {
    textAlign: "center",
    fontSize: 16,
    paddingTop: Spacing["2xl"],
  },
  messageBubble: {
    maxWidth: "80%",
    padding: Spacing.md,
    borderRadius: 16,
    marginBottom: Spacing.sm,
  },
  userBubble: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  footer: {
    alignItems: "center",
    paddingTop: Spacing.xl,
  },
  callButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  callButtonLabel: {
    marginTop: Spacing.md,
    fontSize: 14,
    fontWeight: "500",
  },
  centeredContent: {
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
    lineHeight: 24,
  },
  loadingText: {
    marginTop: Spacing.lg,
    fontSize: 16,
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
  },
});
