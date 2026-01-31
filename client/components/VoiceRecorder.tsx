import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from "react-native";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "./ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface VoiceRecorderProps {
  onRecordingComplete: (uri: string) => void;
  onRecordingStart?: () => void;
  disabled?: boolean;
  isProcessing?: boolean;
}

export function VoiceRecorder({
  onRecordingComplete,
  onRecordingStart,
  disabled = false,
  isProcessing = false,
}: VoiceRecorderProps) {
  const { theme } = useTheme();
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkPermission();
  }, []);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      pulseAnim.stopAnimation();
      // Only set value if not using native driver or if animation stopped
      pulseAnim.setValue(1);
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [isRecording]);

  async function checkPermission() {
    const { status } = await Audio.getPermissionsAsync();
    setHasPermission(status === "granted");
  }

  async function requestPermission() {
    const { status } = await Audio.requestPermissionsAsync();
    setHasPermission(status === "granted");
    return status === "granted";
  }

  async function startRecording() {
    if (disabled || isProcessing) return;

    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: ".wav",
          outputFormat: 0,
          audioEncoder: 0,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 256000,
        },
        ios: {
          extension: ".wav",
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 256000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: "audio/webm",
          bitsPerSecond: 128000,
        },
      });

      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      onRecordingStart?.();

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  }

  async function stopRecording() {
    if (!recordingRef.current) return;

    try {
      setIsRecording(false);
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      if (uri) {
        onRecordingComplete(uri);
      }
    } catch (error) {
      console.error("Failed to stop recording:", error);
    }
  }

  const buttonBackgroundColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.backgroundSecondary, "#dc2626"],
  });

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Pressable
          style={[styles.permissionButton, { backgroundColor: theme.backgroundSecondary }]}
          onPress={requestPermission}
        >
          <Feather name="mic-off" size={32} color={theme.text} />
          <ThemedText style={styles.permissionText}>
            Tap to enable microphone
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.pulseContainer}>
        {isRecording && (
          <>
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  borderColor: "rgba(220, 38, 38, 0.3)",
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.pulseRing,
                styles.pulseRing2,
                {
                  borderColor: "rgba(220, 38, 38, 0.2)",
                  transform: [
                    {
                      scale: Animated.add(pulseAnim, 0.2),
                    },
                  ],
                },
              ]}
            />
          </>
        )}
        <Animated.View
          style={[
            styles.button,
            {
              backgroundColor: buttonBackgroundColor,
              transform: [{ scale: pulseAnim }],
              opacity: disabled || isProcessing ? 0.5 : 1,
            },
          ]}
        >
          <Pressable
            style={styles.buttonInner}
            onPressIn={startRecording}
            onPressOut={stopRecording}
            disabled={disabled || isProcessing}
          >
            <Feather
              name={isProcessing ? "loader" : "mic"}
              size={48}
              color="#FFFFFF"
            />
          </Pressable>
        </Animated.View>
      </View>
      <ThemedText style={[styles.statusText, { color: theme.textSecondary }]}>
        {isProcessing
          ? "PROCESSING..."
          : isRecording
          ? "LISTENING..."
          : "HOLD TO SPEAK"}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  pulseContainer: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
  },
  pulseRing2: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  button: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonInner: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    marginTop: Spacing.xl,
    fontSize: 14,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  permissionButton: {
    padding: Spacing["3xl"],
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    gap: Spacing.md,
  },
  permissionText: {
    fontSize: 16,
    textAlign: "center",
  },
});
