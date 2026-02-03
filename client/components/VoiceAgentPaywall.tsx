import React from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Dimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useVoiceTiers, formatMinutes } from "@/hooks/useVoiceSubscription";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface VoiceAgentPaywallProps {
  onClose: () => void;
  onSubscribe: (tierId: string) => void;
  isLoading?: boolean;
}

export const VoiceAgentPaywall: React.FC<VoiceAgentPaywallProps> = ({ 
  onClose, 
  onSubscribe, 
  isLoading 
}) => {
  const { isDark } = useTheme();
  const { data: tiersData, isLoading: tiersLoading } = useVoiceTiers();

  const tiers = tiersData?.tiers || [];

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

        {tiersLoading ? (
          <ActivityIndicator size="large" color="#fff" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.tiersContainer}>
            {tiers.map((tier) => (
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
  }
});
