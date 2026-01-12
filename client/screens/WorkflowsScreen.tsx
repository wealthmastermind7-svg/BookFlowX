import React, { useState, useCallback } from "react";
import { View, FlatList, StyleSheet, Alert, Modal, Pressable, ActivityIndicator, Switch, ScrollView } from "react-native";
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
  actionConfig: string;
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
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewWorkflow, setPreviewWorkflow] = useState<Workflow | null>(null);
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

      const ownerToken = await api.getOwnerToken();
      // Use the business ID from the token if available to ensure sync
      const currentBusiness = await api.getBusiness();
      
      // CRITICAL: We must use the business ID that the server actually associates with this token
      const targetBusinessId = currentBusiness?.id || businessId;
      
      if (currentBusiness && currentBusiness.id !== businessId) {
        console.warn(`[Workflow] Business ID mismatch detected on client. Redirecting to token's business: ${currentBusiness.id}`);
      }

      const baseUrl = getApiUrl().replace(/\/$/, '');
      const url = `${baseUrl}/api/businesses/${targetBusinessId}/workflows/initialize`;
      
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
      
      if (response.ok) {
        const data = await response.json();
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
      console.error("[Workflow] Blueprint init error:", error?.message || "Unknown error");
      const isNetworkError = error?.message?.includes("Network") || error?.message?.includes("fetch") || error?.message?.includes("Load failed");
      const displayMessage = isNetworkError 
        ? "Could not connect to server. Please check your connection and try again."
        : (error?.message || "Please try again.");
      Alert.alert("Error", `Failed to set up workflows: ${displayMessage}`);
    } finally {
      setInitializing(false);
    }
  };

  const formatDelay = (minutes: number | null) => {
    if (minutes === null || minutes === 0) return "Immediately after booking";
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

  const renderWorkflowItem = ({ item }: { item: Workflow }) => (
    <View style={[
      styles.workflowCard, 
      { 
        backgroundColor: theme.backgroundSecondary, 
        borderColor: item.isActive ? theme.accent : theme.border,
        opacity: item.isActive ? 1 : 0.8
      }
    ]}>
      <View style={styles.workflowHeader}>
        <View style={styles.workflowTitleRow}>
          <View style={[styles.triggerBadge, { backgroundColor: theme.accent + "20" }]}>
            <ThemedText style={[styles.triggerText, { color: theme.accent }]}>
              {TRIGGER_LABELS[item.triggerType] || item.triggerType}
            </ThemedText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <ThemedText style={{ fontSize: 12, fontWeight: '600', color: item.isActive ? theme.accent : theme.textSecondary }}>
              {item.isActive ? "ACTIVE" : "PAUSED"}
            </ThemedText>
            <Switch
              value={item.isActive}
              onValueChange={() => handleToggleWorkflow(item)}
              trackColor={{ false: theme.border, true: theme.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
        <ThemedText style={styles.workflowName}>{item.name}</ThemedText>
        <ThemedText style={[styles.workflowTiming, { color: theme.text }]}>
          {item.triggerType === 'booking_created' ? "⚡ Sends immediately after booking" : `🕒 Sends ${formatDelay(item.delayMinutes)}`}
        </ThemedText>
        {item.description && (
          <ThemedText style={[styles.workflowDescription, { color: theme.textSecondary }]}>
            {item.description.replace(/patient/g, "client").replace(/medical/g, "service")}
          </ThemedText>
        )}
      </View>

      <View style={[styles.workflowMeta, { borderTopColor: theme.border }]}>
        <Pressable 
          style={styles.metaItem} 
          onPress={() => {
            if (item.actionType === 'send_email') {
              setPreviewWorkflow(item);
              setPreviewModalVisible(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
        >
          <Feather name={item.actionType === 'send_email' ? "mail" : "zap"} size={14} color={item.actionType === 'send_email' ? theme.accent : theme.textSecondary} />
          <ThemedText style={[styles.metaText, { color: item.actionType === 'send_email' ? theme.accent : theme.textSecondary, textDecorationLine: item.actionType === 'send_email' ? 'underline' : 'none' }]}>
            {item.actionType === 'send_email' ? "Email (Preview)" : (ACTION_LABELS[item.actionType] || item.actionType)}
          </ThemedText>
        </Pressable>
        <View style={styles.metaItem}>
          <Feather name="shield" size={14} color={theme.textSecondary} />
          <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
            Runs automatically
          </ThemedText>
        </View>
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
            name={item.isPilot ? "eye" : "zap"}
            size={16}
            color={item.isPilot ? theme.accent : theme.textSecondary}
          />
          <ThemedText
            style={[
              styles.pilotText,
              { color: item.isPilot ? theme.accent : theme.textSecondary },
            ]}
          >
            {item.isPilot ? "Suggestive Mode" : "Auto Pilot"}
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

  const renderPreviewModal = () => {
    if (!previewWorkflow) return null;
    
    const config = JSON.parse(previewWorkflow.actionConfig);
    const subject = config.subject || "Booking Confirmation";
    const businessName = business?.name || "Your Business";
    const serviceName = business?.industry === "contractor" ? "Standard Service" : 
                       business?.industry === "auto" ? "Oil Change" :
                       business?.industry === "medical" ? "Consultation" : 
                       "Express Glow";
    
    return (
      <Modal
        visible={previewModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPreviewModalVisible(false)} />
          <View style={[styles.previewModalContent, { backgroundColor: theme.backgroundRoot }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Email Preview</ThemedText>
              <Pressable onPress={() => setPreviewModalVisible(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <View style={styles.emailContainer}>
              <View style={[styles.emailHeader, { borderBottomColor: theme.border }]}>
                <ThemedText style={styles.emailSubject}>{subject} - {businessName}</ThemedText>
                <View style={styles.emailSenderRow}>
                  <View style={[styles.senderAvatar, { backgroundColor: theme.accent }]}>
                    <ThemedText style={styles.avatarText}>{businessName[0].toUpperCase()}</ThemedText>
                  </View>
                  <View>
                    <ThemedText style={styles.senderName}>{businessName}</ThemedText>
                    <ThemedText style={styles.senderDate}>Today</ThemedText>
                  </View>
                </View>
              </View>

              <ScrollView style={styles.emailBodyScroll}>
                <View style={styles.emailBody}>
                  <ThemedText style={styles.emailTitle}>Booking Confirmed!</ThemedText>
                  <ThemedText style={styles.emailGreeting}>Hi John Smith,</ThemedText>
                  <ThemedText style={styles.emailText}>
                    Your booking with <ThemedText style={{ fontWeight: '700' }}>{businessName}</ThemedText> has been successfully confirmed.
                  </ThemedText>

                  <View style={[styles.detailsCard, { backgroundColor: theme.backgroundSecondary }]}>
                    <ThemedText style={styles.detailItem}><ThemedText style={{ fontWeight: '700' }}>Confirmation #:</ThemedText> 77104567</ThemedText>
                    <ThemedText style={styles.detailItem}><ThemedText style={{ fontWeight: '700' }}>Service:</ThemedText> {serviceName}</ThemedText>
                    <ThemedText style={styles.detailItem}><ThemedText style={{ fontWeight: '700' }}>Date:</ThemedText> Wednesday, January 21, 2026</ThemedText>
                    <ThemedText style={styles.detailItem}><ThemedText style={{ fontWeight: '700' }}>Time:</ThemedText> 12:30 PM</ThemedText>
                    <ThemedText style={styles.detailItem}><ThemedText style={{ fontWeight: '700' }}>Total Price:</ThemedText> {business?.currency || 'USD'} $45.00</ThemedText>
                  </View>

                  <ThemedText style={styles.emailFooter}>
                    If you need to make any changes, please contact the business directly.
                  </ThemedText>
                  
                  <ThemedText style={styles.emailSignoff}>Sent via BookFlow</ThemedText>
                </View>
              </ScrollView>
            </View>

            <View style={styles.modalFooter}>
              <Button onPress={() => setPreviewModalVisible(false)}>
                <ThemedText style={{ color: theme.buttonText, fontWeight: "600" }}>Close Preview</ThemedText>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

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
        <View style={{ flex: 1 }}>
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>Automation Workflows</ThemedText>
            <Pressable
              style={[styles.addButton, { backgroundColor: theme.accent }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setBlueprintModalVisible(true);
              }}
            >
              <View style={styles.addButtonContent}>
                <Feather name="plus" size={16} color={theme.buttonText} />
                <ThemedText style={[styles.addButtonText, { color: theme.buttonText }]}>
                  Choose template
                </ThemedText>
              </View>
            </Pressable>
          </View>
          <FlatList
            data={workflows}
            keyExtractor={(item) => item.id}
            renderItem={renderWorkflowItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {renderEmptyState()}
        </View>
      )}
      {renderBlueprintModal()}
      {renderPreviewModal()}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  comingSoonOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
    zIndex: 10,
  },
  comingSoonBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
  },
  comingSoonTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: "700",
  },
  comingSoonDescription: {
    fontSize: Typography.body.fontSize,
    textAlign: "center",
    maxWidth: 300,
    lineHeight: 24,
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
    paddingHorizontal: Spacing.md,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: "700",
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
    fontWeight: "700",
    marginBottom: 4,
  },
  workflowTiming: {
    fontSize: Typography.small.fontSize,
    fontWeight: "600",
    marginBottom: 8,
  },
  workflowDescription: {
    fontSize: Typography.small.fontSize,
    opacity: 0.8,
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
  previewModalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    height: "90%",
    width: "100%",
  },
  emailContainer: {
    flex: 1,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  emailHeader: {
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  emailSubject: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: Spacing.sm,
  },
  emailSenderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  senderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  senderName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  senderDate: {
    fontSize: 12,
    color: "#6B7280",
  },
  emailBodyScroll: {
    flex: 1,
  },
  emailBody: {
    padding: Spacing.lg,
  },
  emailTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: Spacing.lg,
  },
  emailGreeting: {
    fontSize: 16,
    color: "#374151",
    marginBottom: Spacing.md,
  },
  emailText: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  detailsCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  detailItem: {
    fontSize: 15,
    color: "#374151",
    marginBottom: 8,
  },
  emailFooter: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  emailSignoff: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  modalFooter: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  applyButton: {
    width: "100%",
  },
});
