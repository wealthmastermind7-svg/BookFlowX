import React, { useEffect, useState } from "react";
import { View, StyleSheet, Pressable, Dimensions } from "react-native";
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
  const [booking, setBooking] = useState<Booking | null>(null);

  const checkScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);

  React.useEffect(() => {
    loadBooking();
    animateCheckmark();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

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

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.oversizedTextContainer, { top: insets.top + 60 }]}>
        <ThemedText style={[styles.oversizedText, { opacity: isDark ? 0.02 : 0.03 }]}>
          {t('booking.confirmed')}
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
        <Animated.View
          style={[
            styles.checkmarkContainer,
            checkAnimatedStyle,
            { backgroundColor: theme.text },
          ]}
        >
          <Feather name="check" size={48} color={theme.buttonText} />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400).springify()}>
          <ThemedText style={styles.title}>
            {t('booking.bookingConfirmed')}
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(500)}>
          <ThemedText style={styles.message}>
            Your booking has been successfully confirmed. You will receive a confirmation email shortly.
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
              {formatDate()} • {booking?.time || "--"}
            </ThemedText>
          </View>

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
          <Feather name="check-circle" size={12} color={theme.textSecondary} />
          <ThemedText style={styles.confirmationBadgeText}>
            {t('booking.confirmationSentToEmail')}
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
