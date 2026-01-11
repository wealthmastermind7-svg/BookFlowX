import React, { useState, useEffect } from "react";
import { View, FlatList, StyleSheet, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { api, Booking } from "@/lib/api";
import { CalendarDay } from "@/components/CalendarDay";
import { BookingCard } from "@/components/BookingCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Feather } from "@expo/vector-icons";
import { CalendarStackParamList } from "@/navigation/CalendarStackNavigator";

type CalendarScreenNavigationProp = NativeStackNavigationProp<CalendarStackParamList, "CalendarMain">;

export default function CalendarScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<CalendarScreenNavigationProp>();
  const { theme } = useTheme();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  const hasBookingOnDate = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(
      currentMonth.getMonth() + 1
    ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return bookings.some((b) => b.date === dateStr);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const selectedDateStr = selectedDate.split("T")[0];
  const bookingsForSelectedDate = bookings.filter((b) => b.date === selectedDateStr);

  const handlePrevMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleOpenAvailability = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("AvailabilityEditor");
  };

  const monthName = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const formatDateForDisplay = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-");
    const date = new Date(`${year}-${month}-${day}`);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const renderDay = ({ item, index }: { item: number; index: number }) => {
    if (emptyDays.includes(index)) {
      return <View style={styles.emptyDay} />;
    }

    const day = days[index - firstDay];
    if (!day) return <View style={styles.emptyDay} />;

    const dateStr = `${currentMonth.getFullYear()}-${String(
      currentMonth.getMonth() + 1
    ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    return (
      <CalendarDay
        day={day}
        isSelected={dateStr === selectedDateStr}
        hasBookings={hasBookingOnDate(day)}
        isToday={isToday(day)}
        isDisabled={false}
        onPress={() => setSelectedDate(dateStr)}
      />
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: headerHeight + Spacing.lg }]}>
        <View style={styles.headerRow}>
          <ThemedText type="h3" style={styles.monthTitle}>
            {monthName}
          </ThemedText>
          <View style={styles.headerActions}>
            <ThemedText type="small" style={styles.setupText}>Set up your business hours</ThemedText>
            <Pressable
              onPress={handleOpenAvailability}
              style={[styles.hoursButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <Feather name="clock" size={16} color={theme.text} />
              <ThemedText type="small" style={styles.hoursButtonText}>
                Hours
              </ThemedText>
            </Pressable>
          </View>
        </View>
        <View style={styles.weekDays}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <ThemedText key={day} type="small" style={styles.weekDay}>
              {day}
            </ThemedText>
          ))}
        </View>
      </View>

      <FlatList
        scrollEnabled={false}
        numColumns={7}
        data={Array(emptyDays.length + days.length).fill(null)}
        renderItem={renderDay}
        keyExtractor={(_, index) => index.toString()}
        style={styles.grid}
        columnWrapperStyle={styles.row}
      />

      <View
        style={[
          styles.bookingsSection,
          { paddingBottom: tabBarHeight + Spacing.xl },
        ]}
      >
        <View style={styles.bookingsTitleContainer}>
          <ThemedText type="h4" style={styles.bookingsTitle}>
            {bookingsForSelectedDate.length > 0
              ? `${bookingsForSelectedDate.length} booking${
                  bookingsForSelectedDate.length !== 1 ? "s" : ""
                }`
              : "No bookings"}
          </ThemedText>
          {!loading && (
            <ThemedText type="small" style={styles.selectedDateLabel}>
              {formatDateForDisplay(selectedDateStr)}
            </ThemedText>
          )}
        </View>
        {bookingsForSelectedDate.length > 0 ? (
          <FlatList
            scrollEnabled={false}
            data={bookingsForSelectedDate}
            renderItem={({ item }) => (
              <BookingCard
                customerName={item.customerName || "Customer"}
                serviceName={item.serviceName || "Service"}
                date={item.date}
                time={item.time}
                status={item.status as "pending" | "confirmed" | "completed" | "cancelled"}
              />
            )}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        ) : (
          <ThemedText type="body" style={styles.emptyBookingsText}>
            No bookings scheduled for this date
          </ThemedText>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  monthTitle: {},
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  setupText: {
    opacity: 0.6,
    fontStyle: "italic",
  },
  hoursButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    gap: Spacing.xs,
  },
  hoursButtonText: {
    fontWeight: "500",
  },
  weekDays: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  weekDay: {
    flex: 1,
    textAlign: "center",
    opacity: 0.6,
  },
  grid: {
    paddingHorizontal: Spacing.lg,
  },
  row: {
    justifyContent: "space-around",
    marginBottom: Spacing.lg,
  },
  emptyDay: {
    width: "14.2%",
  },
  bookingsSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  bookingsTitleContainer: {
    marginBottom: Spacing.lg,
  },
  bookingsTitle: {
    marginBottom: Spacing.xs,
  },
  selectedDateLabel: {
    opacity: 0.6,
  },
  emptyBookingsText: {
    opacity: 0.6,
    textAlign: "center",
    paddingVertical: Spacing.xl,
  },
  separator: {
    height: Spacing.lg,
  },
});
