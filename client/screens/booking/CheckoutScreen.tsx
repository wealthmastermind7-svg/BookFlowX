import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, TextInput, Dimensions, ActivityIndicator, Platform, Linking } from "react-native";
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
import { getUpsellSuggestions, UpsellSuggestion } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import { getApiUrl } from "@/lib/query-client";
import { api, type Service as ApiService } from "@/lib/api";
import * as WebBrowser from "expo-web-browser";

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

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation<Navigation>();
  const route = useRoute();

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [service, setService] = useState<Service | null>(null);
  const [serviceLoading, setServiceLoading] = useState(true);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [upsellSuggestions, setUpsellSuggestions] = useState<UpsellSuggestion[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<Set<number>>(new Set());
  const [loadingUpsells, setLoadingUpsells] = useState(false);

  const serviceId = (route.params as any)?.serviceId || "";
  const timeSlotId = (route.params as any)?.timeSlotId || "";

  useEffect(() => {
    loadService();
  }, [serviceId]);

  const loadService = async () => {
    setServiceLoading(true);
    setServiceUnavailable(false);
    try {
      await api.getOrCreateBusiness();
      const services = await api.getServices();
      const found = services.find((item) => item.id === serviceId && item.isActive !== false);
      if (found) {
        const bookingService = toBookingService(found);
        setService(bookingService);
        loadUpsellSuggestions(bookingService);
      } else {
        setService(null);
        setServiceUnavailable(true);
      }
    } catch (error) {
      console.error("Error loading selected booking service:", error);
      setService(null);
      setServiceUnavailable(true);
    } finally {
      setServiceLoading(false);
    }
  };

  const loadUpsellSuggestions = async (svc: Service) => {
    // If service has business-defined upsells, use those instead of AI suggestions
    if (svc.upsells) {
      try {
        const customUpsells = JSON.parse(svc.upsells);
        if (Array.isArray(customUpsells) && customUpsells.length > 0) {
          setUpsellSuggestions(customUpsells);
          return;
        }
      } catch (e) {
        console.error("[Upsell] Error parsing custom upsells:", e);
      }
    }

    setLoadingUpsells(true);
    try {
      const suggestions = await getUpsellSuggestions(
        svc.name,
        svc.description || "",
        svc.price / 100
      );
      setUpsellSuggestions(suggestions);
    } catch (error) {
      console.log("[Upsell] Error loading suggestions:", error);
    } finally {
      setLoadingUpsells(false);
    }
  };

  const toggleAddon = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAddons((prev) => {
      const updated = new Set(prev);
      if (updated.has(index)) {
        updated.delete(index);
      } else {
        updated.add(index);
      }
      return updated;
    });
  };

  const getAddonsTotal = () => {
    let total = 0;
    selectedAddons.forEach((index) => {
      const addon = upsellSuggestions[index];
      if (addon) {
        total += addon.price * 100;
      }
    });
    return total;
  };

  const getTotalPrice = () => {
    return (service?.price || 0) + getAddonsTotal();
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
      const selectedAddonsList = Array.from(selectedAddons)
        .map((idx) => upsellSuggestions[idx])
        .filter(Boolean)
        .map((addon) => ({ 
          name: addon.name, 
          price: (addon.price * 100).toString() 
        }));

      const businessId = api.getBusinessId();
      if (!businessId) {
        throw new Error("No business context");
      }

      const response = await fetch(
        `${getApiUrl()}api/businesses/${businessId}/public/book`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: customerName.trim(),
            customerEmail: customerEmail.trim(),
            customerPhone: customerPhone.trim() || undefined,
            serviceId,
            date: date.toISOString().split("T")[0],
            time,
            addons: selectedAddonsList.length > 0 ? selectedAddonsList : undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create booking");
      }

      const result = await response.json();
      const { bookingId, requiresPayment, checkoutUrl } = result;

      const selectedAddonNames = selectedAddonsList.map((a) => a.name);
      const serviceName = selectedAddonNames.length > 0
        ? `${service?.name || "Service"} + ${selectedAddonNames.join(", ")}`
        : (service?.name || "Service");
      const localBooking: Booking = {
        id: bookingId,
        customerId: `customer_${Date.now()}`,
        customerName: customerName.trim(),
        serviceId,
        serviceName,
        date: date.toISOString().split("T")[0],
        time,
        status: requiresPayment ? "pending" : "confirmed",
        totalPrice: getTotalPrice(),
        createdAt: new Date().toISOString(),
        addons: selectedAddonsList.length > 0 ? JSON.stringify(selectedAddonsList) : undefined,
      };
      await StorageService.addBooking(localBooking);

      if (requiresPayment && checkoutUrl) {
        if (Platform.OS === "web") {
          window.open(checkoutUrl, "_self");
        } else {
          await WebBrowser.openBrowserAsync(checkoutUrl);
        }

        navigation.navigate("Confirmation", { 
          bookingId, 
          paymentStatus: "pending",
          requiresPayment: true,
        });
      } else {
        navigation.navigate("Confirmation", { 
          bookingId,
          paymentStatus: "free",
          requiresPayment: false,
        });
      }
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

  const getIndustryPhrasePrefix = (serviceName: string): string => {
    const combined = serviceName.toLowerCase();
    if (combined.includes('viewing') || combined.includes('property') || combined.includes('open house') || combined.includes('inspection')) return "VIEW";
    if (combined.includes('dentist') || combined.includes('dental') || combined.includes('teeth')) return "RESTORE";
    if (combined.includes('consultant') || combined.includes('coach') || combined.includes('advisor')) return "BOOK";
    if (combined.includes('salon') || combined.includes('hair') || combined.includes('barber') || combined.includes('beauty')) return "ELEVATE";
    if (combined.includes('spa') || combined.includes('massage') || combined.includes('relax')) return "FIND";
    if (combined.includes('car wash') || combined.includes('auto') || combined.includes('detail')) return "SHINE";
    if (combined.includes('contractor') || combined.includes('repair') || combined.includes('fix')) return "BOOK";
    return "RESERVE";
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.oversizedTextContainer, { top: insets.top + 20 }]}>
        <ThemedText style={[styles.oversizedText, { opacity: isDark ? 0.03 : 0.04 }]}>
          {getIndustryPhrasePrefix(service?.name || "")}
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
          <View style={[styles.progressSegment, styles.progressSegmentActive, { backgroundColor: theme.accent }]} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.titleSection}>
          <ThemedText style={styles.headerTitle}>{t('booking.yourDetails')}</ThemedText>
          <ThemedText style={styles.subtitle}>
            {t('booking.completeReservation', { service: service?.name || "service" })}
          </ThemedText>
        </Animated.View>

        {(serviceLoading || serviceUnavailable) && (
          <View style={styles.serviceStatus}>
            <ThemedText style={styles.serviceStatusText}>
              {serviceLoading
                ? "Loading selected service…"
                : "This service is no longer available. Please go back and choose an active service."}
            </ThemedText>
          </View>
        )}

        <Animated.View entering={FadeInUp.delay(150).springify()} style={styles.formSection}>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>{t('booking.fullName')}</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderBottomColor: "#E8DDD0",
                },
              ]}
              placeholder={t('booking.namePlaceholder')}
              placeholderTextColor={theme.textTertiary}
              value={customerName}
              onChangeText={setCustomerName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>{t('booking.emailAddress')}</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderBottomColor: "#E8DDD0",
                },
              ]}
              placeholder={t('booking.emailPlaceholder')}
              placeholderTextColor={theme.textTertiary}
              value={customerEmail}
              onChangeText={setCustomerEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>{t('booking.phoneNumber')}</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderBottomColor: "#E8DDD0",
                },
              ]}
              placeholder={t('booking.phonePlaceholder')}
              placeholderTextColor={theme.textTertiary}
              value={customerPhone}
              onChangeText={setCustomerPhone}
              keyboardType="phone-pad"
            />
          </View>
        </Animated.View>

        {(loadingUpsells || upsellSuggestions.length > 0) && (
          <Animated.View entering={FadeInUp.delay(175).springify()} style={styles.upsellSection}>
            <View style={styles.upsellHeader}>
              <Feather name="zap" size={16} color="#C17F3E" />
              <ThemedText style={styles.upsellTitle}>{t('booking.enhanceBooking')}</ThemedText>
            </View>
            <ThemedText style={styles.upsellSubtitle}>{t('booking.optionalAddons')}</ThemedText>
            
            {loadingUpsells ? (
              <View style={styles.upsellLoading}>
                <ActivityIndicator size="small" color={theme.text} />
              </View>
            ) : (
              <View style={styles.upsellList}>
                {upsellSuggestions.map((addon, index) => (
                  <Pressable
                    key={index}
                    onPress={() => toggleAddon(index)}
                    style={[
                      styles.addonCard,
                      {
                        borderColor: selectedAddons.has(index)
                          ? "#C17F3E"
                          : "#E8DDD0",
                        backgroundColor: selectedAddons.has(index)
                          ? "#F4EEE6"
                          : "rgba(17,24,39,0.86)",
                      },
                    ]}
                  >
                    <View style={styles.addonCheckbox}>
                      {selectedAddons.has(index) ? (
                        <Feather name="check-circle" size={20} color="#C17F3E" />
                      ) : (
                        <Feather name="circle" size={20} color={theme.textTertiary} />
                      )}
                    </View>
                    <View style={styles.addonContent}>
                      <ThemedText style={styles.addonName}>{addon.name}</ThemedText>
                      <ThemedText style={styles.addonDescription}>{addon.description}</ThemedText>
                    </View>
                    <ThemedText style={styles.addonPrice}>
                      +{formatPrice(addon.price * 100)}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            )}
          </Animated.View>
        )}

        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <BlurView
            intensity={isDark ? 30 : 50}
            tint={isDark ? "dark" : "light"}
            style={[
              styles.summaryCard,
              {
                borderColor: "#E8DDD0",
                backgroundColor: "rgba(17,24,39,0.94)",
              },
            ]}
          >
            <ThemedText style={styles.summaryTitle}>{t('booking.bookingSummary')}</ThemedText>

            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>{t('dashboard.service')}</ThemedText>
              <ThemedText style={styles.summaryValue}>{service?.name || "--"}</ThemedText>
            </View>

            {selectedAddons.size > 0 && (
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Add-ons ({selectedAddons.size})</ThemedText>
                <ThemedText style={styles.summaryValue}>
                  +{formatPrice(getAddonsTotal())}
                </ThemedText>
              </View>
            )}

            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>{t('dashboard.date')}</ThemedText>
              <ThemedText style={styles.summaryValue}>{formatDate()}</ThemedText>
            </View>

            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>{t('dashboard.time')}</ThemedText>
              <ThemedText style={styles.summaryValue}>{time}</ThemedText>
            </View>

            <View style={[styles.summaryRow, styles.totalRow]}>
              <ThemedText style={styles.totalLabel}>{t('booking.totalAmount')}</ThemedText>
              <ThemedText style={styles.totalValue}>
                {service ? formatPrice(getTotalPrice()) : "--"}
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
            backgroundColor: "rgba(10,10,15,0.96)",
          },
        ]}
      >
        <Pressable
          onPress={handleBooking}
          disabled={!service || serviceLoading || serviceUnavailable || !customerName.trim() || !customerEmail.trim() || !isValidEmail(customerEmail) || isSubmitting}
          style={[
            styles.confirmButton,
            {
              backgroundColor: theme.accent,
              opacity: service && !serviceLoading && !serviceUnavailable && customerName.trim() && customerEmail.trim() && isValidEmail(customerEmail) && !isSubmitting ? 1 : 0.4,
            },
          ]}
        >
          <ThemedText style={[styles.confirmButtonText, { color: theme.buttonText }]}>
            {t('booking.confirmBooking')}
          </ThemedText>
          <Feather name="lock" size={14} color={theme.buttonText} style={{ marginLeft: 8 }} />
        </Pressable>

        <Pressable onPress={handleBack} style={styles.secondaryButton}>
          <ThemedText style={styles.secondaryButtonText}>
            {t('booking.reviewSelections')}
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
    fontSize: 28,
    fontWeight: "700",
    fontStyle: "italic",
    marginBottom: Spacing.sm,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 24,
  },
  serviceStatus: {
    padding: Spacing.lg,
    marginBottom: Spacing["2xl"],
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "#E8DDD0",
    backgroundColor: "rgba(17,24,39,0.94)",
  },
  serviceStatusText: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.76,
  },
  formSection: {
    marginBottom: Spacing["2xl"],
    gap: Spacing["2xl"],
  },
  inputGroup: {},
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    opacity: 0.72,
    marginBottom: Spacing.sm,
  },
  input: {
    fontSize: 14,
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
  upsellSection: {
    marginBottom: Spacing["2xl"],
  },
  upsellHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: Spacing.xs,
  },
  upsellTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  upsellSubtitle: {
    fontSize: 13,
    opacity: 0.5,
    marginBottom: Spacing.lg,
  },
  upsellLoading: {
    paddingVertical: Spacing["2xl"],
    alignItems: "center",
  },
  upsellList: {
    gap: Spacing.md,
  },
  addonCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    gap: Spacing.md,
  },
  addonCheckbox: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  addonContent: {
    flex: 1,
  },
  addonName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  addonDescription: {
    fontSize: 12,
    opacity: 0.5,
  },
  addonPrice: {
    fontSize: 15,
    fontWeight: "600",
  },
});
