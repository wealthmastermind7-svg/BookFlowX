import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  ImageBackground,
  Platform,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

import { api, TimeSlot, BlockedSlot } from "@/lib/api";
import { CalendarStackParamList } from "@/navigation/CalendarStackNavigator";
import { Spacing, BorderRadius } from "@/constants/theme";

const shadowBackground = require("../../attached_assets/generated_images/abstract_black_and_white_shifting_shadows_background_for_block_slots.png");

type BlockedSlotsNavigationProp = NativeStackNavigationProp<
  CalendarStackParamList,
  "BlockedSlots"
>;

type BlockedSlotsRouteProp = RouteProp<CalendarStackParamList, "BlockedSlots">;

function GlassPanel({ children, style, type = "default" }: { children: React.ReactNode; style?: any; type?: "default" | "blocked" | "booked" }) {
  if (Platform.OS === "ios") {
    return (
      <BlurView 
        intensity={type === "blocked" ? 40 : 20} 
        tint={type === "blocked" ? "dark" : "light"} 
        style={[
          styles.glassPanel, 
          type === "blocked" && styles.glassPanelBlocked,
          type === "booked" && styles.glassPanelBooked,
          style
        ]}
      >
        {children}
      </BlurView>
    );
  }
  return (
    <View style={[
      styles.glassPanel, 
      styles.glassPanelAndroid, 
      type === "blocked" && styles.glassPanelBlockedAndroid,
      type === "booked" && styles.glassPanelBookedAndroid,
      style
    ]}>
      {children}
    </View>
  );
}

export default function BlockedSlotsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<BlockedSlotsNavigationProp>();
  const route = useRoute<BlockedSlotsRouteProp>();
  const { date } = route.params;

  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fadeIn = useSharedValue(0);

  useEffect(() => {
    fadeIn.value = withTiming(1, { duration: 800 });
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
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
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
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    } catch (error) {
      console.error("Error toggling slot:", error);
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
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

  const containerStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
  }));

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <ImageBackground source={shadowBackground} style={styles.background} resizeMode="cover">
      <Animated.View style={[styles.container, containerStyle]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable 
              onPress={() => navigation.goBack()} 
              style={({ pressed }) => [
                styles.backButton,
                { opacity: pressed ? 0.5 : 1 }
              ]}
            >
              <Feather name="arrow-left" size={24} color="#fff" />
            </Pressable>
            <Animated.Text style={styles.hugeTitle}>BLOCK SLOTS</Animated.Text>
            <Animated.Text style={styles.dateSubtitle}>
              {new Date(date).toLocaleDateString("en-US", { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </Animated.Text>
          </View>

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
                  style={styles.slotButton}
                >
                  <GlassPanel 
                    type={blocked ? "blocked" : booked ? "booked" : "default"}
                    style={styles.slotPanel}
                  >
                    {isUpdating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Animated.Text style={[
                          styles.slotTime,
                          blocked && styles.textBlocked,
                          booked && styles.textBooked
                        ]}>
                          {slot.time}
                        </Animated.Text>
                        <View style={styles.statusRow}>
                          {blocked ? (
                            <>
                              <Feather name="x-circle" size={14} color="rgba(255,255,255,0.6)" />
                              <Animated.Text style={styles.statusTextBlocked}>Blocked</Animated.Text>
                            </>
                          ) : booked ? (
                            <>
                              <Feather name="user" size={14} color="rgba(255,255,255,0.4)" />
                              <Animated.Text style={styles.statusTextBooked}>Booked</Animated.Text>
                            </>
                          ) : (
                            <>
                              <Feather name="check-circle" size={14} color="#fff" />
                              <Animated.Text style={styles.statusTextAvailable}>Available</Animated.Text>
                            </>
                          )}
                        </View>
                      </>
                    )}
                  </GlassPanel>
                </Pressable>
              );
            })}
          </View>

          {slots.length === 0 && (
            <GlassPanel style={styles.emptyCard}>
              <Feather name="calendar" size={48} color="rgba(255,255,255,0.2)" />
              <Animated.Text style={styles.emptyText}>No time slots available for this day.</Animated.Text>
              <Animated.Text style={styles.emptySubtext}>Check your business hours settings.</Animated.Text>
            </GlassPanel>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 40,
    alignItems: "center",
    position: "relative",
    width: "100%",
  },
  backButton: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  hugeTitle: {
    fontSize: 56,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -2,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  dateSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginTop: 8,
    textAlign: "center",
  },
  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
  },
  slotButton: {
    width: "47%",
  },
  slotPanel: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  glassPanel: {
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.5)",
    overflow: "hidden",
  },
  glassPanelBlocked: {
    backgroundColor: "#000",
    borderColor: "rgba(255,255,255,0.2)",
  },
  glassPanelBooked: {
    opacity: 0.6,
    borderColor: "rgba(255,255,255,0.1)",
  },
  glassPanelAndroid: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  glassPanelBlockedAndroid: {
    backgroundColor: "#000",
  },
  glassPanelBookedAndroid: {
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  slotTime: {
    fontSize: 24,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  textBlocked: {
    color: "rgba(255,255,255,0.6)",
  },
  textBooked: {
    color: "rgba(255,255,255,0.4)",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusTextAvailable: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "500",
  },
  statusTextBlocked: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },
  statusTextBooked: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
  },
  emptyCard: {
    padding: 48,
    alignItems: "center",
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    marginTop: 8,
  },
});
