import React from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";

export function OwnerGlassCard({ children, style }: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.card, style]}>
      {Platform.OS === "ios" ? <BlurView intensity={18} tint="light" style={StyleSheet.absoluteFill} /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E8DDD0",
    backgroundColor: "#FFFFFF",
    shadowColor: "#6B5744",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
    overflow: "hidden",
  },
});