import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  Platform,
  FlatList,
  ViewToken,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedProps,
  useSharedValue,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import * as AppleAuthentication from "expo-apple-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { api } from "@/lib/api";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const ONBOARDING_COMPLETE_KEY = "@bookflow_onboarding_complete";

// Map onboarding business types to demo data business types
const BUSINESS_TYPE_DEMO_MAP: Record<string, string> = {
  salon: "salon",
  medical: "medical",
  automotive: "autodetailing",
  fitness: "fitness",
  veterinary: "veterinary",
  education: "coaching",
  photography: "photography",
  consulting: "consulting",
};

interface OnboardingScreenProps {
  onComplete: () => void;
}

const PAGES = [
  {
    id: "1",
    headline: "Booking Made",
    highlightText: "Effortless",
    description: "Beautiful appointment scheduling for every business type. No accounts. No waiting.",
    buttonText: "Get Started",
    showSkip: false,
  },
  {
    id: "2",
    headline: "Built for How",
    highlightText: "You Work",
    description: "From salons to clinics, coaches to car care. One powerful dashboard for every appointment.",
    buttonText: "Continue",
    showSkip: true,
  },
  {
    id: "3",
    headline: "Every Appointment.",
    highlightText: "Captured.",
    description: "Instant confirmations, zero back-and-forth. Let your business run itself.",
    buttonText: "Get Started",
    showSkip: true,
    showLogin: true,
  },
];

interface BusinessType {
  id: string;
  name: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  backgroundImage: any;
}

const BUSINESS_TYPES: BusinessType[] = [
  {
    id: "salon",
    name: "Salons & Beauty",
    icon: "scissors",
    color: "#EC4899",
    backgroundImage: require("../assets/stock_images/elegant_salon_and_beauty_background.png"),
  },
  {
    id: "medical",
    name: "Dentists & Medical",
    icon: "heart",
    color: "#3B82F6",
    backgroundImage: require("../assets/stock_images/professional_medical_clinic_background.png"),
  },
  {
    id: "automotive",
    name: "Car Detailers",
    icon: "truck",
    color: "#F59E0B",
    backgroundImage: require("../assets/stock_images/professional_car_detailing_background.png"),
  },
  {
    id: "fitness",
    name: "Fitness Trainers",
    icon: "zap",
    color: "#10B981",
    backgroundImage: require("../assets/stock_images/professional_fitness_studio_background.png"),
  },
  {
    id: "veterinary",
    name: "Veterinary Clinics",
    icon: "activity",
    color: "#8B5CF6",
    backgroundImage: require("../assets/stock_images/professional_veterinary_clinic_background.png"),
  },
  {
    id: "education",
    name: "Tutoring & Coaching",
    icon: "book",
    color: "#06B6D4",
    backgroundImage: require("../assets/stock_images/professional_tutoring_studio_background.png"),
  },
  {
    id: "photography",
    name: "Photography Studios",
    icon: "camera",
    color: "#6366F1",
    backgroundImage: require("../assets/stock_images/professional_photography_studio_background.png"),
  },
  {
    id: "consulting",
    name: "Consulting & Services",
    icon: "briefcase",
    color: "#14B8A6",
    backgroundImage: require("../assets/stock_images/professional_consulting_office_background.png"),
  },
];

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function CircularMeter() {
  const { theme: colors, isDark } = useTheme();
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 2000 });
  }, []);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(progress.value, [0, 1], [circumference, 0]),
  }));

  return (
    <View style={styles.meterContainer}>
      <Svg width={100} height={100} viewBox="0 0 100 100" style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle
          cx="50"
          cy="50"
          r={radius}
          stroke={isDark ? "#374151" : "#E5E7EB"}
          strokeWidth={8}
          fill="transparent"
          opacity={0.3}
        />
        <AnimatedCircle
          cx="50"
          cy="50"
          r={radius}
          stroke={colors.text}
          strokeWidth={8}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={styles.meterTextContainer}>
        <Text style={[styles.meterValue, { color: colors.text }]}>100%</Text>
        <Text style={[styles.meterLabel, { color: colors.textSecondary }]}>BOOKED</Text>
      </View>
    </View>
  );
}

function BusinessTypeSelector({ 
  selectedType, 
  onSelect,
  onLoadDemoData,
  isDark,
  colors,
  isLoading = false,
}: { 
  selectedType: string; 
  onSelect: (id: string) => void;
  onLoadDemoData: (id: string) => Promise<void>;
  isDark: boolean;
  colors: any;
  isLoading?: boolean;
}) {
  const scrollRef = useRef<ScrollView>(null);

  return (
    <View style={styles.selectorContainer}>
      <View style={styles.selectorGradient} />
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        snapToInterval={140}
        decelerationRate="fast"
        style={styles.selectorScroll}
        contentContainerStyle={styles.selectorContent}
      >
        {BUSINESS_TYPES.map((type) => (
          <Pressable
            key={type.id}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(type.id);
              await onLoadDemoData(type.id);
            }}
            disabled={isLoading}
            style={[
              styles.businessButton,
              selectedType === type.id && styles.businessButtonActive,
              isLoading && styles.businessButtonDisabled,
              {
                backgroundColor:
                  selectedType === type.id
                    ? isDark
                      ? "rgba(255,255,255,0.15)"
                      : "rgba(255,255,255,0.95)"
                    : isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(255,255,255,0.5)",
              },
            ]}
          >
            {isLoading && selectedType === type.id ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <>
                <Feather name={type.icon} size={20} color={selectedType === type.id ? type.color : colors.textSecondary} />
                <Text
                  style={[
                    styles.businessButtonText,
                    {
                      color: selectedType === type.id ? colors.text : colors.textSecondary,
                      fontWeight: selectedType === type.id ? "600" : "500",
                    },
                  ]}
                  numberOfLines={2}
                >
                  {type.name}
                </Text>
              </>
            )}
          </Pressable>
        ))}
      </ScrollView>
      <View style={[styles.selectorGradientRight, { backgroundColor: isDark ? "rgba(5,5,5,0.8)" : "rgba(250,250,250,0.8)" }]} />
    </View>
  );
}

function Page1Content({ 
  selectedBusinessType,
  onBusinessTypeChange,
  onLoadDemoData,
  isLoadingDemo = false,
}: { 
  selectedBusinessType: string;
  onBusinessTypeChange: (typeId: string) => void;
  onLoadDemoData: (typeId: string) => Promise<void>;
  isLoadingDemo?: boolean;
}) {
  const { theme: colors, isDark } = useTheme();

  return (
    <View style={styles.page1Container}>
      <View style={styles.page1Content}>
        <View style={[styles.shadowCard, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.2)" }]} />

        <Animated.View
          entering={FadeInDown.delay(300).springify()}
          style={[styles.glassCard, { backgroundColor: isDark ? "rgba(30,30,30,0.7)" : "rgba(255,255,255,0.7)" }]}
        >
          <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          <View style={styles.glassCardContent}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardHeaderText, { color: colors.text }]}>DAILY GOAL</Text>
              <Feather name="more-horizontal" size={16} color={colors.textSecondary} />
            </View>

            <CircularMeter />

            <View style={styles.clientList}>
              <View style={styles.clientRow}>
                <View style={[styles.avatar, { backgroundColor: colors.backgroundSecondary }]}>
                  <Feather name="user" size={14} color={colors.textSecondary} />
                </View>
                <View style={styles.clientInfo}>
                  <View style={[styles.skeletonLine, { width: 80, backgroundColor: colors.backgroundSecondary }]} />
                  <View style={[styles.skeletonLineSmall, { width: 60, backgroundColor: colors.backgroundTertiary }]} />
                </View>
                <View style={styles.checkBadge}>
                  <Feather name="check" size={10} color="#FFFFFF" />
                </View>
              </View>
              <View style={[styles.clientRow, { opacity: 0.5 }]}>
                <View style={[styles.avatar, { backgroundColor: colors.backgroundSecondary }]}>
                  <Feather name="user" size={14} color={colors.textSecondary} />
                </View>
                <View style={styles.clientInfo}>
                  <View style={[styles.skeletonLine, { width: 60, backgroundColor: colors.backgroundSecondary }]} />
                  <View style={[styles.skeletonLineSmall, { width: 40, backgroundColor: colors.backgroundTertiary }]} />
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeIn.delay(600)}
          style={[styles.notificationBadge, { backgroundColor: isDark ? "rgba(50,50,50,0.8)" : "rgba(255,255,255,0.9)" }]}
        >
          <Feather name="calendar" size={20} color={colors.text} />
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(800)}
          style={[styles.newClientChip, { backgroundColor: isDark ? "rgba(50,50,50,0.9)" : "rgba(255,255,255,0.95)" }]}
        >
          <View style={styles.greenDot} />
          <Text style={[styles.newClientText, { color: colors.text }]}>New Client</Text>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.delay(400)}>
        <BusinessTypeSelector 
          selectedType={selectedBusinessType} 
          onSelect={onBusinessTypeChange}
          onLoadDemoData={onLoadDemoData}
          isDark={isDark}
          colors={colors}
          isLoading={isLoadingDemo}
        />
      </Animated.View>
    </View>
  );
}

function Page2Content() {
  const { theme: colors, isDark } = useTheme();

  return (
    <View style={styles.page2Content}>
      <Animated.View
        entering={FadeIn.delay(300).springify()}
        style={[
          styles.industryChip,
          {
            backgroundColor: isDark ? "rgba(50,50,50,0.85)" : "rgba(255,255,255,0.9)",
            top: 80,
            left: 20,
          },
        ]}
      >
        <Feather name="heart" size={14} color={colors.text} />
        <Text style={[styles.industryText, { color: colors.text }]}>Wellness & Salon</Text>
      </Animated.View>

      <Animated.View
        entering={FadeIn.delay(450).springify()}
        style={[
          styles.industryChip,
          {
            backgroundColor: isDark ? "rgba(50,50,50,0.85)" : "rgba(255,255,255,0.9)",
            top: 130,
            right: 60,
          },
        ]}
      >
        <Feather name="activity" size={14} color={colors.text} />
        <Text style={[styles.industryText, { color: colors.text }]}>Clinics</Text>
      </Animated.View>

      <Animated.View
        entering={FadeIn.delay(600).springify()}
        style={[
          styles.industryChip,
          {
            backgroundColor: isDark ? "rgba(50,50,50,0.85)" : "rgba(255,255,255,0.9)",
            top: 180,
            right: 30,
          },
        ]}
      >
        <Feather name="target" size={14} color={colors.text} />
        <Text style={[styles.industryText, { color: colors.text }]}>Fitness Coaches</Text>
      </Animated.View>

      <Animated.View
        entering={FadeIn.delay(750).springify()}
        style={[
          styles.industryChip,
          {
            backgroundColor: isDark ? "rgba(50,50,50,0.85)" : "rgba(255,255,255,0.9)",
            top: 280,
            left: 30,
          },
        ]}
      >
        <Feather name="truck" size={14} color={colors.text} />
        <Text style={[styles.industryText, { color: colors.text }]}>Auto Detailing</Text>
      </Animated.View>
    </View>
  );
}

function Page3Content() {
  const { theme: colors, isDark } = useTheme();

  return (
    <View style={styles.page3Content}>
      <Animated.View
        entering={FadeInDown.delay(300).springify()}
        style={[styles.notificationCard, { backgroundColor: isDark ? "rgba(30,30,30,0.85)" : "rgba(255,255,255,0.9)" }]}
      >
        <BlurView intensity={isDark ? 30 : 50} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        <View style={styles.notificationContent}>
          <Text style={[styles.notificationLabel, { color: colors.textSecondary }]}>UPCOMING BOOKING</Text>
          <View style={styles.notificationRow}>
            <View style={styles.notificationCheck}>
              <Feather name="check" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.notificationInfo}>
              <Text style={[styles.notificationTitle, { color: colors.text }]}>Sarah J. - Consultation</Text>
              <Text style={[styles.notificationSubtitle, { color: colors.textSecondary }]}>Friday, 2:00 PM</Text>
            </View>
            <Text style={[styles.notificationTime, { color: colors.textTertiary }]}>Today</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeIn.delay(500)}
        style={[styles.calendarChip, { backgroundColor: "#3B82F6" }]}
      >
        <Feather name="calendar" size={16} color="#FFFFFF" />
        <View style={[styles.calendarLine, { backgroundColor: "rgba(255,255,255,0.4)" }]} />
      </Animated.View>
    </View>
  );
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { theme: colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedBusinessType, setSelectedBusinessType] = useState("salon");
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (currentIndex < PAGES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
      onComplete();
    }
  }, [currentIndex, onComplete]);

  const handleSkip = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
    onComplete();
  }, [onComplete]);

  const handleLogin = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      
      if (credential) {
        // In a real app, we'd verify the token with our backend
        // For now, we'll simulate a successful login by completing onboarding
        await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
        onComplete();
      }
    } catch (e: any) {
      if (e.code === "ERR_CANCELED") {
        // User canceled, do nothing
      } else {
        console.error("Apple Sign-In Error:", e);
        Alert.alert("Login Failed", "There was an error signing in with Apple. Please try again.");
      }
    }
  }, [onComplete]);

  const handleBusinessTypeChange = useCallback((typeId: string) => {
    setSelectedBusinessType(typeId);
  }, []);

  const handleLoadDemoData = useCallback(async (typeId: string) => {
    setIsLoadingDemo(true);
    try {
      // Ensure business exists before loading demo data
      await api.getOrCreateBusiness();
      
      const demoType = BUSINESS_TYPE_DEMO_MAP[typeId] || "salon";
      await api.initializeDemoData(demoType);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const businessName = BUSINESS_TYPES.find(t => t.id === typeId)?.name || "this business";
      Alert.alert("Success", `Demo data for ${businessName} has been loaded`, [
        {
          text: "Continue",
          onPress: async () => {
            // Continue to next page instead of completing onboarding
            if (currentIndex < PAGES.length - 1) {
              flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
            } else {
              // Only complete onboarding after viewing all pages
              await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
              onComplete();
            }
          },
        },
      ]);
    } catch (error) {
      console.error("Error initializing demo data:", error);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      Alert.alert("Error", "Failed to load demo data. Please try again.");
    } finally {
      setIsLoadingDemo(false);
    }
  }, [onComplete, currentIndex]);

  const renderPage = useCallback(
    ({ item, index }: { item: (typeof PAGES)[0]; index: number }) => {
      return (
        <View style={[styles.page, { width: SCREEN_WIDTH }]}>
          <View style={styles.illustrationContainer}>
            {index === 0 && (
              <Page1Content 
                selectedBusinessType={selectedBusinessType} 
                onBusinessTypeChange={handleBusinessTypeChange}
                onLoadDemoData={handleLoadDemoData}
                isLoadingDemo={isLoadingDemo}
              />
            )}
            {index === 1 && <Page2Content />}
            {index === 2 && <Page3Content />}
          </View>

          <View style={[styles.contentPanel, { backgroundColor: isDark ? colors.backgroundRoot : "#FAFAFA" }]}>
            <View style={styles.paginationDots}>
              {PAGES.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === currentIndex ? styles.dotActive : styles.dotInactive,
                    { backgroundColor: i === currentIndex ? colors.text : colors.backgroundSecondary },
                  ]}
                />
              ))}
            </View>

            <View style={styles.textContent}>
              <Text style={[styles.headline, { color: colors.text }]}>
                {item.headline}{" "}
                <Text style={[styles.highlightText, { color: isDark ? "#6B7280" : "#4B5563" }]}>
                  {item.highlightText}
                </Text>
              </Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {item.description}
              </Text>
            </View>

            <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + Spacing.lg }]}>
              <Pressable
                style={[styles.primaryButton, { backgroundColor: colors.text }]}
                onPress={handleNext}
              >
                <Text style={[styles.primaryButtonText, { color: colors.backgroundRoot }]}>
                  {item.buttonText}
                </Text>
                <Feather name="arrow-right" size={18} color={colors.backgroundRoot} />
              </Pressable>

              {item.showLogin && (
                <Pressable style={styles.loginButton} onPress={handleLogin}>
                  <Text style={[styles.loginButtonText, { color: "#3B82F6" }]}>
                    Log in to existing account
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      );
    },
    [colors, isDark, currentIndex, handleNext, handleLogin, insets.bottom, selectedBusinessType, handleBusinessTypeChange, handleLoadDemoData, isLoadingDemo]
  );

  const selectedBusinessTypeData = BUSINESS_TYPES.find(t => t.id === selectedBusinessType);
  const backgroundImage = selectedBusinessTypeData?.backgroundImage || require("../assets/stock_images/professional_salon_i_c9c033e3.jpg");

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundRoot }]}>
      <Image
        source={backgroundImage}
        style={styles.backgroundImage}
        contentFit="cover"
      />
      <View style={[styles.backgroundOverlay, { backgroundColor: isDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.2)" }]} />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.brandContainer}>
          <Image
            source={require("../assets/app-icon.png")}
            style={styles.brandIcon}
            contentFit="contain"
          />
          <Text style={[styles.brandText, { color: colors.text }]}>BookFlow</Text>
        </View>

        {PAGES[currentIndex].showSkip && (
          <Pressable style={styles.skipButton} onPress={handleSkip}>
            <Text style={[styles.skipButtonText, { color: colors.text }]}>Skip</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={PAGES}
        renderItem={renderPage}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
        scrollEventThrottle={16}
      />
    </View>
  );
}

export async function checkOnboardingComplete(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
    return value === "true";
  } catch {
    return false;
  }
}

export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDING_COMPLETE_KEY);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    zIndex: 10,
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  brandIcon: {
    width: 32,
    height: 32,
  },
  brandText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  skipButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: "500",
  },
  page: {
    flex: 1,
    justifyContent: "flex-end",
  },
  illustrationContainer: {
    flex: 1,
    position: "relative",
    paddingTop: 80,
  },
  contentPanel: {
    borderTopLeftRadius: BorderRadius["2xl"],
    borderTopRightRadius: BorderRadius["2xl"],
    paddingTop: Spacing["2xl"],
    paddingHorizontal: Spacing.xl,
  },
  paginationDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
    marginBottom: Spacing["2xl"],
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 24,
  },
  dotInactive: {
    width: 6,
  },
  textContent: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  headline: {
    fontSize: 32,
    fontWeight: "400",
    textAlign: "center",
    lineHeight: 40,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    marginBottom: Spacing.md,
  },
  highlightText: {
    fontStyle: "italic",
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: Spacing.lg,
  },
  buttonContainer: {
    gap: Spacing.lg,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: 56,
    borderRadius: BorderRadius.full,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: "500",
  },
  loginButton: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  loginButtonText: {
    fontSize: 15,
    fontWeight: "500",
  },
  page1Container: {
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: Spacing.lg,
  },
  page1Content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  shadowCard: {
    position: "absolute",
    width: 260,
    height: 320,
    borderRadius: BorderRadius["2xl"],
    transform: [{ rotate: "-6deg" }, { translateY: 10 }],
  },
  glassCard: {
    width: 280,
    borderRadius: BorderRadius["2xl"],
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  glassCardContent: {
    padding: Spacing.xl,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  cardHeaderText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
  },
  meterContainer: {
    width: 100,
    height: 100,
    alignSelf: "center",
    marginBottom: Spacing.xl,
  },
  meterTextContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  meterValue: {
    fontSize: 22,
    fontWeight: "500",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  meterLabel: {
    fontSize: 8,
    fontWeight: "600",
    letterSpacing: 1,
    marginTop: 2,
  },
  clientList: {
    gap: Spacing.md,
  },
  clientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  clientInfo: {
    flex: 1,
    gap: 4,
  },
  skeletonLine: {
    height: 8,
    borderRadius: 4,
  },
  skeletonLineSmall: {
    height: 6,
    borderRadius: 3,
  },
  checkBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadge: {
    position: "absolute",
    right: SCREEN_WIDTH * 0.12,
    top: "30%",
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  newClientChip: {
    position: "absolute",
    left: SCREEN_WIDTH * 0.08,
    bottom: "30%",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  newClientText: {
    fontSize: 12,
    fontWeight: "500",
  },
  page2Content: {
    flex: 1,
    position: "relative",
  },
  industryChip: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  industryText: {
    fontSize: 13,
    fontWeight: "500",
  },
  page3Content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  notificationCard: {
    width: "90%",
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  notificationContent: {
    padding: Spacing.lg,
  },
  notificationLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.2,
    marginBottom: Spacing.sm,
  },
  notificationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  notificationCheck: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  notificationSubtitle: {
    fontSize: 13,
  },
  notificationTime: {
    fontSize: 12,
  },
  calendarChip: {
    position: "absolute",
    left: "10%",
    bottom: "35%",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
  },
  calendarLine: {
    width: 60,
    height: 6,
    borderRadius: 3,
  },
  selectorContainer: {
    position: "relative",
    height: 120,
    marginHorizontal: -Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  selectorGradient: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 20,
    zIndex: 10,
    backgroundColor: "rgba(250,250,250,0.8)",
  },
  selectorGradientRight: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 20,
    zIndex: 10,
  },
  selectorScroll: {
    flex: 1,
  },
  selectorContent: {
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  businessButton: {
    width: 120,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  businessButtonActive: {
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.2)",
  },
  businessButtonDisabled: {
    opacity: 0.6,
  },
  businessButtonText: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 14,
  },
});
