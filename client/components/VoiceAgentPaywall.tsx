import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Dimensions, Alert, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useVoiceTiers, formatMinutes, useVoiceSubscription } from "@/hooks/useVoiceSubscription";
import { api } from "@/lib/api";
import { 
  getVoiceOfferings, 
  purchaseVoicePackage, 
  getVoiceEntitlement,
  restorePurchases,
  VOICE_TIER_CONFIG,
  VoiceTier,
  PurchasesPackage,
  PurchasesOffering
} from "@/lib/revenuecat";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface VoiceAgentPaywallProps {
  onClose: () => void;
  onSubscribe: (tierId: string) => void;
  isLoading?: boolean;
  businessId: string;
}

export const VoiceAgentPaywall: React.FC<VoiceAgentPaywallProps> = ({ 
  onClose, 
  onSubscribe, 
  isLoading: externalLoading,
  businessId
}) => {
  const { isDark } = useTheme();
  const [ownerToken, setOwnerToken] = useState<string | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [voiceTier, setVoiceTier] = useState<VoiceTier>("free");
  
  useEffect(() => {
    api.getOwnerToken().then(setOwnerToken);
    loadOfferings();
    checkVoiceTier();
  }, []);

  const loadOfferings = async () => {
    const off = await getVoiceOfferings();
    setOfferings(off);
  };

  const checkVoiceTier = async () => {
    const tier = await getVoiceEntitlement();
    setVoiceTier(tier);
  };

  const handlePurchase = async (pkg: PurchasesPackage) => {
    if (Platform.OS === "web") {
      Alert.alert("Not Available", "Purchases are only available in the mobile app. Please download BookFlowX from the App Store.");
      return;
    }

    setPurchaseLoading(true);
    try {
      const result = await purchaseVoicePackage(pkg);
      if (result.success) {
        setVoiceTier(result.tier);
        try {
          await api.syncVoiceSubscription(businessId, result.tier);
        } catch (e) {
          console.warn("[VoicePaywall] Failed to sync subscription to backend:", e);
        }
        Alert.alert("Success!", "Your voice subscription is now active.", [
          { text: "OK", onPress: onClose }
        ]);
      } else if (result.error !== "cancelled") {
        Alert.alert("Purchase Failed", result.error || "Please try again.");
      }
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleRestore = async () => {
    if (Platform.OS === "web") {
      Alert.alert("Not Available", "Restore is only available in the mobile app.");
      return;
    }

    setRestoreLoading(true);
    try {
      const result = await restorePurchases();
      const tier = await getVoiceEntitlement();
      setVoiceTier(tier);
      
      if (tier !== "free") {
        try {
          await api.syncVoiceSubscription(businessId, tier);
        } catch (e) {
          console.warn("[VoicePaywall] Failed to sync restored subscription to backend:", e);
        }
        Alert.alert("Restored!", `Your ${VOICE_TIER_CONFIG[tier]?.name || tier} plan has been restored.`);
      } else {
        Alert.alert("No Purchases Found", "We couldn't find any previous purchases to restore.");
      }
    } finally {
      setRestoreLoading(false);
    }
  };

  const { data: voiceSub, refetch: refetchSub } = useVoiceSubscription(businessId, ownerToken || "");
  const minutesUsed = voiceSub?.subscription.minutesUsed || 0;
  const minutesLimit = voiceSub?.subscription.minutesLimit || 5;
  const isExhausted = minutesUsed >= minutesLimit;
  
  const isLoading = externalLoading || purchaseLoading;
  
  // Voice tiers for display (fallback if RevenueCat offerings aren't loaded)
  const displayTiers = [
    { id: "voice_starter", name: "Starter", price: "$49", minutes: 60, features: ["60 minutes/month", "Service info assistant", "Train with your data", "Basic analytics"] },
    { id: "voice_pro", name: "Pro", price: "$149", minutes: 200, popular: true, features: ["200 minutes/month", "Service info assistant", "Train with your data", "Advanced analytics"] },
    { id: "voice_business", name: "Business", price: "$349", minutes: 500, features: ["500 minutes/month", "Service info assistant", "Train with your data", "Advanced analytics", "Custom voice"] },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Feather name="x" size={24} color="#fff" />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Voice Assistant</ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroSection}>
          <View style={styles.iconCircle}>
            <Feather name="mic" size={40} color="#fff" />
          </View>
          <ThemedText style={styles.heroTitle}>Enable Voice Assistant</ThemedText>
          <ThemedText style={styles.heroSubtitle}>
            Let your Assistant answer questions about your services and direct customers to book.
          </ThemedText>
          <View style={{ height: 16 }} />
          <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}>
            <ThemedText style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', textAlign: 'center' }}>
              Booking Links included free with any voice plan.
            </ThemedText>
          </View>
        </View>

        {/* Trial Status Card */}
        <View style={styles.trialStatusCard}>
          <View style={styles.trialInfo}>
            <View>
              <ThemedText style={styles.trialLabel}>TRIAL STATUS</ThemedText>
              <ThemedText style={styles.trialMinutes}>
                {minutesUsed} / {minutesLimit} minutes used
              </ThemedText>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: isExhausted ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.2)" }]}>
              <ThemedText style={[styles.statusBadgeText, { color: isExhausted ? "#EF4444" : "#22C55E" }]}>
                {isExhausted ? "EXHAUSTED" : "ACTIVE"}
              </ThemedText>
            </View>
          </View>
          
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min((minutesUsed/minutesLimit) * 100, 100)}%`, backgroundColor: isExhausted ? "#EF4444" : "#fff" }]} />
          </View>

          <Pressable 
            onPress={() => {
              if (isExhausted) {
                Alert.alert("Trial Ended", "You've used all 5 trial minutes. Please upgrade to a paid plan to continue using the Voice Assistant.");
              } else {
                onClose(); // Proceed to preview
              }
            }}
            style={[styles.previewBtn, isExhausted && styles.disabledBtn]}
          >
            <ThemedText style={styles.previewBtnText}>
              {isExhausted ? "Trial Minutes Exhausted" : "Test Voice Agent Now"}
            </ThemedText>
            {!isExhausted && <Feather name="arrow-right" size={16} color="#000" />}
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
        <ThemedText style={styles.sectionLabel}>CHOOSE A PLAN</ThemedText>

        <View style={styles.tiersContainer}>
          {displayTiers.map((tier) => {
            const tierKey = tier.id.replace("voice_", "");
            const rcPackage = offerings?.availablePackages?.find(
              (pkg: PurchasesPackage) => {
                const id = pkg.identifier.toLowerCase();
                return id === tierKey || id === tier.id || id.includes(`_${tierKey}`) || id.endsWith(tierKey);
              }
            );
            const priceDisplay = rcPackage?.product?.priceString 
              ? `${rcPackage.product.priceString}/mo` 
              : `${tier.price}/mo`;
            const isCurrent = voiceTier === tier.id;
            
            return (
              <Pressable
                key={tier.id}
                onPress={() => {
                  if (isCurrent) return;
                  if (rcPackage) {
                    handlePurchase(rcPackage);
                  } else if (Platform.OS === "web") {
                    Alert.alert("App Store Required", "Voice subscriptions are available in the BookFlowX app. Download from the App Store to subscribe.");
                  } else {
                    Alert.alert("Setup Required", "Voice plans are being set up. Please try again shortly.");
                  }
                }}
                style={[
                  styles.tierCard,
                  tier.popular && styles.popularCard,
                  isCurrent && styles.currentTierCard
                ]}
                disabled={isCurrent}
              >
                {tier.popular && !isCurrent && (
                  <View style={styles.popularBadge}>
                    <ThemedText style={styles.popularBadgeText}>MOST POPULAR</ThemedText>
                  </View>
                )}
                {isCurrent && (
                  <View style={[styles.popularBadge, { backgroundColor: "#22C55E" }]}>
                    <ThemedText style={styles.popularBadgeText}>CURRENT PLAN</ThemedText>
                  </View>
                )}
                
                <View style={styles.tierHeader}>
                  <ThemedText style={styles.tierName}>{tier.name}</ThemedText>
                  <View style={styles.priceRow}>
                    <ThemedText style={styles.tierPrice}>{priceDisplay}</ThemedText>
                  </View>
                </View>

                <View style={styles.tierMinutes}>
                  <Feather name="clock" size={16} color="rgba(255,255,255,0.6)" />
                  <ThemedText style={styles.minutesText}>
                    {tier.id === 'voice_business' ? '8 hr 20 min included' : `${formatMinutes(tier.minutes)} included`}
                  </ThemedText>
                </View>

                <View style={styles.featuresList}>
                  {tier.features.map((feature: string, idx: number) => (
                    <View key={idx} style={styles.featureItem}>
                      <Feather name="check" size={14} color="#fff" />
                      <ThemedText style={styles.featureText}>{feature}</ThemedText>
                    </View>
                  ))}
                </View>

                <View style={[styles.subscribeBtn, tier.popular && styles.popularBtn, isCurrent && styles.disabledBtn]}>
                  {isLoading ? (
                    <ActivityIndicator size="small" color={tier.popular ? "#000" : "#fff"} />
                  ) : (
                    <ThemedText style={[styles.subscribeBtnText, tier.popular && styles.popularBtnText]}>
                      {isCurrent ? "Current Plan" : `Select ${tier.name}`}
                    </ThemedText>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={handleRestore} style={styles.restoreBtn} disabled={restoreLoading}>
          {restoreLoading ? (
            <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" />
          ) : (
            <ThemedText style={styles.restoreBtnText}>Restore Purchases</ThemedText>
          )}
        </Pressable>

        <ThemedText style={styles.disclaimer}>
          Voice Agent plans are optional in-app subscriptions that provide monthly voice booking minutes. Payment will be charged to your Apple ID account at confirmation of purchase. Subscription automatically renews unless auto-renew is turned off at least 24-hours before the end of the current period. Cancel anytime in Settings.
        </ThemedText>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 12,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 300,
  },
  trialStatusCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  trialInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  trialLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  trialMinutes: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  progressTrack: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    marginBottom: 24,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  previewBtn: {
    height: 56,
    backgroundColor: "#fff",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  disabledBtn: {
    backgroundColor: "rgba(255,255,255,0.1)",
    opacity: 0.5,
  },
  previewBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 2,
    marginBottom: 16,
    textAlign: "center",
  },
  tiersContainer: {
    gap: 16,
  },
  tierCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  popularCard: {
    borderColor: "#fff",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  popularBadge: {
    position: "absolute",
    top: -12,
    right: 24,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: "#000",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  tierHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  tierName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  priceRow: {
    alignItems: "flex-end",
  },
  tierPrice: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  tierMinutes: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  minutesText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
  },
  featuresList: {
    gap: 12,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
  },
  subscribeBtn: {
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  popularBtn: {
    backgroundColor: "#fff",
  },
  subscribeBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  popularBtnText: {
    color: "#000",
  },
  currentTierCard: {
    borderColor: "#22C55E",
    opacity: 0.8,
  },
  restoreBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginTop: 24,
  },
  restoreBtnText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    textDecorationLine: "underline",
  },
  disclaimer: {
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
    textAlign: "center",
    marginTop: 40,
    lineHeight: 18,
  },
});
