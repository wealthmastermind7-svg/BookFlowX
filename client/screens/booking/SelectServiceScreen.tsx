import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Dimensions, Platform, Linking, Image } from "react-native";
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
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Service } from "@/lib/storage";
import { api, type Service as ApiService } from "@/lib/api";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { BookingFlowParamList } from "@/navigation/BookingFlowNavigator";
import { formatPrice } from "@/lib/currency";
import { getApiUrl } from "@/lib/query-client";
import { useI18n } from "@/contexts/I18nContext";
import { parsePropertyDetails } from "@/lib/property-details";

type Navigation = NativeStackNavigationProp<BookingFlowParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const toBookingService = (service: ApiService): Service => ({
  id: service.id,
  name: service.name,
  duration: service.duration,
  price: service.price,
  description: service.description ?? undefined,
  photos: service.photos || [],
  upsells: service.upsells ?? undefined,
});

const SPRING_CONFIG = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

function VoiceAssistantButton({ slug }: { slug: string }) {
  const { isDark } = useTheme();
  const scale = useSharedValue(1);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    checkVoiceStatus();
  }, [slug]);

  const checkVoiceStatus = async () => {
    try {
      if (!slug || slug === "default") return;
      const res = await fetch(`${getApiUrl()}api/public/businesses/${slug}/voice-status`);
      if (res.ok) {
        const data = await res.json();
        setIsSubscribed(data.isSubscribed);
      }
    } catch (error) {
      console.error("[VoiceStatus] Error:", error);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, SPRING_CONFIG);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SPRING_CONFIG);
  };

  const handlePress = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    const voiceUrl = `${getApiUrl()}voice/${slug}`;
    if (Platform.OS === "web") {
      window.open(voiceUrl, "_blank");
    } else {
      Linking.openURL(voiceUrl);
    }
  };

  if (!isSubscribed) return null;

  return (
    <Animated.View style={[styles.voiceFab, animatedStyle]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.voiceFabPressable,
          { backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)" },
          pressed && { opacity: 0.8 }
        ]}
      >
        <BlurView
          intensity={60}
          tint={isDark ? "dark" : "light"}
          style={styles.voiceFabBlur}
        >
          <Feather name="mic" size={24} color={isDark ? "#fff" : "#000"} />
        </BlurView>
      </Pressable>
    </Animated.View>
  );
}

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

interface ServiceCardProps {
  service: Service;
  index: number;
  isPopular?: boolean;
  onPress: () => void;
}

function CinematicServiceCard({ service, index, isPopular, onPress }: ServiceCardProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, SPRING_CONFIG);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SPRING_CONFIG);
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const getCategoryIcon = (idx: number): keyof typeof Feather.glyphMap => {
    const icons: (keyof typeof Feather.glyphMap)[] = ["zap", "star", "award"];
    return icons[idx % icons.length];
  };

  const getCategoryLabel = (idx: number): string => {
    const labels = ["Essentials", "Signature", "Premium"];
    return labels[idx % labels.length];
  };

  const formatDuration = (minutes: number): string => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes} min`;
  };

  return (
    <Animated.View 
      style={animatedStyle}
      entering={FadeInDown.delay(index * 100).springify()}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.serviceCardWrapper}
      >
        <BlurView
          intensity={isDark ? 40 : 60}
          tint={isDark ? "dark" : "light"}
          style={[
            styles.serviceCard,
            {
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
              backgroundColor: isDark ? "rgba(20,20,20,0.6)" : "rgba(255,255,255,0.7)",
            },
          ]}
        >
          {service.photos?.[0] ? <Image source={{ uri: service.photos[0] }} resizeMode="cover" style={styles.listingCover} accessibilityLabel={`${service.name} cover photo`} /> : <View style={[styles.listingCover, styles.listingPlaceholder]}><Feather name="home" size={36} color="#C17F3E" /></View>}
          {isPopular && (
            <View style={[styles.popularBadge, { backgroundColor: theme.text }]}>
              <ThemedText style={[styles.popularBadgeText, { color: theme.buttonText }]}>
                Most Popular
              </ThemedText>
            </View>
          )}

          <View style={styles.serviceCardContent}>
            <View style={styles.serviceCardLeft}>
              <View style={styles.categoryRow}>
                <Feather name={getCategoryIcon(index)} size={12} color={theme.text} />
                <ThemedText style={styles.categoryLabel}>
                  {getCategoryLabel(index)}
                </ThemedText>
              </View>

              <ThemedText style={styles.serviceName}>{service.name}</ThemedText>
              {parsePropertyDetails(service.description).agent ? <ThemedText style={styles.serviceDescription}>Agent: {parsePropertyDetails(service.description).agent}</ThemedText> : null}
              <View style={styles.propertyBadges}>
                {Object.entries(parsePropertyDetails(service.description)).filter(([key, value]) => key !== "agent" && value !== null).map(([key, value]) => <ThemedText style={styles.propertyBadge} key={key}>{value} {key === "beds" ? "bed" : key === "baths" ? "bath" : "park"}</ThemedText>)}
                <ThemedText style={styles.availabilityBadge}>Available</ThemedText>
              </View>

              {service.description && (
                <ThemedText style={styles.serviceDescription} numberOfLines={2}>
                  {service.description}
                </ThemedText>
              )}

              <View style={styles.durationRow}>
                <Feather name="clock" size={12} color={theme.textSecondary} />
                <ThemedText style={styles.durationText}>
                  {formatDuration(service.duration)}
                </ThemedText>
              </View>
            </View>

            <View style={styles.serviceCardRight}>
              <ThemedText style={styles.servicePrice}>
                {formatPrice(service.price)}
              </ThemedText>

              <View style={[styles.arrowButton, { backgroundColor: theme.text }]}>
                <Feather name="chevron-right" size={20} color={theme.buttonText} />
              </View>
            </View>
          </View>
        </BlurView>
      </Pressable>
    </Animated.View>
  );
}

export default function SelectServiceScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation<Navigation>();
  const route = useRoute();
  const slug = (route.params as any)?.slug || "default";

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    setLoading(true);
    try {
      await api.getOrCreateBusiness();
      const data = await api.getServices();
      setServices(data.filter((service) => service.isActive !== false).map(toBookingService));
      setLoadError(false);
    } catch (error) {
      console.error("Error loading booking services:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectService = (service: Service) => {
    setSelectedService(service);
    navigation.navigate("SelectTime", { serviceId: service.id });
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.oversizedTextContainer, { top: insets.top + 60 }]}>
        <ThemedText style={[styles.oversizedText, { opacity: isDark ? 0.03 : 0.04 }]}>
          SELECT
        </ThemedText>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <ThemedText style={styles.businessLabel}>BookFlowX</ThemedText>
            <ThemedText style={styles.headerTitle}>{t('booking.services')}</ThemedText>
          </View>
          <ProgressRing step={1} total={3} />
        </View>

        <ThemedText style={styles.subtitle}>
          {t('booking.selectService')}
        </ThemedText>

        <View style={styles.servicesList}>
          {loading ? (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyText}>Loading available viewing options…</ThemedText>
            </View>
          ) : loadError ? (
            <Pressable style={styles.emptyState} onPress={loadServices}>
              <ThemedText style={styles.emptyText}>Could not load viewing options. Tap to retry.</ThemedText>
            </Pressable>
          ) : services.map((service, index) => (
            <CinematicServiceCard
              key={service.id}
              service={service}
              index={index}
              onPress={() => handleSelectService(service)}
            />
          ))}

          {services.length === 0 && !loading && !loadError && (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyText}>
                {t('booking.noServicesAvailable')}
              </ThemedText>
            </View>
          )}
        </View>
      </ScrollView>

      <VoiceAssistantButton slug={slug} />

      <View 
        style={[
          styles.bottomGradient, 
          { 
            paddingBottom: insets.bottom + Spacing.lg,
            backgroundColor: isDark ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.9)",
          }
        ]}
      >
        <View style={styles.progressIndicator}>
          <View style={[styles.progressDot, styles.progressDotActive, { backgroundColor: theme.text }]} />
          <View style={[styles.progressDot, { backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)" }]} />
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
    left: -10,
    width: SCREEN_WIDTH + 20,
    overflow: "hidden",
    pointerEvents: "none",
    zIndex: 0,
  },
  oversizedText: {
    fontSize: 96,
    fontWeight: "900",
    letterSpacing: -6,
    lineHeight: 90,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing["2xl"],
    zIndex: 10,
  },
  headerLeft: {
    flex: 1,
  },
  businessLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 2,
    opacity: 0.5,
    marginBottom: Spacing.xs,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.6,
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
  subtitle: {
    fontSize: 14,
    fontWeight: "500",
    opacity: 0.72,
    marginBottom: Spacing["2xl"],
    maxWidth: 250,
    lineHeight: 26,
  },
  servicesList: {
    gap: Spacing.lg,
  },
  serviceCardWrapper: {
    borderRadius: 20,
    overflow: "hidden",
  },
  serviceCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  listingCover: { width: "100%", height: 160, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  listingPlaceholder: { alignItems: "center", justifyContent: "center", backgroundColor: "#F5EFE6" },
  propertyBadges: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginVertical: 7 },
  propertyBadge: { backgroundColor: "#F5EFE6", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3, fontSize: 11, color: "#6B5744" },
  availabilityBadge: { backgroundColor: "#EFF5EF", color: "#4A7C59", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3, fontSize: 11 },
  popularBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
    borderBottomLeftRadius: BorderRadius.lg,
  },
  popularBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  serviceCardContent: {
    padding: Spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  serviceCardLeft: {
    flex: 1,
    paddingRight: Spacing.lg,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    opacity: 0.4,
  },
  serviceName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  serviceDescription: {
    fontSize: 14,
    opacity: 0.6,
    lineHeight: 20,
    marginBottom: Spacing.lg,
    maxWidth: 200,
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  durationText: {
    fontSize: 12,
    fontWeight: "500",
    opacity: 0.6,
  },
  serviceCardRight: {
    alignItems: "flex-end",
  },
  servicePrice: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: Spacing.sm,
    letterSpacing: -0.5,
  },
  arrowButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: Spacing["3xl"],
    alignItems: "center",
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
  emptyState: {
    padding: Spacing["3xl"],
    alignItems: "center",
  },
  emptyText: {
    opacity: 0.7,
    fontSize: 14,
  },
  voiceFab: {
    position: "absolute",
    right: 24,
    bottom: 120,
    zIndex: 100,
  },
  voiceFabPressable: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  voiceFabBlur: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
