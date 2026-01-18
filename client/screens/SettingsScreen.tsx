import React, { useState, useEffect } from "react";
import * as FileSystem from "expo-file-system/legacy";
import { 
  View, 
  StyleSheet, 
  Alert, 
  Share, 
  Platform, 
  Modal, 
  Pressable, 
  ActivityIndicator, 
  TextInput, 
  Linking, 
  Keyboard, 
  ScrollView, 
  ImageBackground
} from "react-native";
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
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { usePremium } from "@/contexts/PremiumContext";
import { restorePurchases } from "@/lib/revenuecat";
import { SettingsStackParamList } from "@/navigation/SettingsStackNavigator";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { CURRENCY_OPTIONS } from "@/lib/currency";

type EmbedType = "inline" | "popup-button" | "popup-text";
type CombinedNavigation = NativeStackNavigationProp<SettingsStackParamList & RootStackParamList>;

const ACCENT_GOLD = "#FFFFFF";
const silkBackground = require("../assets/stock_images/abstract_dark_fluid__e119120c.jpg");

export default function SettingsScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { isDark, theme } = useTheme();
  const navigation = useNavigation<CombinedNavigation>();
  const { checkShareAccess, checkQrAccess, checkEmbedAccess, isPremium, showPaywall } = usePremium();

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
  const [embedInstructionsVisible, setEmbedInstructionsVisible] = useState(false);
  const [embedCode, setEmbedCode] = useState<EmbedCode | null>(null);
  const [embedLoading, setEmbedLoading] = useState(false);
  const [selectedEmbedType, setSelectedEmbedType] = useState<EmbedType>("inline");
  const [copiedCode, setCopiedCode] = useState(false);
  const copiedTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const DEMO_TYPES = [
    { id: "salon", label: "Salon", description: "Hair & beauty services" },
    { id: "autodetailing", label: "Auto Detailing", description: "Car detailing services" },
    { id: "fitness", label: "Fitness", description: "Gym & fitness training" },
    { id: "coaching", label: "Coaching", description: "Personal & executive coaching" },
    { id: "medical", label: "Medical", description: "Healthcare & clinics" },
    { id: "contractor", label: "Contractor", description: "General home services" },
    { id: "plumber", label: "Plumber", description: "Plumbing services" },
    { id: "electrician", label: "Electrician", description: "Electrical services" },
    { id: "hvac", label: "HVAC", description: "Heating & cooling" },
    { id: "cleaning", label: "Cleaning", description: "Home & office cleaning" },
    { id: "landscaping", label: "Landscaping", description: "Lawn & garden care" },
    { id: "photography", label: "Photography", description: "Photo & video services" },
    { id: "consulting", label: "Consulting", description: "Business consulting" },
    { id: "veterinary", label: "Veterinary", description: "Pet care services" },
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

  const handleClearAllData = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Clear All Data", "This will delete all services, bookings, and customers. This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        onPress: async () => {
          setClearDataLoading(true);
          try {
            await api.clearAllData();
            navigation.navigate("DashboardTab" as any);
          } catch (error) {
            Alert.alert("Error", "Failed to clear data.");
          } finally {
            setClearDataLoading(false);
          }
        },
        style: "destructive",
      },
    ]);
  };

  const handleInitializeDemoData = async (businessType: string) => {
    setDemoDataLoading(true);
    setDemoTypeModalVisible(false);
    try {
      await api.initializeDemoData(businessType);
      navigation.navigate("DashboardTab" as any);
    } catch (error) {
      Alert.alert("Error", "Failed to load demo data.");
    } finally {
      setDemoDataLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    setRestoreLoading(true);
    try {
      const result = await restorePurchases();
      Alert.alert("Restore", result.success ? "Purchases restored!" : "No purchases found.");
    } catch (error) {
      Alert.alert("Error", "Restore failed.");
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleSelectCurrency = async (currencyId: string) => {
    setCurrencyModalVisible(false);
    try {
      const updated = await api.updateBusiness({ currency: currencyId });
      setBusiness(updated);
    } catch (error) {
      Alert.alert("Error", "Failed to update currency.");
    }
  };

  const getCurrentCurrencyShort = () => {
    const currency = CURRENCY_OPTIONS.find(c => c.id === (business?.currency || "USD"));
    return currency ? `${currency.id} ${currency.symbol}` : "USD $";
  };

  const handleOpenSharePreview = () => {
    if (!business || !checkShareAccess()) return;
    const bookingLink = business.bookingUrl || `https://${getBookingDomain()}/book/${business.slug}`;
    navigation.navigate("SharePreview", {
      businessName: business.name,
      bookingUrl: bookingLink,
      slug: business.slug,
    });
  };

  const handleShareBookingLink = async () => {
    if (!business || !checkShareAccess()) return;
    const bookingLink = business.bookingUrl || `https://${getBookingDomain()}/book/${business.slug}`;
    await Share.share({ message: bookingLink, url: bookingLink });
  };

  const handleShowQRCode = async () => {
    if (!checkQrAccess()) return;
    const data = await api.getQRCode();
    if (data) {
      setQrCode(data.qrCode);
      setBookingUrl(data.bookingUrl);
      setQrModalVisible(true);
    }
  };

  const handleDownloadQRCode = async () => {
    if (!business || !qrCode || !checkQrAccess()) return;
    if (Platform.OS === "web") {
      const link = document.createElement("a");
      link.href = qrCode;
      link.download = "qr.png";
      link.click();
      return;
    }
    const fileUri = `${FileSystem.cacheDirectory}qr.png`;
    await FileSystem.writeAsStringAsync(fileUri, qrCode.split(",")[1], { encoding: FileSystem.EncodingType.Base64 });
    await Share.share({ url: fileUri });
  };

  const handleShowEmbedModal = async () => {
    if (!checkEmbedAccess()) return;
    setEmbedModalVisible(true);
    setEmbedLoading(true);
    try {
      const data = await api.getEmbedCode();
      setEmbedCode(data);
    } catch (error) {
      setEmbedCode(null);
    } finally {
      setEmbedLoading(false);
    }
  };

  const handleCopyBookingLink = async () => {
    if (!business) return;
    const bookingLink = business.bookingUrl || `https://${getBookingDomain()}/book/${business.slug}`;
    await Clipboard.setStringAsync(bookingLink);
    Alert.alert("Copied", "Link copied to clipboard.");
  };

  const handleEditBusinessField = (field: "name" | "website" | "phone" | "slug") => {
    setEditingField(field);
    setEditValue(business?.[field] ? String(business[field]) : "");
    setEditModalVisible(true);
  };

  const handleSaveBusinessField = async () => {
    if (!business || !editingField) return;
    setEditLoading(true);
    try {
      let updates: Partial<typeof business> = { [editingField]: editValue };
      
      if (editingField === "name" && editValue) {
        const newSlug = editValue
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        if (newSlug) {
          updates.slug = newSlug;
        }
      }
      
      const updated = await api.updateBusiness(updates);
      setBusiness(updated);
      setEditModalVisible(false);
    } catch (error: any) {
      console.error("Save business field failed:", error);
      Alert.alert("Error", `Save failed: ${error.message || "Unknown error"}`);
    } finally {
      setEditLoading(false);
    }
  };

  const GlassCard = ({ children, style, onPress }: any) => (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.glassCard, { backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)" }, style, pressed && onPress && { opacity: 0.8 }]}>
      {children}
    </Pressable>
  );

  const SectionTitle = ({ children, badge }: any) => (
    <View style={styles.sectionTitleRow}>
      <ThemedText style={styles.sectionTitle}>{children}</ThemedText>
      {badge && <View style={[styles.badge, { borderColor: "rgba(255,255,255,0.2)" }]}><ThemedText style={styles.badgeText}>{badge}</ThemedText></View>}
    </View>
  );

  const CompactRow = ({ icon, title, subtitle, onPress, destructive }: any) => (
    <Pressable onPress={onPress} style={styles.compactRow}>
      <Feather name={icon} size={20} color={destructive ? "#EF4444" : "#fff"} />
      <View style={{ flex: 1, marginLeft: 16 }}>
        <ThemedText style={[styles.compactRowTitle, destructive && { color: "#EF4444" }]}>{title}</ThemedText>
        {subtitle && <ThemedText style={styles.compactRowSubtitle}>{subtitle}</ThemedText>}
      </View>
      <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.3)" />
    </Pressable>
  );

  const PremiumRow = ({ icon, title, subtitle, onPress, disabled }: any) => (
    <GlassCard onPress={disabled ? undefined : onPress} style={styles.premiumRow}>
      <View style={styles.premiumIconBox}><Feather name={icon} size={22} color="#fff" /></View>
      <View style={{ flex: 1 }}>
        <ThemedText style={styles.premiumRowTitle}>{title}</ThemedText>
        <ThemedText style={styles.premiumRowSubtitle}>{subtitle}</ThemedText>
      </View>
      {disabled ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.4)" />}
    </GlassCard>
  );

  const InfoRow = ({ icon, label, value, onPress }: any) => (
    <Pressable onPress={onPress} style={styles.infoRow}>
      <Feather name={icon} size={18} color="rgba(255,255,255,0.6)" />
      <View style={{ flex: 1, marginLeft: 16 }}>
        <ThemedText style={styles.infoLabel}>{label}</ThemedText>
        <ThemedText style={styles.infoValue}>{value}</ThemedText>
      </View>
      <Feather name="edit-2" size={14} color="rgba(255,255,255,0.4)" />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <ImageBackground source={silkBackground} style={styles.overlay}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)" }}>
          <ScrollView contentContainerStyle={{ paddingTop: headerHeight + 40, paddingBottom: tabBarHeight + 60, paddingHorizontal: 24 }}>
            <SectionTitle badge={isPremium ? "MEMBER" : undefined}>Premium</SectionTitle>
            <View style={{ marginBottom: 32 }}>
              <PremiumRow icon="star" title="Upgrade Plan" subtitle={isPremium ? "You're a Pro member" : "Access premium tools"} onPress={() => showPaywall("soft_upsell")} />
              <View style={{ height: 12 }} />
              <PremiumRow icon="rotate-ccw" title="Restore" subtitle="Previous purchases" onPress={handleRestorePurchases} disabled={restoreLoading} />
            </View>

            <SectionTitle>Business</SectionTitle>
            <View style={{ marginBottom: 32 }}>
              <View style={styles.gridRow}>
                <GlassCard style={styles.gridCard} onPress={() => handleEditBusinessField("name")}>
                  <View style={styles.gridIconCircle}><Feather name="briefcase" size={16} color="#fff" /></View>
                  <ThemedText style={styles.gridLabel}>ENTITY</ThemedText>
                  <ThemedText style={styles.gridValue} numberOfLines={1}>{business?.name || "My Business"}</ThemedText>
                </GlassCard>
                <GlassCard style={styles.gridCard} onPress={() => setCurrencyModalVisible(true)}>
                  <View style={styles.gridIconCircle}><Feather name="dollar-sign" size={16} color="#fff" /></View>
                  <ThemedText style={styles.gridLabel}>CURRENCY</ThemedText>
                  <ThemedText style={styles.gridValue}>{getCurrentCurrencyShort()}</ThemedText>
                </GlassCard>
              </View>
              <GlassCard style={[styles.multiRowCard, { marginTop: 12 }]}>
                <InfoRow icon="globe" label="WEBSITE" value={business?.website || "Not set"} onPress={() => handleEditBusinessField("website")} />
                <View style={styles.rowDivider} />
                <InfoRow icon="phone" label="SUPPORT LINE" value={business?.phone || "Not set"} onPress={() => handleEditBusinessField("phone")} />
              </GlassCard>
            </View>

            <SectionTitle>Automation</SectionTitle>
            <GlassCard style={styles.automationCard} onPress={() => navigation.navigate("Workflows")}>
              <ThemedText style={styles.automationTitle}>Workflows</ThemedText>
              <ThemedText style={styles.automationDesc}>Intelligent reminders & confirmation sequences.</ThemedText>
              <ThemedText style={styles.automationAction}>CONFIGURE</ThemedText>
            </GlassCard>

            <SectionTitle>Booking</SectionTitle>
            <GlassCard style={styles.bookingCard}>
              <View style={styles.bookingHeader}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.bookingTitle}>Booking Link</ThemedText>
                  <ThemedText style={styles.bookingLinkText} numberOfLines={1}>{getBookingDomain()}/book/{business?.slug || "..."}</ThemedText>
                </View>
                <Pressable onPress={handleCopyBookingLink} style={styles.copyIconBox}><Feather name="copy" size={16} color="#fff" /></Pressable>
              </View>
              <View style={styles.bookingActions}>
                <Pressable onPress={handleOpenSharePreview} style={styles.shareLinkBtn}><Feather name="share-2" size={18} color="#fff" /><ThemedText style={styles.shareBtnText}>Share Link</ThemedText></Pressable>
                <Pressable onPress={handleShowQRCode} style={styles.shareQrBtn}><Feather name="grid" size={18} color="#000" /><ThemedText style={styles.shareQrText}>Share QR</ThemedText></Pressable>
              </View>
            </GlassCard>
            <GlassCard style={styles.embedCard} onPress={handleShowEmbedModal}>
              <View style={styles.embedIconBox}><Feather name="code" size={18} color="#fff" /></View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <ThemedText style={styles.embedTitle}>Embed Widget</ThemedText>
                <ThemedText style={styles.embedDesc}>Add to your website</ThemedText>
              </View>
              <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.3)" />
            </GlassCard>

            <SectionTitle>Security</SectionTitle>
            <View style={styles.gridRow}>
              <GlassCard style={styles.securityGridCard} onPress={() => setDemoTypeModalVisible(true)}>
                <Feather name="download-cloud" size={22} color="#fff" />
                <ThemedText style={styles.securityTitle}>Demo Data</ThemedText>
                <ThemedText style={styles.securityAction}>LOAD SAMPLES</ThemedText>
              </GlassCard>
              <GlassCard style={styles.securityGridCard} onPress={handleClearAllData}>
                <Feather name="trash-2" size={22} color="#EF4444" style={{ opacity: 0.6 }} />
                <ThemedText style={[styles.securityTitle, { color: "#EF4444" }]}>Wipe Cloud</ThemedText>
                <ThemedText style={styles.securityAction}>CLEAR ALL DATA</ThemedText>
              </GlassCard>
            </View>
            <GlassCard style={{ marginTop: 16 }}>
              <CompactRow icon="shield" title="Privacy Protocol" onPress={() => Linking.openURL("https://confirmbooking.online/privacy-policy")} />
              <View style={styles.rowDivider} />
              <CompactRow icon="file-text" title="Terms of Use" onPress={() => Linking.openURL("https://confirmbooking.online/terms")} />
            </GlassCard>

            <View style={styles.footer}><ThemedText style={styles.footerText}>DESIGNED FOR EXCELLENCE • V4.2.0</ThemedText></View>
          </ScrollView>
        </View>
      </ImageBackground>

      {/* Modals simplified for speed/fixing - maintaining core logic */}
      <Modal visible={qrModalVisible} transparent animationType="fade" onRequestClose={() => setQrModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: "#111" }]}>
            <ThemedText style={styles.modalTitle}>Booking QR Code</ThemedText>
            {qrCode && <Image source={{ uri: qrCode }} style={styles.qrImage} contentFit="contain" />}
            <Button onPress={handleDownloadQRCode}>Share QR Code Image</Button>
            <Pressable onPress={() => setQrModalVisible(false)} style={styles.secondaryButton}><ThemedText style={styles.secondaryButtonText}>Close</ThemedText></Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={editModalVisible} transparent animationType="fade" onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: "#111" }]}>
            <ThemedText style={styles.modalTitle}>Edit {editingField}</ThemedText>
            <TextInput style={[styles.editInput, { color: "#fff", borderColor: "rgba(255,255,255,0.1)" }]} value={editValue} onChangeText={setEditValue} placeholder={`Enter ${editingField}`} placeholderTextColor="#666" />
            <Button onPress={handleSaveBusinessField} disabled={editLoading}>{editLoading ? "Saving..." : "Save"}</Button>
            <Pressable onPress={() => setEditModalVisible(false)} style={styles.secondaryButton}><ThemedText style={styles.secondaryButtonText}>Cancel</ThemedText></Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={demoTypeModalVisible} transparent animationType="slide" onRequestClose={() => setDemoTypeModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: "#111" }]}>
            <ThemedText style={styles.modalTitle}>Choose Business Type</ThemedText>
            <ScrollView style={{ maxHeight: 300 }}>
              {DEMO_TYPES.map(t => (
                <Pressable key={t.id} onPress={() => handleInitializeDemoData(t.id)} style={styles.demoTypeButton}>
                  <ThemedText style={styles.demoTypeLabel}>{t.label}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={() => setDemoTypeModalVisible(false)} style={styles.secondaryButton}><ThemedText style={styles.secondaryButtonText}>Cancel</ThemedText></Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={currencyModalVisible} transparent animationType="slide" onRequestClose={() => setCurrencyModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: "#111" }]}>
            <ThemedText style={styles.modalTitle}>Select Currency</ThemedText>
            <ScrollView style={{ maxHeight: 300 }}>
              {CURRENCY_OPTIONS.map(c => (
                <Pressable key={c.id} onPress={() => handleSelectCurrency(c.id)} style={styles.currencyRow}>
                  <ThemedText style={styles.currencyLabel}>{c.label} ({c.symbol})</ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  overlay: { flex: 1 },
  sectionTitleRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, marginTop: 12 },
  sectionTitle: { fontSize: 56, fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontWeight: "800", color: "#fff", letterSpacing: -2 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 1, color: "#fff" },
  glassCard: { borderRadius: 32, borderWidth: 1, overflow: "hidden" },
  premiumRow: { flexDirection: "row", alignItems: "center", padding: 24, gap: 16 },
  premiumIconBox: { width: 56, height: 56, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.1)" },
  premiumRowTitle: { fontSize: 18, fontWeight: "600", color: "#fff" },
  premiumRowSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  gridRow: { flexDirection: "row", gap: 12 },
  gridCard: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center" },
  gridIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  gridLabel: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.4)", letterSpacing: 2, marginBottom: 4 },
  gridValue: { fontSize: 18, fontWeight: "700", color: "#fff" },
  multiRowCard: { paddingVertical: 8 },
  infoRow: { flexDirection: "row", alignItems: "center", padding: 24 },
  rowDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginHorizontal: 24 },
  infoLabel: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.4)", letterSpacing: 2 },
  infoValue: { fontSize: 15, fontWeight: "600", color: "#fff", marginTop: 2 },
  automationCard: { padding: 32, minHeight: 180, justifyContent: "center" },
  automationTitle: { fontSize: 24, fontWeight: "700", color: "#fff", marginBottom: 8 },
  automationDesc: { fontSize: 16, color: "rgba(255,255,255,0.4)", maxWidth: "80%", lineHeight: 24, marginBottom: 24 },
  automationAction: { fontSize: 10, fontWeight: "800", letterSpacing: 3, color: "rgba(255,255,255,0.4)" },
  bookingCard: { padding: 24 },
  bookingHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  bookingTitle: { fontSize: 18, fontWeight: "700", color: "#fff", marginBottom: 4 },
  bookingLinkText: { fontSize: 12, color: "rgba(255,255,255,0.3)" },
  copyIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center" },
  bookingActions: { flexDirection: "row", gap: 12 },
  shareLinkBtn: { flex: 1, height: 56, borderRadius: 16, backgroundColor: "#000", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  shareQrBtn: { flex: 1, height: 56, borderRadius: 16, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  shareBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  shareQrText: { fontSize: 15, fontWeight: "700", color: "#000" },
  embedCard: { flexDirection: "row", alignItems: "center", padding: 24, marginTop: 16 },
  embedIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center" },
  embedTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  embedDesc: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  securityGridCard: { flex: 1, padding: 24, alignItems: "flex-start" },
  securityTitle: { fontSize: 18, fontWeight: "700", color: "#fff", marginTop: 16, marginBottom: 4 },
  securityAction: { fontSize: 9, fontWeight: "800", letterSpacing: 2, color: "rgba(255,255,255,0.4)" },
  footer: { marginTop: 48, alignItems: "center" },
  footerText: { fontSize: 10, fontWeight: "800", letterSpacing: 4, color: "rgba(255,255,255,0.2)" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { width: "100%", borderRadius: 32, padding: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  modalTitle: { fontSize: 24, fontWeight: "700", color: "#fff", marginBottom: 24 },
  qrImage: { width: 200, height: 200, backgroundColor: "#fff", borderRadius: 16, padding: 16, alignSelf: "center", marginBottom: 24 },
  secondaryButton: { height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 12 },
  secondaryButtonText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  editInput: { height: 56, borderRadius: 16, paddingHorizontal: 16, fontSize: 16, borderWidth: 1, marginBottom: 24 },
  compactRow: { flexDirection: "row", alignItems: "center", padding: 16 },
  compactRowTitle: { fontSize: 16, fontWeight: "600", color: "#fff" },
  compactRowSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  demoTypeButton: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 8 },
  demoTypeLabel: { fontSize: 16, fontWeight: "700", color: "#fff" },
  currencyRow: { padding: 16, borderRadius: 16 },
  currencyLabel: { fontSize: 16, color: "#fff" },
});
