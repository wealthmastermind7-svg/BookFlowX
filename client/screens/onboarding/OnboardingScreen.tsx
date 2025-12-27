import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ViewToken,
  Dimensions,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  useAnimatedScrollHandler,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface OnboardingSlide {
  id: string;
  headline: string;
  subheadline: string;
  description: string;
  icon: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: "1",
    headline: "Booking,",
    subheadline: "Made Effortless.",
    description: "A powerful scheduling system built for service businesses.",
    icon: "calendar",
  },
  {
    id: "2",
    headline: "Share",
    subheadline: "Bookings Instantly.",
    description: "Generate QR codes and shareable links for seamless bookings.",
    icon: "share-2",
  },
  {
    id: "3",
    headline: "Manage",
    subheadline: "Everything Easily.",
    description: "Track revenue, manage services, and oversee all bookings.",
    icon: "settings",
  },
  {
    id: "4",
    headline: "Get",
    subheadline: "Started Now.",
    description: "Join thousands of businesses already using BookFlow.",
    icon: "arrow-right",
  },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { theme: colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useSharedValue(0);

  const handleViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]) {
        setCurrentIndex(viewableItems[0].index || 0);
      }
    }
  ).current;

  const onScroll = useAnimatedScrollHandler((event: any) => {
    scrollX.value = event.contentOffset.x;
  });

  const handleNext = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      onComplete();
    }
  };

  const handleSkip = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onComplete();
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <ScrollView
        contentContainerStyle={[
          styles.slideContent,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        scrollEnabled={false}
      >
        <View style={styles.header}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <Feather
              name={item.icon as any}
              size={40}
              color={colors.text}
            />
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.headlineContainer}>
            <Text
              style={[
                styles.headline,
                { color: colors.text },
              ]}
            >
              {item.headline}
            </Text>
            <Text
              style={[
                styles.subheadline,
                { color: colors.textSecondary },
              ]}
            >
              {item.subheadline}
            </Text>
          </View>

          <ThemedText
            type="body"
            style={[
              styles.description,
              { color: colors.textSecondary },
            ]}
          >
            {item.description}
          </ThemedText>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.backgroundRoot }]}>
      {/* Header */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top,
            borderBottomColor: colors.borderLight,
          },
        ]}
      >
        <View style={styles.logoContainer}>
          <View
            style={[
              styles.logoIcon,
              { backgroundColor: colors.text },
            ]}
          >
            <Feather name="calendar" size={16} color={colors.backgroundRoot} />
          </View>
          <Text style={[styles.logoText, { color: colors.text }]}>BookFlow</Text>
        </View>
        <Pressable onPress={handleSkip}>
          <ThemedText
            type="body"
            style={[
              styles.skipButton,
              { color: colors.textTertiary },
            ]}
          >
            Skip
          </ThemedText>
        </Pressable>
      </View>

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        scrollEnabled
        scrollEventThrottle={16}
        onScroll={onScroll}
        onViewableItemsChanged={handleViewableItemsChanged}
        showsHorizontalScrollIndicator={false}
        snapToInterval={SCREEN_WIDTH}
        decelerationRate="fast"
      />

      {/* Footer */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + Spacing.lg,
            borderTopColor: colors.borderLight,
          },
        ]}
      >
        {/* Dots */}
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, index) => {
            const animatedDotStyle = useAnimatedStyle(() => {
              const width = interpolate(
                scrollX.value,
                [
                  (index - 1) * SCREEN_WIDTH,
                  index * SCREEN_WIDTH,
                  (index + 1) * SCREEN_WIDTH,
                ],
                [8, 24, 8],
                Extrapolate.CLAMP
              );
              const opacity = interpolate(
                scrollX.value,
                [
                  (index - 1) * SCREEN_WIDTH,
                  index * SCREEN_WIDTH,
                  (index + 1) * SCREEN_WIDTH,
                ],
                [0.4, 1, 0.4],
                Extrapolate.CLAMP
              );

              return {
                width,
                opacity,
              };
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor: colors.text,
                  },
                  animatedDotStyle,
                ]}
              />
            );
          })}
        </View>

        {/* CTA Button */}
        <Pressable
          style={[
            styles.ctaButton,
            { backgroundColor: colors.text },
          ]}
          onPress={handleNext}
        >
          <Text style={[styles.ctaText, { color: colors.backgroundRoot }]}>
            {currentIndex === SLIDES.length - 1 ? "Get Started" : "Next"}
          </Text>
          <Feather
            name="arrow-right"
            size={18}
            color={colors.backgroundRoot}
            style={styles.ctaIcon}
          />
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  skipButton: {
    fontSize: 14,
    fontWeight: "500",
  },
  slide: {
    flex: 1,
    justifyContent: "space-between",
  },
  slideContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    gap: Spacing["2xl"],
  },
  headlineContainer: {
    gap: Spacing.sm,
  },
  headline: {
    fontSize: 56,
    fontWeight: "700",
    letterSpacing: -0.5,
    lineHeight: 64,
  },
  subheadline: {
    fontSize: 56,
    fontWeight: "400",
    letterSpacing: -0.5,
    lineHeight: 64,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400",
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  ctaButton: {
    flexDirection: "row",
    height: 56,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "600",
  },
  ctaIcon: {
    marginLeft: Spacing.xs,
  },
});
