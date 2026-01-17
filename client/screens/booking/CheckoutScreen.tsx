import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, TextInput, Dimensions } from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { BookingFlowParamList } from "@/navigation/BookingFlowNavigator";
import { StorageService, Service, Booking } from "@/lib/storage";
import { formatPrice } from "@/lib/currency";

type Navigation = NativeStackNavigationProp<BookingFlowParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<Navigation>();
  const route = useRoute();

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [service, setService] = useState<Service | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const serviceId = (route.params as any)?.serviceId || "";
  const timeSlotId = (route.params as any)?.timeSlotId || "";

  useEffect(() => {
    loadService();
  }, [serviceId]);

  const loadService = async () => {
    const services = await StorageService.getServices();
    const found = services.find((s) => s.id === serviceId);
    if (found) setService(found);
  };

  const parseTimeSlot = () => {
    if (!timeSlotId) return { date: new Date(), time: "11:00 AM" };
    const [dateStr, time] = timeSlotId.split("_");
    return {
      date: new Date(dateStr),
      time: time || "11:00 AM",
    };
  };

  const { date, time } = parseTimeSlot();

  const formatDate = () => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleBooking = async () => {
    if (!customerName.trim() || !customerEmail.trim() || !isValidEmail(customerEmail)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const bookingId = `booking_${Date.now()}`;
      const booking: Booking = {
        id: bookingId,
        customerId: `customer_${Date.now()}`,
        customerName: customerName.trim(),
        serviceId,
        serviceName: service?.name || "Service",
        date: date.toISOString().split("T")[0],
        time,
        status: "confirmed",
        totalPrice: service?.price || 0,
        createdAt: new Date().toISOString(),
      };

      await StorageService.addBooking(booking);

      navigation.navigate("Confirmation", { bookingId });
    } catch (error) {
      console.error("Booking error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.oversizedTextContainer, { top: insets.top + 20 }]}>
        <ThemedText style={[styles.oversizedText, { opacity: isDark ? 0.03 : 0.04 }]}>
          RESERVE
        </ThemedText>
      </View>

      <KeyboardAwareScrollViewCompat
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: insets.bottom + 180,
          paddingHorizontal: Spacing.lg,
        }}
      >
        <Animated.View entering={FadeInDown.springify()} style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Feather name="chevron-left" size={24} color={theme.text} />
          </Pressable>
          <View style={styles.progressBar}>
            <View style={[styles.progressSegment, { backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)" }]} />
            <View style={[styles.progressSegment, { backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)" }]} />
            <View style={[styles.progressSegment, styles.progressSegmentActive, { backgroundColor: theme.text }]} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.titleSection}>
          <ThemedText style={styles.headerTitle}>Your Details</ThemedText>
          <ThemedText style={styles.subtitle}>
            Complete your reservation for the {service?.name || "service"}.
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(150).springify()} style={styles.formSection}>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>FULL NAME</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderBottomColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
                },
              ]}
              placeholder="John Smith"
              placeholderTextColor={theme.textTertiary}
              value={customerName}
              onChangeText={setCustomerName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>EMAIL ADDRESS</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderBottomColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
                },
              ]}
              placeholder="john@example.com"
              placeholderTextColor={theme.textTertiary}
              value={customerEmail}
              onChangeText={setCustomerEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>PHONE NUMBER</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderBottomColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
                },
              ]}
              placeholder="(555) 000-0000"
              placeholderTextColor={theme.textTertiary}
              value={customerPhone}
              onChangeText={setCustomerPhone}
              keyboardType="phone-pad"
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <BlurView
            intensity={isDark ? 30 : 50}
            tint={isDark ? "dark" : "light"}
            style={[
              styles.summaryCard,
              {
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                backgroundColor: isDark ? "rgba(30,30,30,0.8)" : "rgba(255,255,255,0.9)",
              },
            ]}
          >
            <ThemedText style={styles.summaryTitle}>BOOKING SUMMARY</ThemedText>

            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Service</ThemedText>
              <ThemedText style={styles.summaryValue}>{service?.name || "--"}</ThemedText>
            </View>

            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Date</ThemedText>
              <ThemedText style={styles.summaryValue}>{formatDate()}</ThemedText>
            </View>

            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Time</ThemedText>
              <ThemedText style={styles.summaryValue}>{time}</ThemedText>
            </View>

            <View style={[styles.summaryRow, styles.totalRow]}>
              <ThemedText style={styles.totalLabel}>Total amount</ThemedText>
              <ThemedText style={styles.totalValue}>
                {service ? formatPrice(service.price) : "--"}
              </ThemedText>
            </View>
          </BlurView>
        </Animated.View>
      </KeyboardAwareScrollViewCompat>

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
          onPress={handleBooking}
          disabled={!customerName.trim() || !customerEmail.trim() || !isValidEmail(customerEmail) || isSubmitting}
          style={[
            styles.confirmButton,
            {
              backgroundColor: theme.text,
              opacity: customerName.trim() && customerEmail.trim() && isValidEmail(customerEmail) && !isSubmitting ? 1 : 0.4,
            },
          ]}
        >
          <ThemedText style={[styles.confirmButtonText, { color: theme.buttonText }]}>
            Confirm Booking
          </ThemedText>
          <Feather name="lock" size={14} color={theme.buttonText} style={{ marginLeft: 8 }} />
        </Pressable>

        <Pressable onPress={handleBack} style={styles.secondaryButton}>
          <ThemedText style={styles.secondaryButtonText}>
            Review Selections
          </ThemedText>
        </Pressable>
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
    right: -20,
    overflow: "hidden",
    pointerEvents: "none",
    zIndex: 0,
  },
  oversizedText: {
    fontSize: 64,
    fontWeight: "900",
    letterSpacing: -3,
    lineHeight: 64,
    textTransform: "uppercase",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing["3xl"],
    gap: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  progressBar: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
  },
  progressSegment: {
    height: 5,
    flex: 1,
    borderRadius: 3,
  },
  progressSegmentActive: {
    flex: 2,
  },
  titleSection: {
    marginBottom: Spacing["3xl"],
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: "700",
    fontStyle: "italic",
    marginBottom: Spacing.sm,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.5,
    lineHeight: 24,
  },
  formSection: {
    marginBottom: Spacing["3xl"],
    gap: Spacing["2xl"],
  },
  inputGroup: {},
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    opacity: 0.4,
    marginBottom: Spacing.sm,
  },
  input: {
    fontSize: 18,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  summaryCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing["2xl"],
    overflow: "hidden",
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    opacity: 0.4,
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.1)",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  summaryLabel: {
    fontSize: 15,
    opacity: 0.5,
    fontWeight: "300",
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "500",
  },
  totalRow: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.1)",
  },
  totalLabel: {
    fontSize: 15,
    opacity: 0.5,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: "700",
    fontStyle: "italic",
    letterSpacing: -1,
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
  confirmButton: {
    width: "100%",
    paddingVertical: 18,
    borderRadius: BorderRadius.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  confirmButtonText: {
    fontSize: 17,
    fontWeight: "700",
  },
  secondaryButton: {
    paddingVertical: Spacing.sm,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "500",
    opacity: 0.4,
  },
});
