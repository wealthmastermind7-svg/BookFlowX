import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { Booking } from "@/lib/api";
import { VIEWING_CHANNELS } from "@/lib/dashboard-viewings";
import { OwnerGlassCard } from "./OwnerGlassCard";

export function ViewingBookingCard({ booking, onPress }: { booking: Booking; onPress: () => void }) {
  const channel = VIEWING_CHANNELS.find((source) => source.key === booking.channel) ||
    { label: booking.channel === "web" ? "Web" : "Unrecorded", icon: "globe" as const, color: "#94A3B8" };
  const date = new Date(`${booking.date.slice(0, 10)}T12:00:00Z`);
  const dateLabel = Number.isNaN(date.getTime()) ? booking.date : date.toLocaleDateString("en", {
    month: "short", day: "numeric", timeZone: "UTC",
  });
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`View ${booking.customerName || "client"} booking`}>
      <OwnerGlassCard style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.channel, { backgroundColor: `${channel.color}18` }]}>
            <Feather name={channel.icon} size={12} color={channel.color} />
            <Text style={[styles.channelText, { color: channel.color }]}>via {channel.label}</Text>
          </View>
          <Text style={[styles.status, { color: booking.status === "pending" ? "#FBBF24" : "#34D399" }]}>{booking.status}</Text>
        </View>
        <Text style={styles.name} numberOfLines={1}>{booking.customerName || "Client"}</Text>
        <Text style={styles.body} numberOfLines={2}>{booking.serviceName || "Property viewing"}</Text>
        <View style={styles.details}>
          <Feather name="calendar" size={14} color="#94A3B8" />
          <Text style={styles.body}>{dateLabel} · {booking.time}</Text>
        </View>
        <View style={styles.confirmation}>
          <Feather name={booking.confirmationSentAt ? "check-circle" : "clock"} size={13} color={booking.confirmationSentAt ? "#34D399" : "#FBBF24"} />
          <Text style={styles.label}>{booking.confirmationSentAt ? "Confirmation sent" : "Confirmation pending"}</Text>
        </View>
      </OwnerGlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: 300, minHeight: 205 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  channel: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99 },
  channelText: { fontSize: 12, fontWeight: "600" },
  status: { fontSize: 12, textTransform: "capitalize" },
  name: { fontSize: 18, fontWeight: "700", color: "#F8FAFC", marginTop: 16, marginBottom: 4 },
  body: { fontSize: 14, color: "#CBD5E1", lineHeight: 20 },
  details: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16 },
  confirmation: { flexDirection: "row", alignItems: "center", gap: 6, borderTopWidth: 1, borderTopColor: "rgba(148,163,184,0.12)", marginTop: 12, paddingTop: 12 },
  label: { fontSize: 12, color: "#94A3B8" },
});