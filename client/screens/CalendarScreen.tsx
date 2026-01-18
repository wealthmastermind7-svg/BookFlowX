import React, { useState, useEffect } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  ImageBackground,
  Dimensions,
  Platform,
  ScrollView,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";

import { api, Booking } from "@/lib/api";
import { CalendarStackParamList } from "@/navigation/CalendarStackNavigator";
import { Spacing, BorderRadius } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const shadowBackground = require("../../attached_assets/stock_images/abstract_dark_fluid__e119120c.jpg");

type CalendarScreenNavigationProp = NativeStackNavigationProp<CalendarStackParamList, "CalendarMain">;

function GlassPanel({ children, style }: { children: React.ReactNode; style?: any }) {
  if (Platform.OS === "ios") {
    return (
      <BlurView intensity={20} tint="dark" style={[styles.glassPanel, style]}>
        {children}
      </BlurView>
    );
  }
  return (
    <View style={[styles.glassPanel, styles.glassPanelAndroid, style]}>
      {children}
    </View>
  );
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<CalendarScreenNavigationProp>();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const fadeIn = useSharedValue(0);

  useEffect(() => {
    fadeIn.value = withTiming(1, { duration: 800 });
    initializeBusiness();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (api.getBusinessId()) {
        loadBookings();
      }
    }, [])
  );

  const initializeBusiness = async () => {
    try {
      await api.getOrCreateBusiness();
      loadBookings();
    } catch (error) {
      console.error("Error initializing business:", error);
      setLoading(false);
    }
  };

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await api.getBookings();
      setBookings(data);
    } catch (error) {
      console.error("Error loading bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const selectedDateStr = selectedDate.split("T")[0];
  const bookingsForSelectedDate = bookings.filter((b) => b.date === selectedDateStr);

  const handleOpenAvailability = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    navigation.navigate("AvailabilityEditor");
  };

  const handleOpenBlockedSlots = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    navigation.navigate("BlockedSlots", { date: selectedDateStr });
  };

  const monthName = currentMonth.toLocaleDateString("en-US", { month: "long" }).toUpperCase();
  const yearName = currentMonth.getFullYear();

  const containerStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
  }));

  const renderDay = (day: number | null, index: number) => {
    if (day === null) return <View key={`empty-${index}`} style={styles.dayCell} />;

    const dateStr = `${currentMonth.getFullYear()}-${String(
      currentMonth.getMonth() + 1
    ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isSelected = dateStr === selectedDateStr;
    const hasBookings = bookings.some((b) => b.date === dateStr);

    return (
      <Pressable
        key={dateStr}
        onPress={() => setSelectedDate(dateStr)}
        style={styles.dayCell}
      >
        <View
          style={[
            styles.dayCircle,
            isSelected && styles.dayCircleSelected,
            !isSelected && hasBookings && styles.dayCircleHasBooking,
          ]}
        >
          <Animated.Text
            style={[
              styles.dayText,
              isSelected && styles.dayTextSelected,
            ]}
          >
            {day}
          </Animated.Text>
        </View>
      </Pressable>
    );
  };

  const calendarData = [...emptyDays.map(() => null), ...days];

  return (
    <ImageBackground source={shadowBackground} style={styles.background} resizeMode="cover">
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
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Animated.Text style={styles.giantMonth} numberOfLines={1} adjustsFontSizeToFit>{monthName}</Animated.Text>
              <Animated.Text style={styles.hugeYear}>{yearName}</Animated.Text>
            </View>
            <View style={styles.headerControls}>
              <Animated.Text style={styles.setupText}>Set up your business hours</Animated.Text>
              <Pressable onPress={handleOpenAvailability} style={styles.glassButtonSmall}>
                <Feather name="clock" size={14} color="white" />
                <Animated.Text style={styles.buttonTextSmall}>Set Hours</Animated.Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.calendarGrid}>
            <View style={styles.weekDaysHeader}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <Animated.Text key={d} style={styles.weekDayText}>{d}</Animated.Text>
              ))}
            </View>
            <View style={styles.datesGrid}>
              {calendarData.map((day, i) => renderDay(day, i))}
            </View>
          </View>

          <View style={styles.bookingsHeader}>
            <View>
              <Animated.Text style={styles.bookingsCount}>
                {bookingsForSelectedDate.length} booking{bookingsForSelectedDate.length !== 1 ? "s" : ""}
              </Animated.Text>
              <Animated.Text style={styles.selectedDateSub}>
                {new Date(selectedDate).toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' })}
              </Animated.Text>
            </View>
            <Pressable onPress={handleOpenBlockedSlots} style={styles.glassButtonSmall}>
              <Feather name="slash" size={14} color="rgba(255,255,255,0.6)" />
              <Animated.Text style={styles.buttonTextSmall}>Block Times</Animated.Text>
            </Pressable>
          </View>

          <View style={styles.bookingsList}>
            {bookingsForSelectedDate.map((item) => (
              <GlassPanel key={item.id} style={styles.bookingCard}>
                <View style={styles.bookingCardHeader}>
                  <View>
                    <Animated.Text style={styles.customerName}>{item.customerName}'s</Animated.Text>
                    <Animated.Text style={styles.serviceName}>{item.serviceName}</Animated.Text>
                  </View>
                  <View style={styles.clockIconContainer}>
                    <Feather name="clock" size={14} color="black" />
                  </View>
                </View>
                <View style={styles.bookingCardDetails}>
                  <View style={styles.detailItem}>
                    <Feather name="calendar" size={14} color="rgba(255,255,255,0.6)" />
                    <Animated.Text style={styles.detailText}>{item.date}</Animated.Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Feather name="clock" size={14} color="rgba(255,255,255,0.6)" />
                    <Animated.Text style={styles.detailText}>{item.time}</Animated.Text>
                  </View>
                </View>
                <View style={styles.bookingCardFooter}>
                  <View style={styles.footerItem}>
                    <Feather name="check-circle" size={14} color={item.confirmationSentAt ? "white" : "rgba(255,255,255,0.4)"} />
                    <Animated.Text style={[styles.footerText, item.confirmationSentAt && styles.footerTextActive]}>Confirmation</Animated.Text>
                  </View>
                  <View style={styles.footerItem}>
                    <Feather name="check-circle" size={14} color={item.reminder24hSentAt ? "white" : "rgba(255,255,255,0.4)"} />
                    <Animated.Text style={[styles.footerText, item.reminder24hSentAt && styles.footerTextActive]}>24-Hour</Animated.Text>
                  </View>
                  <View style={styles.footerItem}>
                    <Feather name="check-circle" size={14} color={item.reminder2hSentAt ? "white" : "rgba(255,255,255,0.4)"} />
                    <Animated.Text style={[styles.footerText, item.reminder2hSentAt && styles.footerTextActive]}>2-Hour</Animated.Text>
                  </View>
                </View>
              </GlassPanel>
            ))}
            {bookingsForSelectedDate.length === 0 && (
              <GlassPanel style={styles.emptyCard}>
                <Animated.Text style={styles.emptyText}>No bookings scheduled for this date</Animated.Text>
              </GlassPanel>
            )}
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
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 24,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 12,
    flexWrap: "nowrap",
  },
  giantMonth: {
    fontSize: 72,
    fontWeight: "300",
    color: "#fff",
    letterSpacing: -2,
    lineHeight: 80,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  hugeYear: {
    fontSize: 56,
    fontWeight: "300",
    color: "#fff",
    letterSpacing: -1,
    marginTop: -4,
    lineHeight: 60,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  setupText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  glassButtonSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonTextSmall: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
  },
  calendarGrid: {
    marginBottom: 32,
  },
  weekDaysHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  weekDayText: {
    width: "14.28%",
    textAlign: "center",
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "600",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  datesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  dayCircleSelected: {
    backgroundColor: "white",
  },
  dayCircleHasBooking: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  dayText: {
    fontSize: 18,
    color: "white",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  dayTextSelected: {
    color: "black",
    fontWeight: "600",
  },
  bookingsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 20,
  },
  bookingsCount: {
    fontSize: 36,
    fontWeight: "700",
    color: "white",
  },
  selectedDateSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginTop: 4,
  },
  bookingsList: {
    gap: 16,
  },
  glassPanel: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
  },
  glassPanelAndroid: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  bookingCard: {
    padding: 20,
  },
  bookingCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  customerName: {
    fontSize: 20,
    fontWeight: "500",
    color: "white",
  },
  serviceName: {
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
    marginTop: 2,
  },
  clockIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  bookingCardDetails: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 20,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: "white",
    fontWeight: "300",
  },
  bookingCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
  },
  footerTextActive: {
    color: "white",
  },
  emptyCard: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
  },
});
