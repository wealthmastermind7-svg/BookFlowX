import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
  Linking,
} from "react-native";
import { Audio } from "expo-av";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { File } from "expo-file-system";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { getApiUrl } from "@/lib/query-client";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

type Props = NativeStackScreenProps<any, "VoiceBooking">;

interface TranscriptLine {
  role: "user" | "assistant";
  text: string;
}

export default function VoiceBookingScreen({ route, navigation }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { businessSlug, businessName } = route.params || {};
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  async function handleRecordingComplete(uri: string) {
    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      
      if (Platform.OS === "web") {
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append("audio", blob, "voice.wav");
      } else {
        const file = new File(uri);
        formData.append("audio", file as any);
      }

      formData.append("history", JSON.stringify(conversationHistory));

      const apiUrl = getApiUrl();
      const response = await fetch(
        `${apiUrl}/api/voice/${businessSlug}/message`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to process voice message");
      }

      let userText = "";
      let assistantText = "";
      let audioBase64 = "";

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "transcript") {
                  userText = data.text;
                  setTranscript((prev) => [...prev, { role: "user", text: data.text }]);
                } else if (data.type === "response") {
                  assistantText = data.text;
                  setTranscript((prev) => [...prev, { role: "assistant", text: data.text }]);
                } else if (data.type === "audio") {
                  audioBase64 = data.audio;
                } else if (data.type === "history") {
                  setConversationHistory(data.history);
                }
              } catch {}
            }
          }
        }
      }

      if (audioBase64) {
        await playAudioResponse(audioBase64);
      }
    } catch (err) {
      console.error("Voice processing error:", err);
      setError("Failed to process your message. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function playAudioResponse(base64Audio: string) {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: `data:audio/mp3;base64,${base64Audio}` },
        { shouldPlay: true }
      );
      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (err) {
      console.error("Failed to play audio:", err);
    }
  }

  function handleTextBooking() {
    if (Platform.OS === "web") {
      window.open(`/book/${businessSlug}`, "_blank");
    } else {
      Linking.openURL(`https://confirmbooking.online/book/${businessSlug}`);
    }
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText style={[styles.businessName, { color: theme.textSecondary }]}>
            {businessName || "Business"}
          </ThemedText>
          <ThemedText style={[styles.title, { color: theme.text }]}>
            VOICE{"\n"}BOOKING
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.textTertiary }]}>
            Tap and hold to speak, then release to send your message.
          </ThemedText>
        </View>

        <VoiceRecorder
          onRecordingComplete={handleRecordingComplete}
          isProcessing={isProcessing}
        />

        {error && (
          <View style={[styles.errorContainer, { backgroundColor: "rgba(220, 38, 38, 0.1)" }]}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        )}

        {transcript.length > 0 && (
          <View
            style={[
              styles.transcriptContainer,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            {transcript.map((line, index) => (
              <View key={index} style={styles.transcriptLine}>
                <ThemedText
                  style={[
                    styles.transcriptRole,
                    { color: theme.textTertiary },
                  ]}
                >
                  {line.role === "user" ? "You" : "Agent"}:
                </ThemedText>
                <ThemedText
                  style={[
                    styles.transcriptText,
                    {
                      color:
                        line.role === "user"
                          ? theme.textSecondary
                          : theme.text,
                    },
                  ]}
                >
                  {line.text}
                </ThemedText>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Button
            onPress={handleTextBooking}
            style={styles.footerButton}
          >
            Text Booking
          </Button>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing["2xl"],
    alignItems: "center",
    minHeight: "100%",
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["4xl"],
  },
  businessName: {
    ...Typography.body,
    fontFamily: "CormorantGaramond-SemiBold",
    fontSize: 24,
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.h1,
    fontSize: 48,
    textAlign: "center",
    lineHeight: 52,
  },
  subtitle: {
    ...Typography.body,
    fontSize: 16,
    textAlign: "center",
    marginTop: Spacing.lg,
    maxWidth: 280,
  },
  errorContainer: {
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.3)",
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 14,
    textAlign: "center",
  },
  transcriptContainer: {
    marginTop: Spacing["2xl"],
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    width: "100%",
    maxHeight: 200,
  },
  transcriptLine: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
    flexWrap: "wrap",
  },
  transcriptRole: {
    fontSize: 14,
    marginRight: Spacing.xs,
  },
  transcriptText: {
    fontSize: 14,
    flex: 1,
  },
  footer: {
    marginTop: Spacing["3xl"],
    width: "100%",
    gap: Spacing.md,
  },
  footerButton: {
    width: "100%",
  },
});
