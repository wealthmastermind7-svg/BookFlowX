import React, { useState, useMemo, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Dimensions, Text, Platform, ImageBackground } from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BlurView } from "expo-blur";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Spacing, BorderRadius } from "@/constants/theme";
import { BookingFlowParamList } from "@/navigation/BookingFlowNavigator";
import { StorageService, Service } from "@/lib/storage";

type Navigation = NativeStackNavigationProp<BookingFlowParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const SPRING_CONFIG = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

const TIME_SLOTS = [
  "12:00 PM", "12:30 PM", "1:00 PM",
  "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM",
  "4:30 PM", "5:00 PM",
];

const silkBackground = require("@assets/generated_images/black_silk_flowing_fabric_background_for_services.png");

interface TimeSlotProps {
  time: string;
  isSelected: boolean;
  onPress: () => void;
  index: number;
}

function TimeSlotButton({ time, isSelected, onPress, index }: TimeSlotProps) {
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
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    onPress();
  };

  return (
    <Animated.View 
      style={[animatedStyle, styles.timeSlotWrapper]}
      entering={FadeInUp.delay(100 + index * 30).springify()}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.timeSlot,
          isSelected && styles.timeSlotSelected,
        ]}
      >
        <Text
          style={[
            styles.timeSlotText,
            isSelected && styles.timeSlotTextSelected,
          ]}
        >
          {time}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function SelectTimeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Navigation>();
  const route = useRoute();

  const serviceId = (route.params as any)?.serviceId || "";
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

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
    for (let i = 0; i < 31; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      result.push(date);
    }
    return result;
  }, []);

  const monthName = selectedDate.toLocaleDateString("en-US", { month: "long" }).toUpperCase();
  const year = selectedDate.getFullYear();

  const handleContinue = () => {
    if (selectedTime) {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
      const timeSlotId = `${selectedDate.toISOString()}_${selectedTime}`;
      navigation.navigate("Checkout", { serviceId, timeSlotId });
    }
  };

  const handleBack = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    navigation.goBack();
  };

  const formatSelectedDate = () => {
    const day = selectedDate.getDate();
    const month = selectedDate.toLocaleDateString("en-US", { month: "short" });
    return `SELECT DATE | ${day} ${month}, ${year}`;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const { firstDay, daysInMonth } = getDaysInMonth(selectedDate);

  const renderCalendar = () => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
      const isSelected = day === selectedDate.getDate();
      const isPast = currentDate < today;

      days.push(
        <Pressable
          key={day}
          onPress={() => {
            if (!isPast) {
              const newDate = new Date(selectedDate);
              newDate.setDate(day);
              setSelectedDate(newDate);
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
            }
          }}
          disabled={isPast}
          style={styles.calendarDay}
        >
          <View style={[styles.calendarDayInner, isSelected && styles.calendarDaySelected]}>
            <Text
              style={[
                styles.calendarDayText,
                isSelected && styles.calendarDayTextSelected,
                isPast && styles.calendarDayTextPast,
              ]}
            >
              {day}
            </Text>
          </View>
        </Pressable>
      );
    }

    return days;
  };

  return (
    <ImageBackground source={silkBackground} style={styles.container} resizeMode="cover">
      <View style={styles.overlay} />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 200,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          entering={FadeInDown.delay(0).springify()}
          style={styles.header}
        >
          <Text style={styles.brandTitle}>BOOKFLOW</Text>
          <Text style={styles.brandSubtitle}>PREMIUM BOOKING</Text>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(100).springify()}
          style={styles.datePillContainer}
        >
          <Pressable 
            style={styles.datePill}
            onPress={() => setShowDatePicker(!showDatePicker)}
          >
            <Text style={styles.datePillText}>{formatSelectedDate()}</Text>
          </Pressable>
        </Animated.View>

        {showDatePicker && (
          <Animated.View 
            entering={FadeInDown.springify()}
            style={styles.calendarContainer}
          >
            <Text style={styles.monthTitle}>{monthName}</Text>
            <Text style={styles.yearTitle}>{year}</Text>
            <View style={styles.calendarGrid}>
              {renderCalendar()}
            </View>
          </Animated.View>
        )}

        <View style={styles.timesSection}>
          <Text style={styles.timesLabel}>AVAILABLE TIMES</Text>
          <View style={styles.timesGrid}>
            {TIME_SLOTS.map((time, index) => (
              <TimeSlotButton
                key={time}
                time={time}
                index={index}
                isSelected={selectedTime === time}
                onPress={() => setSelectedTime(time)}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomSection,
          { paddingBottom: insets.bottom + Spacing.lg },
        ]}
      >
        <Pressable
          onPress={handleContinue}
          disabled={!selectedTime}
          style={({ pressed }) => [
            styles.continueButton,
            { opacity: selectedTime ? (pressed ? 0.9 : 1) : 0.4 },
          ]}
        >
          <LinearGradient
            colors={["#F0F0F0", "#A0A0A0"]}
            style={styles.continueButtonGradient}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </LinearGradient>
        </Pressable>

        <Pressable onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  header: {
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: 32,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 4,
    textAlign: "center",
  },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: "300",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 6,
    marginTop: 4,
  },
  datePillContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: 32,
  },
  datePill: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 100,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  datePillText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
    textAlign: "center",
    letterSpacing: 1,
  },
  calendarContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: 32,
    alignItems: "center",
  },
  monthTitle: {
    fontSize: 56,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 2,
    textAlign: "center",
  },
  yearTitle: {
    fontSize: 56,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 2,
    textAlign: "center",
    marginTop: -8,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 24,
    width: "100%",
    maxWidth: 350,
  },
  calendarDay: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  calendarDayInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDaySelected: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  calendarDayText: {
    fontSize: 20,
    fontWeight: "500",
    color: "#fff",
  },
  calendarDayTextSelected: {
    fontWeight: "700",
  },
  calendarDayTextPast: {
    color: "rgba(255,255,255,0.3)",
  },
  timesSection: {
    paddingHorizontal: Spacing.lg,
  },
  timesLabel: {
    fontFamily: Platform.OS === "ios" ? "Times New Roman" : "serif",
    fontSize: 24,
    fontWeight: "400",
    color: "#fff",
    textAlign: "center",
    letterSpacing: 4,
    marginBottom: 24,
    textTransform: "uppercase",
  },
  timesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
  },
  timeSlotWrapper: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - 24) / 3,
  },
  timeSlot: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  timeSlotSelected: {
    backgroundColor: "#000",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: "400",
    color: "rgba(255,255,255,0.8)",
  },
  timeSlotTextSelected: {
    fontWeight: "700",
    color: "#fff",
  },
  bottomSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: Spacing["2xl"],
    paddingHorizontal: Spacing.lg,
    backgroundColor: "rgba(0,0,0,0.9)",
  },
  continueButton: {
    width: "100%",
    borderRadius: 100,
    overflow: "hidden",
    marginBottom: 12,
  },
  continueButtonGradient: {
    paddingVertical: 18,
    alignItems: "center",
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  backButton: {
    width: "100%",
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#fff",
  },
});
