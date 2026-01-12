import React, { useEffect, useState } from "react";
import { View, FlatList, StyleSheet, Pressable } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, AnimationConfig } from "@/constants/theme";
import { api, Booking, DashboardStats, Business } from "@/lib/api";
import { AnimatedMetricCard } from "@/components/AnimatedMetricCard";
import { LineGraph } from "@/components/LineGraph";
import { CircularMeter } from "@/components/CircularMeter";
import { BookingCard } from "@/components/BookingCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { PremiumBanner } from "@/components/PremiumBanner";
import { formatPrice } from "@/lib/currency";
import { usePremium } from "@/contexts/PremiumContext";

export default function DashboardScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { showPaywall } = usePremium();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);

  useEffect(() => {
    initializeBusiness();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (api.getBusinessId()) {
        loadData();
      }
    }, [])
  );

  const initializeBusiness = async () => {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await api.getOrCreateBusiness();
        const existingServices = await api.getServices();
        if (existingServices.length === 0) {
          await api.initializeDemoData();
        }
        loadData();
        return;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`Error initializing business (attempt ${attempt}/${maxRetries}): ${errorMsg}`);
        if (attempt === maxRetries) {
          // Show loading complete even if initialization fails
          loadData();
          return;
        }
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, bookingsData, businessData] = await Promise.all([
        api.getStats(),
        api.getBookings(),
        api.getBusiness(),
      ]);
      setStats(statsData);
      setBookings(bookingsData);
      if (businessData) setBusiness(businessData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const paidCount = bookings.filter((b) => b.paymentStatus === "paid").length;
  const unpaidCount = bookings.filter((b) => b.paymentStatus !== "paid").length;
  const totalRevenue = stats?.totalRevenue || 0;

  const upcomingBookings = bookings
    .filter((b) => b.status !== "cancelled")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, showAllBookings ? undefined : 3);

  const graphData = stats?.weeklyData?.map((d) => ({
    label: d.day,
    value: d.revenue * 100,
  })) || [
    { label: "Mon", value: 0 },
    { label: "Tue", value: 0 },
    { label: "Wed", value: 0 },
    { label: "Thu", value: 0 },
    { label: "Fri", value: 0 },
    { label: "Sat", value: 0 },
    { label: "Sun", value: 0 },
  ];

  const renderItem = ({ index }: { index: number }) => {
    switch (index) {
      case 0:
        return (
          <AnimatedMetricCard
            title="Total Revenue"
            value={formatPrice(Math.round(totalRevenue * 100), business?.currency || "USD")}
            style={styles.heroCard}
            delay={0}
          >
            <View style={styles.metersContainer}>
              <View style={styles.meterColumn}>
                <CircularMeter
                  value={paidCount}
                  maxValue={Math.max(paidCount + unpaidCount, 1)}
                  size={100}
                  label="Paid"
                />
              </View>
              <View style={styles.meterColumn}>
                <CircularMeter
                  value={unpaidCount}
                  maxValue={Math.max(paidCount + unpaidCount, 1)}
                  size={100}
                  label="Unpaid"
                />
              </View>
            </View>
          </AnimatedMetricCard>
        );
      case 1:
        return <LineGraph data={graphData} title="Revenue This Week" />;
      case 2:
        return (
          <Pressable onPress={() => showPaywall("soft_upsell")}>
            <PremiumBanner />
          </Pressable>
        );
      case 3:
        return (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="h3" style={styles.sectionTitle}>
                Bookings & Reminders
              </ThemedText>
              <Pressable
                onPress={() => setShowAllBookings(!showAllBookings)}
                style={({ pressed }) => [
                  styles.toggleButton,
                  { backgroundColor: pressed ? theme.text : theme.backgroundSecondary },
                ]}
              >
                <ThemedText
                  type="body"
                  style={[
                    styles.toggleButtonText,
                    { color: showAllBookings ? theme.text : theme.textSecondary },
                  ]}
                >
                  {showAllBookings ? "All" : "This Week"}
                </ThemedText>
              </Pressable>
            </View>
            {upcomingBookings.length > 0 ? (
              upcomingBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  customerName={booking.customerName || "Customer"}
                  serviceName={booking.serviceName || "Service"}
                  date={booking.date}
                  time={booking.time}
                  status={booking.status as "pending" | "confirmed" | "completed" | "cancelled"}
                  confirmationSentAt={booking.confirmationSentAt}
                  reminder24hSentAt={booking.reminder24hSentAt}
                  reminder2hSentAt={booking.reminder2hSentAt}
                />
              ))
            ) : (
              <View style={styles.emptyState}>
                <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
                  No upcoming bookings
                </ThemedText>
              </View>
            )}
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={[0, 1, 2, 3]}
        renderItem={renderItem}
        keyExtractor={(item) => item.toString()}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroCard: {
    marginBottom: Spacing.lg,
  },
  metersContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: Spacing.xl,
  },
  meterColumn: {
    alignItems: "center",
  },
  section: {
    marginTop: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    flex: 1,
  },
  toggleButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    padding: Spacing.xl,
    alignItems: "center",
  },
});
