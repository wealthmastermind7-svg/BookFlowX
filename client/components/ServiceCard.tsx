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
          <View style={styles.icon}><Feather name="home" size={17} color="#00D4FF" /></View>
          <View style={styles.heading}>
            <ThemedText style={styles.name} numberOfLines={1}>{name}</ThemedText>
            {description ? <ThemedText style={styles.description} numberOfLines={1}>{description}</ThemedText> : null}
          </View>
          {isActive !== undefined && isActive !== null ? <View style={[styles.state, isActive ? styles.active : styles.inactive]}><ThemedText style={[styles.stateText, isActive ? styles.activeText : styles.inactiveText]}>{isActive ? "LIVE" : "PAUSED"}</ThemedText></View> : null}
          {onPress ? <Feather name="chevron-right" size={17} color="#66758D" /> : null}
        </View>
        <View style={styles.footer}>
          <View style={styles.duration}><Feather name="clock" size={13} color="#92A1B5" /><ThemedText style={styles.durationText}>{durationLabel}</ThemedText></View>
          <ThemedText style={styles.price}>{formatPriceSimple(price, currency)}</ThemedText>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 20, backgroundColor: "#111827", borderWidth: 1, borderColor: "rgba(0,212,255,0.16)" },
  compact: { padding: 16 },
  pressed: { opacity: 0.88 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,212,255,0.1)" },
  heading: { flex: 1, minWidth: 0 },
  name: { color: "#F2F6FC", fontSize: 14, fontWeight: "700" },
  description: { color: "#8796AC", fontSize: 12, marginTop: 3 },
  state: { borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4 },
  active: { backgroundColor: "rgba(52,211,153,0.12)" },
  inactive: { backgroundColor: "rgba(148,163,184,0.12)" },
  stateText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  activeText: { color: "#34D399" },
  inactiveText: { color: "#94A3B8" },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" },
  duration: { flexDirection: "row", alignItems: "center", gap: 6 },
  durationText: { color: "#9AA8BC", fontSize: 12 },
  price: { color: "#00D4FF", fontSize: 14, fontWeight: "700" },
});