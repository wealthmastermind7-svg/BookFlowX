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
} from "react-native";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const ONBOARDING_COMPLETE_KEY = "@bookflow_onboarding_complete";
const SELECTED_DEMO_TYPE_KEY = "@bookflow_selected_demo_type";

interface OnboardingScreenProps {
  onComplete: () => void;
}

const INDUSTRIES = [
  { id: "hvac", label: "HVAC" },
  { id: "plumbing", label: "Plumbing" },
  { id: "electrical", label: "Electrical" },
  { id: "roofing", label: "Roofing" },
  { id: "construction", label: "Construction" },
  { id: "handyman", label: "Handyman" },
  { id: "appliance-repair", label: "Appliance Repair" },
  { id: "painting", label: "Painting" },
  { id: "renovations", label: "Renovations" },
  { id: "flooring", label: "Flooring" },
  { id: "residential-cleaning", label: "Residential Cleaning" },
  { id: "commercial-cleaning", label: "Commercial Cleaning" },
  { id: "window-cleaning", label: "Window Cleaning" },
  { id: "pressure-washing", label: "Pressure Washing" },
  { id: "carpet-cleaning", label: "Carpet Cleaning" },
  { id: "landscaping", label: "Landscaping" },
  { id: "lawn-care", label: "Lawn Care" },
  { id: "tree-care", label: "Tree Care" },
  { id: "pool-service", label: "Pool Service" },
  { id: "auto-detailing", label: "Auto Detailing" },
  { id: "mobile-car-wash", label: "Mobile Car Wash" },
  { id: "mechanics", label: "Mechanics" },
  { id: "hair-salon", label: "Hair Salon" },
  { id: "barbershop", label: "Barbershop" },
  { id: "nail-salon", label: "Nail Salon" },
  { id: "lash-brow", label: "Lash & Brow" },
  { id: "spa", label: "Spa" },
  { id: "massage", label: "Massage" },
  { id: "tattoo", label: "Tattoo" },
  { id: "personal-trainer", label: "Personal Trainer" },
  { id: "fitness-studio", label: "Fitness Studio" },
  { id: "yoga-studio", label: "Yoga Studio" },
  { id: "pilates", label: "Pilates" },
  { id: "crossfit", label: "CrossFit" },
  { id: "dance-studio", label: "Dance Studio" },
  { id: "martial-arts", label: "Martial Arts" },
  { id: "boxing", label: "Boxing" },
  { id: "sports-coaching", label: "Sports Coaching" },
  { id: "physiotherapy", label: "Physiotherapy" },
  { id: "chiropractic", label: "Chiropractic" },
  { id: "acupuncture", label: "Acupuncture" },
  { id: "psychology", label: "Psychology" },
  { id: "counseling", label: "Counseling" },
  { id: "speech-therapy", label: "Speech Therapy" },
  { id: "nutritionist", label: "Nutritionist" },
  { id: "business-consulting", label: "Business Consulting" },
  { id: "financial-advisor", label: "Financial Advisor" },
  { id: "accountant", label: "Accountant" },
  { id: "lawyer", label: "Lawyer" },
  { id: "private-tutor", label: "Private Tutor" },
  { id: "language-teacher", label: "Language Teacher" },
  { id: "music-teacher", label: "Music Teacher" },
  { id: "photography", label: "Photography" },
  { id: "videography", label: "Videography" },
  { id: "graphic-design", label: "Graphic Design" },
  { id: "event-planning", label: "Event Planning" },
  { id: "wedding-planning", label: "Wedding Planning" },
  { id: "pet-grooming", label: "Pet Grooming" },
  { id: "dog-training", label: "Dog Training" },
  { id: "veterinary", label: "Veterinary" },
];

function getBackgroundImageForType(industryId: string) {
  return require("../assets/stock_images/professional_salon_i_c9c033e3.jpg");
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

function Page1Content({ selectedIndustry, onSelectIndustry }: { selectedIndustry: string; onSelectIndustry: (id: string) => void }) {
  const { theme: colors, isDark } = useTheme();
  const scrollViewRef = React.useRef<ScrollView>(null);
  const lastScrollXRef = React.useRef(0);

  const handleScroll = React.useCallback(
    (event: any) => {
      const contentOffsetX = event.nativeEvent.contentOffset.x;
      const itemWidth = 110;
      const currentIndex = Math.round(contentOffsetX / itemWidth);
      const selectedItem = INDUSTRIES[currentIndex];
      
      if (selectedItem && selectedItem.id !== selectedIndustry && Math.abs(contentOffsetX - lastScrollXRef.current) > 50) {
        onSelectIndustry(selectedItem.id);
        lastScrollXRef.current = contentOffsetX;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [selectedIndustry, onSelectIndustry]
  );

  return (
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

      <Animated.View 
        entering={FadeInUp.delay(900)}
        style={[styles.industrySelector, { backgroundColor: isDark ? "rgba(20,20,20,0.95)" : "rgba(255,255,255,0.95)" }]}
      >
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          snapToInterval={110}
          contentContainerStyle={styles.industryList}
        >
          {INDUSTRIES.map((industry) => (
            <Pressable
              key={industry.id}
              onPress={() => {
                onSelectIndustry(industry.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
              style={[
                styles.industryChip,
                {
                  backgroundColor: selectedIndustry === industry.id
                    ? colors.text
                    : isDark ? "rgba(50,50,50,0.6)" : "rgba(0,0,0,0.05)",
                  borderColor: selectedIndustry === industry.id ? colors.text : "transparent",
                },
              ]}
            >
              <Text
                style={[
                  styles.industryChipText,
                  {
                    color: selectedIndustry === industry.id ? colors.backgroundRoot : colors.text,
                  },
                ]}
              >
                {industry.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
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
          styles.decorativeChip,
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
          styles.decorativeChip,
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
          styles.decorativeChip,
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
          styles.decorativeChip,
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
  const [selectedIndustry, setSelectedIndustry] = useState("hair-salon");

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
      await AsyncStorage.setItem(SELECTED_DEMO_TYPE_KEY, selectedIndustry);
      onComplete();
    }
  }, [currentIndex, onComplete, selectedIndustry]);

  const handleSkip = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
    await AsyncStorage.setItem(SELECTED_DEMO_TYPE_KEY, selectedIndustry);
    onComplete();
  }, [onComplete, selectedIndustry]);

  const handleLogin = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
    await AsyncStorage.setItem(SELECTED_DEMO_TYPE_KEY, selectedIndustry);
    onComplete();
  }, [onComplete, selectedIndustry]);

  const renderPage = useCallback(({ item, index }: { item: typeof PAGES[0]; index: number }) => {
    return (
      <View style={[styles.page, { width: SCREEN_WIDTH }]}>
        <View style={styles.illustrationContainer}>
          {index === 0 && <Page1Content selectedIndustry={selectedIndustry} onSelectIndustry={setSelectedIndustry} />}
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
  }, [colors, isDark, currentIndex, handleNext, handleLogin, insets.bottom]);

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundRoot }]}>
      <Image
        source={getBackgroundImageForType(selectedIndustry)}
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
  decorativeChip: {
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
  industrySelector: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: 100,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  industryList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  industryChip: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  industryChipText: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
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
});
