import React, { useState } from "react";
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
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
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

interface PaywallModalProps {
  visible: boolean;
  type: PaywallType;
  onClose: () => void;
  onUpgrade: (plan: "monthly" | "yearly") => void;
  isLoading?: boolean;
  offerings: PurchasesOffering | null;
  remainingCount?: number;
  onRestore?: () => void;
}

interface PremiumFeature {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
}

const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    icon: "link",
    title: "Unlimited Booking Links",
    description: "Share personalized links for all your services",
  },
  {
    icon: "grid",
    title: "Unlimited QR Codes",
    description: "Generate and display QR codes without limits",
  },
  {
    icon: "code",
    title: "Embed Widget",
    description: "Add booking widgets to your website",
  },
  {
    icon: "headphones",
    title: "Priority Support",
    description: "Dedicated assistance for all your premium needs",
  },
];

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
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");
  const [freeTrialEnabled, setFreeTrialEnabled] = useState(false);

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

  const handlePlanSelect = async (plan: "monthly" | "yearly") => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlan(plan);
  };

  const handleTrialToggle = async (value: boolean) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFreeTrialEnabled(value);
  };

  const yearlyPrice = "$269.99";
  const yearlyMonthly = "$22.49";
  const monthlyPrice = "$29.99";

  const ctaText = selectedPlan === "yearly" 
    ? `Go Premium - ${yearlyPrice}/year`
    : `Go Premium - ${monthlyPrice}/mo`;

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
            <LinearGradient
              colors={isDark ? ["#1A1A1A", "#0D0D0D"] : ["#2D2D2D", "#1A1A1A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerGradient}
            >
              <View style={styles.headerPattern}>
                <View style={[styles.patternLine, styles.patternLine1]} />
                <View style={[styles.patternLine, styles.patternLine2]} />
              </View>
              <View style={[styles.headerFade, { backgroundColor: colors.backgroundRoot }]} />
            </LinearGradient>

            <Pressable style={styles.closeButton} onPress={handleClose}>
              <View style={styles.closeButtonInner}>
                <Feather name="x" size={20} color="#FFFFFF" />
              </View>
            </Pressable>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.titleContainer}>
                <Text style={[styles.title, { color: colors.text }]}>
                  Unlock Premium Access
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Get unlimited access to advanced booking features and business tools
                </Text>
              </View>

              <View style={styles.featuresContainer}>
                {PREMIUM_FEATURES.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <View style={[styles.featureIcon, { backgroundColor: colors.backgroundSecondary }]}>
                      <Feather name={feature.icon} size={20} color="#06B6D4" />
                    </View>
                    <View style={styles.featureText}>
                      <Text style={[styles.featureTitle, { color: colors.text }]}>
                        {feature.title}
                      </Text>
                      <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                        {feature.description}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={[styles.trialToggle, { backgroundColor: colors.backgroundSecondary, borderColor: colors.backgroundTertiary }]}>
                <View style={styles.trialTextContainer}>
                  <Text style={[styles.trialText, { color: colors.text }]}>
                    Not sure yet? Enable free trial (7 days)
                  </Text>
                  <Text style={[styles.trialSubtext, { color: colors.textSecondary }]}>
                    You will not be charged until the trial ends
                  </Text>
                </View>
                <Switch
                  value={freeTrialEnabled}
                  onValueChange={handleTrialToggle}
                  trackColor={{ false: colors.backgroundTertiary, true: "#06B6D4" }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={colors.backgroundTertiary}
                />
              </View>

              <View style={styles.planSection}>
                <Text style={[styles.planSectionTitle, { color: colors.text }]}>
                  Choose Your Plan
                </Text>

                <Pressable
                  style={[
                    styles.planCard,
                    selectedPlan === "yearly" && styles.planCardSelected,
                    { 
                      backgroundColor: colors.backgroundSecondary,
                      borderColor: selectedPlan === "yearly" ? "#06B6D4" : colors.backgroundTertiary,
                    },
                  ]}
                  onPress={() => handlePlanSelect("yearly")}
                >
                  <View style={styles.planRadio}>
                    <View
                      style={[
                        styles.radioOuter,
                        { borderColor: selectedPlan === "yearly" ? "#06B6D4" : colors.textSecondary },
                      ]}
                    >
                      {selectedPlan === "yearly" ? (
                        <View style={[styles.radioInner, { backgroundColor: "#06B6D4" }]} />
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.planDetails}>
                    <View style={styles.planHeader}>
                      <Text style={[styles.planName, { color: colors.text }]}>
                        Yearly Access
                      </Text>
                      <View style={styles.bestValueBadge}>
                        <Text style={styles.bestValueText}>BEST VALUE</Text>
                      </View>
                    </View>
                    <View style={styles.planPricing}>
                      <Text style={[styles.planDuration, { color: colors.textSecondary }]}>
                        12 mo • {yearlyPrice}/year
                      </Text>
                      <Text style={[styles.planMonthly, { color: colors.text }]}>
                        {yearlyMonthly}<Text style={[styles.planUnit, { color: colors.textSecondary }]}>/mo</Text>
                      </Text>
                    </View>
                  </View>
                </Pressable>

                <Pressable
                  style={[
                    styles.planCard,
                    selectedPlan === "monthly" && styles.planCardSelected,
                    { 
                      backgroundColor: colors.backgroundSecondary,
                      borderColor: selectedPlan === "monthly" ? "#06B6D4" : colors.backgroundTertiary,
                    },
                  ]}
                  onPress={() => handlePlanSelect("monthly")}
                >
                  <View style={styles.planRadio}>
                    <View
                      style={[
                        styles.radioOuter,
                        { borderColor: selectedPlan === "monthly" ? "#06B6D4" : colors.textSecondary },
                      ]}
                    >
                      {selectedPlan === "monthly" ? (
                        <View style={[styles.radioInner, { backgroundColor: "#06B6D4" }]} />
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.planDetails}>
                    <View style={styles.planHeader}>
                      <Text style={[styles.planName, { color: colors.text }]}>
                        Monthly
                      </Text>
                    </View>
                    <View style={styles.planPricing}>
                      <Text style={[styles.planDuration, { color: colors.textSecondary }]}>
                        Pay as you go
                      </Text>
                      <Text style={[styles.planMonthly, { color: colors.text }]}>
                        {monthlyPrice}<Text style={[styles.planUnit, { color: colors.textSecondary }]}>/mo</Text>
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </View>

              <Pressable
                style={[styles.ctaButton, { opacity: isLoading ? 0.7 : 1 }]}
                onPress={handleUpgrade}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.ctaText}>{ctaText}</Text>
                )}
              </Pressable>

              <Pressable onPress={handleRestore} style={styles.restoreButton}>
                <Text style={[styles.restoreText, { color: colors.textSecondary }]}>
                  Restore Purchase
                </Text>
              </Pressable>

              <Text style={[styles.disclaimer, { color: colors.textTertiary }]}>
                Subscription auto-renews unless cancelled 24 hours before the period ends.
              </Text>
            </ScrollView>
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
    maxHeight: SCREEN_HEIGHT * 0.92,
  },
  modal: {
    borderTopLeftRadius: BorderRadius["2xl"],
    borderTopRightRadius: BorderRadius["2xl"],
    overflow: "hidden",
  },
  headerGradient: {
    height: 140,
    width: "100%",
    position: "relative",
  },
  headerPattern: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
    overflow: "hidden",
  },
  patternLine: {
    position: "absolute",
    height: 2,
    backgroundColor: "#FFFFFF",
    opacity: 0.2,
  },
  patternLine1: {
    width: "150%",
    top: 80,
    left: -50,
    transform: [{ rotate: "-5deg" }],
  },
  patternLine2: {
    width: "150%",
    top: 110,
    left: -80,
    transform: [{ rotate: "-3deg" }],
    backgroundColor: "#06B6D4",
    opacity: 0.3,
  },
  headerFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  closeButton: {
    position: "absolute",
    top: Spacing.xl,
    right: Spacing.xl,
    zIndex: 10,
  },
  closeButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    maxHeight: SCREEN_HEIGHT * 0.75,
  },
  scrollContent: {
    paddingHorizontal: Spacing["2xl"],
    paddingBottom: Spacing["3xl"],
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
  },
  featuresContainer: {
    gap: Spacing.xl,
    marginBottom: Spacing["2xl"],
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.lg,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  trialToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing["2xl"],
  },
  trialTextContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  trialText: {
    fontSize: 15,
    fontWeight: "600",
  },
  trialSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
  planSection: {
    marginBottom: Spacing.xl,
  },
  planSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: Spacing.lg,
  },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    marginBottom: Spacing.md,
  },
  planCardSelected: {
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  planRadio: {
    marginRight: Spacing.lg,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  planDetails: {
    flex: 1,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  planName: {
    fontSize: 15,
    fontWeight: "700",
  },
  bestValueBadge: {
    backgroundColor: "#06B6D4",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  bestValueText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  planPricing: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planDuration: {
    fontSize: 12,
  },
  planMonthly: {
    fontSize: 17,
    fontWeight: "700",
  },
  planUnit: {
    fontSize: 12,
    fontWeight: "400",
  },
  ctaButton: {
    height: 56,
    borderRadius: BorderRadius.xl,
    backgroundColor: "#06B6D4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  restoreButton: {
    alignItems: "center",
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  restoreText: {
    fontSize: 14,
    fontWeight: "500",
  },
  disclaimer: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },
});
