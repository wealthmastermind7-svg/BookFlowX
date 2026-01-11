import React, { useState, useCallback } from "react";
import { View, FlatList, StyleSheet, Alert, Modal, Pressable, ActivityIndicator, Switch } from "react-native";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { getApiUrl } from "@/lib/query-client";
import { api } from "@/lib/api";

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
}

interface BlueprintSummary {
  industry: string;
  count: number;
  workflows: {
    name: string;
    description: string;
    triggerType: string;
    actionType: string;
  }[];
}

const TRIGGER_LABELS: Record<string, string> = {
  booking_created: "New Booking",
  booking_confirmed: "Booking Confirmed",
  booking_reminder: "Booking Reminder",
  booking_completed: "Service Completed",
  booking_cancelled: "Booking Cancelled",
  customer_created: "New Customer",
  payment_received: "Payment Received",
};

const ACTION_LABELS: Record<string, string> = {
  send_email: "Send Email",
  send_sms: "Send SMS",
  webhook: "Call Webhook",
  internal_notification: "Push Notification",
};

const INDUSTRY_LABELS: Record<string, { label: string; icon: keyof typeof Feather.glyphMap }> = {
  salon: { label: "Salon & Beauty", icon: "scissors" },
  fitness: { label: "Fitness & Wellness", icon: "activity" },
  consulting: { label: "Consulting", icon: "briefcase" },
  medical: { label: "Medical & Health", icon: "heart" },
  auto: { label: "Auto Services", icon: "truck" },
  custom: { label: "Custom", icon: "settings" },
};

export default function WorkflowsScreen() {
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [blueprints, setBlueprints] = useState<BlueprintSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [blueprintModalVisible, setBlueprintModalVisible] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadWorkflows();
      loadBlueprints();
    }, [])
  );

  const loadWorkflows = async () => {
    try {
      const businessId = api.getBusinessId();
      if (!businessId) return;

      const ownerToken = await api.getOwnerToken();
      const baseUrl = getApiUrl().replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/api/businesses/${businessId}/workflows`, {
        headers: {
          "x-owner-token": ownerToken || "",
        },
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
        setWorkflows(prev =>
          prev.map(w =>
            w.id === workflow.id ? { ...w, isActive: !w.isActive } : w
          )
        );
      }
    } catch (error) {
      console.error("Error toggling workflow:", error);
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
        setWorkflows(prev =>
          prev.map(w =>
            w.id === workflow.id ? { ...w, isPilot: !w.isPilot } : w
          )
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Error toggling pilot mode:", error);
      Alert.alert("Error", "Failed to update workflow");
    }
  };

  const handleDeleteWorkflow = (workflow: Workflow) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      "Delete Workflow",
      `Are you sure you want to delete "${workflow.name}"?`,
      [
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
                headers: {
                  "x-owner-token": ownerToken || "",
                },
              });

              if (response.ok) {
                setWorkflows(prev => prev.filter(w => w.id !== workflow.id));
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            } catch (error) {
              console.error("Error deleting workflow:", error);
              Alert.alert("Error", "Failed to delete workflow");
            }
          },
        },
      ]
    );
  };

  const handleInitializeBlueprints = async (industry: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setInitializing(true);
    setBlueprintModalVisible(false);

    try {
      const businessId = api.getBusinessId();
      if (!businessId) throw new Error("No business ID");

      console.log("[Workflow] Starting blueprint init for industry:", industry);
      const ownerToken = await api.getOwnerToken();
      console.log("[Workflow] Token retrieved length:", ownerToken?.length || 0);
      
      const baseUrl = getApiUrl().replace(/\/$/, ''); // Remove trailing slash
      const url = `${baseUrl}/api/businesses/${businessId}/workflows/initialize`;
      
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      
      if (ownerToken) {
        headers["x-owner-token"] = ownerToken;
        headers["x-business-token"] = ownerToken;
      }
      
      const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({ industry }),
        }
      );

      console.log("[Workflow] Response status:", response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log("[Workflow] Init successful, received", data.length, "workflows");
        setWorkflows(data);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "Workflows Added",
          `${INDUSTRY_LABELS[industry]?.label || industry} automation workflows have been set up.`
        );
      } else {
        const responseText = await response.text();
        console.error("[Workflow] Server error during init - Status:", response.status);
        console.error("[Workflow] Response body:", responseText);
        let errorMessage = "Failed to initialize blueprints";
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          if (responseText) errorMessage = responseText;
        }
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error("[Workflow] Blueprint init failed:", error?.message || "Unknown error");
      console.error("[Workflow] Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
      const isNetworkError = error?.message?.includes("Network") || error?.message?.includes("fetch") || error?.message?.includes("Load failed");
      const displayMessage = isNetworkError 
        ? "Could not connect to server. Please check your connection and try again."
        : (error?.message || "Please try again.");
      Alert.alert("Error", `Failed to set up workflows: ${displayMessage}`);
    } finally {
      setInitializing(false);
    }
  };

  const renderWorkflowItem = ({ item }: { item: Workflow }) => (
    <View style={[styles.workflowCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
      <View style={styles.workflowHeader}>
        <View style={styles.workflowTitleRow}>
          <View style={[styles.triggerBadge, { backgroundColor: theme.accent + "20" }]}>
            <ThemedText style={[styles.triggerText, { color: theme.accent }]}>
              {TRIGGER_LABELS[item.triggerType] || item.triggerType}
            </ThemedText>
          </View>
          <Switch
            value={item.isActive}
            onValueChange={() => handleToggleWorkflow(item)}
            trackColor={{ false: theme.border, true: theme.accent }}
            thumbColor="#FFFFFF"
          />
        </View>
        <ThemedText style={styles.workflowName}>{item.name}</ThemedText>
        {item.description && (
          <ThemedText style={[styles.workflowDescription, { color: theme.textSecondary }]}>
            {item.description}
          </ThemedText>
        )}
      </View>

      <View style={[styles.workflowMeta, { borderTopColor: theme.border }]}>
        <View style={styles.metaItem}>
          <Feather name="zap" size={14} color={theme.textSecondary} />
          <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
            {ACTION_LABELS[item.actionType] || item.actionType}
          </ThemedText>
        </View>
        {item.delayMinutes && item.delayMinutes !== 0 && (
          <View style={styles.metaItem}>
            <Feather name="clock" size={14} color={theme.textSecondary} />
            <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
              {item.delayMinutes > 0 
                ? `${item.delayMinutes}min after` 
                : `${Math.abs(item.delayMinutes)}min before`}
            </ThemedText>
          </View>
        )}
      </View>

      <View style={styles.workflowActions}>
        <Pressable
          style={[
            styles.pilotButton,
            item.isPilot && { backgroundColor: theme.accent + "20" },
          ]}
          onPress={() => handleTogglePilotMode(item)}
        >
          <Feather
            name={item.isPilot ? "user-check" : "cpu"}
            size={16}
            color={item.isPilot ? theme.accent : theme.textSecondary}
          />
          <ThemedText
            style={[
              styles.pilotText,
              { color: item.isPilot ? theme.accent : theme.textSecondary },
            ]}
          >
            {item.isPilot ? "Manual Approval" : "Auto Pilot"}
          </ThemedText>
        </Pressable>

        <Pressable style={styles.deleteButton} onPress={() => handleDeleteWorkflow(item)}>
          <Feather name="trash-2" size={16} color={theme.error} />
        </Pressable>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.accent + "15" }]}>
        <Feather name="zap" size={48} color={theme.accent} />
      </View>
      <ThemedText style={styles.emptyTitle}>Intelligent Triggers</ThemedText>
      <ThemedText style={[styles.emptyDescription, { color: theme.textSecondary }]}>
        Automate your booking confirmations, reminders, and follow-ups. Choose an industry template to get started.
      </ThemedText>
      <Button
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setBlueprintModalVisible(true);
        }}
        style={styles.emptyButton}
      >
        <ThemedText style={{ color: theme.buttonText, fontWeight: "600" }}>
          Choose Industry Template
        </ThemedText>
      </Button>
    </View>
  );

  const renderBlueprintModal = () => (
    <Modal
      visible={blueprintModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setBlueprintModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={() => setBlueprintModalVisible(false)} />
        <View style={[styles.modalContent, { backgroundColor: theme.backgroundRoot }]}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Industry Templates</ThemedText>
            <Pressable onPress={() => setBlueprintModalVisible(false)}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ThemedText style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
            Select your industry to get pre-configured automation workflows
          </ThemedText>

          <FlatList
            data={blueprints.filter(b => b.count > 0)}
            keyExtractor={(item) => item.industry}
            renderItem={({ item }) => {
              const industryInfo = INDUSTRY_LABELS[item.industry] || { label: item.industry, icon: "settings" as keyof typeof Feather.glyphMap };
              return (
                <Pressable
                  style={[
                    styles.blueprintItem,
                    { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                    selectedIndustry === item.industry && { borderColor: theme.accent },
                  ]}
                  onPress={() => setSelectedIndustry(item.industry)}
                >
                  <View style={[styles.blueprintIcon, { backgroundColor: theme.accent + "15" }]}>
                    <Feather name={industryInfo.icon} size={24} color={theme.accent} />
                  </View>
                  <View style={styles.blueprintInfo}>
                    <ThemedText style={styles.blueprintLabel}>{industryInfo.label}</ThemedText>
                    <ThemedText style={[styles.blueprintCount, { color: theme.textSecondary }]}>
                      {item.count} workflows included
                    </ThemedText>
                  </View>
                  {selectedIndustry === item.industry && (
                    <Feather name="check-circle" size={20} color={theme.accent} />
                  )}
                </Pressable>
              );
            }}
            contentContainerStyle={styles.blueprintList}
          />

          <View style={styles.modalFooter}>
            <Button
              onPress={() => {
                if (selectedIndustry) {
                  handleInitializeBlueprints(selectedIndustry);
                }
              }}
              disabled={!selectedIndustry || initializing}
              style={styles.applyButton}
            >
              <ThemedText style={{ color: theme.buttonText, fontWeight: "600" }}>
                {initializing ? "Setting up..." : "Apply Template"}
              </ThemedText>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: headerHeight }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: headerHeight }]}>
      {workflows.length > 0 ? (
        <>
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>Automation Workflows</ThemedText>
            <Pressable
              style={[styles.addButton, { backgroundColor: theme.accent }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setBlueprintModalVisible(true);
              }}
            >
              <Feather name="plus" size={20} color={theme.buttonText} />
            </Pressable>
          </View>
          <FlatList
            data={workflows}
            keyExtractor={(item) => item.id}
            renderItem={renderWorkflowItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        renderEmptyState()
      )}
      {renderBlueprintModal()}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: "700",
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.md,
  },
  workflowCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  workflowHeader: {
    padding: Spacing.md,
  },
  workflowTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  triggerBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  triggerText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: "600",
  },
  workflowName: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
    marginBottom: 4,
  },
  workflowDescription: {
    fontSize: Typography.small.fontSize,
  },
  workflowMeta: {
    flexDirection: "row",
    gap: Spacing.lg,
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: Typography.small.fontSize,
  },
  workflowActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    paddingTop: 0,
  },
  pilotButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  pilotText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "500",
  },
  deleteButton: {
    padding: Spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.h3.fontSize,
    fontWeight: "700",
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: Typography.body.fontSize,
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  emptyButton: {
    minWidth: 240,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: "700",
  },
  modalSubtitle: {
    fontSize: Typography.small.fontSize,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  blueprintList: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.sm,
  },
  blueprintItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    gap: Spacing.md,
  },
  blueprintIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  blueprintInfo: {
    flex: 1,
  },
  blueprintLabel: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  blueprintCount: {
    fontSize: Typography.small.fontSize,
  },
  modalFooter: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  applyButton: {
    width: "100%",
  },
});
