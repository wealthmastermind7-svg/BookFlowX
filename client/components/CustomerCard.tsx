import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { AnimationConfig } from "@/constants/theme";

interface CustomerCardProps {
  name: string;
  email: string;
  phone?: string;
  totalBookings: number;
  onPress?: () => void;
  caption?: string;
  badge?: string;
}

export function CustomerCard({ name, email, phone, totalBookings, onPress, caption, badge }: CustomerCardProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const initials = name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.985, AnimationConfig.spring); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        onPressOut={() => { scale.value = withSpring(1, AnimationConfig.spring); }}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        accessibilityRole={onPress ? "button" : undefined}
      >
        <View style={styles.avatar}><ThemedText style={styles.initials}>{initials || "—"}</ThemedText></View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <ThemedText style={styles.name} numberOfLines={1}>{name}</ThemedText>
            {badge ? <View style={styles.badge}><ThemedText style={styles.badgeText}>{badge}</ThemedText></View> : null}
          </View>
          <ThemedText style={styles.email} numberOfLines={1}>{email}</ThemedText>
          {caption || phone ? <ThemedText style={styles.caption} numberOfLines={1}>{caption || phone}</ThemedText> : null}
        </View>
        <View style={styles.bookings}>
          <ThemedText style={styles.count}>{totalBookings}</ThemedText>
          <ThemedText style={styles.countLabel}>visits</ThemedText>
        </View>
        {onPress ? <Feather name="chevron-right" size={17} color="#66758D" /> : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 88, flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 20, backgroundColor: "#111827", borderWidth: 1, borderColor: "rgba(0,212,255,0.16)" },
  pressed: { opacity: 0.88 },
  avatar: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,212,255,0.12)", borderWidth: 1, borderColor: "rgba(0,212,255,0.28)" },
  initials: { color: "#00D4FF", fontSize: 14, fontWeight: "800" },
  info: { flex: 1, minWidth: 0, marginLeft: 13, marginRight: 10 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  name: { flexShrink: 1, color: "#F2F6FC", fontSize: 14, fontWeight: "700" },
  email: { color: "#9AA8BC", fontSize: 12, marginTop: 3 },
  caption: { color: "#718097", fontSize: 12, marginTop: 4 },
  badge: { borderRadius: 7, backgroundColor: "rgba(0,212,255,0.1)", paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { color: "#00D4FF", fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  bookings: { alignItems: "center", minWidth: 34, marginRight: 8 },
  count: { color: "#EAF1FA", fontSize: 16, fontWeight: "700" },
  countLabel: { color: "#77859A", fontSize: 12, marginTop: 1 },
});