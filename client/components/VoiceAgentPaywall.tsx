import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Dimensions, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useVoiceTiers, formatMinutes, useVoiceSubscription } from "@/hooks/useVoiceSubscription";
import { api } from "@/lib/api";

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
  isLoading,
  businessId
}) => {
  const { isDark } = useTheme();
  const [ownerToken, setOwnerToken] = useState<string | null>(null);
  
  useEffect(() => {
    api.getOwnerToken().then(setOwnerToken);
  }, []);

  const { data: tiersData, isLoading: tiersLoading } = useVoiceTiers();
  const { data: voiceSub, refetch: refetchSub } = useVoiceSubscription(businessId, ownerToken || "");

  const tiers = tiersData?.tiers || [];
  const currentTier = voiceSub?.subscription.tier || "free";
  const minutesUsed = voiceSub?.subscription.minutesUsed || 0;
  const minutesLimit = voiceSub?.subscription.minutesLimit || 5;
  const isExhausted = minutesUsed >= minutesLimit;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Feather name="x" size={24} color="#fff" />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Voice Booking Plan</ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroSection}>
          <View style={styles.iconCircle}>
            <Feather name="mic" size={40} color="#fff" />
          </View>
          <ThemedText style={styles.heroTitle}>Enable Voice Booking</ThemedText>
          <ThemedText style={styles.heroSubtitle}>
            Automated call confirmations and booking assistance for your business.
          </ThemedText>
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
                Alert.alert("Trial Ended", "You've used all 5 trial minutes. Please upgrade to a paid plan to continue using Voice Booking.");
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

        {tiersLoading ? (
          <ActivityIndicator size="large" color="#fff" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.tiersContainer}>
            {tiers.filter(t => t.id !== 'free').map((tier) => (
              <Pressable
                key={tier.id}
                onPress={() => onSubscribe(tier.id)}
                style={[
                  styles.tierCard,
                  tier.popular && styles.popularCard
                ]}
              >
                {tier.popular && (
                  <View style={styles.popularBadge}>
                    <ThemedText style={styles.popularBadgeText}>MOST POPULAR</ThemedText>
                  </View>
                )}
                
                <View style={styles.tierHeader}>
                  <ThemedText style={styles.tierName}>{tier.name}</ThemedText>
                  <View style={styles.priceRow}>
                    <ThemedText style={styles.tierPrice}>{tier.priceDisplay || `$${tier.price}/mo`}</ThemedText>
                  </View>
                </View>

                <View style={styles.tierMinutes}>
                  <Feather name="clock" size={16} color="rgba(255,255,255,0.6)" />
                  <ThemedText style={styles.minutesText}>
                    {tier.id === 'business' ? '8 hr 20 min included' : `${formatMinutes(tier.minutes)} included`}
                  </ThemedText>
                </View>

                <View style={styles.featuresList}>
                  {tier.id === 'business' ? (
                    <>
                      <View style={styles.featureItem}>
                        <Feather name="check" size={14} color="#fff" />
                        <ThemedText style={styles.featureText}>500 minutes/month</ThemedText>
                      </View>
                      <View style={styles.featureItem}>
                        <Feather name="check" size={14} color="#fff" />
                        <ThemedText style={styles.featureText}>Voice booking</ThemedText>
                      </View>
                      <View style={styles.featureItem}>
                        <Feather name="check" size={14} color="#fff" />
                        <ThemedText style={styles.featureText}>Email confirmations</ThemedText>
                      </View>
                      <View style={styles.featureItem}>
                        <Feather name="check" size={14} color="#fff" />
                        <ThemedText style={styles.featureText}>Advanced analytics</ThemedText>
                      </View>
                      <View style={styles.featureItem}>
                        <Feather name="check" size={14} color="#fff" />
                        <ThemedText style={styles.featureText}>Custom voice</ThemedText>
                      </View>
                    </>
                  ) : (
                    tier.features
                      .filter(f => !f.toLowerCase().includes('api access') && !f.toLowerCase().includes('priority support'))
                      .map((feature, idx) => (
                        <View key={idx} style={styles.featureItem}>
                          <Feather name="check" size={14} color="#fff" />
                          <ThemedText style={styles.featureText}>{feature}</ThemedText>
                        </View>
                      ))
                  )}
                </View>

                <View style={[styles.subscribeBtn, tier.popular && styles.popularBtn]}>
                  {isLoading ? (
                    <ActivityIndicator size="small" color={tier.popular ? "#000" : "#fff"} />
                  ) : (
                    <ThemedText style={[styles.subscribeBtnText, tier.popular && styles.popularBtnText]}>
                      Select {tier.name}
                    </ThemedText>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <ThemedText style={styles.disclaimer}>
          Voice Agent plans are optional subscriptions that provide monthly voice booking minutes for automated customer calls and confirmations. Auto-renews monthly. Cancel anytime.
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
  disclaimer: {
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
    textAlign: "center",
    marginTop: 40,
    lineHeight: 18,
  },
  trialStatusCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 24,
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
});
