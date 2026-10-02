import React, { useState, useMemo, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Dimensions } from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { BookingFlowParamList } from "@/navigation/BookingFlowNavigator";
import { Service } from "@/lib/storage";
import { api, type Service as ApiService, type TimeSlot } from "@/lib/api";
import { formatPrice } from "@/lib/currency";
import { useI18n } from "@/contexts/I18nContext";

type Navigation = NativeStackNavigationProp<BookingFlowParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const toBookingService = (service: ApiService): Service => ({
  id: service.id,
  name: service.name,
  duration: service.duration,
  price: service.price,
  description: service.description ?? undefined,
  upsells: service.upsells ?? undefined,
});

const SPRING_CONFIG = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

function ProgressRing({ step, total }: { step: number; total: number }) {
  const { theme, isDark } = useTheme();
  const radius = 20;
  const strokeWidth = 2.5;
  const circumference = 2 * Math.PI * radius;
  const progress = step / total;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={styles.progressRing}>
      <Svg width={48} height={48}>
        <Circle
          cx={24}
          cy={24}
          r={radius}
          stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={24}
          cy={24}
          r={radius}
          stroke={theme.accent}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation={-90}
          origin="24, 24"
        />
      </Svg>
      <ThemedText style={styles.progressText}>{step}/{total}</ThemedText>
    </View>
  );
}

interface DateCardProps {
  date: Date;
  isSelected: boolean;
  onPress: () => void;
}

function DateCard({ date, isSelected, onPress }: DateCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, SPRING_CONFIG);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SPRING_CONFIG);
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const monthName = date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const dayNum = date.getDate();
  const dayName = date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.datePickerItem,
          isSelected
            ? { backgroundColor: "#00D4FF", borderColor: "#00D4FF", borderWidth: 2 }
            : {
                backgroundColor: "rgba(255,255,255,0.05)",
                borderColor: "rgba(255,255,255,0.15)",
                borderWidth: 1,
              },
        ]}
      >
        <ThemedText
          style={[
            styles.datePickerMonth,
            { color: isSelected ? "#0A0A0F" : "#F8FAFC" },
          ]}
        >
          {monthName}
        </ThemedText>
        <ThemedText
          style={[
            styles.datePickerDay,
            { color: isSelected ? "#0A0A0F" : "#F8FAFC" },
          ]}
        >
          {dayNum}
        </ThemedText>
        <ThemedText
          style={[
            styles.datePickerDayName,
            { color: isSelected ? "#0A0A0F" : "#94A3B8" },
          ]}
        >
          {dayName}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

interface TimeSlotProps {
  time: string;
  isSelected: boolean;
  onPress: () => void;
}

function TimeSlotButton({ time, isSelected, onPress }: TimeSlotProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, SPRING_CONFIG);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SPRING_CONFIG);
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const [timeVal, ampm] = time.split(' ');

  return (
    <Animated.View style={[animatedStyle, styles.timeSlotWrapper]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.timeSlot,
          isSelected
            ? { backgroundColor: "#00D4FF", borderColor: "#00D4FF", borderWidth: 2 }
            : {
                backgroundColor: "rgba(255,255,255,0.05)",
                borderColor: "rgba(255,255,255,0.15)",
                borderWidth: 1,
              },
        ]}
      >
        <ThemedText
          style={[
            styles.timeSlotText,
            {
              color: isSelected ? "#0A0A0F" : "#F8FAFC",
              fontWeight: isSelected ? "700" : "300",
            },
          ]}
        >
          {timeVal}
        </ThemedText>
        <ThemedText style={[styles.timeSlotAmPm, isSelected && { color: "rgba(10,10,15,0.7)" }]}>{ampm}</ThemedText>
      </Pressable>
    </Animated.View>
  );
}

function DateScrollPicker({ dates, selectedDate, onDateChange }: { dates: Date[], selectedDate: Date, onDateChange: (date: Date) => void }) {
  const handleScroll = (event: any) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / 96); // 80 width + 16 gap
    if (index >= 0 && index < dates.length) {
      const newDate = dates[index];
      if (newDate.toDateString() !== selectedDate.toDateString()) {
        Haptics.selectionAsync();
        onDateChange(newDate);
      }
    }
  };

  return (
    <View style={styles.datePickerContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={96}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.datePickerContent}
      >
        {dates.map((date, index) => {
          const isSelected = date.toDateString() === selectedDate.toDateString();
          return (
            <Pressable
              key={date.toISOString()}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onDateChange(date);
              }}
              style={[
                styles.datePickerItem,
                 isSelected && { backgroundColor: "#00D4FF", borderColor: "#00D4FF", borderWidth: 2 }
              ]}
            >
              <ThemedText style={[styles.datePickerMonth, { color: isSelected ? "#0A0A0F" : "#F8FAFC" }]}>
                {date.toLocaleDateString("en-US", { month: "short" }).toUpperCase()}
              </ThemedText>
              <ThemedText style={[styles.datePickerDay, { color: isSelected ? "#0A0A0F" : "#F8FAFC" }]}>
                {date.getDate()}
              </ThemedText>
              <ThemedText style={[styles.datePickerDayName, { color: isSelected ? "rgba(10,10,15,0.72)" : "#94A3B8" }]}>
                {date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function SelectTimeScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation<Navigation>();
  const route = useRoute();

  const serviceId = (route.params as any)?.serviceId || "";
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [serviceLoading, setServiceLoading] = useState(true);
  const [serviceLoadError, setServiceLoadError] = useState(false);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState(false);

  useEffect(() => {
    loadService();
  }, [serviceId]);

  useEffect(() => {
    let active = true;
    const loadSlots = async () => {
      if (!serviceId || !service) {
        setAvailableSlots([]);
        setSlotsLoading(false);
        return;
      }
      setSlotsLoading(true);
      setSlotsError(false);
      setSelectedTime(null);
      try {
        const day = selectedDate.toISOString().split("T")[0];
        const slots = await api.getTimeSlots(day, serviceId);
        if (active) setAvailableSlots(slots.filter(slot => slot.available && !slot.isBlocked));
      } catch (error) {
        console.error("Error loading viewing times:", error);
        if (active) {
          setAvailableSlots([]);
          setSlotsError(true);
        }
      } finally {
        if (active) setSlotsLoading(false);
      }
    };
    loadSlots();
    return () => { active = false; };
  }, [selectedDate, serviceId, service?.id]);

  const displayTime = (rawTime: string) => {
    if (/\b(AM|PM)\b/i.test(rawTime)) return rawTime;
    const [hourText, minuteText = "00"] = rawTime.split(":");
    const hour = Number(hourText);
    if (!Number.isFinite(hour)) return rawTime;
    const period = hour >= 12 ? "PM" : "AM";
    return `${String(hour % 12 || 12).padStart(2, "0")}:${minuteText} ${period}`;
  };

  const loadService = async () => {
    setServiceLoading(true);
    setServiceLoadError(false);
    setServiceUnavailable(false);
    try {
      await api.getOrCreateBusiness();
      const services = await api.getServices();
      const found = services.find((item) => item.id === serviceId && item.isActive !== false);
      setService(found ? toBookingService(found) : null);
      setServiceUnavailable(!found);
    } catch (error) {
      console.error("Error loading selected booking service:", error);
      setService(null);
      setServiceLoadError(true);
    } finally {
      setServiceLoading(false);
    }
  };

  const dates = useMemo(() => {
    const result: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      result.push(date);
    }
    return result;
  }, []);

  const handleContinue = () => {
    if (selectedTime) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const timeSlotId = `${selectedDate.toISOString()}_${selectedTime}`;
      navigation.navigate("Checkout", { serviceId, timeSlotId });
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  const formatSelectedSlot = () => {
    const month = selectedDate.toLocaleDateString("en-US", { month: "short" });
    const day = selectedDate.getDate();
    return `${month} ${day} • ${selectedTime || "--:--"}`;
  };

  const businessName = (service as any)?.businessName || (route.params as any)?.businessName || "BOOKFLOW";

  useEffect(() => {
    console.log("[SelectTimeScreen] Current businessName:", businessName);
    console.log("[SelectTimeScreen] Route params:", route.params);
  }, [businessName, route.params]);

  return (
    <View style={styles.container}>
      <View style={[styles.oversizedTextContainer, { top: insets.top + 40 }]}>
        <ThemedText style={[styles.oversizedText, { opacity: isDark ? 0.05 : 0.08 }]}>
          {businessName.toUpperCase()}
        </ThemedText>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: insets.bottom + 250,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#FFF" />
          </Pressable>
          <ProgressRing step={2} total={3} />
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.heroSection}>
          <ThemedText style={styles.heroTitle}>{businessName.toUpperCase()}</ThemedText>
          <ThemedText style={styles.heroSubtitle}>{t('booking.premiumBooking')}</ThemedText>
        </View>

        {(serviceLoading || serviceLoadError || serviceUnavailable) && (
          <View style={styles.slotsMessage}>
            <ThemedText style={styles.slotsMessageText}>
              {serviceLoading
                ? "Loading selected service…"
                : serviceLoadError
                  ? "Unable to load this service. Please go back and try again."
                  : "This service is no longer available. Please go back and choose an active service."}
            </ThemedText>
          </View>
        )}

        <View style={styles.datePickerSection}>
          <View style={styles.dateSelectorButton}>
            <ThemedText style={styles.dateSelectorLabel}>{t('booking.selectDate')}</ThemedText>
            <ThemedText style={styles.selectedDateLabel}>
              {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </ThemedText>
          </View>
          <DateScrollPicker
            dates={dates}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        </View>

        <View style={styles.timesSection}>
          {serviceLoading || serviceLoadError || serviceUnavailable ? null : slotsLoading ? (
            <View style={styles.slotsMessage}>
              <ThemedText style={styles.slotsMessageText}>Checking available viewing times…</ThemedText>
            </View>
          ) : slotsError ? (
            <View style={styles.slotsMessage}>
              <ThemedText style={styles.slotsMessageText}>Unable to load times for this date. Please try another date.</ThemedText>
            </View>
          ) : availableSlots.length === 0 ? (
            <View style={styles.slotsMessage}>
              <ThemedText style={styles.slotsMessageText}>No viewing times available on this date. Choose another day.</ThemedText>
            </View>
          ) : (
            <View style={styles.timesGrid}>
              {availableSlots.map((slot) => (
                <TimeSlotButton
                  key={slot.time}
                  time={displayTime(slot.time)}
                  isSelected={selectedTime === slot.time}
                  onPress={() => setSelectedTime(slot.time)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <Pressable
          onPress={handleContinue}
          disabled={!selectedTime}
          style={[
            styles.mainButton,
            {
              backgroundColor: "#00D4FF",
              borderColor: "rgba(0,212,255,0.8)",
              opacity: selectedTime ? 1 : 0.5,
            },
          ]}
        >
          <ThemedText style={[styles.mainButtonText, { color: "#0A0A0F" }]}>{t('common.continue').toUpperCase()}</ThemedText>
        </Pressable>

        <Pressable onPress={handleBack} style={styles.backButtonLarge}>
          <ThemedText style={styles.backButtonText}>{t('common.back').toUpperCase()}</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0F",
  },
  oversizedTextContainer: {
    position: "absolute",
    left: 0,
    width: SCREEN_WIDTH,
    overflow: "hidden",
    pointerEvents: "none",
    zIndex: 0,
    paddingHorizontal: Spacing.lg,
  },
  oversizedText: {
    fontFamily: "Inter-SemiBold",
    fontSize: 120,
    letterSpacing: -5,
    lineHeight: 120,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  progressRing: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  progressText: {
    position: "absolute",
    fontSize: 10,
    fontWeight: "700",
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  heroTitle: {
    fontFamily: "Inter-SemiBold",
    fontSize: 26,
    letterSpacing: -2,
    textAlign: "center",
    color: "#FFF",
  },
  heroSubtitle: {
    fontFamily: "Inter-SemiBold",
    fontSize: 14,
    letterSpacing: 0.3,
    color: "rgba(255,255,255,0.6)",
    marginTop: 6,
  },
  datePickerSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  dateSelectorButton: {
    height: 52,
    borderRadius: 20,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl, // Increased from Spacing.lg
    marginBottom: Spacing.lg,
    marginHorizontal: Spacing.lg, // Moves it in from the edges
    width: "100%",
    alignSelf: 'center', // Centers it horizontally
  },
  dateSelectorLabel: {
    fontFamily: "Inter-Light",
    fontSize: 12,
    letterSpacing: 0.2,
    color: "rgba(255,255,255,0.8)",
  },
  selectedDateLabel: {
    fontFamily: "Inter-SemiBold",
    fontSize: 14,
    color: "#00D4FF",
  },
  datePickerContainer: {
    height: 90,
  },
  datePickerContent: {
    paddingHorizontal: Spacing.lg,
    paddingRight: Spacing.lg + 8, // Added extra padding to prevent border overlap
    alignItems: 'center',
    gap: Spacing.md,
  },
  datePickerItem: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  datePickerMonth: {
    fontSize: 10,
    fontFamily: "Inter-SemiBold",
    opacity: 0.6,
  },
  datePickerDay: {
    fontSize: 24,
    fontFamily: "Inter-Bold",
    marginVertical: 2,
  },
  datePickerDayName: {
    fontSize: 9,
    fontFamily: "Inter-SemiBold",
    marginTop: 0,
  },
  timesSection: {
    paddingHorizontal: Spacing.lg,
  },
  timesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  slotsMessage: {
    padding: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.18)",
    backgroundColor: "#111827",
  },
  slotsMessageText: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.72,
  },
  timeSlotWrapper: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - 24) / 3,
  },
  timeSlot: {
    minHeight: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  timeSlotText: {
    fontSize: 16,
    fontFamily: "Inter-Light",
  },
  timeSlotAmPm: {
    fontSize: 10,
    fontFamily: "Inter-SemiBold",
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: 40,
    backgroundColor: "transparent",
  },
  mainButton: {
    width: "100%",
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
  },
  mainButtonText: {
    fontFamily: "Inter-SemiBold",
    fontSize: 14,
    letterSpacing: 2,
    color: "#FFF",
  },
  backButtonLarge: {
    width: "100%",
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  backButtonText: {
    fontFamily: "Inter-SemiBold",
    fontSize: 14,
    letterSpacing: 2,
    color: "#FFF",
  },
});
