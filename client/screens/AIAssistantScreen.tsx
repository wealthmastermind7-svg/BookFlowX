import React, { useState, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Alert,
  TextInput,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Text } from "react-native";
import {
  api,
  getMorningBriefing,
  getSchedulingInsights,
  getReengagementSuggestions,
  getCompetitorRadar,
  generateReviewResponses,
  type MorningBriefing,
  type SchedulingInsight,
  type ReengagementMessage,
  type CompetitorBriefing,
  type ReviewDraft,
} from "@/lib/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function GlassCard({ children, style, onPress }: { children: React.ReactNode; style?: any; onPress?: () => void }) {
  const { theme } = useTheme();
  const content = (
    <View style={[styles.glassCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.borderLight }, style]}>
      {children}
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}>
        {content}
      </Pressable>
    );
  }
  return content;
}

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: theme.backgroundSecondary }]}>
        <Feather name={icon as any} size={18} color={theme.text} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
        {subtitle ? <ThemedText style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>{subtitle}</ThemedText> : null}
      </View>
    </View>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const { theme } = useTheme();
  const colors: Record<string, string> = { high: "#FF4444", urgent: "#FF4444", medium: "#FFB800", normal: "#FFB800", low: "#44BB44" };
  return (
    <View style={[styles.badge, { backgroundColor: colors[priority] || theme.backgroundTertiary }]}>
      <Text style={styles.badgeText}>{priority.toUpperCase()}</Text>
    </View>
  );
}

function LoadingOverlay({ message }: { message: string }) {
  return (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="small" color="#FFFFFF" />
      <ThemedText style={styles.loadingText}>{message}</ThemedText>
    </View>
  );
}

export default function AIAssistantScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const [briefing, setBriefing] = useState<MorningBriefing | null>(null);
  const [scheduling, setScheduling] = useState<SchedulingInsight | null>(null);
  const [reengagement, setReengagement] = useState<ReengagementMessage[] | null>(null);
  const [competitorRadar, setCompetitorRadar] = useState<CompetitorBriefing | null>(null);
  const [reviewDrafts, setReviewDrafts] = useState<ReviewDraft[] | null>(null);

  const [reviewInput, setReviewInput] = useState({ name: "", rating: "5", text: "", platform: "Google" });

  const loadBusinessId = useCallback(async () => {
    try {
      const business = await api.getCurrentBusiness();
      if (business) {
        setBusinessId(business.id);
        // Force sync business ID in api client to prevent 404s
        await api.setBusinessId(business.id, business.ownerToken || undefined);
      }
    } catch {}
  }, []);

  React.useEffect(() => { loadBusinessId(); }, [loadBusinessId]);

  const setFeatureLoading = (feature: string, val: boolean) => setLoading(prev => ({ ...prev, [feature]: val }));

  const loadBriefing = useCallback(async () => {
    if (!businessId) return;
    setFeatureLoading("briefing", true);
    try {
      const data = await getMorningBriefing(businessId);
      setBriefing(data);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to load briefing");
    }
    setFeatureLoading("briefing", false);
  }, [businessId]);

  const loadScheduling = useCallback(async () => {
    if (!businessId) return;
    setFeatureLoading("scheduling", true);
    try {
      const data = await getSchedulingInsights(businessId);
      setScheduling(data);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to load scheduling insights");
    }
    setFeatureLoading("scheduling", false);
  }, [businessId]);

  const loadReengagement = useCallback(async () => {
    if (!businessId) return;
    setFeatureLoading("reengagement", true);
    try {
      const data = await getReengagementSuggestions(businessId);
      setReengagement(data);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to load re-engagement data");
    }
    setFeatureLoading("reengagement", false);
  }, [businessId]);

  const loadCompetitorRadar = useCallback(async () => {
    if (!businessId) return;
    setFeatureLoading("competitor", true);
    try {
      const data = await getCompetitorRadar(businessId);
      setCompetitorRadar(data);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to load competitor radar");
    }
    setFeatureLoading("competitor", false);
  }, [businessId]);

  const submitReviewForResponse = useCallback(async () => {
    if (!businessId) return;
    if (!reviewInput.name || !reviewInput.text) {
      Alert.alert("Missing Info", "Please enter reviewer name and review text");
      return;
    }
    setFeatureLoading("reviews", true);
    try {
      const drafts = await generateReviewResponses(businessId, [{
        reviewerName: reviewInput.name,
        rating: parseInt(reviewInput.rating) || 5,
        text: reviewInput.text,
        platform: reviewInput.platform,
      }]);
      setReviewDrafts(drafts);
      setReviewInput({ name: "", rating: "5", text: "", platform: "Google" });
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to generate review response");
    }
    setFeatureLoading("reviews", false);
  }, [businessId, reviewInput]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBusinessId();
    if (briefing) await loadBriefing();
    setRefreshing(false);
  }, [loadBusinessId, loadBriefing, briefing]);

  const toggleFeature = (feature: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveFeature(activeFeature === feature ? null : feature);
  };

  if (!businessId) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.emptyState}>
          <Feather name="cpu" size={48} color={theme.textTertiary} />
          <ThemedText style={[styles.emptyTitle, { color: theme.textSecondary }]}>Set up your business first</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + Spacing.lg, paddingBottom: tabBarHeight + Spacing.xl, paddingHorizontal: Spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>AI Assistant</ThemedText>
          <ThemedText style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Powered by Kimi Claw</ThemedText>
        </View>

        {/* Morning Briefing */}
        <GlassCard onPress={() => { toggleFeature("briefing"); if (!briefing) loadBriefing(); }}>
          <SectionHeader icon="sunrise" title="Morning Briefing" subtitle="Your daily business intelligence" />
          {loading.briefing ? <LoadingOverlay message="Generating your briefing..." /> : null}
          {activeFeature === "briefing" && briefing ? (
            <View style={styles.expandedContent}>
              <ThemedText style={styles.greeting}>{briefing.greeting}</ThemedText>
              <ThemedText style={[styles.summaryText, { color: theme.textSecondary }]}>{briefing.todaysSummary}</ThemedText>
              <View style={styles.statRow}>
                <View style={[styles.statBox, { backgroundColor: theme.backgroundSecondary }]}>
                  <ThemedText style={styles.statNumber}>{briefing.bookingsToday}</ThemedText>
                  <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Today</ThemedText>
                </View>
                <View style={[styles.statBox, { backgroundColor: theme.backgroundSecondary }]}>
                  <ThemedText style={styles.statNumber}>{briefing.revenueToday}</ThemedText>
                  <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Revenue</ThemedText>
                </View>
              </View>
              {briefing.urgentItems.length > 0 ? (
                <View style={styles.listSection}>
                  <ThemedText style={styles.listTitle}>Needs Attention</ThemedText>
                  {briefing.urgentItems.map((item, i) => (
                    <View key={i} style={styles.listItem}>
                      <Feather name="alert-circle" size={14} color="#FFB800" />
                      <ThemedText style={[styles.listText, { color: theme.textSecondary }]}>{item}</ThemedText>
                    </View>
                  ))}
                </View>
              ) : null}
              <View style={[styles.insightBox, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="users" size={14} color={theme.text} />
                <ThemedText style={[styles.insightText, { color: theme.textSecondary }]}>{briefing.customerInsight}</ThemedText>
              </View>
              <View style={[styles.insightBox, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="target" size={14} color={theme.text} />
                <ThemedText style={[styles.insightText, { color: theme.textSecondary }]}>{briefing.competitorTip}</ThemedText>
              </View>
              <ThemedText style={[styles.motivational, { color: theme.textTertiary }]}>{briefing.motivationalNote}</ThemedText>
            </View>
          ) : null}
          {activeFeature === "briefing" && !briefing && !loading.briefing ? (
            <Pressable style={[styles.actionButton, { backgroundColor: theme.text }]} onPress={loadBriefing}>
              <Text style={[styles.actionButtonText, { color: theme.backgroundRoot }]}>Generate Briefing</Text>
            </Pressable>
          ) : null}
        </GlassCard>

        {/* Smart Scheduling */}
        <GlassCard onPress={() => { toggleFeature("scheduling"); if (!scheduling) loadScheduling(); }}>
          <SectionHeader icon="clock" title="Smart Scheduling" subtitle="Optimize your appointment slots" />
          {loading.scheduling ? <LoadingOverlay message="Analyzing booking patterns..." /> : null}
          {activeFeature === "scheduling" && scheduling ? (
            <View style={styles.expandedContent}>
              <View style={styles.listSection}>
                <ThemedText style={styles.listTitle}>Peak Hours</ThemedText>
                <View style={styles.chipRow}>
                  {scheduling.peakHours.map((h, i) => (
                    <View key={i} style={[styles.chip, { backgroundColor: theme.backgroundSecondary }]}>
                      <Feather name="trending-up" size={12} color="#44BB44" />
                      <ThemedText style={styles.chipText}>{h}</ThemedText>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.listSection}>
                <ThemedText style={styles.listTitle}>Slow Periods</ThemedText>
                <View style={styles.chipRow}>
                  {scheduling.slowPeriods.map((h, i) => (
                    <View key={i} style={[styles.chip, { backgroundColor: theme.backgroundSecondary }]}>
                      <Feather name="trending-down" size={12} color="#FF4444" />
                      <ThemedText style={styles.chipText}>{h}</ThemedText>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.listSection}>
                <ThemedText style={styles.listTitle}>Recommendations</ThemedText>
                {scheduling.recommendations.map((rec, i) => (
                  <View key={i} style={styles.listItem}>
                    <Feather name="check-circle" size={14} color="#44BB44" />
                    <ThemedText style={[styles.listText, { color: theme.textSecondary }]}>{rec}</ThemedText>
                  </View>
                ))}
              </View>
              <View style={[styles.insightBox, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="zap" size={14} color="#FFB800" />
                <ThemedText style={[styles.insightText, { color: theme.textSecondary }]}>{scheduling.optimalSlotSuggestion}</ThemedText>
              </View>
              <View style={[styles.insightBox, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="dollar-sign" size={14} color="#44BB44" />
                <ThemedText style={[styles.insightText, { color: theme.textSecondary }]}>{scheduling.revenueOpportunity}</ThemedText>
              </View>
            </View>
          ) : null}
        </GlassCard>

        {/* Customer Re-engagement */}
        <GlassCard onPress={() => { toggleFeature("reengagement"); if (!reengagement) loadReengagement(); }}>
          <SectionHeader icon="heart" title="Customer Re-engagement" subtitle="Win back inactive customers" />
          {loading.reengagement ? <LoadingOverlay message="Finding inactive customers..." /> : null}
          {activeFeature === "reengagement" && reengagement ? (
            <View style={styles.expandedContent}>
              {reengagement.length === 0 ? (
                <ThemedText style={[styles.emptyMessage, { color: theme.textSecondary }]}>All your customers are active! Great job.</ThemedText>
              ) : (
                reengagement.map((msg, i) => (
                  <View key={i} style={[styles.customerCard, { backgroundColor: theme.backgroundSecondary }]}>
                    <View style={styles.customerHeader}>
                      <View>
                        <ThemedText style={styles.customerName}>{msg.customerName}</ThemedText>
                        <ThemedText style={[styles.customerDetail, { color: theme.textSecondary }]}>{msg.daysSinceLastVisit} days since last visit</ThemedText>
                      </View>
                      <PriorityBadge priority={msg.urgency} />
                    </View>
                    <ThemedText style={[styles.emailSubject, { color: theme.textSecondary }]}>Subject: {msg.subject}</ThemedText>
                    <ThemedText style={[styles.draftMessage, { color: theme.textSecondary }]}>{msg.suggestedMessage}</ThemedText>
                  </View>
                ))
              )}
            </View>
          ) : null}
        </GlassCard>

        {/* Competitor Radar */}
        <GlassCard onPress={() => { toggleFeature("competitor"); if (!competitorRadar) loadCompetitorRadar(); }}>
          <SectionHeader icon="eye" title="Competitor Radar" subtitle="Stay ahead of local competition" />
          {loading.competitor ? <LoadingOverlay message="Scanning competitive landscape..." /> : null}
          {activeFeature === "competitor" && competitorRadar ? (
            <View style={styles.expandedContent}>
              <ThemedText style={[styles.summaryText, { color: theme.textSecondary }]}>{competitorRadar.summary}</ThemedText>
              {competitorRadar.competitors.map((comp, i) => (
                <View key={i} style={[styles.competitorCard, { backgroundColor: theme.backgroundSecondary }]}>
                  <ThemedText style={styles.competitorName}>{comp.name}</ThemedText>
                  <View style={styles.compDetail}>
                    <Feather name="plus-circle" size={12} color="#44BB44" />
                    <ThemedText style={[styles.compText, { color: theme.textSecondary }]}>{comp.strength}</ThemedText>
                  </View>
                  <View style={styles.compDetail}>
                    <Feather name="minus-circle" size={12} color="#FF4444" />
                    <ThemedText style={[styles.compText, { color: theme.textSecondary }]}>{comp.weakness}</ThemedText>
                  </View>
                  <View style={styles.compDetail}>
                    <Feather name="target" size={12} color="#FFB800" />
                    <ThemedText style={[styles.compText, { color: theme.textSecondary }]}>{comp.opportunity}</ThemedText>
                  </View>
                </View>
              ))}
              <View style={styles.listSection}>
                <ThemedText style={styles.listTitle}>Trending in Your Niche</ThemedText>
                {competitorRadar.trendingInNiche.map((trend, i) => (
                  <View key={i} style={styles.listItem}>
                    <Feather name="trending-up" size={14} color="#FFB800" />
                    <ThemedText style={[styles.listText, { color: theme.textSecondary }]}>{trend}</ThemedText>
                  </View>
                ))}
              </View>
              <View style={styles.listSection}>
                <ThemedText style={styles.listTitle}>Action Items</ThemedText>
                {competitorRadar.actionItems.map((item, i) => (
                  <View key={i} style={styles.listItem}>
                    <Feather name="check-square" size={14} color={theme.text} />
                    <ThemedText style={[styles.listText, { color: theme.textSecondary }]}>{item}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </GlassCard>

        {/* Review Management */}
        <GlassCard onPress={() => toggleFeature("reviews")}>
          <SectionHeader icon="message-square" title="Review Management" subtitle="Draft responses to customer reviews" />
          {activeFeature === "reviews" ? (
            <View style={styles.expandedContent}>
              <View style={styles.inputGroup}>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.borderLight, backgroundColor: theme.backgroundSecondary }]}
                  placeholder="Reviewer name"
                  placeholderTextColor={theme.textTertiary}
                  value={reviewInput.name}
                  onChangeText={(t) => setReviewInput(prev => ({ ...prev, name: t }))}
                />
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, styles.inputSmall, { color: theme.text, borderColor: theme.borderLight, backgroundColor: theme.backgroundSecondary }]}
                    placeholder="Rating (1-5)"
                    placeholderTextColor={theme.textTertiary}
                    value={reviewInput.rating}
                    onChangeText={(t) => setReviewInput(prev => ({ ...prev, rating: t }))}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.input, styles.inputSmall, { color: theme.text, borderColor: theme.borderLight, backgroundColor: theme.backgroundSecondary }]}
                    placeholder="Platform"
                    placeholderTextColor={theme.textTertiary}
                    value={reviewInput.platform}
                    onChangeText={(t) => setReviewInput(prev => ({ ...prev, platform: t }))}
                  />
                </View>
                <TextInput
                  style={[styles.input, styles.inputMultiline, { color: theme.text, borderColor: theme.borderLight, backgroundColor: theme.backgroundSecondary }]}
                  placeholder="Paste the review text here..."
                  placeholderTextColor={theme.textTertiary}
                  value={reviewInput.text}
                  onChangeText={(t) => setReviewInput(prev => ({ ...prev, text: t }))}
                  multiline
                  numberOfLines={3}
                />
                <Pressable
                  style={[styles.actionButton, { backgroundColor: theme.text }]}
                  onPress={submitReviewForResponse}
                  disabled={loading.reviews}
                >
                  {loading.reviews ? (
                    <ActivityIndicator size="small" color={theme.backgroundRoot} />
                  ) : (
                    <Text style={[styles.actionButtonText, { color: theme.backgroundRoot }]}>Generate Response</Text>
                  )}
                </Pressable>
              </View>
              {reviewDrafts && reviewDrafts.length > 0 ? (
                <View style={styles.listSection}>
                  <ThemedText style={styles.listTitle}>Drafted Responses</ThemedText>
                  {reviewDrafts.map((draft, i) => (
                    <View key={i} style={[styles.reviewDraftCard, { backgroundColor: theme.backgroundSecondary }]}>
                      <View style={styles.customerHeader}>
                        <ThemedText style={styles.customerName}>{draft.reviewerName} ({draft.rating}/5)</ThemedText>
                        <PriorityBadge priority={draft.priority} />
                      </View>
                      <ThemedText style={[styles.quoteText, { color: theme.textTertiary }]}>"{draft.originalReview}"</ThemedText>
                      <ThemedText style={[styles.draftMessage, { color: theme.textSecondary }]}>{draft.draftResponse}</ThemedText>
                      <View style={[styles.toneTag, { backgroundColor: theme.backgroundTertiary }]}>
                        <ThemedText style={styles.toneText}>{draft.tone}</ThemedText>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
        </GlassCard>

        <View style={{ height: Spacing["2xl"] }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { marginBottom: Spacing.xl },
  headerTitle: { fontSize: 36, fontFamily: "Inter-SemiBold", letterSpacing: -1 },
  headerSubtitle: { fontSize: 14, fontFamily: "Inter-Regular", marginTop: 4 },
  glassCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    overflow: "hidden",
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  sectionIcon: { width: 36, height: 36, borderRadius: BorderRadius.xs, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter-SemiBold" },
  sectionSubtitle: { fontSize: 13, fontFamily: "Inter-Regular", marginTop: 2 },
  expandedContent: { marginTop: Spacing.lg },
  greeting: { fontSize: 18, fontFamily: "Inter-SemiBold", marginBottom: Spacing.sm },
  summaryText: { fontSize: 14, fontFamily: "Inter-Regular", lineHeight: 20, marginBottom: Spacing.md },
  statRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.md },
  statBox: { flex: 1, borderRadius: BorderRadius.sm, padding: Spacing.md, alignItems: "center" },
  statNumber: { fontSize: 24, fontFamily: "Inter-Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter-Regular", marginTop: 4 },
  listSection: { marginTop: Spacing.md },
  listTitle: { fontSize: 15, fontFamily: "Inter-SemiBold", marginBottom: Spacing.sm },
  listItem: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm, marginBottom: Spacing.xs, paddingRight: Spacing.md },
  listText: { fontSize: 13, fontFamily: "Inter-Regular", flex: 1, lineHeight: 18 },
  insightBox: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.sm, marginTop: Spacing.sm },
  insightText: { fontSize: 13, fontFamily: "Inter-Regular", flex: 1, lineHeight: 18 },
  motivational: { fontSize: 13, fontFamily: "Inter-Italic", fontStyle: "italic", marginTop: Spacing.md, textAlign: "center" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  chipText: { fontSize: 12, fontFamily: "Inter-Medium" },
  customerCard: { borderRadius: BorderRadius.sm, padding: Spacing.md, marginBottom: Spacing.sm },
  customerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.xs },
  customerName: { fontSize: 15, fontFamily: "Inter-SemiBold" },
  customerDetail: { fontSize: 12, fontFamily: "Inter-Regular", marginTop: 2 },
  emailSubject: { fontSize: 13, fontFamily: "Inter-Medium", marginTop: Spacing.xs },
  draftMessage: { fontSize: 13, fontFamily: "Inter-Regular", lineHeight: 18, marginTop: Spacing.xs },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full },
  badgeText: { fontSize: 10, fontFamily: "Inter-Bold", color: "#000" },
  competitorCard: { borderRadius: BorderRadius.sm, padding: Spacing.md, marginBottom: Spacing.sm },
  competitorName: { fontSize: 15, fontFamily: "Inter-SemiBold", marginBottom: Spacing.xs },
  compDetail: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 4 },
  compText: { fontSize: 13, fontFamily: "Inter-Regular", flex: 1, lineHeight: 18 },
  inputGroup: { gap: Spacing.sm },
  input: { borderWidth: 1, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: 14, fontFamily: "Inter-Regular" },
  inputRow: { flexDirection: "row", gap: Spacing.sm },
  inputSmall: { flex: 1 },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },
  actionButton: { paddingVertical: Spacing.md, borderRadius: BorderRadius.sm, alignItems: "center", marginTop: Spacing.sm },
  actionButtonText: { fontSize: 15, fontFamily: "Inter-SemiBold" },
  reviewDraftCard: { borderRadius: BorderRadius.sm, padding: Spacing.md, marginBottom: Spacing.sm },
  quoteText: { fontSize: 12, fontFamily: "Inter-Italic", fontStyle: "italic", marginTop: Spacing.xs },
  toneTag: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full, marginTop: Spacing.xs },
  toneText: { fontSize: 11, fontFamily: "Inter-Medium" },
  loadingOverlay: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingVertical: Spacing.md },
  loadingText: { fontSize: 13, fontFamily: "Inter-Regular" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.md },
  emptyTitle: { fontSize: 16, fontFamily: "Inter-Medium" },
  emptyMessage: { fontSize: 14, fontFamily: "Inter-Regular", textAlign: "center", paddingVertical: Spacing.md },
});
