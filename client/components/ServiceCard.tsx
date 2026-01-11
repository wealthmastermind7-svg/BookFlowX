import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AnimationConfig } from "@/constants/theme";
import { formatPriceSimple } from "@/lib/currency";

interface ServiceCardProps {
  name: string;
  duration: number;
  price: number;
  currency?: string;
  bookingRate?: number;
  onPress?: () => void;
  compact?: boolean;
}

export function ServiceCard({
  name,
  duration,
  price,
  currency = "USD",
  bookingRate,
  onPress,
  compact = false,
}: ServiceCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, AnimationConfig.spring);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, AnimationConfig.spring);
  };

  const formatDuration = (mins: number) => {
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.card,
          compact ? styles.cardCompact : null,
          { backgroundColor: theme.backgroundDefault },
        ]}
      >
      <View style={styles.header}>
        <ThemedText type={compact ? "h4" : "h3"} style={styles.name}>
          {name}
        </ThemedText>
        <Feather name="chevron-right" size={24} color={theme.textSecondary} />
      </View>
      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Feather name="clock" size={16} color={theme.textSecondary} />
          <ThemedText type="body" style={styles.detailText}>
            {formatDuration(duration)}
          </ThemedText>
        </View>
        <ThemedText type={compact ? "h3" : "h2"} style={styles.price}>
          {formatPriceSimple(price, currency)}
        </ThemedText>
      </View>
      {bookingRate !== undefined && !compact ? (
        <View style={styles.meterContainer}>
          <View style={styles.meterBackground}>
            <View
              style={[
                styles.meterFill,
                {
                  width: `${bookingRate}%`,
                  backgroundColor: theme.accent,
                },
              ]}
            />
          </View>
          <ThemedText type="caption" style={styles.meterLabel}>
            {bookingRate}% booked this week
          </ThemedText>
        </View>
      ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.xl,
  },
  cardCompact: {
    padding: Spacing.xl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  name: {
    flex: 1,
  },
  details: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  detailText: {
    opacity: 0.7,
  },
  price: {
    fontWeight: "200",
  },
  meterContainer: {
    marginTop: Spacing.lg,
  },
  meterBackground: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.1)",
    overflow: "hidden",
  },
  meterFill: {
    height: "100%",
    borderRadius: 2,
  },
  meterLabel: {
    marginTop: Spacing.xs,
    opacity: 0.5,
  },
});
