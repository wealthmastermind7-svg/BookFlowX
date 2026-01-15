import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { api, TimeSlot, BlockedSlot } from "@/lib/api";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { CalendarStackParamList } from "@/navigation/CalendarStackNavigator";

type BlockedSlotsNavigationProp = NativeStackNavigationProp<
  CalendarStackParamList,
  "BlockedSlots"
>;

type BlockedSlotsRouteProp = RouteProp<CalendarStackParamList, "BlockedSlots">;

function formatTime12Hour(time24: string): string {
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function formatDateForDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  const date = new Date(`${year}-${month}-${day}`);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function BlockedSlotsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<BlockedSlotsNavigationProp>();
  const route = useRoute<BlockedSlotsRouteProp>();
  const { theme } = useTheme();
  const { date } = route.params;

  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [date]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [slotsData, blockedData] = await Promise.all([
        api.getTimeSlots(date),
        api.getBlockedSlotsByDate(date),
      ]);
      setSlots(slotsData);
      setBlockedSlots(blockedData);
    } catch (error) {
      console.error("Error loading slots:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSlot = async (time: string, isCurrentlyBlocked: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setUpdating(time);
    
    try {
      if (isCurrentlyBlocked) {
        await api.unblockSlot(date, time);
        setBlockedSlots((prev) => prev.filter((b) => b.time !== time));
        setSlots((prev) =>
          prev.map((s) =>
            s.time === time ? { ...s, available: true, isBlocked: false } : s
          )
        );
      } else {
        const newBlockedSlot = await api.blockSlot(date, time);
        setBlockedSlots((prev) => [...prev, newBlockedSlot]);
        setSlots((prev) =>
          prev.map((s) =>
            s.time === time ? { ...s, available: false, isBlocked: true } : s
          )
        );
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error toggling slot:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Error",
        isCurrentlyBlocked
          ? "Failed to unblock this time slot"
          : "Failed to block this time slot"
      );
    } finally {
      setUpdating(null);
    }
  };

  const isSlotBlocked = (time: string) => {
    return blockedSlots.some((b) => b.time === time);
  };

  const isSlotBooked = (slot: TimeSlot) => {
    return !slot.available && !isSlotBlocked(slot.time);
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.text} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        contentContainerStyle={[
          styles.content,
          { paddingTop: Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
        ]}
      >
        <ThemedText type="h4" style={styles.dateTitle}>
          {formatDateForDisplay(date)}
        </ThemedText>
        
        <ThemedText type="body" style={styles.description}>
          Tap a time slot to block or unblock it. Blocked slots will not be available for customers to book.
        </ThemedText>

        {slots.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Feather name="calendar" size={48} color={theme.textSecondary} />
            <ThemedText type="body" style={styles.emptyText}>
              No time slots available for this day.
            </ThemedText>
            <ThemedText type="small" style={styles.emptySubtext}>
              Check your business hours settings.
            </ThemedText>
          </Card>
        ) : (
          <View style={styles.slotsGrid}>
            {slots.map((slot) => {
              const blocked = isSlotBlocked(slot.time);
              const booked = isSlotBooked(slot);
              const isUpdating = updating === slot.time;

              return (
                <Pressable
                  key={slot.time}
                  onPress={() => {
                    if (!booked && !isUpdating) {
                      handleToggleSlot(slot.time, blocked);
                    }
                  }}
                  disabled={booked || isUpdating}
                  style={[
                    styles.slotButton,
                    {
                      backgroundColor: blocked
                        ? theme.error || "#DC2626"
                        : booked
                        ? theme.backgroundSecondary
                        : theme.backgroundRoot,
                      borderColor: blocked
                        ? theme.error || "#DC2626"
                        : booked
                        ? theme.borderLight
                        : theme.border,
                      opacity: booked ? 0.5 : 1,
                    },
                  ]}
                >
                  {isUpdating ? (
                    <ActivityIndicator size="small" color={blocked ? "#fff" : theme.text} />
                  ) : (
                    <>
                      <ThemedText
                        type="body"
                        style={[
                          styles.slotTime,
                          { color: blocked ? "#fff" : theme.text },
                        ]}
                      >
                        {slot.time}
                      </ThemedText>
                      <View style={styles.slotStatus}>
                        {blocked ? (
                          <>
                            <Feather name="x-circle" size={14} color="#fff" />
                            <ThemedText
                              type="small"
                              style={[styles.slotStatusText, { color: "#fff" }]}
                            >
                              Blocked
                            </ThemedText>
                          </>
                        ) : booked ? (
                          <>
                            <Feather name="user" size={14} color={theme.textSecondary} />
                            <ThemedText
                              type="small"
                              style={[
                                styles.slotStatusText,
                                { color: theme.textSecondary },
                              ]}
                            >
                              Booked
                            </ThemedText>
                          </>
                        ) : (
                          <>
                            <Feather name="check-circle" size={14} color={theme.success || "#10B981"} />
                            <ThemedText
                              type="small"
                              style={[
                                styles.slotStatusText,
                                { color: theme.success || "#10B981" },
                              ]}
                            >
                              Available
                            </ThemedText>
                          </>
                        )}
                      </View>
                    </>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        {blockedSlots.length > 0 && (
          <View style={styles.summarySection}>
            <ThemedText type="h4" style={styles.summaryTitle}>
              Blocked Time Slots
            </ThemedText>
            <ThemedText type="body" style={styles.summaryCount}>
              {blockedSlots.length} slot{blockedSlots.length !== 1 ? "s" : ""} blocked for this day
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  dateTitle: {
    marginBottom: Spacing.sm,
  },
  description: {
    marginBottom: Spacing.xl,
    opacity: 0.7,
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing["3xl"],
  },
  emptyText: {
    marginTop: Spacing.lg,
    textAlign: "center",
    opacity: 0.7,
  },
  emptySubtext: {
    marginTop: Spacing.sm,
    textAlign: "center",
    opacity: 0.5,
  },
  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  slotButton: {
    width: "47%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  slotTime: {
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  slotStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  slotStatusText: {
    fontSize: 12,
  },
  summarySection: {
    marginTop: Spacing["3xl"],
    paddingTop: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  summaryTitle: {
    marginBottom: Spacing.sm,
  },
  summaryCount: {
    opacity: 0.7,
  },
});
