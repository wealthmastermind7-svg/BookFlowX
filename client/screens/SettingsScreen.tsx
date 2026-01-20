import React, { useState, useEffect, useRef } from "react";
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
  ScrollView, 
  ImageBackground,
  Animated,
  Dimensions
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
import Svg, { Circle } from "react-native-svg";

type CombinedNavigation = NativeStackNavigationProp<SettingsStackParamList & RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const silkBackground = require("../assets/stock_images/abstract_dark_fluid__e119120c.jpg");

const CircularMeter = ({ value, max, size = 80, strokeWidth = 6, label }: { value: number; max: number; size?: number; strokeWidth?: number; label: string }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(value / max, 1);
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#fff"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
        <ThemedText style={{ fontSize: 18, fontWeight: "700", color: "#fff" }}>{value}</ThemedText>
      </View>
      <ThemedText style={{ fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginTop: 8 }}>{label}</ThemedText>
    </View>
  );
};

const ParallaxIcon = ({ name, delay = 0 }: { name: any; delay?: number }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 2000, useNativeDriver: true, delay }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const translateY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });

  return (
    <Animated.View style={{ transform: [{ translateY }] }}>
      <View style={styles.parallaxIconBox}>
        <Feather name={name} size={24} color="#fff" />
      </View>
    </Animated.View>
  );
};

export default function SettingsScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { isDark, theme } = useTheme();
  const navigation = useNavigation<CombinedNavigation>();
  const { checkShareAccess, checkQrAccess, isPremium, showPaywall, offerings } = usePremium();

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
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const [bookingsCount, setBookingsCount] = useState(0);
  const [servicesCount, setServicesCount] = useState(0);
  const [customersCount, setCustomersCount] = useState(0);

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
      loadStats();
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

  const loadStats = async () => {
    try {
      const [bookings, services, customers] = await Promise.all([
        api.getBookings(),
        api.getServices(),
        api.getCustomers()
      ]);
      setBookingsCount(bookings?.length || 0);
      setServicesCount(services?.length || 0);
      setCustomersCount(customers?.length || 0);
    } catch (error) {
      console.error("Error loading stats:", error);
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

  const GlassCard = ({ children, style, onPress, highlight }: any) => (
    <Pressable 
      onPress={onPress} 
      style={({ pressed }) => [
        styles.glassCard, 
        { 
          backgroundColor: highlight ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)", 
          borderColor: highlight ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)" 
        }, 
        style, 
        pressed && onPress && { opacity: 0.85, transform: [{ scale: 0.99 }] }
      ]}
    >
      {children}
    </Pressable>
  );

  const SectionTitleBadge = ({ children, label }: any) => (
    <View style={styles.sectionTitleRow}>
      <View>
        <ThemedText style={styles.sectionTitle}>{children}</ThemedText>
        {label && <ThemedText style={{ fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.4)", letterSpacing: 1.5, marginTop: 4 }}>{label}</ThemedText>}
      </View>
    </View>
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
      <ImageBackground source={silkBackground} style={styles.overlay} resizeMode="cover">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.88)" }}>
          <ScrollView contentContainerStyle={{ paddingTop: headerHeight + 40, paddingBottom: tabBarHeight + 60, paddingHorizontal: 24 }}>
            
            <SectionTitle badge={isPremium ? "ACTIVE" : undefined}>Premium</SectionTitle>
            
            <GlassCard style={styles.premiumBanner} onPress={() => showPaywall("soft_upsell")} highlight>
              <View style={styles.premiumBannerHeader}>
                <View style={styles.premiumIconGlow}>
                  <Feather name="zap" size={28} color="#fff" />
                </View>
                <View style={{ flex: 1, marginLeft: 20 }}>
                  <ThemedText style={styles.premiumBannerTitle}>
                    {isPremium ? "Premium Active" : "Unlock Premium"}
                  </ThemedText>
                  <ThemedText style={styles.premiumBannerSubtitle}>
                    {isPremium 
                      ? "All features unlocked" 
                      : "Smart automation & unlimited tools"}
                  </ThemedText>
                </View>
                <Feather name="chevron-right" size={24} color="rgba(255,255,255,0.5)" />
              </View>
              
              <View style={styles.premiumFeatures}>
                <View style={styles.featureRow}>
                  <Feather name="check" size={16} color="rgba(255,255,255,0.6)" />
                  <ThemedText style={styles.featureText}>Smart reminders that reduce no-shows</ThemedText>
                </View>
                <View style={styles.featureRow}>
                  <Feather name="check" size={16} color="rgba(255,255,255,0.6)" />
                  <ThemedText style={styles.featureText}>Instant service setup in seconds</ThemedText>
                </View>
                <View style={styles.featureRow}>
                  <Feather name="check" size={16} color="rgba(255,255,255,0.6)" />
                  <ThemedText style={styles.featureText}>Intelligent upsell suggestions</ThemedText>
                </View>
                <View style={styles.featureRow}>
                  <Feather name="check" size={16} color="rgba(255,255,255,0.6)" />
                  <ThemedText style={styles.featureText}>Unlimited booking links & QR codes</ThemedText>
                </View>
              </View>

              {!isPremium && (
                <View style={styles.pricingRow}>
                  <View style={styles.priceOption}>
                    <ThemedText style={styles.priceAmount}>Flexible</ThemedText>
                    <ThemedText style={styles.pricePeriod}>subscriptions</ThemedText>
                  </View>
                  <View style={styles.priceDivider} />
                  <View style={styles.priceOption}>
                    <ThemedText style={styles.priceAmount}>Lifetime</ThemedText>
                    <ThemedText style={styles.pricePeriod}>access available</ThemedText>
                  </View>
                </View>
              )}
            </GlassCard>
            
            <GlassCard style={styles.restoreRow} onPress={handleRestorePurchases}>
              <Feather name="refresh-cw" size={18} color="rgba(255,255,255,0.5)" />
              <ThemedText style={styles.restoreText}>Restore Previous Purchases</ThemedText>
              {restoreLoading && <ActivityIndicator size="small" color="#fff" />}
            </GlassCard>

            <View style={{ height: 32 }} />

            <SectionTitle>Activity</SectionTitle>
            <GlassCard style={styles.metersCard}>
              <View style={styles.metersRow}>
                <CircularMeter value={bookingsCount} max={100} label="BOOKINGS" />
                <CircularMeter value={servicesCount} max={20} label="SERVICES" />
                <CircularMeter value={customersCount} max={100} label="CLIENTS" />
              </View>
            </GlassCard>

            <View style={{ height: 32 }} />

            <SectionTitleBadge label="BUSINESS DETAILS">Public Profile</SectionTitleBadge>
            <View style={styles.gridRow}>
              <GlassCard style={styles.gridCard} onPress={() => handleEditBusinessField("name")}>
                <View style={styles.gridIconCircle}><Feather name="briefcase" size={16} color="#fff" /></View>
                <ThemedText style={styles.gridLabel}>BUSINESS NAME</ThemedText>
                <ThemedText style={styles.gridValue} numberOfLines={1}>{business?.name || "My Business"}</ThemedText>
              </GlassCard>
              <GlassCard style={styles.gridCard} onPress={() => setCurrencyModalVisible(true)}>
                <View style={styles.gridIconCircle}><Feather name="dollar-sign" size={16} color="#fff" /></View>
                <ThemedText style={styles.gridLabel}>CURRENCY</ThemedText>
                <ThemedText style={styles.gridValue}>{getCurrentCurrencyShort()}</ThemedText>
              </GlassCard>
            </View>
            <GlassCard style={[styles.multiRowCard, { marginTop: 12 }]}>
              <InfoRow icon="globe" label="PUBLIC WEBSITE" value={business?.website || "Not set"} onPress={() => handleEditBusinessField("website")} />
              <View style={styles.rowDivider} />
              <InfoRow icon="phone" label="PUBLIC SUPPORT LINE" value={business?.phone || "Not set"} onPress={() => handleEditBusinessField("phone")} />
            </GlassCard>

            <View style={{ height: 32 }} />

            <SectionTitleBadge label="DANGER ZONE">Security</SectionTitleBadge>
            <View style={styles.gridRow}>
              <GlassCard style={styles.securityGridCard} onPress={() => setDemoTypeModalVisible(true)}>
                <View style={styles.securityIconCircle}><Feather name="database" size={16} color="#fff" /></View>
                <ThemedText style={styles.securityLabel}>DEMO DATA</ThemedText>
                <ThemedText style={styles.securityAction}>LOAD SAMPLES</ThemedText>
              </GlassCard>
              <GlassCard style={styles.securityGridCard} onPress={handleClearAllData}>
                <View style={[styles.securityIconCircle, { backgroundColor: "rgba(239, 68, 68, 0.2)" }]}><Feather name="trash-2" size={16} color="#EF4444" /></View>
                <ThemedText style={styles.securityLabel}>DESTRUCTIVE</ThemedText>
                <ThemedText style={styles.securityAction}>CLEAR ALL</ThemedText>
              </GlassCard>
            </View>

            <View style={{ height: 32 }} />

            <SectionTitle>Legal</SectionTitle>
            <GlassCard>
              <CompactRow icon="shield" title="Privacy Protocol" onPress={() => Linking.openURL("https://confirmbooking.online/privacy-policy")} />
              <View style={styles.rowDivider} />
              <CompactRow icon="file-text" title="Terms of Use" onPress={() => Linking.openURL("https://confirmbooking.online/terms")} />
            </GlassCard>

            <View style={styles.footer}>
              <ThemedText style={styles.footerText}>DESIGNED FOR EXCELLENCE</ThemedText>
              <ThemedText style={styles.footerVersion}>V4.2.0</ThemedText>
            </View>
          </ScrollView>
        </View>
      </ImageBackground>

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
  sectionTitle: { fontSize: 56, fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontWeight: "800", color: "#fff", letterSpacing: -2.5 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 1, color: "#fff" },
  glassCard: { borderRadius: 32, borderWidth: 1, overflow: "hidden" },
  
  premiumBanner: { padding: 28, marginBottom: 12 },
  premiumBannerHeader: { flexDirection: "row", alignItems: "center" },
  premiumIconGlow: { 
    width: 64, 
    height: 64, 
    borderRadius: 20, 
    backgroundColor: "rgba(255,255,255,0.1)", 
    alignItems: "center", 
    justifyContent: "center",
  },
  premiumBannerTitle: { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 4 },
  premiumBannerSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.5)" },
  premiumFeatures: { marginTop: 24, marginBottom: 20 },
  featureRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 12 },
  featureText: { fontSize: 15, color: "rgba(255,255,255,0.7)" },
  pricingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingTop: 20, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" },
  priceOption: { alignItems: "center" },
  priceAmount: { fontSize: 22, fontWeight: "800", color: "#fff" },
  pricePeriod: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  priceDivider: { width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.1)" },
  
  restoreRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 18, gap: 10 },
  restoreText: { fontSize: 14, color: "rgba(255,255,255,0.5)" },

  metersCard: { padding: 32 },
  metersRow: { flexDirection: "row", justifyContent: "space-around", alignItems: "center" },

  gridRow: { flexDirection: "row", gap: 12 },
  gridCard: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center" },
  gridIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  gridLabel: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.4)", letterSpacing: 2.5, marginBottom: 4 },
  gridValue: { fontSize: 18, fontWeight: "700", color: "#fff" },
  multiRowCard: { paddingVertical: 8 },
  infoRow: { flexDirection: "row", alignItems: "center", padding: 24 },
  rowDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginHorizontal: 24 },
  infoLabel: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.4)", letterSpacing: 2.5 },
  infoValue: { fontSize: 15, fontWeight: "600", color: "#fff", marginTop: 2 },

  parallaxIconBox: { 
    width: 56, 
    height: 56, 
    borderRadius: 16, 
    backgroundColor: "rgba(255,255,255,0.08)", 
    alignItems: "center", 
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  automationCard: { padding: 32 },
  automationHeader: { flexDirection: "row", gap: 16, marginBottom: 28 },
  automationTitle: { fontSize: 28, fontWeight: "700", color: "#fff", marginBottom: 12 },
  automationDesc: { fontSize: 16, color: "rgba(255,255,255,0.4)", lineHeight: 24, marginBottom: 24 },
  automationActionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  automationAction: { fontSize: 11, fontWeight: "800", letterSpacing: 3, color: "rgba(255,255,255,0.4)" },

  bookingCard: { padding: 24 },
  bookingHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  bookingTitle: { fontSize: 18, fontWeight: "700", color: "#fff", marginBottom: 4 },
  bookingLinkText: { fontSize: 12, color: "rgba(255,255,255,0.3)" },
  qrPlacementHint: { fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 20, fontStyle: "italic" },
  copyIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center" },
  bookingActions: { flexDirection: "row", gap: 12 },
  shareLinkBtn: { flex: 1, height: 56, borderRadius: 16, backgroundColor: "#000", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  shareQrBtn: { flex: 1, height: 56, borderRadius: 16, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  shareBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  shareQrText: { fontSize: 15, fontWeight: "700", color: "#000" },

  securityGridCard: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center" },
  securityLabel: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.4)", letterSpacing: 2.5, marginBottom: 4 },
  securityAction: { fontSize: 11, fontWeight: "800", letterSpacing: 3, color: "rgba(255,255,255,0.4)" },
  securityIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  
  footer: { marginTop: 56, alignItems: "center" },
  footerText: { fontSize: 10, fontWeight: "800", letterSpacing: 4, color: "rgba(255,255,255,0.15)" },
  footerVersion: { fontSize: 10, fontWeight: "600", color: "rgba(255,255,255,0.1)", marginTop: 4 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 20 },
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
