import React, { useState, useMemo, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Dimensions } from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BlurView } from "expo-blur";
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
import { StorageService, Service } from "@/lib/storage";
import { formatPrice } from "@/lib/currency";

type Navigation = NativeStackNavigationProp<BookingFlowParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const SPRING_CONFIG = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

  const TIME_SLOTS = [
    "09:00 AM", "09:30 AM", "10:00 AM",
    "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "12:30 PM", "01:00 PM",
    "01:30 PM", "02:00 PM", "02:30 PM",
    "03:00 PM", "03:30 PM", "04:00 PM",
  ];

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
          stroke={theme.text}
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
  const { theme, isDark } = useTheme();
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
            ? { backgroundColor: "rgba(255,255,255,0.25)", borderColor: "#FFF", borderWidth: 2 }
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
            { color: "#FFF" },
          ]}
        >
          {monthName}
        </ThemedText>
        <ThemedText
          style={[
            styles.datePickerDay,
            { color: "#FFF" },
          ]}
        >
          {dayNum}
        </ThemedText>
        <ThemedText
          style={[
            styles.datePickerDayName,
            { color: "#FFF" },
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
  const { theme, isDark } = useTheme();
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
            ? { backgroundColor: "rgba(255,255,255,0.25)", borderColor: "#FFF", borderWidth: 2 }
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
              color: "#FFF",
              fontWeight: isSelected ? "700" : "300",
            },
          ]}
        >
          {timeVal}
        </ThemedText>
        <ThemedText style={styles.timeSlotAmPm}>{ampm}</ThemedText>
      </Pressable>
    </Animated.View>
  );
}

function DateScrollPicker({ dates, selectedDate, onDateChange }: { dates: Date[], selectedDate: Date, onDateChange: (date: Date) => void }) {
  const { theme, isDark } = useTheme();
  
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
                isSelected && { backgroundColor: "rgba(255,255,255,0.25)", borderColor: "#FFF", borderWidth: 2 }
              ]}
            >
              <ThemedText style={[styles.datePickerMonth, { color: "#FFF" }]}>
                {date.toLocaleDateString("en-US", { month: "short" }).toUpperCase()}
              </ThemedText>
              <ThemedText style={[styles.datePickerDay, { color: "#FFF" }]}>
                {date.getDate()}
              </ThemedText>
              <ThemedText style={[styles.datePickerDayName, { color: "#FFF" }]}>
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
  const navigation = useNavigation<Navigation>();
  const route = useRoute();

  const serviceId = (route.params as any)?.serviceId || "";
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [service, setService] = useState<Service | null>(null);

  useEffect(() => {
    loadService();
  }, [serviceId]);

  const loadService = async () => {
    const services = await StorageService.getServices();
    const found = services.find((s) => s.id === serviceId);
    if (found) setService(found);
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
          <ProgressRing step={2} total={2} />
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.heroSection}>
          <ThemedText style={styles.heroTitle}>{businessName.toUpperCase()}</ThemedText>
          <ThemedText style={styles.heroSubtitle}>PREMIUM BOOKING</ThemedText>
        </View>

        <View style={styles.datePickerSection}>
          <Pressable style={styles.dateSelectorButton}>
            <ThemedText style={styles.dateSelectorLabel}>SELECT DATE</ThemedText>
            <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.6)" />
          </Pressable>
          <DateScrollPicker
            dates={dates}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        </View>

        <View style={styles.timesSection}>
          <View style={styles.timesGrid}>
            {TIME_SLOTS.map((time) => (
              <TimeSlotButton
                key={time}
                time={time}
                isSelected={selectedTime === time}
                onPress={() => setSelectedTime(time)}
              />
            ))}
          </View>
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
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              borderColor: "rgba(255, 255, 255, 0.4)",
              opacity: selectedTime ? 1 : 0.5,
            },
          ]}
        >
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
          <ThemedText style={styles.mainButtonText}>CONTINUE</ThemedText>
        </Pressable>

        <Pressable onPress={handleBack} style={styles.backButtonLarge}>
          <ThemedText style={styles.backButtonText}>BACK</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
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
    fontFamily: "CormorantGaramond-Bold",
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
    marginBottom: 40,
  },
  heroTitle: {
    fontFamily: "CormorantGaramond-Regular",
    fontSize: 72,
    letterSpacing: -2,
    textAlign: "center",
    color: "#FFF",
  },
  heroSubtitle: {
    fontFamily: "Inter-SemiBold",
    fontSize: 12,
    letterSpacing: 4,
    color: "rgba(255,255,255,0.6)",
    marginTop: -10,
  },
  datePickerSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: 40,
  },
  dateSelectorButton: {
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl, // Increased from Spacing.lg
    marginBottom: Spacing.lg,
    marginHorizontal: Spacing.lg, // Moves it in from the edges
    width: SCREEN_WIDTH * 0.7, // Controlled width instead of full width
    alignSelf: 'center', // Centers it horizontally
  },
  dateSelectorLabel: {
    fontFamily: "Inter-Light",
    fontSize: 14,
    letterSpacing: 2,
    color: "rgba(255,255,255,0.8)",
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
  timeSlotWrapper: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - 24) / 3,
  },
  timeSlot: {
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  timeSlotText: {
    fontSize: 22,
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
