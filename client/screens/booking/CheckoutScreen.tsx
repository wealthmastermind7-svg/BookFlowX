import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, TextInput, Dimensions, Text, Platform, ImageBackground } from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BlurView } from "expo-blur";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Spacing, BorderRadius } from "@/constants/theme";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { BookingFlowParamList } from "@/navigation/BookingFlowNavigator";
import { StorageService, Service, Booking } from "@/lib/storage";
import { formatPrice } from "@/lib/currency";

type Navigation = NativeStackNavigationProp<BookingFlowParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const silkBackground = require("../../../attached_assets/generated_images/black_silk_flowing_fabric_background_for_services.png");

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
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
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).replace(/\//g, "-");
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleBooking = async () => {
    if (!customerName.trim() || !customerEmail.trim() || !isValidEmail(customerEmail)) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
      return;
    }

    setIsSubmitting(true);
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}

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
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    navigation.goBack();
  };

  const isFormValid = customerName.trim() && customerEmail.trim() && isValidEmail(customerEmail);

  return (
    <ImageBackground source={silkBackground} style={styles.container} resizeMode="cover">
      <View style={styles.overlay} />

      <KeyboardAwareScrollViewCompat
        contentContainerStyle={{
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 180,
          paddingHorizontal: Spacing.lg,
        }}
      >
        <Animated.View entering={FadeInDown.springify()} style={styles.header}>
          <Text style={styles.brandTitle}>Black Edition</Text>
          <Text style={styles.brandSubtitle}>Premium Booking</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>FULL NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="John Smith"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={customerName}
              onChangeText={setCustomerName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
            <TextInput
              style={styles.input}
              placeholder="john@example.com"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={customerEmail}
              onChangeText={setCustomerEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PHONE NUMBER</Text>
            <TextInput
              style={styles.input}
              placeholder="(555) 123-4567"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={customerPhone}
              onChangeText={setCustomerPhone}
              keyboardType="phone-pad"
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service</Text>
              <Text style={styles.summaryValue}>{service?.name || "--"}</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date & Time</Text>
              <Text style={styles.summaryValue}>{formatDate()} at {time}</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Amount</Text>
              <Text style={styles.summaryPrice}>
                {service ? formatPrice(service.price) : "--"}
              </Text>
            </View>
          </View>
        </Animated.View>
      </KeyboardAwareScrollViewCompat>

      <View
        style={[
          styles.bottomSection,
          { paddingBottom: insets.bottom + Spacing.lg },
        ]}
      >
        <Pressable
          onPress={handleBooking}
          disabled={!isFormValid || isSubmitting}
          style={({ pressed }) => [
            styles.confirmButton,
            { opacity: isFormValid && !isSubmitting ? (pressed ? 0.9 : 1) : 0.4 },
          ]}
        >
          <Text style={styles.confirmButtonText}>
            {isSubmitting ? "Processing..." : "Confirm Booking"}
          </Text>
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
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  brandTitle: {
    fontFamily: Platform.OS === "ios" ? "Times New Roman" : "serif",
    fontSize: 48,
    fontWeight: "400",
    color: "#fff",
    textAlign: "center",
    letterSpacing: 1,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  brandSubtitle: {
    fontSize: 16,
    fontWeight: "300",
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    letterSpacing: 2,
    marginTop: 4,
  },
  formSection: {
    marginBottom: 32,
    gap: 24,
  },
  inputGroup: {},
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: "rgba(80,80,80,0.4)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  summaryCard: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "rgba(128,128,128,0.3)",
    marginVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  summaryPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
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
  confirmButton: {
    width: "100%",
    backgroundColor: "#000",
    borderRadius: 100,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    marginBottom: 12,
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  confirmButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#fff",
  },
  backButton: {
    width: "100%",
    paddingVertical: 14,
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.5)",
  },
});
