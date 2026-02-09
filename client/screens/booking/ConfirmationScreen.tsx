import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, Pressable, Dimensions, ActivityIndicator } from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
  FadeIn,
  FadeInUp,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { BookingFlowParamList } from "@/navigation/BookingFlowNavigator";
import { StorageService, Booking } from "@/lib/storage";
import { formatPrice } from "@/lib/currency";
import { useI18n } from "@/contexts/I18nContext";
import { getApiUrl } from "@/lib/query-client";

type Navigation = NativeStackNavigationProp<BookingFlowParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const SPRING_CONFIG = {
  damping: 12,
  mass: 0.5,
  stiffness: 100,
};

export default function ConfirmationScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation<Navigation>();
  const route = useRoute();

  const bookingId = (route.params as any)?.bookingId || "";
  const requiresPayment = (route.params as any)?.requiresPayment || false;
  const initialPaymentStatus = (route.params as any)?.paymentStatus || "free";

  const [booking, setBooking] = useState<Booking | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>(initialPaymentStatus);
  const [isPolling, setIsPolling] = useState(requiresPayment);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);

  useEffect(() => {
    loadBooking();
    if (!requiresPayment) {
      animateCheckmark();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  useEffect(() => {
    if (requiresPayment && bookingId) {
      pollPaymentStatus();
      pollIntervalRef.current = setInterval(pollPaymentStatus, 3000);
      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      };
    }
  }, [requiresPayment, bookingId]);

  const pollPaymentStatus = async () => {
    try {
      const response = await fetch(
        `${getApiUrl()}api/bookings/${bookingId}/public/status`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.paymentStatus === "paid") {
          setPaymentStatus("paid");
          setIsPolling(false);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
          await StorageService.updateBooking(bookingId, { status: "confirmed" });
          setBooking((prev) => prev ? { ...prev, status: "confirmed" } : prev);
          animateCheckmark();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (data.paymentStatus === "unpaid" && data.status !== "pending") {
          setPaymentStatus("cancelled");
          setIsPolling(false);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
          animateCheckmark();
        }
      }
    } catch (error) {
      console.error("[PaymentPoll] Error:", error);
    }
  };

  const loadBooking = async () => {
    const found = await StorageService.getBookingById(bookingId);
    if (found) setBooking(found);
  };

  const animateCheckmark = () => {
    checkOpacity.value = withDelay(200, withSpring(1, SPRING_CONFIG));
    checkScale.value = withDelay(
      200,
      withSequence(
        withSpring(1.2, { ...SPRING_CONFIG, stiffness: 200 }),
        withSpring(1, SPRING_CONFIG)
      )
    );
  };

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkOpacity.value,
  }));

  const handleDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const parent = navigation.getParent();
    if (parent) {
      parent.goBack();
    } else {
      navigation.goBack();
    }
  };

  const formatDate = () => {
    if (!booking?.date) return "--";
    const date = new Date(booking.date);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusConfig = () => {
    if (isPolling) {
      return {
        icon: null,
        title: t('booking.processingPayment') || "Processing Payment",
        message: t('booking.paymentProcessingMessage') || "Complete your payment in the browser window. This page will update automatically once payment is confirmed.",
        badgeText: t('booking.waitingForPayment') || "Waiting for payment confirmation...",
        badgeIcon: "clock" as const,
      };
    }
    if (paymentStatus === "paid") {
      return {
        icon: "check" as const,
        title: t('booking.bookingConfirmed'),
        message: t('booking.paymentSuccessMessage') || "Your payment was successful and your booking is confirmed. You will receive a confirmation email shortly.",
        badgeText: t('booking.paymentConfirmed') || "Payment confirmed",
        badgeIcon: "check-circle" as const,
      };
    }
    if (paymentStatus === "cancelled") {
      return {
        icon: "x" as const,
        title: t('booking.paymentCancelled') || "Payment Cancelled",
        message: t('booking.paymentCancelledMessage') || "Your payment was cancelled. The booking has been saved but payment is still required. Please contact the business to arrange payment.",
        badgeText: t('booking.paymentNotCompleted') || "Payment not completed",
        badgeIcon: "alert-circle" as const,
      };
    }
    return {
      icon: "check" as const,
      title: t('booking.bookingConfirmed'),
      message: t('booking.confirmationMessage') || "Your booking has been successfully confirmed. You will receive a confirmation email shortly.",
      badgeText: t('booking.confirmationSentToEmail'),
      badgeIcon: "check-circle" as const,
    };
  };

  const statusConfig = getStatusConfig();

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.oversizedTextContainer, { top: insets.top + 60 }]}>
        <ThemedText style={[styles.oversizedText, { opacity: isDark ? 0.02 : 0.03 }]}>
          {isPolling ? (t('booking.processing') || "PROCESSING") : t('booking.confirmed')}
        </ThemedText>
      </View>

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + Spacing["5xl"],
            paddingBottom: insets.bottom + 140,
          },
        ]}
      >
        {isPolling ? (
          <View style={[styles.checkmarkContainer, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}>
            <ActivityIndicator size="large" color={theme.text} />
          </View>
        ) : (
          <Animated.View
            style={[
              styles.checkmarkContainer,
              checkAnimatedStyle,
              { backgroundColor: paymentStatus === "cancelled" ? (isDark ? "#662222" : "#ffdddd") : theme.text },
            ]}
          >
            <Feather
              name={statusConfig.icon || "check"}
              size={48}
              color={paymentStatus === "cancelled" ? (isDark ? "#ff6666" : "#cc0000") : theme.buttonText}
            />
          </Animated.View>
        )}

        <Animated.View entering={FadeInUp.delay(400).springify()}>
          <ThemedText style={styles.title}>
            {statusConfig.title}
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(500)}>
          <ThemedText style={styles.message}>
            {statusConfig.message}
          </ThemedText>
        </Animated.View>

        <Animated.View 
          entering={FadeInUp.delay(600).springify()}
          style={[
            styles.detailsCard,
            {
              backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
            },
          ]}
        >
          <View style={[styles.detailRow, { borderBottomColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]}>
            <ThemedText style={styles.detailLabel}>{t('dashboard.service')}</ThemedText>
            <ThemedText style={styles.detailValue}>{booking?.serviceName || "--"}</ThemedText>
          </View>

          <View style={[styles.detailRow, { borderBottomColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]}>
            <ThemedText style={styles.detailLabel}>{t('dashboard.date')} & {t('dashboard.time')}</ThemedText>
            <ThemedText style={styles.detailValue}>
              {formatDate()} {"\u2022"} {booking?.time || "--"}
            </ThemedText>
          </View>

          {requiresPayment ? (
            <View style={[styles.detailRow, { borderBottomColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]}>
              <ThemedText style={styles.detailLabel}>{t('booking.paymentStatusLabel') || "Payment"}</ThemedText>
              <View style={styles.paymentBadge}>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: paymentStatus === "paid" ? "#22c55e" : paymentStatus === "cancelled" ? "#ef4444" : "#f59e0b" }
                ]} />
                <ThemedText style={[styles.detailValue, { 
                  color: paymentStatus === "paid" ? "#22c55e" : paymentStatus === "cancelled" ? "#ef4444" : "#f59e0b"
                }]}>
                  {paymentStatus === "paid" ? (t('booking.paid') || "Paid") : 
                   paymentStatus === "cancelled" ? (t('booking.cancelled') || "Cancelled") : 
                   (t('booking.pending') || "Pending")}
                </ThemedText>
              </View>
            </View>
          ) : null}

          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>{t('dashboard.total')}</ThemedText>
            <ThemedText style={styles.detailPrice}>
              {booking ? formatPrice(booking.totalPrice) : "--"}
            </ThemedText>
          </View>
        </Animated.View>
      </View>

      <View
        style={[
          styles.bottomSection,
          {
            paddingBottom: insets.bottom + Spacing.lg,
            backgroundColor: isDark ? "rgba(0,0,0,0.95)" : "rgba(255,255,255,0.95)",
          },
        ]}
      >
        <Animated.View 
          entering={FadeInUp.delay(700).springify()}
          style={{ width: "100%" }}
        >
          <Pressable
            onPress={handleDone}
            style={[styles.doneButton, { backgroundColor: theme.text }]}
          >
            <ThemedText style={[styles.doneButtonText, { color: theme.buttonText }]}>
              {t('common.done')}
            </ThemedText>
          </Pressable>
        </Animated.View>

        <View style={styles.confirmationBadge}>
          <Feather name={statusConfig.badgeIcon} size={12} color={theme.textSecondary} />
          <ThemedText style={styles.confirmationBadgeText}>
            {statusConfig.badgeText}
          </ThemedText>
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
    left: -20,
    width: SCREEN_WIDTH + 40,
    overflow: "hidden",
    pointerEvents: "none",
    zIndex: 0,
  },
  oversizedText: {
    fontSize: 56,
    fontWeight: "900",
    letterSpacing: -3,
    lineHeight: 56,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  checkmarkContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing["3xl"],
  },
  title: {
    fontSize: 40,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.lg,
    lineHeight: 48,
    letterSpacing: -1,
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.6,
    lineHeight: 24,
    marginBottom: Spacing["3xl"],
    maxWidth: 280,
  },
  detailsCard: {
    width: "100%",
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  detailLabel: {
    fontSize: 14,
    opacity: 0.5,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  detailPrice: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  paymentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bottomSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: Spacing["2xl"],
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
  },
  doneButton: {
    width: "100%",
    paddingVertical: 18,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: "700",
  },
  confirmationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  confirmationBadgeText: {
    fontSize: 12,
    opacity: 0.5,
  },
});
