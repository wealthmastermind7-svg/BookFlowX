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
  "04:30 PM", "05:00 PM", "05:30 PM",
  "06:00 PM", "06:30 PM", "07:00 PM",
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
          styles.dateCard,
          isSelected
            ? { backgroundColor: theme.text }
            : {
                backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.5)",
                borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                borderWidth: 1,
              },
        ]}
      >
        <ThemedText
          style={[
            styles.dateMonth,
            { color: isSelected ? theme.buttonText : theme.textSecondary },
          ]}
        >
          {monthName}
        </ThemedText>
        <ThemedText
          style={[
            styles.dateDay,
            { color: isSelected ? theme.buttonText : theme.text },
          ]}
        >
          {dayNum}
        </ThemedText>
        <ThemedText
          style={[
            styles.dateDayName,
            { color: isSelected ? theme.buttonText : theme.textSecondary },
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

  return (
    <Animated.View style={[animatedStyle, styles.timeSlotWrapper]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.timeSlot,
          isSelected
            ? { backgroundColor: theme.text }
            : {
                backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.4)",
                borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                borderWidth: 1,
              },
        ]}
      >
        <ThemedText
          style={[
            styles.timeSlotText,
            {
              color: isSelected ? theme.buttonText : theme.text,
              fontWeight: isSelected ? "700" : "500",
            },
          ]}
        >
          {time}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

function DateScrollPicker({ dates, selectedDate, onDateChange }: { dates: Date[], selectedDate: Date, onDateChange: (date: Date) => void }) {
  const { theme, isDark } = useTheme();
  
  const handleScroll = (event: any) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / 80);
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
        snapToInterval={80}
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
                isSelected && { backgroundColor: theme.text }
              ]}
            >
              <ThemedText style={[styles.datePickerMonth, isSelected && { color: theme.buttonText }]}>
                {date.toLocaleDateString("en-US", { month: "short" }).toUpperCase()}
              </ThemedText>
              <ThemedText style={[styles.datePickerDay, isSelected && { color: theme.buttonText }]}>
                {date.getDate()}
              </ThemedText>
              <ThemedText style={[styles.datePickerDayName, isSelected && { color: theme.buttonText }]}>
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

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.oversizedTextContainer, { top: insets.top + 80 }]}>
        <ThemedText style={[styles.oversizedText, { opacity: isDark ? 0.03 : 0.04 }]}>
          WHEN
        </ThemedText>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: insets.bottom + 200,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Feather name="chevron-left" size={24} color={theme.text} />
          </Pressable>
          <ProgressRing step={2} total={3} />
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.titleSection}>
          <ThemedText style={styles.headerTitle}>WHEN</ThemedText>
          <ThemedText style={styles.subtitle}>
            Select your preferred date & time
          </ThemedText>
        </View>

        <View style={styles.dateAlignmentContainer}>
          <View style={styles.dateCardCenter}>
            <View style={styles.dateLabelContainer}>
              <ThemedText style={styles.dateLabel}>SELECT DATE</ThemedText>
            </View>
            <View style={[
              styles.dateCardBig,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.5)",
                borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
              }
            ]}>
              <ThemedText style={styles.dateCardBigText}>
                {selectedDate.toLocaleDateString("en-US", { day: 'numeric', month: 'short', year: 'numeric' })}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.timesSection}>
          <ThemedText style={styles.timesLabel}>AVAILABLE TIMES</ThemedText>
          <View style={styles.timesGrid}>
            {TIME_SLOTS.map((time, index) => (
              <Animated.View
                key={time}
                entering={FadeInUp.delay(100 + index * 30).springify()}
              >
                <TimeSlotButton
                  time={time}
                  isSelected={selectedTime === time}
                  onPress={() => setSelectedTime(time)}
                />
              </Animated.View>
            ))}
          </View>
        </View>

        {selectedTime && (
          <Animated.View 
            entering={FadeInUp.springify()}
            style={styles.summaryContainer}
          >
            <BlurView
              intensity={isDark ? 40 : 60}
              tint={isDark ? "dark" : "light"}
              style={[
                styles.summaryCard,
                {
                  borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                  backgroundColor: isDark ? "rgba(20,20,20,0.6)" : "rgba(255,255,255,0.7)",
                },
              ]}
            >
              <View>
                <ThemedText style={styles.summaryLabel}>SELECTED SLOT</ThemedText>
                <ThemedText style={styles.summaryValue}>{formatSelectedSlot()}</ThemedText>
              </View>
              <View style={styles.summaryRight}>
                <ThemedText style={styles.summaryLabel}>EST. PRICE</ThemedText>
                <ThemedText style={styles.summaryPrice}>
                  {service ? formatPrice(service.price) : "--"}
                </ThemedText>
              </View>
            </BlurView>
          </Animated.View>
        )}
      </ScrollView>

      <View
        style={[
          styles.bottomGradient,
          {
            paddingBottom: insets.bottom + Spacing.lg,
            backgroundColor: isDark ? "rgba(0,0,0,0.95)" : "rgba(255,255,255,0.95)",
          },
        ]}
      >
        <Pressable
          onPress={handleContinue}
          disabled={!selectedTime}
          style={[
            styles.continueButton,
            {
              backgroundColor: theme.text,
              opacity: selectedTime ? 1 : 0.4,
            },
          ]}
        >
          <ThemedText style={[styles.continueButtonText, { color: theme.buttonText }]}>
            Continue
          </ThemedText>
        </Pressable>

        <Pressable onPress={handleBack} style={styles.secondaryButton}>
          <ThemedText style={styles.secondaryButtonText}>
            BACK TO SERVICES
          </ThemedText>
        </Pressable>

        <View style={styles.progressIndicator}>
          <View style={[styles.progressDot, { backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)" }]} />
          <View style={[styles.progressDot, styles.progressDotActive, { backgroundColor: theme.text }]} />
          <View style={[styles.progressDot, { backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)" }]} />
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  oversizedTextContainer: {
    position: "absolute",
    left: 0,
    width: SCREEN_WIDTH,
    overflow: "hidden",
    pointerEvents: "none",
    zIndex: 0,
    paddingHorizontal: Spacing.lg,
    opacity: 0.5,
  },
  oversizedText: {
    fontSize: 80,
    fontWeight: "900",
    letterSpacing: -5,
    lineHeight: 80,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  titleSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  headerTitle: {
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: -3,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "500",
    opacity: 0.6,
  },
  dateAlignmentContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  dateCardCenter: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  dateLabelContainer: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    opacity: 0.5,
  },
  dateCardBig: {
    width: '100%',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dateCardBigText: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  datePickerContainer: {
    height: 100,
    marginTop: Spacing.md,
  },
  datePickerContent: {
    paddingHorizontal: SCREEN_WIDTH / 2 - 40,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  datePickerItem: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  datePickerMonth: {
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.6,
  },
  datePickerDay: {
    fontSize: 24,
    fontWeight: '800',
    marginVertical: 2,
  },
  datePickerDayName: {
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.6,
  },
  dateScrollerContainer: {
    marginBottom: Spacing.xl,
  },
  dateMonth: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 0,
  },
  dateDay: {
    fontSize: 24,
    fontWeight: "800",
    marginVertical: 0,
  },
  dateDayName: {
    fontSize: 9,
    fontWeight: "600",
    marginTop: 0,
  },
  timesSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing["2xl"],
  },
  timesLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    opacity: 0.5,
    marginBottom: Spacing.lg,
  },
  timesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  timeSlotWrapper: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.sm * 2) / 3,
  },
  dateCard: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  timeSlot: {
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  timeSlotText: {
    fontSize: 15,
  },
  summaryContainer: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  summaryCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    opacity: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  summaryRight: {
    alignItems: "flex-end",
  },
  summaryPrice: {
    fontSize: 16,
    fontWeight: "700",
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: Spacing["2xl"],
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
  },
  continueButton: {
    width: "100%",
    paddingVertical: 18,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: "700",
  },
  secondaryButton: {
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    opacity: 0.4,
  },
  progressIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  progressDot: {
    height: 4,
    width: 8,
    borderRadius: 2,
  },
  progressDotActive: {
    width: 32,
  },
});
