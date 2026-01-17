import React, { useState, useCallback } from "react";
import { View, FlatList, StyleSheet, Alert, Modal, Pressable, ActivityIndicator, Switch, ScrollView, ImageBackground, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { getApiUrl } from "@/lib/query-client";
import { api } from "@/lib/api";
import { getBookingDomain } from "@/lib/query-client";

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  actionType: string;
  isActive: boolean;
  isPilot: boolean;
  industryBlueprint: string | null;
  delayMinutes: number | null;
  actionConfig: string;
}

interface BlueprintSummary {
  industry: string;
  count: number;
}

const silkBackground = require("../../attached_assets/stock_images/abstract_dark_fluid__e119120c.jpg");

const TRIGGER_LABELS: Record<string, string> = {
  booking_created: "New Booking",
  booking_confirmed: "Booking Confirmed",
  booking_reminder: "Booking Reminder",
  booking_completed: "Service Completed",
  booking_cancelled: "Booking Cancelled",
};

const INDUSTRY_LABELS: Record<string, { label: string; icon: keyof typeof Feather.glyphMap }> = {
  salon: { label: "Salon & Beauty", icon: "scissors" },
  fitness: { label: "Fitness & Wellness", icon: "activity" },
  consulting: { label: "Consulting", icon: "briefcase" },
  medical: { label: "Medical & Health", icon: "heart" },
  auto: { label: "Auto Services", icon: "truck" },
  contractor: { label: "Contractor", icon: "home" },
};

export default function WorkflowsScreen() {
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const { theme } = useTheme();

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [blueprints, setBlueprints] = useState<BlueprintSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [blueprintModalVisible, setBlueprintModalVisible] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [business, setBusiness] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      loadWorkflows();
      loadBlueprints();
      api.getBusiness().then(setBusiness);
    }, [])
  );

  const loadWorkflows = async () => {
    try {
      const businessId = api.getBusinessId();
      if (!businessId) return;
      const ownerToken = await api.getOwnerToken();
      const baseUrl = getApiUrl().replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/api/businesses/${businessId}/workflows`, {
        headers: { "x-owner-token": ownerToken || "" },
      });
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data);
      }
    } catch (error) {
      console.error("Error loading workflows:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadBlueprints = async () => {
    try {
      const baseUrl = getApiUrl().replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/api/workflows/blueprints`);
      if (response.ok) {
        const data = await response.json();
        setBlueprints(data);
      }
    } catch (error) {
      console.error("Error loading blueprints:", error);
    }
  };

  const handleToggleWorkflow = async (workflow: Workflow) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const ownerToken = await api.getOwnerToken();
      const baseUrl = getApiUrl().replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/api/workflows/${workflow.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-owner-token": ownerToken || "",
        },
        body: JSON.stringify({ isActive: !workflow.isActive }),
      });
      if (response.ok) {
        setWorkflows(prev => prev.map(w => w.id === workflow.id ? { ...w, isActive: !w.isActive } : w));
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update workflow");
    }
  };

  const handleTogglePilotMode = async (workflow: Workflow) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const ownerToken = await api.getOwnerToken();
      const baseUrl = getApiUrl().replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/api/workflows/${workflow.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-owner-token": ownerToken || "",
        },
        body: JSON.stringify({ isPilot: !workflow.isPilot }),
      });
      if (response.ok) {
        setWorkflows(prev => prev.map(w => w.id === workflow.id ? { ...w, isPilot: !w.isPilot } : w));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update pilot mode");
    }
  };

  const handleDeleteWorkflow = (workflow: Workflow) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Delete Workflow", `Are you sure you want to delete "${workflow.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const ownerToken = await api.getOwnerToken();
            const baseUrl = getApiUrl().replace(/\/$/, '');
            const response = await fetch(`${baseUrl}/api/workflows/${workflow.id}`, {
              method: "DELETE",
              headers: { "x-owner-token": ownerToken || "" },
            });
            if (response.ok) {
              setWorkflows(prev => prev.filter(w => w.id !== workflow.id));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          } catch (error) {
            Alert.alert("Error", "Failed to delete workflow");
          }
        },
      },
    ]);
  };

  const handleInitializeBlueprints = async (industry: string) => {
    setInitializing(true);
    setBlueprintModalVisible(false);
    try {
      const businessId = api.getBusinessId();
      if (!businessId) throw new Error("No business ID");
      const ownerToken = await api.getOwnerToken();
      const baseUrl = getApiUrl().replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/api/businesses/${businessId}/workflows/initialize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-token": ownerToken || "",
        },
        body: JSON.stringify({ industry }),
      });
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to set up workflows.");
    } finally {
      setInitializing(false);
    }
  };

  const formatDelay = (minutes: number | null) => {
    if (minutes === null || minutes === 0) return "immediately after booking";
    const absMinutes = Math.abs(minutes);
    const isBefore = minutes < 0;
    if (absMinutes >= 1440 && absMinutes % 1440 === 0) {
      const days = absMinutes / 1440;
      return `${days} day${days > 1 ? "s" : ""} ${isBefore ? "before" : "after"} appointment`;
    }
    if (absMinutes >= 60 && absMinutes % 60 === 0) {
      const hours = absMinutes / 60;
      return `${hours} hour${hours > 1 ? "s" : ""} ${isBefore ? "before" : "after"} appointment`;
    }
    return `${absMinutes} min ${isBefore ? "before" : "after"} appointment`;
  };

  const GlassCard = ({ children, style }: any) => (
    <View style={[styles.glassCard, style]}>{children}</View>
  );

  const renderWorkflowItem = (workflow: Workflow) => (
    <GlassCard key={workflow.id} style={styles.workflowCard}>
      <View style={styles.cardHeader}>
        <View style={styles.triggerBadge}>
          <ThemedText style={styles.triggerBadgeText}>
            {TRIGGER_LABELS[workflow.triggerType] || "Workflow"}
          </ThemedText>
        </View>
        <View style={styles.activeToggleRow}>
          <ThemedText style={styles.activeText}>{workflow.isActive ? "ACTIVE" : "PAUSED"}</ThemedText>
          <Switch
            value={workflow.isActive}
            onValueChange={() => handleToggleWorkflow(workflow)}
            trackColor={{ false: "rgba(255,255,255,0.1)", true: "#fff" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <ThemedText style={styles.workflowName}>{workflow.name}</ThemedText>
      
      <View style={styles.timingRow}>
        <Feather name={workflow.triggerType === 'booking_created' ? "zap" : "clock"} size={14} color="rgba(255,255,255,0.6)" />
        <ThemedText style={styles.timingText}>
          Sends {formatDelay(workflow.delayMinutes)}
        </ThemedText>
      </View>

      {workflow.description && (
        <ThemedText style={styles.workflowDescription}>{workflow.description}</ThemedText>
      )}

      <View style={styles.divider} />

      <View style={styles.cardFooter}>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Feather name="mail" size={12} color="rgba(255,255,255,0.4)" />
            <ThemedText style={styles.metaText}>Email (Preview)</ThemedText>
          </View>
          <View style={styles.metaItem}>
            <Feather name="shield" size={12} color="rgba(255,255,255,0.4)" />
            <ThemedText style={styles.metaText}>Runs automatically</ThemedText>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable style={styles.pilotBtn} onPress={() => handleTogglePilotMode(workflow)}>
            <Feather name={workflow.isPilot ? "eye" : "zap"} size={14} color="rgba(255,255,255,0.6)" />
            <ThemedText style={styles.pilotBtnText}>{workflow.isPilot ? "Suggestive" : "Auto Pilot"}</ThemedText>
          </Pressable>
          <Pressable style={styles.deleteBtn} onPress={() => handleDeleteWorkflow(workflow)}>
            <Feather name="trash-2" size={16} color="rgba(255,255,255,0.3)" />
          </Pressable>
        </View>
      </View>
    </GlassCard>
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ImageBackground source={silkBackground} style={styles.overlay}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)" }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: headerHeight + 40,
              paddingBottom: 100,
              paddingHorizontal: 24,
            }}
          >
            <View style={styles.headerRow}>
              <ThemedText style={styles.title}>Automation Workflows</ThemedText>
              <Pressable style={styles.addBtn} onPress={() => setBlueprintModalVisible(true)}>
                <Feather name="plus" size={20} color="#000" />
                <ThemedText style={styles.addBtnText}>Choose template</ThemedText>
              </Pressable>
            </View>

            {workflows.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="zap" size={64} color="rgba(255,255,255,0.1)" />
                <ThemedText style={styles.emptyTitle}>Intelligent Triggers</ThemedText>
                <ThemedText style={styles.emptyDesc}>Automate your booking confirmations, reminders, and follow-ups.</ThemedText>
                <Button onPress={() => setBlueprintModalVisible(true)}>Choose Industry Template</Button>
              </View>
            ) : (
              workflows.map(renderWorkflowItem)
            )}
          </ScrollView>
        </View>
      </ImageBackground>

      <Modal visible={blueprintModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Templates</ThemedText>
              <Pressable onPress={() => setBlueprintModalVisible(false)}><Feather name="x" size={24} color="#fff" /></Pressable>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {blueprints.map(b => (
                <Pressable
                  key={b.industry}
                  style={[styles.blueprintItem, selectedIndustry === b.industry && { borderColor: "#fff" }]}
                  onPress={() => setSelectedIndustry(b.industry)}
                >
                  <Feather name={INDUSTRY_LABELS[b.industry]?.icon || "settings"} size={20} color="#fff" />
                  <ThemedText style={styles.blueprintLabel}>{INDUSTRY_LABELS[b.industry]?.label || b.industry}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>
            <Button onPress={() => selectedIndustry && handleInitializeBlueprints(selectedIndustry)} disabled={!selectedIndustry || initializing}>
              {initializing ? "Setting up..." : "Apply Template"}
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  overlay: { flex: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 40 },
  title: { fontSize: 48, fontWeight: "800", color: "#fff", letterSpacing: -2, flex: 1, marginRight: 16 },
  addBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, gap: 8 },
  addBtnText: { color: "#000", fontWeight: "700", fontSize: 14 },
  glassCard: { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 32, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 16, overflow: "hidden" },
  workflowCard: { padding: 24 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  triggerBadge: { backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  triggerBadgeText: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.6)", letterSpacing: 0.5 },
  activeToggleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  activeText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  workflowName: { fontSize: 24, fontWeight: "700", color: "#fff", marginBottom: 8 },
  timingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  timingText: { fontSize: 15, color: "rgba(255,255,255,0.8)", fontWeight: "600" },
  workflowDescription: { fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 20, marginBottom: 20 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginBottom: 20 },
  cardFooter: { gap: 16 },
  metaRow: { flexDirection: "row", gap: 16 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 12, color: "rgba(255,255,255,0.4)" },
  actionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pilotBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  pilotBtnText: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.6)" },
  deleteBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  emptyState: { padding: 40, alignItems: "center", justifyContent: "center", minHeight: 400 },
  emptyTitle: { fontSize: 24, fontWeight: "700", color: "#fff", marginTop: 24, marginBottom: 8 },
  emptyDesc: { fontSize: 16, color: "rgba(255,255,255,0.4)", textAlign: "center", marginBottom: 32 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", padding: 24 },
  modalContent: { backgroundColor: "#111", borderRadius: 32, padding: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: "700", color: "#fff" },
  blueprintItem: { flexDirection: "row", alignItems: "center", gap: 16, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", marginBottom: 12 },
  blueprintLabel: { fontSize: 16, fontWeight: "600", color: "#fff" },
});
