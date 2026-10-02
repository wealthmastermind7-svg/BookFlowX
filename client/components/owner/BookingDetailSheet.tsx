import React, { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { Booking } from "@/lib/api";
import { formatPrice } from "@/lib/currency";
import { OwnerGlassCard } from "./OwnerGlassCard";

export function BookingDetailSheet({ booking, currency, onClose, onUpdate }: {
  booking: Booking | null;
  currency: string;
  onClose: () => void;
  onUpdate: (updates: Partial<Booking>) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const update = async (updates: Partial<Booking>) => {
    setBusy(true); setError("");
    try { await onUpdate(updates); }
    catch { setError("Couldn't update this viewing. Please try again."); }
    finally { setBusy(false); }
  };
  let addons: { name: string; price: number }[] = [];
  try { const parsed = JSON.parse(booking?.addons || "[]"); if (Array.isArray(parsed)) addons = parsed; } catch {}
  return (
    <Modal visible={!!booking} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <OwnerGlassCard>
            <View style={styles.header}><Text style={styles.title}>Viewing details</Text>
              <Pressable onPress={() => { setError(""); onClose(); }} accessibilityLabel="Close viewing details" accessibilityRole="button" hitSlop={12}><Feather name="x" size={22} color="#CBD5E1" /></Pressable>
            </View>
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              {booking ? <>
                {[
                  ["Client", booking.customerName || "—"], ["Viewing type", booking.serviceName || "—"],
                  ["Date", booking.date], ["Time", booking.time], ["Status", booking.status],
                  ["Booked via", booking.channel || "Web / unrecorded"],
                  ["Payment", booking.paymentStatus === "paid" ? "Paid" : "Unpaid"],
                ].map(([label, value]) => <View key={label} style={styles.detail}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>)}
                {addons.length ? <View style={styles.section}><Text style={styles.title}>Add-ons</Text>{addons.map((addon, index) => <View key={`${addon.name}-${index}`} style={styles.detail}><Text style={styles.value}>{addon.name}</Text><Text style={styles.value}>{formatPrice(addon.price * 100, currency)}</Text></View>)}</View> : null}
                <View style={styles.detail}><Text style={styles.title}>Total</Text><Text style={styles.title}>{formatPrice(booking.totalPrice, currency)}</Text></View>
                {booking.notes ? <View style={styles.section}><Text style={styles.title}>Notes</Text><Text style={styles.notes}>{booking.notes}</Text></View> : null}
                {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
                <Pressable disabled={busy} onPress={() => update({ paymentStatus: booking.paymentStatus === "paid" ? "unpaid" : "paid" })} style={[styles.secondaryButton, busy && styles.disabled]} accessibilityRole="button">
                  {busy ? <ActivityIndicator color="#00D4FF" /> : <Text style={styles.secondaryText}>{booking.paymentStatus === "paid" ? "Revert to unpaid" : "Mark as paid"}</Text>}
                </Pressable>
                {booking.status === "pending" ? <Pressable disabled={busy} onPress={() => update({ status: "confirmed" })} style={[styles.button, busy && styles.disabled]} accessibilityRole="button"><Text style={styles.buttonText}>Confirm viewing</Text></Pressable> : null}
              </> : null}
            </ScrollView>
          </OwnerGlassCard>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", padding: 20, alignItems: "center", justifyContent: "center" },
  sheet: { width: "100%", maxWidth: 480 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "700", color: "#F8FAFC" },
  scroll: { maxHeight: 520 },
  detail: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(148,163,184,0.1)" },
  label: { color: "#94A3B8", fontSize: 12 },
  value: { color: "#F8FAFC", fontSize: 14, flexShrink: 1, textAlign: "right", textTransform: "none" },
  section: { marginTop: 24, gap: 8 },
  notes: { fontSize: 14, color: "#CBD5E1", lineHeight: 21 },
  button: { padding: 16, backgroundColor: "#00D4FF", borderRadius: 14, alignItems: "center", marginTop: 12 },
  buttonText: { fontSize: 14, fontWeight: "700", color: "#0A0A0F" },
  secondaryButton: { padding: 16, borderColor: "rgba(0,212,255,0.35)", borderWidth: 1, borderRadius: 14, alignItems: "center", marginTop: 24 },
  secondaryText: { fontSize: 14, fontWeight: "600", color: "#00D4FF" },
  error: { color: "#FB7185", fontSize: 14, marginTop: 16 },
  disabled: { opacity: 0.5 },
});