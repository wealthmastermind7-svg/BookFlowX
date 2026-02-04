import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Spacing, BorderRadius } from "@/constants/theme";
import { usePremium } from "@/contexts/PremiumContext";

interface PremiumBannerProps {
  onPress?: () => void;
}

export function PremiumBanner({ onPress }: PremiumBannerProps) {
  const { isPremium, showPaywall } = usePremium();

  if (isPremium) return null;

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPress) {
      onPress();
    } else {
      showPaywall("soft_upsell");
    }
  };

  return (
    <Pressable onPress={handlePress} style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Feather name="zap" size={20} color="#fff" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Unlock Advanced Automation</Text>
          <Text style={styles.subtitle}>
            Smart reminders, instant setup, upsell suggestions
          </Text>
          <View style={styles.pricingRow}>
            <Text style={styles.priceText}>Booking Premium</Text>
            <View style={styles.priceDot} />
            <Text style={styles.priceText}>Lifetime Access</Text>
          </View>
          <Text style={[styles.subtitle, { fontSize: 11, marginTop: 8, fontStyle: 'italic', opacity: 0.6 }]}>
            Voice booking sold separately.
          </Text>
        </View>
        <Feather name="chevron-right" size={22} color="rgba(255,255,255,0.5)" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 24,
    gap: 18,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 20,
    marginBottom: 8,
  },
  pricingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  priceText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
  },
  priceDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
});
