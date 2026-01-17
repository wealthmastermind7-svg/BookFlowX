import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ImageBackground,
  Dimensions,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Path, Defs, LinearGradient, Stop, Line } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { api, Booking, DashboardStats, Business } from "@/lib/api";
import { formatPrice } from "@/lib/currency";
import { usePremium } from "@/contexts/PremiumContext";
import { Spacing, BorderRadius } from "@/constants/theme";

const smokeBackground = require("@assets/generated_images/abstract_dark_smoke_fluid_motion.png");

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

function GlassPanel({ children, style }: { children: React.ReactNode; style?: any }) {
  if (Platform.OS === "ios") {
    return (
      <BlurView intensity={20} tint="dark" style={[styles.glassPanel, style]}>
        <View style={styles.glassPanelInner}>{children}</View>
      </BlurView>
    );
  }
  return (
    <View style={[styles.glassPanel, styles.glassPanelAndroid, style]}>
      {children}
    </View>
  );
}

function CircularMeterGlass({
  percentage,
  label,
  size = 96,
}: {
  percentage: number;
  label: string;
  size?: number;
}) {
  const progress = useSharedValue(0);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - percentage / 100);

  useEffect(() => {
    progress.value = withTiming(percentage / 100, {
      duration: 1200,
      easing: Easing.bezier(0.4, 0.0, 0.2, 1),
    });
  }, [percentage]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={styles.meterContainer}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Circle
            cx="50"
            cy="50"
            r={radius}
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={3}
            fill="transparent"
          />
          <AnimatedCircle
            cx="50"
            cy="50"
            r={radius}
            stroke="white"
            strokeWidth={3}
            fill="transparent"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
        </Svg>
        <View style={styles.meterCenterContent}>
          <Animated.Text style={styles.meterPercentage}>
            {Math.round(percentage)}%
          </Animated.Text>
          <Animated.Text style={styles.meterLabel}>{label}</Animated.Text>
        </View>
      </View>
    </View>
  );
}

function RevenueChart({ data }: { data: { label: string; value: number }[] }) {
  const progress = useSharedValue(0);
  const graphWidth = SCREEN_WIDTH - 80;
  const graphHeight = 100;

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: 1500,
      easing: Easing.bezier(0.4, 0.0, 0.2, 1),
    });
  }, []);

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minValue = Math.min(...data.map((d) => d.value));
  const valueRange = maxValue - minValue || 1;

  const points = data.map((point, index) => {
    const x = (index / (data.length - 1)) * graphWidth;
    const y = graphHeight - 20 - ((point.value - minValue) / valueRange) * (graphHeight - 40);
    return { x, y };
  });

  const pathData = points
    .map((point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      const prev = points[index - 1];
      const cpx1 = prev.x + (point.x - prev.x) / 2;
      const cpy1 = prev.y;
      const cpx2 = prev.x + (point.x - prev.x) / 2;
      const cpy2 = point.y;
      return `C ${cpx1} ${cpy1} ${cpx2} ${cpy2} ${point.x} ${point.y}`;
    })
    .join(" ");

  const areaPath = `${pathData} L ${graphWidth} ${graphHeight} L 0 ${graphHeight} Z`;

  const pathLength = graphWidth * 3;

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: pathLength * (1 - progress.value),
  }));

  return (
    <View style={styles.chartContainer}>
      <Svg width={graphWidth} height={graphHeight + 10} style={{ overflow: "visible" }}>
        <Defs>
          <LinearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
            <Stop offset="50%" stopColor="white" />
            <Stop offset="100%" stopColor="rgba(255,255,255,0.8)" />
          </LinearGradient>
          <LinearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
            <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#areaGrad)" opacity={0.5} />
        <AnimatedPath
          d={pathData}
          fill="none"
          stroke="white"
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={pathLength}
          animatedProps={animatedProps}
        />
      </Svg>
    </View>
  );
}

function BookingCardGlass({
  customerName,
  serviceName,
  date,
  time,
  isPremium,
  status,
  confirmationSentAt,
  reminder24hSentAt,
  reminder2hSentAt,
  onPress,
}: {
  customerName: string;
  serviceName: string;
  date: string;
  time: string;
  isPremium?: boolean;
  status: string;
  confirmationSentAt?: string | null;
  reminder24hSentAt?: string | null;
  reminder2hSentAt?: string | null;
  onPress?: () => void;
}) {
  const { theme } = useTheme();
  const handlePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    onPress?.();
  };

  return (
    <Pressable onPress={handlePress}>
      <GlassPanel style={styles.bookingCard}>
        <View style={styles.bookingHeader}>
          <View style={styles.bookingAvatar}>
            <Feather name="user" size={14} color="white" />
          </View>
          <View style={styles.bookingInfo}>
            <Animated.Text style={styles.bookingName}>{customerName}</Animated.Text>
            <Animated.Text style={styles.bookingService}>{serviceName}</Animated.Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  status === "confirmed" || status === "completed"
                    ? "#22C55E"
                    : status === "pending"
                    ? "#F59E0B"
                    : "#6B7280",
              },
            ]}
          >
            <Feather
              name={
                status === "confirmed"
                  ? "check-circle"
                  : status === "pending"
                  ? "clock"
                  : status === "completed"
                  ? "check"
                  : "x-circle"
              }
              size={14}
              color="white"
            />
          </View>
        </View>

        <View style={styles.bookingDetails}>
          <View style={styles.bookingDetailItem}>
            <Feather name="calendar" size={12} color="rgba(255,255,255,0.6)" />
            <Animated.Text style={styles.bookingDetailText}>{date}</Animated.Text>
          </View>
          <View style={styles.bookingDetailItem}>
            <Feather name="clock" size={12} color="rgba(255,255,255,0.6)" />
            <Animated.Text style={styles.bookingDetailText}>{time}</Animated.Text>
          </View>
        </View>

        <View style={styles.progressRowGlass}>
          <View style={styles.progressItem}>
            <View
              style={[
                styles.progressTick,
                confirmationSentAt ? styles.progressTickActive : styles.progressTickInactive,
              ]}
            >
              <Feather
                name="check"
                size={8}
                color={confirmationSentAt ? "#fff" : "rgba(255,255,255,0.4)"}
              />
            </View>
            <Animated.Text
              style={[styles.progressLabel, confirmationSentAt && styles.progressLabelActive]}
            >
              Conf
            </Animated.Text>
          </View>
          <View style={styles.progressItem}>
            <View
              style={[
                styles.progressTick,
                reminder24hSentAt ? styles.progressTickActive : styles.progressTickInactive,
              ]}
            >
              <Feather
                name="check"
                size={8}
                color={reminder24hSentAt ? "#fff" : "rgba(255,255,255,0.4)"}
              />
            </View>
            <Animated.Text
              style={[styles.progressLabel, reminder24hSentAt && styles.progressLabelActive]}
            >
              24h
            </Animated.Text>
          </View>
          <View style={styles.progressItem}>
            <View
              style={[
                styles.progressTick,
                reminder2hSentAt ? styles.progressTickActive : styles.progressTickInactive,
              ]}
            >
              <Feather
                name="check"
                size={8}
                color={reminder2hSentAt ? "#fff" : "rgba(255,255,255,0.4)"}
              />
            </View>
            <Animated.Text
              style={[styles.progressLabel, reminder2hSentAt && styles.progressLabelActive]}
            >
              2h
            </Animated.Text>
          </View>
        </View>
      </GlassPanel>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { isPremium, showPaywall } = usePremium();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);

  const fadeIn = useSharedValue(0);

  useEffect(() => {
    fadeIn.value = withTiming(1, { duration: 800 });
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
          loadData();
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
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

  const paidCount = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "completed" || b.paymentStatus === "paid"
  ).length;
  const unpaidCount = bookings.filter((b) => b.status === "pending").length;
  const totalBookings = Math.max(paidCount + unpaidCount, 1);
  const paidPercentage = Math.round((paidCount / totalBookings) * 100);
  const unpaidPercentage = Math.round((unpaidCount / totalBookings) * 100);
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

  const containerStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
  }));

  return (
    <ImageBackground source={smokeBackground} style={styles.background} resizeMode="cover">
      <Animated.View style={[styles.container, containerStyle]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + 20,
              paddingBottom: tabBarHeight + 40,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.Text style={styles.headerTitle}>BookFlow</Animated.Text>

          <GlassPanel style={styles.revenueCard}>
            <Animated.Text style={styles.revenueLabel}>Total Revenue</Animated.Text>
            <Animated.Text style={styles.revenueValue}>
              {formatPrice(Math.round(totalRevenue * 100), business?.currency || "USD")}
            </Animated.Text>
          </GlassPanel>

          {!isPremium && (
            <Pressable onPress={() => showPaywall("soft_upsell")}>
              <GlassPanel style={styles.premiumBanner}>
                <View style={styles.premiumIconContainer}>
                  <Feather name="zap" size={16} color="white" />
                </View>
                <View style={styles.premiumContent}>
                  <Animated.Text style={styles.premiumTitle}>Grow faster with Premium</Animated.Text>
                  <Animated.Text style={styles.premiumSubtitle}>
                    Unlimited booking links, QR codes, and website embeds
                  </Animated.Text>
                </View>
                <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.6)" />
              </GlassPanel>
            </Pressable>
          )}

          <View style={styles.metersRow}>
            <GlassPanel style={styles.meterCard}>
              <CircularMeterGlass percentage={paidPercentage} label="Paid" />
            </GlassPanel>
            <GlassPanel style={styles.meterCard}>
              <CircularMeterGlass percentage={unpaidPercentage} label="Unpaid" />
            </GlassPanel>
          </View>

          <GlassPanel style={styles.chartCard}>
            <Animated.Text style={styles.chartTitle}>Revenue This Week</Animated.Text>
            <RevenueChart data={graphData} />
          </GlassPanel>

          <View style={styles.bookingsSection}>
            <View style={styles.bookingsHeader}>
              <Animated.Text style={styles.bookingsTitle}>Bookings & Reminders</Animated.Text>
              <Pressable
                onPress={() => setShowAllBookings(!showAllBookings)}
                style={styles.toggleButton}
              >
                <Animated.Text style={styles.toggleText}>
                  {showAllBookings ? "All" : "This Week"}
                </Animated.Text>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bookingsScroll}
              snapToInterval={280}
              decelerationRate="fast"
            >
              {upcomingBookings.length > 0 ? (
                upcomingBookings.map((booking) => (
                  <BookingCardGlass
                    key={booking.id}
                    customerName={booking.customerName || "Customer"}
                    serviceName={booking.serviceName || "Service"}
                    date={booking.date}
                    time={booking.time}
                    status={booking.status}
                    isPremium={booking.status === "confirmed"}
                    confirmationSentAt={booking.confirmationSentAt}
                    reminder24hSentAt={booking.reminder24hSentAt}
                    reminder2hSentAt={booking.reminder2hSentAt}
                    onPress={async () => {
                      if (booking.status === "pending") {
                        try {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
                            () => {}
                          );
                        } catch {}
                        try {
                          await api.updateBooking(booking.id, { status: "confirmed" });
                          loadData();
                        } catch (error) {
                          console.error("Error confirming booking:", error);
                        }
                      }
                    }}
                  />
                ))
              ) : (
                <GlassPanel style={styles.emptyBookingCard}>
                  <Animated.Text style={styles.emptyText}>No upcoming bookings</Animated.Text>
                </GlassPanel>
              )}
            </ScrollView>
          </View>
        </ScrollView>
      </Animated.View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: "#000",
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 16,
    textShadowColor: "rgba(255,255,255,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  glassPanel: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  glassPanelInner: {
    padding: 0,
  },
  glassPanelAndroid: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  revenueCard: {
    padding: 32,
    alignItems: "center",
  },
  revenueLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 8,
    fontWeight: "500",
  },
  revenueValue: {
    fontSize: 56,
    fontWeight: "700",
    color: "#fff",
    textShadowColor: "rgba(255,255,255,0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  premiumBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    gap: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  premiumIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#06B6D4",
    justifyContent: "center",
    alignItems: "center",
  },
  premiumContent: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  premiumSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    lineHeight: 18,
  },
  metersRow: {
    flexDirection: "row",
    gap: 16,
  },
  meterCard: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  meterContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  meterCenterContent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  meterPercentage: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  meterLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  chartCard: {
    padding: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: "center",
  },
  bookingsSection: {
    marginTop: 8,
  },
  bookingsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  bookingsTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  toggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
  },
  bookingsScroll: {
    paddingRight: 20,
    gap: 16,
  },
  bookingCard: {
    width: 280,
    padding: 16,
  },
  bookingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  bookingAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  bookingInfo: {
    flex: 1,
  },
  bookingName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  bookingService: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },
  statusBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  bookingDetails: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  bookingDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bookingDetailText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  progressRowGlass: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  progressItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  progressTick: {
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  progressTickActive: {
    backgroundColor: "#22C55E",
  },
  progressTickInactive: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  progressLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
  },
  progressLabelActive: {
    color: "rgba(255,255,255,0.8)",
  },
  emptyBookingCard: {
    width: 260,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },
});
