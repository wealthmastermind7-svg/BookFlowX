import React, { useState, useEffect } from "react";
import {
  View,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { api, Service } from "@/lib/api";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getCurrencySymbol } from "@/lib/currency";

type EditScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "ServiceEditor"
>;

export default function ServiceEditorScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation<EditScreenNavigationProp>();
  const { theme } = useTheme();

  const [service, setService] = useState<Partial<Service>>({
    name: "",
    duration: 30,
    price: 0,
    description: "",
  });

  const [activeTab, setActiveTab] = useState<"details" | "links">("details");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [businessReady, setBusinessReady] = useState(!!api.getBusinessId());
  const [currencySymbol, setCurrencySymbol] = useState("$");

  const serviceId = (route.params as any)?.serviceId;

  useEffect(() => {
    // Wait for business to be ready
    const checkBusinessReady = setInterval(() => {
      if (api.getBusinessId()) {
        setBusinessReady(true);
        clearInterval(checkBusinessReady);
      }
    }, 100);

    return () => clearInterval(checkBusinessReady);
  }, []);

  useEffect(() => {
    if (serviceId && businessReady) {
      loadService();
    }
  }, [serviceId, businessReady]);

  useEffect(() => {
    const loadBusinessCurrency = async () => {
      try {
        const business = await api.getBusiness();
        if (business?.currency) {
          setCurrencySymbol(getCurrencySymbol(business.currency));
        }
      } catch (error) {
        console.error("Error loading business currency:", error);
      }
    };
    if (businessReady) {
      loadBusinessCurrency();
    }
  }, [businessReady]);

  const loadService = async () => {
    setLoading(true);
    try {
      const found = await api.getService(serviceId);
      if (found) {
        setService(found);
      }
    } catch (error) {
      console.error("Error loading service:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Check business is ready
    if (!businessReady || !api.getBusinessId()) {
      alert("Business is not ready. Please wait a moment and try again.");
      return;
    }

    if (!service.name?.trim()) {
      alert("Please enter a service name");
      return;
    }

    if (!service.duration || service.duration === 0) {
      alert("Please set a duration");
      return;
    }

    setSaving(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Dismiss keyboard first (critical on iOS)
      Keyboard.dismiss();
      
      // Give iOS time to commit any pending operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log("Saving service with businessId:", api.getBusinessId());
      if (serviceId) {
        console.log("Updating service:", serviceId);
        await api.updateService(serviceId, {
          name: service.name,
          duration: service.duration,
          price: service.price || 0,
          description: service.description,
        });
      } else {
        console.log("Creating new service");
        await api.createService({
          name: service.name,
          duration: service.duration,
          price: service.price || 0,
          description: service.description,
        });
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Only navigate AFTER persistence completes
      navigation.goBack();
    } catch (error) {
      console.error("Error saving service:", error);
      alert("Error saving service: " + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
    >
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={{
          paddingBottom: insets.bottom + Spacing.xl,
        }}
      >
        {/* Tab Navigation */}
        <View style={[styles.tabBar, { borderBottomColor: theme.backgroundSecondary }]}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab("details");
            }}
            style={[
              styles.tab,
              activeTab === "details" && [
                styles.activeTab,
                { borderBottomColor: theme.text },
              ],
            ]}
          >
            <ThemedText
              type="body"
              style={[
                styles.tabText,
                activeTab === "details" && styles.activeTabText,
              ]}
            >
              Details
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab("links");
            }}
            style={[
              styles.tab,
              activeTab === "links" && [
                styles.activeTab,
                { borderBottomColor: theme.text },
              ],
            ]}
          >
            <ThemedText
              type="body"
              style={[
                styles.tabText,
                activeTab === "links" && styles.activeTabText,
              ]}
            >
              Links
            </ThemedText>
          </Pressable>
        </View>

        {/* Details Tab */}
        {activeTab === "details" && (
          <View style={styles.tabContent}>
            {/* Service Name */}
            <View style={styles.section}>
              <ThemedText type="h4" style={styles.sectionTitle}>
                Service Name
              </ThemedText>
              <TextInput
                value={service.name}
                onChangeText={(text) =>
                  setService((prev) => ({ ...prev, name: text }))
                }
                placeholder="Enter service name"
                placeholderTextColor={theme.textSecondary}
                editable={!saving}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.backgroundTertiary,
                  },
                ]}
              />
            </View>

            {/* Duration */}
            <View style={styles.section}>
              <ThemedText type="h4" style={styles.sectionTitle}>
                Duration (minutes)
              </ThemedText>
              <TextInput
                value={String(service.duration)}
                onChangeText={(text) =>
                  setService((prev) => ({
                    ...prev,
                    duration: parseInt(text) || 0,
                  }))
                }
                placeholder="30"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                editable={!saving}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.backgroundTertiary,
                  },
                ]}
              />
            </View>

            {/* Price */}
            <View style={styles.section}>
              <ThemedText type="h4" style={styles.sectionTitle}>
                Price ({currencySymbol})
              </ThemedText>
              <TextInput
                value={String((service.price || 0) / 100)}
                onChangeText={(text) =>
                  setService((prev) => ({
                    ...prev,
                    price: Math.round((parseFloat(text) || 0) * 100),
                  }))
                }
                placeholder="0.00"
                placeholderTextColor={theme.textSecondary}
                keyboardType="decimal-pad"
                editable={!saving}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.backgroundTertiary,
                  },
                ]}
              />
            </View>

            {/* Description */}
            <View style={styles.section}>
              <ThemedText type="h4" style={styles.sectionTitle}>
                Description
              </ThemedText>
              <TextInput
                value={service.description || ""}
                onChangeText={(text) =>
                  setService((prev) => ({ ...prev, description: text }))
                }
                placeholder="Enter service description"
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={4}
                editable={!saving}
                style={[
                  styles.input,
                  styles.descriptionInput,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.backgroundTertiary,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Links Tab */}
        {activeTab === "links" && (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <ThemedText type="h4" style={styles.sectionTitle}>
                Coming Soon
              </ThemedText>
              <ThemedText type="body" style={styles.comingSoonText}>
                Link management will be available in the next update
              </ThemedText>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View
          style={[
            styles.actionButtons,
            { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl },
          ]}
        >
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.goBack();
            }}
            disabled={saving}
            style={[
              styles.cancelButton,
              { backgroundColor: theme.backgroundSecondary },
              saving && { opacity: 0.5 },
            ]}
          >
            <ThemedText type="body" style={styles.cancelButtonText}>
              Cancel
            </ThemedText>
          </Pressable>

          <Button
            onPress={handleSave}
            disabled={saving}
            style={{ flex: 1, marginLeft: Spacing.md }}
          >
            {saving ? "Saving..." : "Save Service"}
          </Button>
        </View>
      </KeyboardAwareScrollViewCompat>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.lg,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    opacity: 0.6,
    fontWeight: "500",
  },
  activeTabText: {
    opacity: 1,
    fontWeight: "600",
  },
  tabContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  descriptionInput: {
    textAlignVertical: "top",
    minHeight: 100,
  },
  comingSoonText: {
    opacity: 0.6,
    fontStyle: "italic",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  cancelButton: {
    flex: 1,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  cancelButtonText: {
    fontWeight: "600",
  },
});
