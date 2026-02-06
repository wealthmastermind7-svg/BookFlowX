import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ImageBackground,
  Dimensions,
  Platform,
  Modal,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
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
import { api, Booking, DashboardStats, Business, getCustomerInsights, CustomerInsightsResult } from "@/lib/api";
import { formatPrice } from "@/lib/currency";
import { Text } from "react-native";
import { usePremium } from "@/contexts/PremiumContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useVoiceSubscription } from "@/hooks/useVoiceSubscription";
import { ThemedText } from "@/components/ThemedText";

type DashboardNavigation = NativeStackNavigationProp<RootStackParamList>;

const smokeBackground = require("../assets/stock_images/abstract_dark_fluid__e119120c.jpg");

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
  const navigation = useNavigation<DashboardNavigation>();
  const { isPremium, showPaywall } = usePremium();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);
  const [insights, setInsights] = useState<CustomerInsightsResult | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const fadeIn = useSharedValue(0);

  const [ownerToken, setOwnerToken] = useState<string | null>(null);
  const { data: voiceSubResult } = useVoiceSubscription(business?.id || "", ownerToken || "");
  const voiceSub = voiceSubResult;
  const remainingMinutes = voiceSub?.usage.remaining ?? 5;
  const isExhausted = voiceSub?.usage.available === false;
  const percentUsed = voiceSub?.usage.percentUsed || 0;

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
      if (businessData) {
        setBusiness(businessData);
        const token = await api.getOwnerToken();
        if (token) setOwnerToken(token);
        const insightsData = await getCustomerInsights(businessData.id);
        if (insightsData) setInsights(insightsData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const paidCount = bookings.filter((b) => b.paymentStatus === "paid").length;
  const unpaidCount = bookings.filter((b) => b.paymentStatus !== "paid").length;
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
    <View style={styles.background}>
      <View style={styles.backgroundOverlay} />
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
          <View style={styles.headerRow}>
            <Animated.Text style={styles.headerTitle}>BookFlow</Animated.Text>
          </View>

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
                  <Feather name="zap" size={20} color="#fff" />
                </View>
                <View style={styles.premiumContent}>
                  <Animated.Text style={styles.premiumTitle}>Enhance Your Booking Power</Animated.Text>
                  <Animated.Text style={styles.premiumSubtitle}>
                    Grow faster with smart reminders & automated upsells
                  </Animated.Text>
                  <View style={styles.premiumPricing}>
                    <Animated.Text style={styles.premiumPrice}>Explore Features</Animated.Text>
                    <View style={styles.premiumPriceDot} />
                    <Animated.Text style={styles.premiumPrice}>See Plans</Animated.Text>
                  </View>
                </View>
                <Feather name="arrow-right" size={20} color="rgba(255,255,255,0.4)" />
              </GlassPanel>
            </Pressable>
          )}

          <Pressable 
            onPress={() => {
              if (business?.slug) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                navigation.navigate("VoiceBooking", { businessSlug: business.slug });
              }
            }}
          >
            <GlassPanel style={styles.voiceAspirationalBanner}>
              <View style={styles.voiceAspirationalHeader}>
                <View style={styles.voiceIconStack}>
                  <Feather name="mic" size={16} color={isExhausted ? "#EF4444" : percentUsed > 0.8 ? "#F59E0B" : "rgba(255,255,255,0.5)"} />
                  <ThemedText style={{ fontSize: 10, fontWeight: "800", color: isExhausted ? "#EF4444" : percentUsed > 0.8 ? "#F59E0B" : "rgba(255,255,255,0.4)", marginLeft: 8 }}>
                    {isExhausted ? "ALLOWANCE REACHED" : `${remainingMinutes} MIN LEFT`}
                  </ThemedText>
                </View>
                <Animated.Text style={styles.voiceAspirationalTitle}>Elevate to Voice Booking</Animated.Text>
              </View>
              <Animated.Text style={styles.voiceAspirationalDesc}>
                {isExhausted 
                  ? "Your monthly allowance has been reached. Upgrade to continue assisting customers."
                  : "Let your business breathe with an Informational Assistant that handles calls naturally."}
              </Animated.Text>
              <View style={styles.voiceAspirationalAction}>
                <Animated.Text style={styles.voiceAspirationalLink}>
                  {isExhausted ? "UPGRADE NOW" : "PREVIEW EXPERIENCE"}
                </Animated.Text>
                <Feather name="chevron-right" size={14} color="rgba(255,255,255,0.3)" />
              </View>
            </GlassPanel>
          </Pressable>

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
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setSelectedBooking(booking);
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

          {insights && (insights.topCustomers.length > 0 || insights.atRiskCustomers.length > 0 || insights.mostFrequentServices.length > 0) && (
            <View style={styles.insightsSection}>
              <Animated.Text style={styles.sectionTitle}>Insights</Animated.Text>
              
              {insights.topCustomers.length > 0 && (
                <GlassPanel style={styles.insightCard}>
                  <View style={styles.insightHeader}>
                    <View style={[styles.insightIcon, { backgroundColor: "#10B981" }]}>
                      <Feather name="star" size={14} color="#fff" />
                    </View>
                    <Text style={styles.insightTitle}>Top Customers</Text>
                  </View>
                  {insights.topCustomers.slice(0, 3).map((customer, idx) => (
                    <View key={customer.id} style={styles.insightRow}>
                      <Text style={styles.insightName}>{customer.name}</Text>
                      <Text style={styles.insightValue}>
                        {formatPrice(Math.round(customer.totalSpend * 100), business?.currency || "USD")}
                      </Text>
                    </View>
                  ))}
                </GlassPanel>
              )}

              {insights.atRiskCustomers.length > 0 && (
                <GlassPanel style={styles.insightCard}>
                  <View style={styles.insightHeader}>
                    <View style={[styles.insightIcon, { backgroundColor: "#EF4444" }]}>
                      <Feather name="alert-circle" size={14} color="#fff" />
                    </View>
                    <Text style={styles.insightTitle}>At-Risk Customers</Text>
                  </View>
                  {insights.atRiskCustomers.slice(0, 3).map((customer) => (
                    <View key={customer.id} style={styles.insightRow}>
                      <Text style={styles.insightName}>{customer.name}</Text>
                      <Text style={styles.insightSubtext}>Last: {customer.lastBookingDate || "Never"}</Text>
                    </View>
                  ))}
                </GlassPanel>
              )}

              {insights.mostFrequentServices.length > 0 && (
                <GlassPanel style={styles.insightCard}>
                  <View style={styles.insightHeader}>
                    <View style={[styles.insightIcon, { backgroundColor: "#8B5CF6" }]}>
                      <Feather name="trending-up" size={14} color="#fff" />
                    </View>
                    <Text style={styles.insightTitle}>Popular Services</Text>
                  </View>
                  {insights.mostFrequentServices.slice(0, 3).map((service, idx) => (
                    <View key={idx} style={styles.insightRow}>
                      <Text style={styles.insightName}>{service.name}</Text>
                      <Text style={styles.insightValue}>{service.count} bookings</Text>
                    </View>
                  ))}
                </GlassPanel>
              )}

              <GlassPanel style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryNumber}>{insights.summary.totalCustomers}</Text>
                    <Text style={styles.summaryLabel}>Customers</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryNumber, { color: "#10B981" }]}>{insights.summary.vipCount}</Text>
                    <Text style={styles.summaryLabel}>VIP</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryNumber, { color: "#EF4444" }]}>{insights.summary.atRiskCount}</Text>
                    <Text style={styles.summaryLabel}>At Risk</Text>
                  </View>
                </View>
              </GlassPanel>
            </View>
          )}
        </ScrollView>
      </Animated.View>

      <Modal
        visible={selectedBooking !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBooking(null)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setSelectedBooking(null)}
        >
          <Pressable 
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <BlurView intensity={40} tint="dark" style={styles.modalBlur}>
              <View style={styles.modalHeader}>
                <Animated.Text style={styles.modalTitle}>Booking Details</Animated.Text>
                <Pressable onPress={() => setSelectedBooking(null)} style={styles.modalCloseButton}>
                  <Feather name="x" size={20} color="rgba(255,255,255,0.6)" />
                </Pressable>
              </View>

              {selectedBooking && (
                <View style={styles.modalBody}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Customer</Text>
                    <Text style={styles.detailValue}>{selectedBooking.customerName || "—"}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Service</Text>
                    <Text style={styles.detailValue}>{selectedBooking.serviceName || "—"}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedBooking.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Time</Text>
                    <Text style={styles.detailValue}>{selectedBooking.time}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <View style={[
                      styles.statusBadge,
                      selectedBooking.status === "confirmed" && styles.statusConfirmed,
                      selectedBooking.status === "pending" && styles.statusPending,
                      selectedBooking.status === "completed" && styles.statusCompleted,
                      selectedBooking.status === "cancelled" && styles.statusCancelled,
                    ]}>
                      <Text style={styles.statusText}>
                        {selectedBooking.status?.charAt(0).toUpperCase() + selectedBooking.status?.slice(1)}
                      </Text>
                    </View>
                  </View>

                  {selectedBooking.addons && (() => {
                    try {
                      const addonsArray = JSON.parse(selectedBooking.addons);
                      if (Array.isArray(addonsArray) && addonsArray.length > 0) {
                        return (
                          <View style={styles.addonsSection}>
                            <Text style={styles.addonsSectionTitle}>Add-ons</Text>
                            {addonsArray.map((addon: { name: string; price: number }, idx: number) => (
                              <View key={idx} style={styles.addonItem}>
                                <Text style={styles.addonName}>{addon.name}</Text>
                                <Text style={styles.addonPrice}>
                                  {formatPrice(addon.price * 100, business?.currency || "USD")}
                                </Text>
                              </View>
                            ))}
                          </View>
                        );
                      }
                      return null;
                    } catch {
                      return null;
                    }
                  })()}

                  <View style={[styles.detailRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>
                      {formatPrice(selectedBooking.totalPrice, business?.currency || "USD")}
                    </Text>
                  </View>

                  {selectedBooking.notes && (
                    <View style={styles.notesSection}>
                      <Text style={styles.notesLabel}>Notes</Text>
                      <Text style={styles.notesText}>{selectedBooking.notes}</Text>
                    </View>
                  )}

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Payment</Text>
                    <View style={[
                      styles.statusBadge,
                      selectedBooking.paymentStatus === "paid" ? styles.statusConfirmed : styles.statusPending
                    ]}>
                      <Text style={styles.statusText}>
                        {selectedBooking.paymentStatus?.toUpperCase() || "UNPAID"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.paymentActions}>
                    {selectedBooking.paymentStatus !== "paid" ? (
                      <Pressable
                        style={styles.confirmPaidButton}
                        onPress={async () => {
                          try {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                            await api.updateBooking(selectedBooking.id, { paymentStatus: "paid" });
                            setSelectedBooking(prev => prev ? { ...prev, paymentStatus: "paid" } : null);
                            loadData();
                          } catch (error) {
                            console.error("Error confirming payment:", error);
                          }
                        }}
                      >
                        <Feather name="dollar-sign" size={16} color="#000" />
                        <Text style={styles.confirmPaidButtonText}>Mark as Paid</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        style={styles.revertPaidButton}
                        onPress={async () => {
                          try {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                            await api.updateBooking(selectedBooking.id, { paymentStatus: "unpaid" });
                            setSelectedBooking(prev => prev ? { ...prev, paymentStatus: "unpaid" } : null);
                            loadData();
                          } catch (error) {
                            console.error("Error reverting payment:", error);
                          }
                        }}
                      >
                        <Feather name="rotate-ccw" size={16} color="rgba(255,255,255,0.6)" />
                        <Text style={styles.revertPaidButtonText}>Revert to Unpaid</Text>
                      </Pressable>
                    )}
                  </View>

                  {selectedBooking.status === "pending" && (
                    <Pressable
                      style={styles.confirmBookingButton}
                      onPress={async () => {
                        try {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                          await api.updateBooking(selectedBooking.id, { status: "confirmed" });
                          setSelectedBooking(null);
                          loadData();
                        } catch (error) {
                          console.error("Error confirming booking:", error);
                        }
                      }}
                    >
                      <Feather name="check" size={16} color="#000" />
                      <Text style={styles.confirmBookingText}>Confirm Booking</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </BlurView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: "#000",
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerVoiceButton: {
    overflow: "hidden",
    borderRadius: 20,
  },
  headerVoiceButtonGlass: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  headerVoiceButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    textShadowColor: "rgba(255,255,255,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    letterSpacing: -1.5,
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
    color: "#fff",
    marginBottom: 8,
    fontWeight: "600",
    opacity: 0.9,
  },
  revenueValue: {
    fontSize: 56,
    fontWeight: "800",
    color: "#fff",
    textShadowColor: "rgba(255,255,255,0.4)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
    letterSpacing: -2,
  },
  premiumBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    marginBottom: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  premiumIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  premiumContent: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  premiumSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 18,
    marginBottom: 8,
  },
  premiumPricing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  premiumPrice: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  premiumPriceDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  voiceAspirationalBanner: {
    padding: 24,
    marginBottom: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    backgroundColor: "rgba(255,255,255,0.01)",
  },
  voiceAspirationalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  voiceIconStack: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  voiceAspirationalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    letterSpacing: -0.5,
  },
  voiceAspirationalDesc: {
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
    lineHeight: 20,
    marginBottom: 16,
  },
  voiceAspirationalAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  voiceAspirationalLink: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255,255,255,0.3)",
    letterSpacing: 2,
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
  insightsSection: {
    marginTop: 24,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  insightCard: {
    padding: 16,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  insightIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  insightRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  insightName: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    flex: 1,
  },
  insightValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  insightSubtext: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
  },
  summaryCard: {
    padding: 20,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
  },
  summaryLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    overflow: "hidden",
  },
  modalBlur: {
    padding: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBody: {
    gap: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    textAlign: "right",
    flex: 1,
    marginLeft: 16,
  },
  statusConfirmed: {
    backgroundColor: "#22C55E",
  },
  statusPending: {
    backgroundColor: "#F59E0B",
  },
  statusCompleted: {
    backgroundColor: "#3B82F6",
  },
  statusCancelled: {
    backgroundColor: "#EF4444",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
    paddingHorizontal: 8,
  },
  addonsSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  addonsSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 12,
  },
  addonItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  addonName: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    flex: 1,
  },
  addonPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
  },
  totalValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  notesSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  notesLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    lineHeight: 20,
  },
  confirmBookingButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  confirmBookingText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  confirmPaidButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22C55E",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  confirmPaidButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  paymentActions: {
    marginTop: 8,
  },
  revertPaidButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  revertPaidButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
  },
});
