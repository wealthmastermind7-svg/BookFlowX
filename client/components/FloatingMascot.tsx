import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Platform,
  Modal,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "./ThemedText";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface MascotTip {
  title: string;
  message: string;
  icon: keyof typeof Feather.glyphMap;
}

interface FloatingMascotProps {
  screenName?: string;
  customTip?: MascotTip;
}

const SCREEN_TIPS: Record<string, MascotTip> = {
  Dashboard: {
    title: "Welcome to BookFlow",
    message: "This is your command center. View today's bookings, revenue trends, and upcoming appointments at a glance.",
    icon: "home",
  },
  Calendar: {
    title: "Your Schedule",
    message: "Tap any date to see bookings. Long-press a time slot to block it off. Swipe between months easily.",
    icon: "calendar",
  },
  Services: {
    title: "Your Services",
    message: "Create services your customers can book. Try the AI assistant to set up multiple services instantly!",
    icon: "briefcase",
  },
  Customers: {
    title: "Customer Insights",
    message: "See all your customers here. The AI automatically segments them into VIP, Regular, At-Risk, and New.",
    icon: "users",
  },
  Settings: {
    title: "Customize Everything",
    message: "Set up your booking link, share your QR code, configure reminders, and manage your business details.",
    icon: "settings",
  },
  Checkout: {
    title: "Almost There!",
    message: "Complete the booking with customer details. Smart upsell suggestions can help increase your revenue.",
    icon: "shopping-cart",
  },
  default: {
    title: "Need Help?",
    message: "Tap me anytime for tips on how to get the most out of BookFlow. Smooth sailing ahead!",
    icon: "compass",
  },
};

export function FloatingMascot({ screenName, customTip }: FloatingMascotProps) {
  const insets = useSafeAreaInsets();
  const [showTip, setShowTip] = useState(false);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  const currentTip = customTip || SCREEN_TIPS[screenName || ""] || SCREEN_TIPS.default;

  useEffect(() => {
    // Floating animation
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    // Subtle pulse
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    floatAnimation.start();
    pulseAnimation.start();

    return () => {
      floatAnimation.stop();
      pulseAnimation.stop();
    };
  }, []);

  // Wave animation when tip is shown
  useEffect(() => {
    if (showTip) {
      Animated.sequence([
        Animated.timing(waveAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(waveAnim, { toValue: -1, duration: 150, useNativeDriver: true }),
        Animated.timing(waveAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(waveAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [showTip]);

  const handlePress = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    setShowTip(true);
  };

  const floatTranslateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const waveRotate = waveAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-15deg", "0deg", "15deg"],
  });

  return (
    <>
      <Animated.View
        style={[
          styles.container,
          {
            bottom: insets.bottom + 100,
            transform: [
              { translateY: floatTranslateY },
              { scale: pulseAnim },
              { rotate: waveRotate },
            ],
          },
        ]}
      >
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [
            styles.mascotButton,
            pressed && styles.mascotPressed,
          ]}
        >
          <View style={styles.mascotFace}>
            <View style={styles.eyeContainer}>
              <View style={styles.eye}>
                <View style={styles.pupil} />
              </View>
              <View style={styles.eye}>
                <View style={styles.pupil} />
              </View>
            </View>
            <View style={styles.smile} />
          </View>
          <View style={styles.mascotGlow} />
        </Pressable>
        
        <View style={styles.sailContainer}>
          <View style={styles.sail} />
          <View style={styles.mastTop} />
        </View>
      </Animated.View>

      <Modal
        visible={showTip}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTip(false)}
      >
        <Pressable style={styles.tipOverlay} onPress={() => setShowTip(false)}>
          <View style={styles.tipContainer}>
            <View style={styles.tipHeader}>
              <View style={styles.tipIconCircle}>
                <Feather name={currentTip.icon} size={24} color="#fff" />
              </View>
              <ThemedText style={styles.tipTitle}>{currentTip.title}</ThemedText>
            </View>
            <ThemedText style={styles.tipMessage}>{currentTip.message}</ThemedText>
            <Pressable style={styles.gotItButton} onPress={() => setShowTip(false)}>
              <ThemedText style={styles.gotItText}>Got it!</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 20,
    zIndex: 1000,
    alignItems: "center",
  },
  mascotButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  mascotPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  mascotFace: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  eyeContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 3,
  },
  eye: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  pupil: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#fff",
    position: "absolute",
    top: 1,
    right: 1,
  },
  smile: {
    width: 12,
    height: 6,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: "#000",
    marginTop: 1,
  },
  mascotGlow: {
    position: "absolute",
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(255,255,255,0.08)",
    zIndex: -1,
  },
  sailContainer: {
    position: "absolute",
    top: -14,
    alignItems: "center",
  },
  sail: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 0,
    borderBottomWidth: 16,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "rgba(255,255,255,0.9)",
    transform: [{ rotate: "15deg" }],
  },
  mastTop: {
    width: 1.5,
    height: 20,
    backgroundColor: "rgba(255,255,255,0.6)",
    position: "absolute",
    top: -2,
    left: 4,
  },
  tipOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  tipContainer: {
    backgroundColor: "#1a1a1a",
    borderRadius: 24,
    padding: 28,
    maxWidth: 340,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 16,
  },
  tipIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  tipTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    flex: 1,
  },
  tipMessage: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 24,
    marginBottom: 24,
  },
  gotItButton: {
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  gotItText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
});
