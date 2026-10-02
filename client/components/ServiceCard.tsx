import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { AnimationConfig } from "@/constants/theme";
import { formatPriceSimple } from "@/lib/currency";

interface ServiceCardProps {
  name: string;
  duration: number;
  price: number;
  currency?: string;
  bookingRate?: number;
  onPress?: () => void;
  compact?: boolean;
  isActive?: boolean | null;
  description?: string | null;
}

export function ServiceCard({ name, duration, price, currency = "USD", onPress, compact = false, isActive, description }: ServiceCardProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const durationLabel = duration >= 60 ? `${Math.floor(duration / 60)}h${duration % 60 ? ` ${duration % 60}m` : ""}` : `${duration} min`;
  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.985, AnimationConfig.spring); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        onPressOut={() => { scale.value = withSpring(1, AnimationConfig.spring); }}
        style={({ pressed }) => [styles.card, compact && styles.compact, pressed && styles.pressed]}
        accessibilityRole={onPress ? "button" : undefined}
      >
        <View style={styles.topRow}>
          <View style={styles.icon}><Feather name="home" size={17} color="#A8662F" /></View>
          <View style={styles.heading}>
            <ThemedText style={styles.name} numberOfLines={1}>{name}</ThemedText>
            {description ? <ThemedText style={styles.description} numberOfLines={1}>{description}</ThemedText> : null}
          </View>
          {isActive !== undefined && isActive !== null ? <View style={[styles.state, isActive ? styles.active : styles.inactive]}><ThemedText style={[styles.stateText, isActive ? styles.activeText : styles.inactiveText]}>{isActive ? "LIVE" : "PAUSED"}</ThemedText></View> : null}
          {onPress ? <Feather name="chevron-right" size={17} color="#8B6F47" /> : null}
        </View>
        <View style={styles.footer}>
          <View style={styles.duration}><Feather name="clock" size={13} color="#8B6F47" /><ThemedText style={styles.durationText}>{durationLabel}</ThemedText></View>
          <ThemedText style={styles.price}>{formatPriceSimple(price, currency)}</ThemedText>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E8DDD0" },
  compact: { padding: 16 },
  pressed: { opacity: 0.88 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#F4EEE6" },
  heading: { flex: 1, minWidth: 0 },
  name: { color: "#1C1410", fontSize: 14, fontWeight: "700" },
  description: { color: "#8B6F47", fontSize: 12, marginTop: 3 },
  state: { borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4 },
  active: { backgroundColor: "#EFF5EF" },
  inactive: { backgroundColor: "#F4EEE6" },
  stateText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  activeText: { color: "#4A7C59" },
  inactiveText: { color: "#8B6F47" },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E8DDD0" },
  duration: { flexDirection: "row", alignItems: "center", gap: 6 },
  durationText: { color: "#6B5744", fontSize: 12 },
  price: { color: "#A8662F", fontSize: 14, fontWeight: "700" },
});