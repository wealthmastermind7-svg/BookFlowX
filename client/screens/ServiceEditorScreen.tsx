import React, { useState, useEffect, useRef } from "react";
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
  Share,
  Alert,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system";
import * as Clipboard from "expo-clipboard";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { api, Service, Business } from "@/lib/api";
import { getBookingDomain } from "@/lib/query-client";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getCurrencySymbol } from "@/lib/currency";
import QRCode from "react-native-qrcode-svg";

import { usePremium } from "@/contexts/PremiumContext";

type EditScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "ServiceEditor"
>;

export default function ServiceEditorScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation<EditScreenNavigationProp>();
  const { theme } = useTheme();
  const { isPremium, checkShareAccess, checkQrAccess } = usePremium();

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
  const [business, setBusiness] = useState<Business | null>(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const qrRef = useRef<any>(null);

  const serviceId = (route.params as any)?.serviceId;

  useEffect(() => {
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
    const loadBusinessData = async () => {
      try {
        const biz = await api.getBusiness();
        if (biz) {
          setBusiness(biz);
          if (biz.currency) {
            setCurrencySymbol(getCurrencySymbol(biz.currency));
          }
        }
      } catch (error) {
        console.error("Error loading business:", error);
      }
    };
    if (businessReady) {
      loadBusinessData();
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

  const getServiceBookingLink = () => {
    if (!business?.slug || !serviceId) return null;
    const domain = getBookingDomain();
    const protocol = domain.includes("localhost") ? "http" : "https";
    const serviceSlug = (service as Service).slug 
      || (service.name ? service.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim() : serviceId);
    return `${protocol}://${domain}/book/${business.slug}/${serviceSlug}`;
  };

  const handleCopyServiceLink = async () => {
    if (!checkShareAccess()) return;
    const link = getServiceBookingLink();
    if (!link) {
      Alert.alert("Error", "Save the service first to generate a booking link");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Clipboard.setStringAsync(link);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Copied", "Service booking link copied to clipboard");
  };

  const handleShareServiceLink = async () => {
    if (!checkShareAccess()) return;
    const link = getServiceBookingLink();
    if (!link) {
      Alert.alert("Error", "Save the service first to share a booking link");
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await Share.share({
        message: `Book ${service.name}:\n${link}\n\nSchedule your appointment now!`,
        url: link,
        title: `Book ${service.name}`,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleShowQRCode = () => {
    if (!checkQrAccess()) return;
    if (!serviceId) {
      Alert.alert("Error", "Save the service first to generate a QR code");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setQrModalVisible(true);
  };

  const handleDownloadQRCode = async () => {
    if (!qrRef.current) return;
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      qrRef.current.toDataURL(async (dataURL: string) => {
        if (Platform.OS === "web") {
          const link = document.createElement("a");
          link.href = `data:image/png;base64,${dataURL}`;
          link.download = `${service.name?.replace(/\s+/g, "-").toLowerCase() || "service"}-qr.png`;
          link.click();
          return;
        }

        const filename = `${service.name?.replace(/\s+/g, "-").toLowerCase() || "service"}-qr.png`;
        const docDir = FileSystem.documentDirectory;
        if (!docDir) {
          Alert.alert("Error", "Unable to access file storage");
          return;
        }
        const fileUri = `${docDir}${filename}`;
        
        await FileSystem.writeAsStringAsync(fileUri, dataURL, {
          encoding: "base64",
        });

        await Share.share({
          url: fileUri,
          title: `${service.name} - Booking QR Code`,
        });
      });
    } catch (error) {
      console.error("Error sharing QR code:", error);
      Alert.alert("Error", "Failed to share QR code image");
    }
  };

  const handleSave = async () => {
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
      
      Keyboard.dismiss();
      
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

  const bookingLink = getServiceBookingLink();

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
            {!serviceId ? (
              <View style={styles.section}>
                <ThemedText type="h4" style={styles.sectionTitle}>
                  Save First
                </ThemedText>
                <ThemedText type="body" style={styles.comingSoonText}>
                  Save this service to generate its unique booking link and QR code
                </ThemedText>
              </View>
            ) : (
              <>
                {/* Direct Booking Link */}
                <View style={styles.section}>
                  <ThemedText type="h4" style={styles.sectionTitle}>
                    Direct Booking Link
                  </ThemedText>
                  <ThemedText type="body" style={styles.linkDescription}>
                    Share this link to let customers book this specific service directly
                  </ThemedText>
                  
                  <Pressable
                    onPress={handleCopyServiceLink}
                    style={[styles.linkCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.backgroundTertiary }]}
                  >
                    <View style={styles.linkCardContent}>
                      <View style={[styles.linkIconBadge, { backgroundColor: theme.backgroundTertiary }]}>
                        <Feather name="link" size={20} color={theme.text} />
                      </View>
                      <View style={styles.linkCardText}>
                        <ThemedText type="body" style={styles.linkUrl} numberOfLines={1}>
                          {bookingLink?.replace(/^https?:\/\//, "") || "Loading..."}
                        </ThemedText>
                        <ThemedText type="small" style={styles.linkHint}>
                          Tap to copy
                        </ThemedText>
                      </View>
                      <View style={[styles.copyBadge, { backgroundColor: theme.text }]}>
                        <Feather name={isPremium ? "copy" : "lock"} size={14} color={theme.backgroundDefault} />
                      </View>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={handleShareServiceLink}
                    style={[styles.shareButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.backgroundTertiary }]}
                  >
                    <Feather name={isPremium ? "share" : "lock"} size={18} color={theme.text} />
                    <ThemedText style={[styles.shareButtonText, { color: theme.text }]}>
                      Share Link
                    </ThemedText>
                  </Pressable>
                </View>

                {/* QR Code Section */}
                <View style={styles.section}>
                  <ThemedText type="h4" style={styles.sectionTitle}>
                    QR Code
                  </ThemedText>
                  <ThemedText type="body" style={styles.linkDescription}>
                    Display this QR code for customers to scan and book this service
                  </ThemedText>
                  
                  <Pressable
                    onPress={handleShowQRCode}
                    style={[styles.qrPreviewButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.backgroundTertiary }]}
                  >
                    <Feather name={isPremium ? "maximize" : "lock"} size={24} color={theme.text} />
                    <ThemedText type="body" style={{ marginLeft: Spacing.md }}>
                      View QR Code
                    </ThemedText>
                  </Pressable>
                </View>
              </>
            )}
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

      {/* QR Code Modal */}
      <Modal
        visible={qrModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQrModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setQrModalVisible(false)}
        >
          <View style={[styles.qrModalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.qrModalHeader}>
              <ThemedText type="h3" style={{ flex: 1 }}>
                {service.name || "Service"} QR Code
              </ThemedText>
              <Pressable
                onPress={() => setQrModalVisible(false)}
                style={styles.closeButton}
              >
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <View style={styles.qrContainer}>
              {bookingLink && (
                <QRCode
                  value={bookingLink}
                  size={220}
                  backgroundColor="white"
                  color="black"
                  getRef={(ref: any) => (qrRef.current = ref)}
                />
              )}
            </View>

            <ThemedText type="body" style={styles.qrDescription}>
              Scan to book {service.name}
            </ThemedText>

            <View style={styles.qrActions}>
              <Button onPress={handleDownloadQRCode} style={{ flex: 1 }}>
                Download QR Code
              </Button>
            </View>
          </View>
        </Pressable>
      </Modal>
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
  linkDescription: {
    opacity: 0.7,
    marginBottom: Spacing.lg,
  },
  linkCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  linkCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  linkIconBadge: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  linkCardText: {
    flex: 1,
  },
  linkUrl: {
    fontSize: 14,
    fontWeight: "500",
  },
  linkHint: {
    opacity: 0.5,
    marginTop: 2,
  },
  copyBadge: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  shareButtonText: {
    fontWeight: "600",
  },
  qrPreviewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  qrModalContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  qrModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  qrContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    backgroundColor: "white",
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  qrDescription: {
    textAlign: "center",
    opacity: 0.7,
    marginBottom: Spacing.xl,
  },
  qrActions: {
    flexDirection: "row",
  },
});
