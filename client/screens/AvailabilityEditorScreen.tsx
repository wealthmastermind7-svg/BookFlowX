import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Switch,
  Keyboard,
  Alert,
  ImageBackground,
  Platform,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing 
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { api, AvailabilitySchedule } from "@/lib/api";
import { CalendarStackParamList } from "@/navigation/CalendarStackNavigator";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const lightPlayBackground = require("../assets/stock_images/abstract_dark_fluid__e119120c.jpg");

type AvailabilityNavigationProp = NativeStackNavigationProp<
  CalendarStackParamList,
  "AvailabilityEditor"
>;

const DAY_NAMES = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

const TIME_OPTIONS = [
  "00:00", "01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", 
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"
].filter(time => {
  const hour = parseInt(time.split(':')[0]);
  return hour >= 6 && hour <= 23;
});

interface DaySchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hours12} ${period}`;
}

function GlassPanel({ children, style }: { children: React.ReactNode; style?: any }) {
  if (Platform.OS === "ios") {
    return (
      <BlurView intensity={30} tint="light" style={[styles.glassPanel, style]}>
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

export default function AvailabilityEditorScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<AvailabilityNavigationProp>();
  const { theme } = useTheme();

  const [schedules, setSchedules] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const fadeIn = useSharedValue(0);

  useEffect(() => {
    fadeIn.value = withTiming(1, { duration: 800 });
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    setLoading(true);
    try {
      const availability = await api.getAvailability();
      const defaultSchedules: DaySchedule[] = DAY_NAMES.map((_, index) => ({
        dayOfWeek: index,
        startTime: "09:00",
        endTime: "17:00",
        isActive: index >= 1 && index <= 5,
      }));

      availability.forEach((avail) => {
        const index = defaultSchedules.findIndex((s) => s.dayOfWeek === avail.dayOfWeek);
        if (index >= 0) {
          defaultSchedules[index] = {
            dayOfWeek: avail.dayOfWeek,
            startTime: avail.startTime,
            endTime: avail.endTime,
            isActive: avail.isActive ?? true,
          };
        }
      });

      setSchedules(defaultSchedules);
    } catch (error) {
      console.error("Error loading availability:", error);
      const defaultSchedules: DaySchedule[] = DAY_NAMES.map((_, index) => ({
        dayOfWeek: index,
        startTime: "09:00",
        endTime: "17:00",
        isActive: index >= 1 && index <= 5,
      }));
      setSchedules(defaultSchedules);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDay = (dayOfWeek: number) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    setSchedules((prev) =>
      prev.map((s) =>
        s.dayOfWeek === dayOfWeek ? { ...s, isActive: !s.isActive } : s
      )
    );
    setHasChanges(true);
  };

  const handleUpdateTime = (dayOfWeek: number, field: "startTime" | "endTime", value: string) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    setSchedules((prev) =>
      prev.map((s) =>
        s.dayOfWeek === dayOfWeek ? { ...s, [field]: value } : s
      )
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
      Keyboard.dismiss();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const availabilitySchedules: AvailabilitySchedule[] = schedules.map((s) => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        isActive: s.isActive,
      }));

      await api.bulkUpdateAvailability(availabilitySchedules);
      setHasChanges(false);
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      navigation.goBack();
    } catch (error) {
      console.error("Error saving availability:", error);
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
      Alert.alert(
        "Save Failed",
        "Unable to save your business hours. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setSaving(false);
    }
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
    <ImageBackground source={lightPlayBackground} style={styles.background} resizeMode="cover">
      <Animated.View style={[styles.container, containerStyle]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            { 
              paddingTop: insets.top + 20,
              paddingBottom: insets.bottom + 120 
            },
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
            <View style={styles.headerText}>
              <Animated.Text style={styles.hugeTitle}>BUSINESS</Animated.Text>
              <Animated.Text style={styles.hugeTitle}>HOURS</Animated.Text>
            </View>
          </View>

          {schedules.map((schedule) => (
            <GlassPanel key={schedule.dayOfWeek} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <Animated.Text style={styles.dayName}>
                  {DAY_NAMES[schedule.dayOfWeek]}
                </Animated.Text>
                <Switch
                  value={schedule.isActive}
                  onValueChange={() => handleToggleDay(schedule.dayOfWeek)}
                  trackColor={{ false: "rgba(0,0,0,0.1)", true: "rgba(0,0,0,0.4)" }}
                  thumbColor={schedule.isActive ? "#fff" : "#eee"}
                  ios_backgroundColor="rgba(0,0,0,0.1)"
                />
              </View>

              {schedule.isActive && (
                <View style={styles.timeSection}>
                  <View style={styles.statsRow}>
                    <View style={styles.statusBadge}>
                      <View style={styles.toggleIcon}>
                        <View style={styles.toggleKnob} />
                      </View>
                      <Animated.Text style={styles.statusText}>Open</Animated.Text>
                    </View>
                  </View>

                  <View style={styles.timeRow}>
                    <Animated.Text style={styles.timeLabel}>OPENS</Animated.Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeButtons}>
                      {TIME_OPTIONS.map((time) => (
                        <Pressable
                          key={`start-${time}`}
                          onPress={() => handleUpdateTime(schedule.dayOfWeek, "startTime", time)}
                          style={[
                            styles.timeButton,
                            schedule.startTime === time && styles.timeButtonActive,
                          ]}
                        >
                          <Animated.Text
                            style={[
                              styles.timeButtonText,
                              schedule.startTime === time && styles.timeButtonTextActive,
                            ]}
                          >
                            {formatTime(time)}
                          </Animated.Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>

                  <View style={styles.timeRow}>
                    <Animated.Text style={styles.timeLabel}>CLOSES</Animated.Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeButtons}>
                      {TIME_OPTIONS.map((time) => (
                        <Pressable
                          key={`end-${time}`}
                          onPress={() => handleUpdateTime(schedule.dayOfWeek, "endTime", time)}
                          style={[
                            styles.timeButton,
                            schedule.endTime === time && styles.timeButtonActive,
                          ]}
                        >
                          <Animated.Text
                            style={[
                              styles.timeButtonText,
                              schedule.endTime === time && styles.timeButtonTextActive,
                            ]}
                          >
                            {formatTime(time)}
                          </Animated.Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              )}
            </GlassPanel>
          ))}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <GlassPanel style={styles.footerInner}>
            <Pressable
              onPress={handleSave}
              disabled={saving || !hasChanges}
              style={[
                styles.saveButton,
                (!hasChanges || saving) && styles.saveButtonDisabled,
              ]}
            >
              <Animated.Text style={styles.saveButtonText}>
                {saving ? "SAVING..." : "SAVE CHANGES"}
              </Animated.Text>
            </Pressable>
          </GlassPanel>
        </View>
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
    flexDirection: "row",
    justifyContent: "center",
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
  headerText: {
    alignItems: "center",
  },
  hugeTitle: {
    fontSize: 48,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 2,
    lineHeight: 56,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
    textAlign: "center",
  },
  glassPanel: {
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    overflow: "hidden",
  },
  glassPanelAndroid: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
  },
  dayCard: {
    marginBottom: 20,
    padding: 24,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayName: {
    fontSize: 32,
    fontWeight: "700",
    color: "#000",
    letterSpacing: -1,
  },
  timeSection: {
    marginTop: 20,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  toggleIcon: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#ccc",
    marginLeft: "auto",
  },
  statusText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  timeRow: {
    marginBottom: 20,
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#555",
    letterSpacing: 1,
    marginBottom: 10,
  },
  timeButtons: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 16,
  },
  timeButton: {
    height: 40,
    minWidth: 70,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#999",
    justifyContent: "center",
    alignItems: "center",
  },
  timeButtonActive: {
    backgroundColor: "#fff",
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  timeButtonText: {
    fontSize: 10,
    fontWeight: "400",
    color: "#555",
  },
  timeButtonTextActive: {
    color: "#000",
    fontWeight: "700",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 0,
  },
  footerInner: {
    borderRadius: 0,
    borderTopWidth: 1,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
  },
  saveButton: {
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 2,
  },
});
