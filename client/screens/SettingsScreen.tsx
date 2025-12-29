import React, { useState, useEffect } from "react";
import { View, FlatList, StyleSheet, Alert, Share, Platform, Modal, Pressable, ActivityIndicator, TextInput, Linking, Keyboard, ScrollView } from "react-native";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { api, Business, EmbedCode } from "@/lib/api";
import { getBookingDomain } from "@/lib/query-client";
import { SettingsRow } from "@/components/SettingsRow";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { getApiUrl } from "@/lib/query-client";
import { usePremium } from "@/contexts/PremiumContext";
import { SettingsStackParamList } from "@/navigation/SettingsStackNavigator";

type EmbedType = "inline" | "popup-button" | "popup-text";

export default function SettingsScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const { checkAndIncrementShare, checkAndIncrementQr, checkEmbedAccess, remainingShares, remainingQrCodes, isPremium } = usePremium();

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoDataLoading, setDemoDataLoading] = useState(false);
  const [clearDataLoading, setClearDataLoading] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [bookingUrl, setBookingUrl] = useState<string>("");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingField, setEditingField] = useState<"name" | "website" | "phone" | "slug" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [demoTypeModalVisible, setDemoTypeModalVisible] = useState(false);
  const [selectedDemoType, setSelectedDemoType] = useState<string>("salon");
  const [embedModalVisible, setEmbedModalVisible] = useState(false);
  const [embedCode, setEmbedCode] = useState<EmbedCode | null>(null);
  const [embedLoading, setEmbedLoading] = useState(false);
  const [embedError, setEmbedError] = useState(false);
  const [selectedEmbedType, setSelectedEmbedType] = useState<EmbedType>("inline");
  const [copiedCode, setCopiedCode] = useState(false);
  const copiedTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const DEMO_TYPES = [
    { id: "salon", label: "Salon", description: "Hair & beauty services" },
    { id: "autodetailing", label: "Auto Detailing", description: "Car detailing services" },
    { id: "solar", label: "Solar Installation", description: "Solar energy services" },
    { id: "coaching", label: "Coaching", description: "Personal & executive coaching" },
    { id: "fitness", label: "Fitness", description: "Gym & fitness training" },
  ];

  useEffect(() => {
    initializeBusiness();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const bidSync = api.getBusinessId();
      if (bidSync) {
        loadSettings();
      }
    }, [])
  );

  const initializeBusiness = async () => {
    try {
      const biz = await api.getOrCreateBusiness();
      setBusiness(biz);
    } catch (error) {
      console.error("Error initializing business:", error);
    }
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const biz = await api.getBusiness();
      if (biz) {
        setBusiness(biz);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllData = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Clear All Data",
      "This will delete all services, bookings, and customers. This action cannot be undone.",
      [
        { text: "Cancel", onPress: () => {}, style: "cancel" },
        {
          text: "Clear",
          onPress: async () => {
            setClearDataLoading(true);
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              await api.clearAllData();
              Alert.alert("Success", "All data has been cleared", [
                { text: "OK", onPress: () => navigation.navigate("DashboardTab" as any) }
              ]);
            } catch (error) {
              console.error("Error clearing data:", error);
              Alert.alert("Error", "Failed to clear data. Please try again.");
            } finally {
              setClearDataLoading(false);
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const handleInitializeDemoData = async (businessType: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDemoDataLoading(true);
    setDemoTypeModalVisible(false);
    try {
      await api.initializeDemoData(businessType);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const businessLabel = DEMO_TYPES.find(t => t.id === businessType)?.label;
      Alert.alert("Success", `Demo data for ${businessLabel} has been loaded`, [
        { text: "View Dashboard", onPress: () => navigation.navigate("DashboardTab" as any) }
      ]);
    } catch (error) {
      console.error("Error initializing demo data:", error);
      Alert.alert("Error", "Failed to load demo data. Please try again.");
    } finally {
      setDemoDataLoading(false);
    }
  };

  const handleShowDemoTypeModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDemoTypeModalVisible(true);
  };

  const handleOpenSharePreview = () => {
    if (!business) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const bookingLink = business.bookingUrl || `https://${getBookingDomain()}/book/${business.slug}`;
    navigation.navigate("SharePreview", {
      businessName: business.name,
      bookingUrl: bookingLink,
      slug: business.slug,
    });
  };

  const handleShareBookingLink = async () => {
    if (!business) return;
    
    if (!checkAndIncrementShare()) {
      return;
    }
    
    const bookingLink = business.bookingUrl || `https://${getBookingDomain()}/book/${business.slug}`;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await Share.share({
        message: `Book an appointment:\n${bookingLink}\n\nVisit to schedule with ${business.name}`,
        url: bookingLink,
        title: `${business.name} - Booking`,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleShowQRCode = async () => {
    if (!checkAndIncrementQr()) {
      return;
    }
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const data = await api.getQRCode();
      if (data) {
        setQrCode(data.qrCode);
        setBookingUrl(data.bookingUrl);
        setQrModalVisible(true);
      } else {
        Alert.alert("Error", "Could not generate QR code");
      }
    } catch (error) {
      console.error("Error getting QR code:", error);
      Alert.alert("Error", "Failed to generate QR code");
    }
  };

  const handleDownloadQRCode = async () => {
    if (!business) return;
    try {
      const cleanDomain = getBookingDomain();
      const qrImageUrl = `/api/businesses/${business.id}/qrcode?format=image`;
      const fullUrl = `https://${cleanDomain}${qrImageUrl}`;
      await Share.share({
        url: fullUrl,
        message: `Share this QR code to book appointments with ${business.name}`,
        title: `${business.name} - Booking QR Code`,
      });
    } catch (error) {
      console.error("Error sharing QR code:", error);
    }
  };

  const handleShowEmbedModal = async () => {
    if (!checkEmbedAccess()) {
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEmbedCode(null);
    setEmbedError(false);
    setEmbedLoading(true);
    setCopiedCode(false);
    setSelectedEmbedType("inline");
    setEmbedModalVisible(true);
    
    try {
      const data = await api.getEmbedCode();
      if (data) {
        setEmbedCode(data);
      } else {
        setEmbedError(true);
      }
    } catch (error) {
      console.error("Error getting embed code:", error);
      setEmbedError(true);
    } finally {
      setEmbedLoading(false);
    }
  };

  const handleRetryEmbedCode = async () => {
    setEmbedError(false);
    setEmbedLoading(true);
    try {
      const data = await api.getEmbedCode();
      if (data) {
        setEmbedCode(data);
      } else {
        setEmbedError(true);
      }
    } catch (error) {
      console.error("Error getting embed code:", error);
      setEmbedError(true);
    } finally {
      setEmbedLoading(false);
    }
  };

  const handleCloseEmbedModal = () => {
    setEmbedModalVisible(false);
    if (copiedTimeoutRef.current) {
      clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = null;
    }
  };

  const handleCopyEmbedCode = async () => {
    if (!embedCode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let codeToCopy = "";
    switch (selectedEmbedType) {
      case "inline":
        codeToCopy = embedCode.inlineCode;
        break;
      case "popup-button":
        codeToCopy = embedCode.popupButtonCode;
        break;
      case "popup-text":
        codeToCopy = embedCode.popupTextCode;
        break;
    }
    await Clipboard.setStringAsync(codeToCopy);
    setCopiedCode(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (copiedTimeoutRef.current) {
      clearTimeout(copiedTimeoutRef.current);
    }
    copiedTimeoutRef.current = setTimeout(() => setCopiedCode(false), 2000);
  };

  const getEmbedCodeForType = (): string => {
    if (!embedCode) return "";
    switch (selectedEmbedType) {
      case "inline":
        return embedCode.inlineCode;
      case "popup-button":
        return embedCode.popupButtonCode;
      case "popup-text":
        return embedCode.popupTextCode;
      default:
        return "";
    }
  };

  const handleEditBusinessField = (field: "name" | "website" | "phone" | "slug") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingField(field);
    const currentValue = business?.[field as keyof Business];
    setEditValue(currentValue ? String(currentValue) : "");
    setEditModalVisible(true);
  };

  const validateSlug = (slug: string): string | null => {
    if (!slug.trim()) return "Slug cannot be empty";
    if (!/^[a-z0-9-]+$/.test(slug)) return "Slug can only contain lowercase letters, numbers, and hyphens";
    if (slug.length < 3) return "Slug must be at least 3 characters";
    if (slug.length > 50) return "Slug must be at most 50 characters";
    if (slug.startsWith("-") || slug.endsWith("-")) return "Slug cannot start or end with a hyphen";
    return null;
  };

  const handleSaveBusinessField = async () => {
    if (!business || !editingField) return;
    
    // Validate slug format
    if (editingField === "slug") {
      const slugError = validateSlug(editValue);
      if (slugError) {
        Alert.alert("Invalid Slug", slugError);
        return;
      }
    }
    
    setEditLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Dismiss keyboard first (critical on iOS)
      Keyboard.dismiss();
      
      // Give iOS time to commit any pending operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const updates: Partial<Business> = { [editingField]: editValue };
      console.log("Saving field:", editingField, "with value:", editValue);
      const updated = await api.updateBusiness(updates);
      console.log("Save successful:", updated);
      setBusiness(updated);
      
      // Only close modal AFTER persistence completes
      setEditModalVisible(false);
      setEditingField(null);
      setEditValue("");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error("Error updating business:", error);
      if (editingField === "slug" && error instanceof Error && error.message.includes("409")) {
        Alert.alert("Slug Taken", "This booking link is already in use. Please choose another.");
      } else {
        Alert.alert("Error", `Failed to save ${editingField}. Please try again.`);
      }
    } finally {
      setEditLoading(false);
    }
  };

  const settingsItems = [
    {
      section: "Business Settings",
      items: [
        {
          icon: "briefcase" as const,
          title: "Business Name",
          subtitle: "Tap to edit",
          value: business?.name || "My Business",
          onPress: () => handleEditBusinessField("name"),
          showChevron: true,
        },
        {
          icon: "globe" as const,
          title: "Website",
          subtitle: "Tap to edit",
          value: business?.website || "Not set",
          onPress: () => handleEditBusinessField("website"),
          showChevron: true,
        },
        {
          icon: "phone" as const,
          title: "Phone",
          subtitle: "Tap to edit",
          value: business?.phone || "Not set",
          onPress: () => handleEditBusinessField("phone"),
          showChevron: true,
        },
      ],
    },
    {
      section: "Booking Link",
      items: [
        {
          icon: "link-2" as const,
          title: "Booking URL Slug",
          subtitle: "Tap to edit",
          value: business?.slug || "demo-business",
          onPress: () => handleEditBusinessField("slug"),
          showChevron: true,
        },
        {
          icon: "link" as const,
          title: "Share Booking Link",
          subtitle: business?.bookingUrl || (business?.slug ? `${getBookingDomain()}/book/${business.slug}` : "Loading..."),
          onPress: handleOpenSharePreview,
          showChevron: true,
        },
        {
          icon: "grid" as const,
          title: "Show QR Code",
          subtitle: "Display QR code for customers to scan",
          onPress: handleShowQRCode,
          showChevron: true,
        },
        {
          icon: "code" as const,
          title: "Embed Widget",
          subtitle: "Add booking widget to your website",
          onPress: handleShowEmbedModal,
          showChevron: true,
        },
        {
          icon: "message-circle" as const,
          title: "Booking Assistant",
          subtitle: "Coming Soon",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Alert.alert("Coming Soon", "AI booking assistant will be available in v1.1");
          },
          showChevron: true,
        },
      ],
    },
    {
      section: "Data Management",
      items: [
        {
          icon: "refresh-cw" as const,
          title: "Load Demo Data",
          subtitle: "Choose business type to showcase",
          onPress: handleShowDemoTypeModal,
          disabled: demoDataLoading,
        },
        {
          icon: "trash-2" as const,
          title: "Clear All Data",
          subtitle: "Delete all services, bookings, and customers",
          onPress: handleClearAllData,
          destructive: true,
          disabled: clearDataLoading,
        },
      ],
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <FlatList
        scrollEnabled={true}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        data={settingsItems}
        renderItem={({ item: section }) => (
          <View key={section.section} style={styles.section}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              {section.section}
            </ThemedText>
            {section.items.map((item: any, idx: number) => (
              <View key={idx} style={idx < section.items.length - 1 ? styles.itemGap : {}}>
                <SettingsRow
                  icon={item.icon}
                  title={item.title}
                  subtitle={item.subtitle}
                  value={item.value}
                  hasToggle={item.hasToggle}
                  toggleValue={item.toggleValue}
                  onToggle={item.onToggle}
                  onPress={!item.disabled ? item.onPress : undefined}
                  destructive={item.destructive}
                  disabled={item.disabled}
                />
              </View>
            ))}
          </View>
        )}
        keyExtractor={(item) => item.section}
      />

      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3">
                {editingField === "name" && "Business Name"}
                {editingField === "website" && "Website"}
                {editingField === "phone" && "Phone"}
                {editingField === "slug" && "Booking URL Slug"}
              </ThemedText>
              <Pressable onPress={() => setEditModalVisible(false)} style={styles.closeButton}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            {editingField === "slug" && (
              <ThemedText type="small" style={styles.slugHelper}>
                URL: {getBookingDomain()}/book/{editValue || "your-slug"}
              </ThemedText>
            )}
            <TextInput
              value={editValue}
              onChangeText={setEditValue}
              placeholder={editingField === "name" ? "Business name" : editingField === "website" ? "Website URL" : editingField === "phone" ? "Phone number" : "my-booking-link"}
              autoCapitalize={editingField === "slug" ? "none" : "words"}
              keyboardType={editingField === "phone" ? "phone-pad" : editingField === "website" ? "url" : "default"}
              style={[
                styles.editInput,
                { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.backgroundTertiary }
              ]}
              placeholderTextColor={theme.textSecondary}
              editable={!editLoading}
            />
            <View style={styles.modalActions}>
              <Button onPress={handleSaveBusinessField} disabled={editLoading || !editValue.trim()}>
                {editLoading ? "Saving..." : "Save"}
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={qrModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Booking QR Code</ThemedText>
              <Pressable onPress={() => setQrModalVisible(false)} style={styles.closeButton}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            
            {qrCode ? (
              <View style={styles.qrContainer}>
                <Image
                  source={{ uri: qrCode }}
                  style={styles.qrImage}
                  contentFit="contain"
                />
                <ThemedText type="small" style={styles.qrUrl}>
                  {bookingUrl}
                </ThemedText>
              </View>
            ) : null}
            
            <View style={styles.modalActions}>
              <Button onPress={handleDownloadQRCode}>
                Share QR Code Image
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={demoTypeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDemoTypeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault, maxWidth: 400 }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Select Business Type</ThemedText>
              <Pressable onPress={() => setDemoTypeModalVisible(false)} style={styles.closeButton}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            
            <View style={styles.demoTypeGrid}>
              {DEMO_TYPES.map((type) => (
                <Pressable
                  key={type.id}
                  onPress={() => {
                    setSelectedDemoType(type.id);
                    handleInitializeDemoData(type.id);
                  }}
                  style={[
                    styles.demoTypeButton,
                    { backgroundColor: theme.backgroundSecondary }
                  ]}
                >
                  <ThemedText type="body" style={styles.demoTypeLabel}>
                    {type.label}
                  </ThemedText>
                  <ThemedText type="small" style={styles.demoTypeDescription}>
                    {type.description}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={embedModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseEmbedModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.embedModalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Embed Widget</ThemedText>
              <Pressable onPress={handleCloseEmbedModal} style={styles.closeButton}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            
            {embedLoading ? (
              <View style={styles.embedLoading}>
                <ActivityIndicator size="large" color={theme.text} />
                <ThemedText type="small" style={styles.embedLoadingText}>
                  Generating embed code...
                </ThemedText>
              </View>
            ) : embedError ? (
              <View style={styles.embedLoading}>
                <Feather name="alert-circle" size={48} color={theme.text} style={{ opacity: 0.5 }} />
                <ThemedText type="small" style={styles.embedLoadingText}>
                  Failed to generate embed code
                </ThemedText>
                <View style={styles.modalActions}>
                  <Button onPress={handleRetryEmbedCode}>
                    Try Again
                  </Button>
                </View>
              </View>
            ) : embedCode ? (
              <View>
                <ThemedText type="small" style={styles.embedDescription}>
                  Add this booking widget to your website. Choose an embed type:
                </ThemedText>
                
                <View style={styles.embedTypeTabs}>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedEmbedType("inline");
                      setCopiedCode(false);
                    }}
                    style={[
                      styles.embedTypeTab,
                      { backgroundColor: selectedEmbedType === "inline" ? theme.text : theme.backgroundSecondary }
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={[
                        styles.embedTypeTabText,
                        { color: selectedEmbedType === "inline" ? theme.backgroundDefault : theme.text }
                      ]}
                    >
                      Inline
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedEmbedType("popup-button");
                      setCopiedCode(false);
                    }}
                    style={[
                      styles.embedTypeTab,
                      { backgroundColor: selectedEmbedType === "popup-button" ? theme.text : theme.backgroundSecondary }
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={[
                        styles.embedTypeTabText,
                        { color: selectedEmbedType === "popup-button" ? theme.backgroundDefault : theme.text }
                      ]}
                    >
                      Button
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedEmbedType("popup-text");
                      setCopiedCode(false);
                    }}
                    style={[
                      styles.embedTypeTab,
                      { backgroundColor: selectedEmbedType === "popup-text" ? theme.text : theme.backgroundSecondary }
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={[
                        styles.embedTypeTabText,
                        { color: selectedEmbedType === "popup-text" ? theme.backgroundDefault : theme.text }
                      ]}
                    >
                      Text Link
                    </ThemedText>
                  </Pressable>
                </View>

                <ThemedText type="small" style={styles.embedTypeHint}>
                  {selectedEmbedType === "inline" && "Displays the booking form directly on your page"}
                  {selectedEmbedType === "popup-button" && "Shows a button that opens booking in a popup"}
                  {selectedEmbedType === "popup-text" && "Creates a text link that opens booking in a popup"}
                </ThemedText>
                
                <ScrollView 
                  style={[styles.codeContainer, { backgroundColor: theme.backgroundSecondary }]}
                  horizontal={false}
                  nestedScrollEnabled
                >
                  <ThemedText type="small" style={styles.codeText}>
                    {getEmbedCodeForType()}
                  </ThemedText>
                </ScrollView>
                
                <View style={styles.modalActions}>
                  <Button onPress={handleCopyEmbedCode}>
                    {copiedCode ? "Copied!" : "Copy Code"}
                  </Button>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    width: "100%",
    maxWidth: 360,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  qrContainer: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  qrImage: {
    width: 250,
    height: 250,
    marginBottom: Spacing.md,
  },
  qrUrl: {
    textAlign: "center",
    opacity: 0.7,
  },
  modalActions: {
    gap: Spacing.md,
  },
  section: {
    marginBottom: Spacing["3xl"],
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  itemGap: {
    marginBottom: Spacing.lg,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    fontSize: 16,
  },
  slugHelper: {
    marginBottom: Spacing.md,
    opacity: 0.7,
  },
  demoTypeGrid: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  demoTypeButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  demoTypeLabel: {
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  demoTypeDescription: {
    opacity: 0.6,
  },
  embedModalContent: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "80%",
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  embedLoading: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
  },
  embedLoadingText: {
    marginTop: Spacing.md,
    opacity: 0.6,
  },
  embedDescription: {
    opacity: 0.7,
    marginBottom: Spacing.lg,
  },
  embedTypeTabs: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  embedTypeTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  embedTypeTabText: {
    fontWeight: "600",
  },
  embedTypeHint: {
    opacity: 0.6,
    marginBottom: Spacing.md,
    fontStyle: "italic",
  },
  codeContainer: {
    maxHeight: 200,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  codeText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    lineHeight: 16,
  },
});
