import React, { useState, useEffect } from "react";
import * as FileSystem from "expo-file-system/legacy";
import { View, StyleSheet, Alert, Share, Platform, Modal, Pressable, ActivityIndicator, TextInput, Linking, Keyboard, ScrollView, Text } from "react-native";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { api, Business } from "@/lib/api";
import { getBookingDomain } from "@/lib/query-client";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { usePremium } from "@/contexts/PremiumContext";
import { restorePurchases } from "@/lib/revenuecat";
import { SettingsStackParamList } from "@/navigation/SettingsStackNavigator";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { CURRENCY_OPTIONS } from "@/lib/currency";

type CombinedNavigation = NativeStackNavigationProp<SettingsStackParamList & RootStackParamList>;

export default function SettingsScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<CombinedNavigation>();
  const { checkShareAccess, checkQrAccess, isPremium, showPaywall } = usePremium();

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoDataLoading, setDemoDataLoading] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [bookingUrl, setBookingUrl] = useState<string>("");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingField, setEditingField] = useState<"name" | "website" | "phone" | "slug" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [demoTypeModalVisible, setDemoTypeModalVisible] = useState(false);
  const [selectedDemoType, setSelectedDemoType] = useState<string>("salon");
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const DEMO_TYPES = [
    { id: "salon", label: "Salon" },
    { id: "autodetailing", label: "Auto Detailing" },
    { id: "fitness", label: "Fitness" },
    { id: "coaching", label: "Coaching" },
    { id: "medical", label: "Medical" },
    { id: "contractor", label: "Contractor" },
    { id: "plumber", label: "Plumber" },
    { id: "electrician", label: "Electrician" },
    { id: "hvac", label: "HVAC" },
    { id: "cleaning", label: "Cleaning" },
    { id: "landscaping", label: "Landscaping" },
    { id: "photography", label: "Photography" },
    { id: "consulting", label: "Consulting" },
    { id: "veterinary", label: "Veterinary" },
  ];

  useEffect(() => {
    initializeBusiness();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadSettings();
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
      if (biz) setBusiness(biz);
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditBusinessField = (field: "name" | "website" | "phone" | "slug") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingField(field);
    const currentValue = business?.[field as keyof Business];
    setEditValue(currentValue ? String(currentValue) : "");
    setEditModalVisible(true);
  };

  const generateSlugFromName = (name: string): string => {
    return name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
  };

  const validateSlug = (slug: string): string | null => {
    if (!slug.trim()) return "Slug cannot be empty";
    if (!/^[a-z0-9-]+$/.test(slug)) return "Slug can only contain lowercase letters, numbers, and hyphens";
    if (slug.length < 3) return "Slug must be at least 3 characters";
    return null;
  };

  const handleSaveBusinessField = async () => {
    if (!business || !editingField) return;
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
      Keyboard.dismiss();
      const updates: Partial<Business> = { [editingField]: editValue };
      if (editingField === "name" && editValue.trim()) {
        updates.slug = generateSlugFromName(editValue);
      }
      const updated = await api.updateBusiness(updates);
      setBusiness(updated);
      setEditModalVisible(false);
      setEditingField(null);
      setEditValue("");
    } catch (error) {
      Alert.alert("Error", `Failed to save ${editingField}.`);
    } finally {
      setEditLoading(false);
    }
  };

  const handleShowCurrencyModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrencyModalVisible(true);
  };

  const handleSelectCurrency = async (currencyId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrencyModalVisible(false);
    try {
      const updated = await api.updateBusiness({ currency: currencyId });
      setBusiness(updated);
    } catch (error) {
      Alert.alert("Error", "Failed to update currency.");
    }
  };

  const getCurrentCurrencyShort = (): string => {
    const currency = CURRENCY_OPTIONS.find(c => c.id === (business?.currency || "USD"));
    return currency ? `${currency.id} ${currency.symbol}` : "USD $";
  };

  const handleOpenSharePreview = () => {
    if (!business || !checkShareAccess()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const domain = getBookingDomain();
    const protocol = domain.includes("localhost") || domain.includes("10.0.2.2") || domain.match(/\d+\.\d+\.\d+\.\d+/) ? "http" : "https";
    const bookingLink = `${protocol}://${domain}/book/${business.slug}`;
    console.log("[Booking] Share link generated:", bookingLink);
    navigation.navigate("SharePreview", {
      businessName: business.name,
      bookingUrl: bookingLink,
      slug: business.slug,
    });
  };

  const handleShowQRCode = async () => {
    if (!checkQrAccess()) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const data = await api.getQRCode();
      if (data) {
        const domain = getBookingDomain();
        const protocol = domain.includes("localhost") || domain.includes("10.0.2.2") || domain.match(/\d+\.\d+\.\d+\.\d+/) ? "http" : "https";
        const bookingLink = `${protocol}://${domain}/book/${business.slug}`;
        console.log("[Booking] QR link generated:", bookingLink);
        setQrCode(data.qrCode);
        setBookingUrl(bookingLink);
        setQrModalVisible(true);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to generate QR code");
    }
  };

  const handleDownloadQRCode = async () => {
    if (!business || !qrCode || !checkQrAccess()) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (Platform.OS === "web") {
        const link = document.createElement("a");
        link.href = qrCode;
        link.download = `${business.slug}-qr.png`;
        link.click();
        return;
      }
      const filename = `${business.slug}-booking-qr.png`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      const base64Data = qrCode.split("base64,")[1];
      await FileSystem.writeAsStringAsync(fileUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
      await Share.share({ url: fileUri, title: `${business.name} - Booking QR Code` });
    } catch (error) {
      Alert.alert("Error", "Failed to share QR code");
    }
  };

  const handleClearAllData = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Clear All Data", "This will delete all services, bookings, and customers. This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        onPress: async () => {
          try {
            await api.clearAllData();
            Alert.alert("Success", "All data has been cleared", [{ text: "OK", onPress: () => navigation.navigate("DashboardTab" as any) }]);
          } catch (error) {
            Alert.alert("Error", "Failed to clear data.");
          }
        },
        style: "destructive",
      },
    ]);
  };

  const handleInitializeDemoData = async (businessType: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDemoDataLoading(true);
    setDemoTypeModalVisible(false);
    try {
      await api.initializeDemoData(businessType);
      Alert.alert("Success", "Demo data has been loaded", [{ text: "View Dashboard", onPress: () => navigation.navigate("DashboardTab" as any) }]);
    } catch (error) {
      Alert.alert("Error", "Failed to load demo data.");
    } finally {
      setDemoDataLoading(false);
    }
  }

  const handleRestorePurchases = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRestoreLoading(true);
    try {
      const result = await restorePurchases();
      if (result.success) {
        Alert.alert("Success", result.isPremium ? "Purchases restored!" : "No active subscriptions found.");
      } else {
        Alert.alert("Error", result.error || "Failed to restore.");
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred.");
    } finally {
      setRestoreLoading(false);
    }
  };

  const SectionTitle = ({ children, small = false }: { children: string; small?: boolean }) => (
    <Text style={[styles.sectionTitle, small && { fontSize: 24, marginTop: 24 }]}>{children}</Text>
  );

  const MetallicCard = ({ children, style, onPress, flex = false }: { children: React.ReactNode; style?: any; onPress?: () => void; flex?: boolean }) => {
    const content = (
      <View style={[styles.metallicCard, flex && { flex: 1 }, style]}>
        {children}
      </View>
    );
    if (onPress) {
      return (
        <Pressable onPress={onPress} style={({ pressed }) => [flex && { flex: 1 }, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}>
          {content}
        </Pressable>
      );
    }
    return content;
  };

  const MetallicButton = ({ title, icon, onPress, style }: { title: string; icon: string; onPress: () => void; style?: any }) => (
    <MetallicCard onPress={onPress} style={[styles.metallicButton, style]} flex>
      <ThemedText style={styles.metallicButtonText}>{title}</ThemedText>
      <Feather name={icon as any} size={18} color="#222" style={{ opacity: 0.7 }} />
    </MetallicCard>
  );

  const RingChart = ({ icon }: { icon: string }) => (
    <View style={styles.ringChart}>
      <Feather name={icon as any} size={24} color="#333" />
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.background, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.background}>
      <View style={styles.lightStreak} pointerEvents="none" />
      <ScrollView 
        style={styles.container}
        contentContainerStyle={{ paddingTop: headerHeight + 40, paddingBottom: tabBarHeight + 40, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.hugeTitle}>Settings</Text>
        </View>

        <SectionTitle>Business</SectionTitle>
        <Text style={styles.sectionSubtitle}>Set your business profile and local currency.</Text>
        <View style={styles.row}>
          <MetallicCard onPress={() => handleEditBusinessField("name")} style={styles.squareCard} flex>
            <Text style={styles.cardLabel}>BUSINESS NAME</Text>
            <Text style={styles.cardValueLarge}>{business?.name || "My Business"}</Text>
          </MetallicCard>
          <MetallicCard onPress={handleShowCurrencyModal} style={styles.squareCard} flex>
            <Text style={styles.cardLabel}>CURRENCY</Text>
            <View style={styles.currencyRow}>
              <Text style={styles.cardValueLarge}>{getCurrentCurrencyShort()}</Text>
              <Feather name="dollar-sign" size={48} color="#000" style={styles.cardIconDecor} />
            </View>
          </MetallicCard>
        </View>

        <SectionTitle>Automation</SectionTitle>
        <MetallicCard onPress={() => navigation.navigate("Workflows" as any)} style={styles.wideCard}>
          <View style={styles.automationRow}>
            <Feather name="zap" size={48} color="#222" />
            <View style={styles.automationText}>
              <Text style={styles.cardValueMedium}>Workflows</Text>
              <Text style={styles.cardDesc}>Intelligent reminders & confirmation sequences.</Text>
            </View>
          </View>
        </MetallicCard>

        <SectionTitle>Booking</SectionTitle>
        <View style={styles.row}>
          <MetallicButton title="Share Link" icon="share-2" onPress={handleOpenSharePreview} />
          <MetallicButton title="Share QR" icon="maximize" onPress={handleShowQRCode} />
        </View>

        <SectionTitle small>Subscription</SectionTitle>
        <View style={{ gap: 8, marginBottom: 16 }}>
          <MetallicCard onPress={() => showPaywall("soft_upsell")} style={styles.premiumRow}>
            <View style={styles.premiumIconBox}>
              <Feather name="star" size={16} color="#222" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.premiumRowTitle}>Upgrade Plan</Text>
              <Text style={styles.premiumRowSubtitle}>{isPremium ? "Pro status active" : "Access premium tools"}</Text>
            </View>
            <Feather name="chevron-right" size={14} color="#222" style={{ opacity: 0.2 }} />
          </MetallicCard>

          <MetallicCard onPress={handleRestorePurchases} style={styles.premiumRow}>
            <View style={styles.premiumIconBox}>
              <Feather name="rotate-ccw" size={16} color="#222" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.premiumRowTitle}>Restore</Text>
              <Text style={styles.premiumRowSubtitle}>Previous purchases</Text>
            </View>
            {restoreLoading ? (
              <ActivityIndicator size="small" color="#222" />
            ) : (
              <Feather name="chevron-right" size={14} color="#222" style={{ opacity: 0.2 }} />
            )}
          </MetallicCard>
        </View>

        <SectionTitle small>System</SectionTitle>
        <View style={styles.row}>
          <MetallicCard style={styles.securityCard} flex>
            <Text style={styles.cardLabel}>Demo Data</Text>
            <RingChart icon="database" />
            <Pressable onPress={() => setDemoTypeModalVisible(true)} style={styles.securityInnerBtn}>
              <Text style={styles.securityInnerBtnText}>LOAD</Text>
            </Pressable>
          </MetallicCard>
          <MetallicCard style={styles.securityCard} flex>
            <Text style={styles.cardLabel}>Wipe Cloud</Text>
            <RingChart icon="cloud-off" />
            <Pressable onPress={handleClearAllData} style={styles.securityInnerBtn}>
              <Text style={styles.securityInnerBtnText}>CLEAR</Text>
            </Pressable>
          </MetallicCard>
          <View style={styles.securityBtnsColumn}>
            <MetallicCard onPress={() => Linking.openURL(`https://${getBookingDomain()}/privacy-policy`)} style={styles.compactSecurityBtn}>
              <Text style={styles.compactSecurityText}>Privacy</Text>
            </MetallicCard>
            <MetallicCard onPress={() => Linking.openURL(`https://${getBookingDomain()}/terms`)} style={styles.compactSecurityBtn}>
              <Text style={styles.compactSecurityText}>Terms</Text>
            </MetallicCard>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>DESIGNED FOR EXCELLENCE • v4.2.0</Text>
        </View>
      </ScrollView>

      {/* Modals */}
      <Modal visible={qrModalVisible} transparent animationType="fade" onRequestClose={() => setQrModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <MetallicCard style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Booking QR</ThemedText>
              <Pressable onPress={() => setQrModalVisible(false)}><Feather name="x" size={24} color="#222" /></Pressable>
            </View>
            <View style={styles.qrContainer}>
              {qrCode ? <Image source={{ uri: qrCode }} style={styles.qrImage} contentFit="contain" /> : <ActivityIndicator size="large" color="#222" />}
            </View>
            <Pressable 
              onPress={handleDownloadQRCode}
              style={({ pressed }) => [
                styles.modalPrimaryButton,
                { backgroundColor: '#000', opacity: pressed ? 0.8 : 1 }
              ]}
            >
              <Text style={styles.modalPrimaryButtonText}>Share QR</Text>
            </Pressable>
          </MetallicCard>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={editModalVisible} transparent animationType="fade" onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <MetallicCard style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Edit {editingField}</ThemedText>
              <Pressable onPress={() => setEditModalVisible(false)}><Feather name="x" size={24} color="#222" /></Pressable>
            </View>
            <TextInput 
              style={styles.editInput} 
              value={editValue} 
              onChangeText={setEditValue} 
              placeholder={editingField === 'name' ? "Enter business name" : `Enter ${editingField}`}
              placeholderTextColor="#888" 
              autoFocus 
            />
            <Pressable 
              onPress={handleSaveBusinessField} 
              disabled={editLoading}
              style={({ pressed }) => [
                styles.modalPrimaryButton,
                { backgroundColor: '#000', opacity: pressed || editLoading ? 0.8 : 1 }
              ]}
            >
              {editLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.modalPrimaryButtonText}>Save Changes</Text>
              )}
            </Pressable>
          </MetallicCard>
        </View>
      </Modal>

      {/* Demo Modal */}
      <Modal visible={demoTypeModalVisible} transparent animationType="slide" onRequestClose={() => setDemoTypeModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <MetallicCard style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Choose Type</ThemedText>
              <Pressable onPress={() => setDemoTypeModalVisible(false)}><Feather name="x" size={24} color="#222" /></Pressable>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {DEMO_TYPES.map(type => (
                <Pressable key={type.id} onPress={() => setSelectedDemoType(type.id)} style={[styles.demoItem, selectedDemoType === type.id && { backgroundColor: '#bbb' }]}>
                  <Text style={styles.demoText}>{type.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable 
              onPress={() => handleInitializeDemoData(selectedDemoType)}
              disabled={demoDataLoading}
              style={({ pressed }) => [
                styles.modalPrimaryButton,
                { backgroundColor: '#000', opacity: pressed || demoDataLoading ? 0.8 : 1, marginTop: 20 }
              ]}
            >
              {demoDataLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.modalPrimaryButtonText}>Load</Text>
              )}
            </Pressable>
          </MetallicCard>
        </View>
      </Modal>

      {/* Currency Modal */}
      <Modal visible={currencyModalVisible} transparent animationType="slide" onRequestClose={() => setCurrencyModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <MetallicCard style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Currency</ThemedText>
              <Pressable onPress={() => setCurrencyModalVisible(false)}><Feather name="x" size={24} color="#222" /></Pressable>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {CURRENCY_OPTIONS.map(c => (
                <Pressable key={c.id} onPress={() => handleSelectCurrency(c.id)} style={styles.demoItem}>
                  <Text style={styles.demoText}>{c.symbol} {c.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </MetallicCard>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: "#000" },
  lightStreak: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.05)" },
  container: { flex: 1 },
  header: { marginBottom: 32 },
  hugeTitle: { fontSize: 56, color: "#fff", lineHeight: 60, fontWeight: "300", letterSpacing: -1 },
  row: { flexDirection: "row", gap: 16, marginBottom: 16 },
  squareCard: { height: 128, padding: 16, justifyContent: "space-between" },
  wideCard: { padding: 20, marginBottom: 16 },
  metallicCard: { backgroundColor: "#d0d0d0", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.6)", overflow: "hidden" },
  cardLabel: { fontSize: 10, fontWeight: "700", color: "#555", letterSpacing: 1, textTransform: "uppercase" },
  cardValueLarge: { fontSize: 20, fontWeight: "600", color: "#222" },
  cardValueMedium: { fontSize: 18, fontWeight: "700", color: "#222", marginBottom: 4 },
  cardDesc: { fontSize: 13, color: "#444", lineHeight: 18 },
  cardIconDecor: { position: "absolute", right: 8, bottom: -10, opacity: 0.1 },
  currencyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 36, color: "#fff", marginTop: 32, marginBottom: 4, fontWeight: "300" },
  sectionSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 16, fontWeight: "400" },
  automationRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  automationText: { flex: 1 },
  metallicButton: { height: 50, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  metallicButtonText: { fontSize: 15, fontWeight: "600", color: "#222" },
  premiumRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  premiumIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  premiumRowTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
  },
  premiumRowSubtitle: {
    fontSize: 13,
    color: "#666",
  },
  securityCard: { height: 144, padding: 12, alignItems: "center", justifyContent: "space-between" },
  ringChart: { width: 60, height: 60, borderRadius: 30, borderWidth: 6, borderColor: "rgba(0,0,0,0.05)", borderTopColor: "#333", alignItems: "center", justifyContent: "center" },
  securityInnerBtn: { height: 28, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: "#333", alignItems: 'center', justifyContent: 'center' },
  securityInnerBtnText: { fontSize: 10, fontWeight: '700', color: '#333' },
  securityBtnsColumn: { width: "33%", gap: 12 },
  compactSecurityBtn: { flex: 1, alignItems: "center", justifyContent: "center", padding: 8 },
  compactSecurityText: { fontSize: 12, fontWeight: "600", color: "#222", textAlign: "center" },
  footer: { marginTop: 48, marginBottom: 32, alignItems: "center" },
  footerText: { fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: 2 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", padding: 24 },
  modalContent: { padding: 24, backgroundColor: '#e0e0e0', borderRadius: 24 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#222" },
  editInput: { height: 50, backgroundColor: "rgba(0,0,0,0.05)", borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: "#222", marginBottom: 20 },
  modalPrimaryButton: {
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  modalPrimaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  qrContainer: { alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: "#fff", borderRadius: 16, marginBottom: 20 },
  qrImage: { width: 200, height: 200 },
  demoItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  demoText: { fontSize: 16, color: '#222' }
});
