import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { api, type Booking, type Business, type DashboardStats } from "@/lib/api";
import { formatPrice } from "@/lib/currency";
import { viewingOverview } from "@/lib/dashboard-viewings";
import { useVoiceSubscription } from "@/hooks/useVoiceSubscription";
import { OwnerGlassCard } from "@/components/owner/OwnerGlassCard";
import { WeeklyViewingsChart } from "@/components/owner/WeeklyViewingsChart";
import { ViewingBookingCard } from "@/components/owner/ViewingBookingCard";
import { BookingDetailSheet } from "@/components/owner/BookingDetailSheet";

export default function DashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [business, setBusiness] = useState<Business | null>(null);
  const [ownerToken, setOwnerToken] = useState("");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [now, setNow] = useState(new Date());
  const voice = useVoiceSubscription(business?.id || "", ownerToken);
  const overview = useMemo(() => viewingOverview(bookings, now, business?.timezone), [bookings, now, business?.timezone]);

  const loadData = useCallback(async () => {
    setError("");
    try {
      await api.getOrCreateBusiness();
      const [nextStats, nextBookings, nextBusiness, nextOwnerToken] = await Promise.all([
        api.getStats(), api.getBookings(), api.getBusiness(), api.getOwnerToken(),
      ]);
      setStats(nextStats); setBookings(nextBookings); setBusiness(nextBusiness);
      setOwnerToken(nextOwnerToken || "");
      setNow(new Date());
    } catch {
      setError("Couldn't load your viewings. Pull down to try again.");
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { void loadData(); }, [loadData]));
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const updateBooking = async (updates: Partial<Booking>) => {
    if (!selectedBooking) return;
    await api.updateBooking(selectedBooking.id, updates);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (updates.status === "confirmed") setSelectedBooking(null);
    else setSelectedBooking((booking) => booking ? { ...booking, ...updates } : null);
    await loadData();
  };
  const currency = business?.currency || "USD";
  const voiceLimited = voice.data?.usage.available === false;
  const voiceInactive = !!voice.data && !["active", "trialing"].includes(voice.data.subscription.status);
  const visibleBookings = showAll ? overview.upcoming : overview.upcoming.slice(0, 3);

  return (
    <View style={styles.background}>
      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: tabBarHeight + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor="#C17F3E" onRefresh={() => { setRefreshing(true); void loadData(); }} />}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{overview.greeting}</Text>
          <Text style={styles.businessName}>{business?.name || "Your agency"}</Text>
          <View style={styles.badge}>
            <View style={[styles.dot, { backgroundColor: voiceLimited ? "#B87831" : business ? "#4A7C59" : "#8B6F47" }]} />
            <Text style={styles.badgeText}>{voiceInactive ? "Omnichannel · Voice not active" : voiceLimited ? "Omnichannel · Voice limit reached" : "Omnichannel Active"}</Text>
          </View>
        </View>

        {loading ? <ActivityIndicator size="large" color="#C17F3E" style={styles.loading} /> : <>
          {error ? <OwnerGlassCard><Text style={styles.error} accessibilityRole="alert">{error}</Text></OwnerGlassCard> : null}
          <OwnerGlassCard>
            <Text style={styles.title}>Today at a glance</Text>
            <View style={styles.stats}>
              {[
                { label: "Viewings Today", value: String(overview.todayCount) },
                { label: "This Week", value: String(overview.weekCount) },
                { label: "Revenue", value: formatPrice(Math.round((stats?.totalRevenue || 0) * 100), currency) },
              ].map((stat, index) => <View key={stat.label} style={[styles.stat, index > 0 && styles.statDivider]}>
                <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{stat.value}</Text>
                <Text style={styles.label}>{stat.label}</Text>
              </View>)}
            </View>
            <Text style={styles.scope}>Revenue across all recorded bookings</Text>
          </OwnerGlassCard>

          <View style={styles.statusRow}>
            {[
              { label: "Confirmed", count: overview.statuses.confirmed, color: "#4A7C59" },
              { label: "Pending", count: overview.statuses.pending, color: "#B87831" },
              { label: "Completed", count: overview.statuses.completed, color: "#8B6F47" },
            ].map((status) => <View key={status.label} style={styles.statusItem}>
              <View style={[styles.dot, { backgroundColor: status.color }]} />
              <Text style={styles.statusText}><Text style={styles.statusNumber}>{status.count}</Text> {status.label}</Text>
            </View>)}
          </View>

          <OwnerGlassCard>
            <Text style={styles.title}>Viewings This Week</Text>
            <Text style={styles.subtitle}>Monday–Sunday · Cancelled viewings excluded</Text>
            <WeeklyViewingsChart data={overview.weeklyData} />
          </OwnerGlassCard>

          <OwnerGlassCard>
            <Text style={styles.eyebrow}>CHANNELS</Text>
            <Text style={styles.title}>How your viewings are coming in</Text>
            <Text style={styles.subtitle}>All recorded viewings · Cancelled excluded</Text>
            {overview.channels.map((channel, index) => <View key={channel.key} style={[styles.channelRow, index > 0 && styles.channelBorder]}>
              <View style={[styles.channelIcon, { backgroundColor: `${channel.color}18` }]}>
                <Feather name={channel.icon} size={18} color={channel.color} />
              </View>
              <View style={styles.channelInfo}>
                <Text style={styles.body}>{channel.label}</Text>
                {channel.key === "voice" && voice.data ? <Text style={styles.label}>{voiceInactive ? "Not active" : `${voice.data.usage.remaining} min remaining this period`}</Text> : null}
                {channel.key === "voice" && voice.isError ? <Text style={styles.label}>Voice usage unavailable</Text> : null}
              </View>
              <Text style={[styles.channelCount, { color: channel.color }]}>{channel.count}</Text>
              <Text style={styles.label}>bookings</Text>
            </View>)}
            {overview.unrecordedCount ? <Text style={styles.scope}>{overview.unrecordedCount} additional web / unrecorded-source bookings</Text> : null}
          </OwnerGlassCard>

          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.title}>Upcoming viewings</Text>
              {overview.upcoming.length > 3 ? <Pressable onPress={() => setShowAll(!showAll)} accessibilityRole="button" hitSlop={10}>
                <Text style={styles.link}>{showAll ? "Show fewer" : "Show all"}</Text>
              </Pressable> : null}
            </View>
            {visibleBookings.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bookingStrip}>
              {visibleBookings.map((booking) => <ViewingBookingCard key={booking.id} booking={booking} onPress={() => setSelectedBooking(booking)} />)}
            </ScrollView> : <OwnerGlassCard>
              <Feather name="calendar" size={22} color="#C17F3E" />
              <Text style={[styles.body, { marginTop: 12 }]}>No upcoming viewings</Text>
              <Text style={[styles.label, { marginTop: 4 }]}>New bookings will appear here with their source channel.</Text>
              <Pressable style={styles.emptyAction} onPress={() => navigation.navigate("BookingFlow")} accessibilityRole="button"><Text style={styles.link}>Create a viewing</Text><Feather name="arrow-right" size={16} color="#C17F3E" /></Pressable>
            </OwnerGlassCard>}
          </View>
        </>}
      </ScrollView>
      <BookingDetailSheet booking={selectedBooking} currency={currency} onClose={() => setSelectedBooking(null)} onUpdate={updateBooking} />
    </View>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: "#FAF7F2" },
  content: { paddingHorizontal: 20, gap: 24, width: "100%", maxWidth: 900, alignSelf: "center" },
  header: { gap: 6 },
  greeting: { color: "#1C1410", fontSize: 30, fontWeight: "700", fontFamily: "PlayfairDisplay-Bold" },
  businessName: { color: "#6B5744", fontSize: 14 },
  badge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#D7E5D9", backgroundColor: "#EFF5EF", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6, marginTop: 8 },
  badgeText: { color: "#4A7C59", fontSize: 12 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  loading: { paddingVertical: 48 },
  title: { fontSize: 20, fontWeight: "700", color: "#1C1410", fontFamily: "PlayfairDisplay-Bold" },
  stats: { flexDirection: "row", marginTop: 20 },
  stat: { flex: 1, gap: 6, paddingHorizontal: 8 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: "rgba(148,163,184,0.16)" },
  statValue: { fontSize: 20, fontWeight: "700", color: "#A8662F" },
  label: { fontSize: 12, color: "#8B6F47", lineHeight: 18 },
  scope: { fontSize: 12, color: "#8B6F47", marginTop: 12, lineHeight: 18 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  statusItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusText: { color: "#6B5744", fontSize: 12 },
  statusNumber: { color: "#1C1410", fontWeight: "700" },
  subtitle: { fontSize: 12, color: "#8B6F47", marginTop: 6, marginBottom: 20, lineHeight: 18 },
  eyebrow: { color: "#A8662F", fontSize: 12, fontWeight: "600", letterSpacing: 1, marginBottom: 8 },
  channelRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
  channelBorder: { borderTopWidth: 1, borderTopColor: "#E8DDD0" },
  channelIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  channelInfo: { flex: 1 },
  body: { fontSize: 14, color: "#1C1410", lineHeight: 20 },
  channelCount: { fontSize: 20, fontWeight: "700" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 16 },
  link: { fontSize: 14, color: "#A8662F", fontWeight: "600" },
  bookingStrip: { gap: 12, paddingBottom: 2 },
  emptyAction: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16, paddingVertical: 8 },
  error: { color: "#B74E42", fontSize: 14 },
});