import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  Switch,
} from "react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { PurchasesPackage, PurchasesOffering } from "@/lib/revenuecat";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export type PaywallType =
  | "share_limit"
  | "qr_limit"
  | "embed_locked"
  | "soft_upsell"
  | "exit_prompt";

export type PlanType = "monthly" | "yearly" | "lifetime";

interface PaywallModalProps {
  visible: boolean;
  type: PaywallType;
  onClose: () => void;
  onUpgrade: (plan: PlanType) => void;
  isLoading?: boolean;
  offerings: PurchasesOffering | null;
  remainingCount?: number;
  onRestore?: () => void;
}

export function PaywallModal({
  visible,
  type,
  onClose,
  onUpgrade,
  isLoading = false,
  offerings,
  onRestore,
}: PaywallModalProps) {
  const { theme: colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("yearly");
  const [freeTrialEnabled, setFreeTrialEnabled] = useState(false);

  const floatY = useSharedValue(0);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    if (visible) {
      floatY.value = withRepeat(
        withSequence(
          withTiming(-12, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.2, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    }
  }, [visible]);

  const floatingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const handleUpgrade = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onUpgrade(selectedPlan);
  };

  const handleClose = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleRestore = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onRestore) {
      onRestore();
    }
  };

  const handlePlanSelect = async (plan: PlanType) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlan(plan);
  };

  const handleTrialToggle = async (value: boolean) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFreeTrialEnabled(value);
  };

  const yearlyPrice = "$69.99";
  const yearlyMonthly = "$5.83";
  const monthlyPrice = "$7.99";
  const lifetimePrice = "$149.00";

  const getCtaText = () => {
    if (selectedPlan === "lifetime") {
      return "Get Started";
    }
    if (freeTrialEnabled) {
      return "Start Free Trial";
    }
    return "Get Started";
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={StyleSheet.absoluteFill}
        >
          <BlurView
            intensity={isDark ? 40 : 60}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        <Animated.View
          entering={SlideInDown.springify().damping(20).mass(0.8)}
          exiting={SlideOutDown.duration(200)}
          style={[styles.modalContainer, { paddingBottom: insets.bottom }]}
        >
          <View style={[styles.modal, { backgroundColor: colors.backgroundRoot }]}>
            <View style={styles.headerRow}>
              <Pressable style={[styles.closeButton, { backgroundColor: colors.backgroundSecondary }]} onPress={handleClose}>
                <Feather name="x" size={20} color={colors.text} />
              </Pressable>
              <Pressable onPress={handleRestore} style={styles.restoreTopButton}>
                <Text style={[styles.restoreTopText, { color: colors.textSecondary }]}>RESTORE</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.heroSection}>
                <Animated.View style={[styles.floatingCircle, floatingStyle]}>
                  <Animated.View style={[styles.glowRing, glowStyle]} />
                  <View style={[styles.innerCircle, { borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }]}>
                    <View style={[styles.circleCore, { borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)" }]}>
                      <Feather name="star" size={40} color={colors.text} />
                    </View>
                  </View>
                </Animated.View>
              </View>

              <View style={styles.titleContainer}>
                <Text style={[styles.title, { color: colors.text }]}>
                  Unlock Full Access
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  BookFlow gives you a booking link and QR code so customers can book you instantly, with automatic confirmations and reminders.
                </Text>
              </View>

              <View style={[styles.trialToggle, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                <View style={styles.trialTextContainer}>
                  <Text style={[styles.trialText, { color: colors.text }]}>
                    Enable 7-day free trial
                  </Text>
                  <Text style={[styles.trialSubtext, { color: colors.textSecondary }]}>
                    Not sure yet? Cancel anytime.
                  </Text>
                </View>
                <Switch
                  value={freeTrialEnabled}
                  onValueChange={handleTrialToggle}
                  trackColor={{ false: colors.backgroundTertiary, true: colors.text }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={colors.backgroundTertiary}
                />
              </View>

              <View style={styles.planSection}>
                <Pressable
                  style={[
                    styles.planCard,
                    selectedPlan === "yearly" && styles.planCardSelected,
                    { 
                      backgroundColor: selectedPlan === "yearly" ? colors.backgroundSecondary : "transparent",
                      borderColor: selectedPlan === "yearly" ? colors.text : colors.border,
                      borderWidth: selectedPlan === "yearly" ? 2 : 1,
                    },
                  ]}
                  onPress={() => handlePlanSelect("yearly")}
                >
                  <View style={styles.planDetails}>
                    <View style={styles.planHeader}>
                      <Text style={[styles.planName, { color: colors.text, fontWeight: "700" }]}>
                        Yearly Access
                      </Text>
                      <View style={[styles.bestValueBadge, { backgroundColor: colors.text }]}>
                        <Text style={[styles.bestValueText, { color: colors.backgroundRoot }]}>BEST VALUE</Text>
                      </View>
                    </View>
                    <Text style={[styles.planDuration, { color: colors.textSecondary }]}>
                      {freeTrialEnabled ? "7-day free trial, then " : ""}{yearlyPrice}/year
                    </Text>
                  </View>
                  <View style={styles.planPriceRight}>
                    <Text style={[styles.planMonthly, { color: colors.text }]}>
                      {yearlyMonthly}
                    </Text>
                    <Text style={[styles.planUnit, { color: colors.textSecondary }]}>/mo</Text>
                  </View>
                </Pressable>

                <Pressable
                  style={[
                    styles.planCard,
                    selectedPlan === "monthly" && styles.planCardSelected,
                    { 
                      backgroundColor: selectedPlan === "monthly" ? colors.backgroundSecondary : "transparent",
                      borderColor: selectedPlan === "monthly" ? colors.text : colors.border,
                      borderWidth: selectedPlan === "monthly" ? 2 : 1,
                    },
                  ]}
                  onPress={() => handlePlanSelect("monthly")}
                >
                  <View style={styles.planDetails}>
                    <Text style={[styles.planName, { color: colors.text }]}>
                      Monthly
                    </Text>
                    <Text style={[styles.planDuration, { color: colors.textSecondary }]}>
                      Billed every month
                    </Text>
                  </View>
                  <View style={styles.planPriceRight}>
                    <Text style={[styles.planMonthlySmall, { color: colors.text }]}>
                      {monthlyPrice}
                    </Text>
                    <Text style={[styles.planUnit, { color: colors.textSecondary }]}>/mo</Text>
                  </View>
                </Pressable>

                <Pressable
                  style={[
                    styles.planCard,
                    selectedPlan === "lifetime" && styles.planCardSelected,
                    { 
                      backgroundColor: selectedPlan === "lifetime" ? colors.backgroundSecondary : "transparent",
                      borderColor: selectedPlan === "lifetime" ? colors.text : colors.border,
                      borderWidth: selectedPlan === "lifetime" ? 2 : 1,
                    },
                  ]}
                  onPress={() => handlePlanSelect("lifetime")}
                >
                  <View style={styles.planDetails}>
                    <Text style={[styles.planName, { color: colors.text }]}>
                      Lifetime Access
                    </Text>
                    <Text style={[styles.planDuration, { color: colors.textSecondary }]}>
                      One-time payment
                    </Text>
                  </View>
                  <View style={styles.planPriceRight}>
                    <Text style={[styles.planMonthlySmall, { color: colors.text }]}>
                      {lifetimePrice}
                    </Text>
                  </View>
                </Pressable>
              </View>

              <Pressable
                style={[
                  styles.ctaButton, 
                  { 
                    opacity: isLoading ? 0.7 : 1,
                    backgroundColor: colors.text,
                  }
                ]}
                onPress={handleUpgrade}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.backgroundRoot} size="small" />
                ) : (
                  <View style={styles.ctaContent}>
                    <Text style={[styles.ctaText, { color: colors.backgroundRoot }]}>{getCtaText()}</Text>
                    <Feather name="arrow-right" size={18} color={colors.backgroundRoot} style={{ marginLeft: 8 }} />
                  </View>
                )}
              </Pressable>

              <View style={styles.legalLinks}>
                <Pressable 
                  onPress={() => WebBrowser.openBrowserAsync("https://confirmbooking.online/terms")}
                  style={styles.legalLink}
                >
                  <Text style={[styles.legalText, { color: colors.textTertiary }]}>TERMS OF USE</Text>
                </Pressable>
                <Pressable 
                  onPress={() => WebBrowser.openBrowserAsync("https://confirmbooking.online/privacy-policy")}
                  style={styles.legalLink}
                >
                  <Text style={[styles.legalText, { color: colors.textTertiary }]}>PRIVACY POLICY</Text>
                </Pressable>
              </View>
            </ScrollView>

            <View style={styles.homeIndicator}>
              <View style={[styles.homeIndicatorBar, { backgroundColor: colors.textTertiary }]} />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  modalContainer: {
    width: SCREEN_WIDTH,
    maxHeight: SCREEN_HEIGHT * 0.95,
  },
  modal: {
    borderTopLeftRadius: BorderRadius["2xl"],
    borderTopRightRadius: BorderRadius["2xl"],
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  restoreTopButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  restoreTopText: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 1.5,
  },
  scrollView: {
    maxHeight: SCREEN_HEIGHT * 0.78,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  heroSection: {
    alignItems: "center",
    justifyContent: "center",
    height: 180,
    marginBottom: Spacing.lg,
  },
  floatingCircle: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  glowRing: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.1)",
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
  },
  innerCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  circleCore: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.sm,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
    maxWidth: 280,
  },
  trialToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  trialTextContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  trialText: {
    fontSize: 14,
    fontWeight: "600",
  },
  trialSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  planSection: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
  },
  planCardSelected: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  planDetails: {
    flex: 1,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 4,
  },
  planName: {
    fontSize: 14,
    fontWeight: "600",
  },
  bestValueBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  bestValueText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  planDuration: {
    fontSize: 12,
  },
  planPriceRight: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  planMonthly: {
    fontSize: 22,
    fontWeight: "700",
  },
  planMonthlySmall: {
    fontSize: 18,
    fontWeight: "600",
  },
  planUnit: {
    fontSize: 12,
    fontWeight: "400",
    marginLeft: 2,
  },
  ctaButton: {
    height: 60,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  ctaContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  ctaText: {
    fontSize: 17,
    fontWeight: "700",
  },
  legalLinks: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.xl,
    marginBottom: Spacing.md,
  },
  legalLink: {
    paddingVertical: 4,
  },
  legalText: {
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 1,
  },
  homeIndicator: {
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  homeIndicatorBar: {
    width: 134,
    height: 5,
    borderRadius: 3,
    opacity: 0.3,
  },
});
