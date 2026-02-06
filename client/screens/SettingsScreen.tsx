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
import ViewShot from "react-native-view-shot";
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
import { getBookingDomain, getApiUrl } from "@/lib/query-client";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { usePremium } from "@/contexts/PremiumContext";
import { restorePurchases } from "@/lib/revenuecat";
import { SettingsStackParamList } from "@/navigation/SettingsStackNavigator";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { CURRENCY_OPTIONS } from "@/lib/currency";
import Svg, { Circle } from "react-native-svg";
import { useVoiceSubscription, getTierColor, getTierName, formatMinutes } from "@/hooks/useVoiceSubscription";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";

import { VoiceAgentPaywall } from "@/components/VoiceAgentPaywall";

type EmbedType = "inline" | "popup-button" | "popup-text";
type CombinedNavigation = NativeStackNavigationProp<SettingsStackParamList & RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const silkBackground = require("../assets/stock_images/abstract_dark_fluid__e119120c.jpg");

const CircularMeter = ({ value, max, size = 80, strokeWidth = 6, label, warningColor }: { value: number; max: number; size?: number; strokeWidth?: number; label: string; warningColor?: string }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(value / max, 1);
  const strokeDashoffset = circumference - progress * circumference;
  const strokeColor = warningColor || (progress >= 1 ? "#EF4444" : progress > 0.95 ? "#EF4444" : progress > 0.8 ? "#F59E0B" : "#fff");
  const labelColor = warningColor || "rgba(255,255,255,0.4)";

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
          stroke={strokeColor}
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
      <ThemedText style={{ fontSize: 10, fontWeight: "700", color: labelColor, letterSpacing: 1, marginTop: 8 }}>{label}</ThemedText>
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
  const { checkShareAccess, checkQrAccess, checkEmbedAccess, isPremium, showPaywall, offerings, isTrialActive, trialDaysLeft } = usePremium();

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoDataLoading, setDemoDataLoading] = useState(false);
  const [clearDataLoading, setClearDataLoading] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [bookingUrl, setBookingUrl] = useState<string>("");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingField, setEditingField] = useState<"name" | "website" | "phone" | "slug" | "timezone" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [demoTypeModalVisible, setDemoTypeModalVisible] = useState(false);
  const [embedModalVisible, setEmbedModalVisible] = useState(false);
  const [embedCode, setEmbedCode] = useState<EmbedCode | null>(null);
  const [embedLoading, setEmbedLoading] = useState(false);
  const [selectedEmbedType, setSelectedEmbedType] = useState<EmbedType>("inline");
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [voicePaywallVisible, setVoicePaywallVisible] = useState(false);
  const [voiceCheckoutLoading, setVoiceCheckoutLoading] = useState(false);

  const [bookingsCount, setBookingsCount] = useState(0);
  const [servicesCount, setServicesCount] = useState(0);
  const [customersCount, setCustomersCount] = useState(0);
  const [ownerToken, setOwnerToken] = useState<string | null>(null);

  const { data: voiceSubResult } = useVoiceSubscription(
    business?.id || "",
    ownerToken || ""
  );
  const voiceSub = voiceSubResult;
  const isVoiceExhausted = voiceSub?.usage.available === false;
  const percentUsed = voiceSub?.usage.percentUsed || 0;

  const { 
    isConnected: isCalendarConnected, 
    connectedEmail: calendarEmail, 
    isLoading: calendarLoading,
    connectCalendar,
    disconnect: disconnectCalendar
  } = useGoogleCalendar(business?.id || "", ownerToken || "");

  const [calendarConnecting, setCalendarConnecting] = useState(false);

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
      const token = await api.getOwnerToken();
      setOwnerToken(token);
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
    Alert.alert("Reset Data", "This will delete all services, bookings, and customers. This action cannot be undone.", [
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

  const handleOpenAgentTraining = () => {
    if (!business) return;
    navigation.navigate("AgentTraining", {
      businessId: business.id,
      businessName: business.name,
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

  const qrViewShotRef = useRef<ViewShot>(null);
  
  const handleDownloadQRCode = async () => {
    if (!business || !checkQrAccess()) return;
    try {
      if (Platform.OS === "web") {
        const brandedQrUrl = `${getApiUrl()}/api/businesses/${business.id}/qrcode?format=image`;
        const link = document.createElement("a");
        link.href = brandedQrUrl;
        link.download = `${business.slug}-booking-qr.png`;
        link.click();
        return;
      }
      
      // Capture the QR preview with branding using ViewShot
      if (qrViewShotRef.current?.capture) {
        const uri = await qrViewShotRef.current.capture();
        await Share.share({ url: uri });
      } else {
        Alert.alert("Error", "Unable to capture QR code");
      }
    } catch (error) {
      console.error("Error sharing QR:", error);
      Alert.alert("Error", "Failed to share QR code");
    }
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

  const handleEditBusinessField = (field: "name" | "website" | "phone" | "slug" | "timezone") => {
    setEditingField(field);
    setEditValue(business?.[field as keyof Business] ? String(business[field as keyof Business]) : "");
    setEditModalVisible(true);
  };

  const TIMEZONES = [
    { label: "Auckland (NZST)", value: "Pacific/Auckland" },
    { label: "Sydney (AEST)", value: "Australia/Sydney" },
    { label: "Adelaide (ACST)", value: "Australia/Adelaide" },
    { label: "Perth (AWST)", value: "Australia/Perth" },
    { label: "Tokyo (JST)", value: "Asia/Tokyo" },
    { label: "Singapore (SGT)", value: "Asia/Singapore" },
    { label: "Mumbai (IST)", value: "Asia/Kolkata" },
    { label: "Dubai (GST)", value: "Asia/Dubai" },
    { label: "Riyadh (AST)", value: "Asia/Riyadh" },
    { label: "Istanbul (TRT)", value: "Europe/Istanbul" },
    { label: "Athens (EET)", value: "Europe/Athens" },
    { label: "Paris (CET)", value: "Europe/Paris" },
    { label: "London (GMT)", value: "Europe/London" },
    { label: "New York (EST)", value: "America/New_York" },
    { label: "Chicago (CST)", value: "America/Chicago" },
    { label: "Denver (MST)", value: "America/Denver" },
    { label: "Los Angeles (PST)", value: "America/Los_Angeles" },
    { label: "Anchorage (AKST)", value: "America/Anchorage" },
    { label: "Honolulu (HST)", value: "Pacific/Honolulu" },
    { label: "São Paulo (BRT)", value: "America/Sao_Paulo" },
    { label: "UTC", value: "UTC" },
  ];

  const handleVoiceSubscribe = async (tierId: string) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    setVoicePaywallVisible(false);
  };

  const handleSaveBusinessField = async () => {
    if (!business || !editingField) return;
    setEditLoading(true);
    try {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
      let updates: Partial<typeof business> = { [editingField]: editValue };
      const updated = await api.updateBusiness(updates);
      setBusiness(updated);
      setEditModalVisible(false);
    } catch (error: any) {
      let errorMessage = error.message || "Please check your connection and try again.";
      if (errorMessage.includes("duplicate key value violates unique constraint")) {
        errorMessage = "That name is too common. Try adding a unique word or changing it slightly.";
      }
      Alert.alert("Update Failed", errorMessage);
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
      <View style={styles.backgroundOverlay} />
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingTop: headerHeight + 40, paddingBottom: tabBarHeight + 60, paddingHorizontal: 24 }}>
          {isTrialActive && !isPremium && (
            <GlassCard style={{ marginBottom: 24, paddingHorizontal: 20, paddingVertical: 20, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.05)' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'nowrap', gap: 16 }}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontSize: 18, fontWeight: '700', marginBottom: 6, letterSpacing: -0.5, color: '#fff' }}>Free Trial Active</ThemedText>
                  <ThemedText style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 20, fontWeight: '400' }}>
                    {trialDaysLeft} days left to use booking links & QR codes for free.
                  </ThemedText>
                </View>
                <View style={{ backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 }}>
                  <ThemedText style={{ fontSize: 12, fontWeight: '900', color: '#000', letterSpacing: 1 }}>TRIAL</ThemedText>
                </View>
              </View>
            </GlassCard>
          )}

          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>
              {isPremium ? "Booking Premium" : "Booking Plan"}
            </ThemedText>
            {isPremium ? (
              <View style={[styles.badge, { borderColor: "rgba(255,255,255,0.2)" }]}><ThemedText style={styles.badgeText}>PREMIUM</ThemedText></View>
            ) : isTrialActive ? (
              <View style={[styles.badge, { borderColor: "rgba(255,255,255,0.2)" }]}><ThemedText style={styles.badgeText}>TRIAL</ThemedText></View>
            ) : (
              <View style={[styles.badge, { borderColor: "rgba(255,255,255,0.2)" }]}><ThemedText style={styles.badgeText}>BASIC</ThemedText></View>
            )}
          </View>
          
          <GlassCard style={styles.premiumBanner} onPress={() => showPaywall("soft_upsell")} highlight>
            <View style={styles.premiumBannerHeader}>
              <View style={styles.premiumIconGlow}>
                <Feather name="zap" size={28} color="#fff" />
              </View>
              <View style={{ flex: 1, marginLeft: 20 }}>
                <ThemedText style={styles.premiumBannerTitle}>
                  {isPremium ? "Booking Premium" : "Unlock Booking Premium"}
                </ThemedText>
                <ThemedText style={styles.premiumBannerSubtitle}>
                  {isPremium ? "Advanced automation active" : "Smart automation & unlimited tools"}
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
                <ThemedText style={styles.featureText}>Smart service setup in seconds</ThemedText>
              </View>
              <View style={styles.featureRow}>
                <Feather name="check" size={16} color="rgba(255,255,255,0.6)" />
                <ThemedText style={styles.featureText}>Intelligent upsell suggestions</ThemedText>
              </View>
              <View style={styles.featureRow}>
                <Feather name="check" size={16} color="rgba(255,255,255,0.6)" />
                <ThemedText style={styles.featureText}>Unlimited booking links & QR codes</ThemedText>
              </View>
              <View style={{ height: 12 }} />
              <ThemedText style={[styles.featureText, { fontSize: 12, fontStyle: 'italic', opacity: 0.7 }]}>
                Voice Booking sold separately as optional add-on.
              </ThemedText>
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
            
            {!isPremium && isTrialActive && (
              <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
                <ThemedText style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                  Includes 7-day free trial for booking links and QR codes.
                </ThemedText>
              </View>
            )}
          </GlassCard>
          
          <GlassCard style={styles.restoreRow} onPress={handleRestorePurchases}>
            <Feather name="refresh-cw" size={18} color="rgba(255,255,255,0.5)" />
            <ThemedText style={styles.restoreText}>Restore Previous Purchases</ThemedText>
            {restoreLoading && <ActivityIndicator size="small" color="#fff" />}
          </GlassCard>

          <View style={{ height: 32 }} />

          <GlassCard style={styles.voiceCard} onPress={() => setVoicePaywallVisible(true)} highlight>
            <View style={styles.voiceHeader}>
              <View style={styles.voiceIconBox}>
                <Feather name="mic" size={24} color="#fff" />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <ThemedText style={[styles.voiceTitle, { fontSize: 16 }]} numberOfLines={1} adjustsFontSizeToFit>Informational Assistant</ThemedText>
                <ThemedText style={styles.voiceSubtitle}>Answers questions about your services</ThemedText>
              </View>
              <Button 
                onPress={handleOpenAgentTraining}
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)', height: 36, paddingHorizontal: 12 }}
              >
                <ThemedText style={{ fontSize: 13, fontWeight: "600", color: "#fff" }}>Train Agent</ThemedText>
              </Button>
            </View>
            <View style={styles.voiceIconGroup}>
              <View style={styles.voiceIconBox}><Feather name="mic" size={20} color="#fff" /></View>
              <View style={styles.voiceIconBox}><Feather name="message-square" size={20} color="#fff" /></View>
              <View style={styles.voiceIconBox}><Feather name="volume-2" size={20} color="#fff" /></View>
            </View>
            <View style={{ marginTop: 24 }}>
              <ThemedText style={styles.voiceCardTitle}>Voice Assistant</ThemedText>
              <ThemedText style={styles.voiceCardDesc}>Let customers ask questions about your services and get directed to book via Text Booking.</ThemedText>
            </View>
            <View style={styles.previewContainer}>
              <Pressable style={styles.previewLink} onPress={() => navigation.navigate("VoiceBooking", { businessSlug: business?.slug || "" })}>
                <Feather name="play-circle" size={18} color="rgba(255,255,255,0.4)" />
                <ThemedText style={styles.previewText}>QUICK PREVIEW</ThemedText>
              </Pressable>
              <ThemedText style={[styles.featureText, { fontSize: 11, marginTop: 12, fontStyle: 'italic', opacity: 0.6 }]}>
                Booking links and automation plans are separate.
              </ThemedText>
            </View>
            <View style={styles.usageContainer}>
              <View style={styles.usageHeader}>
                <ThemedText style={styles.usageLabel}>
                  {voiceSub?.subscription.tier === 'free' ? 'Trial Allowance' : 'Monthly Allowance'}
                </ThemedText>
                <ThemedText style={[styles.usageValue, isVoiceExhausted && { color: '#EF4444' }, !isVoiceExhausted && percentUsed > 80 && { color: '#F59E0B' }]}>
                  {voiceSub ? `${voiceSub.usage.remaining} / ${voiceSub.subscription.minutesLimit} min` : '5 / 5 min'}
                </ThemedText>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { 
                  width: `${voiceSub ? Math.min(voiceSub.usage.percentUsed, 100) : 0}%`, 
                  backgroundColor: isVoiceExhausted ? '#EF4444' : percentUsed > 80 ? '#F59E0B' : '#fff' 
                }]} />
              </View>
              {isVoiceExhausted ? (
                <ThemedText style={{ fontSize: 11, color: '#EF4444', marginTop: 8, fontWeight: '600' }}>
                  Allowance reached — upgrade to continue assisting customers
                </ThemedText>
              ) : voiceSub?.subscription.tier === 'free' ? (
                <ThemedText style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
                  {voiceSub.usage.remaining} minutes remaining — one-time trial
                </ThemedText>
              ) : percentUsed > 80 ? (
                <ThemedText style={{ fontSize: 11, color: '#F59E0B', marginTop: 8 }}>
                  Running low — consider upgrading for more minutes
                </ThemedText>
              ) : null}
            </View>
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
          <SectionTitleBadge label="REVENUE & SHARING">Booking Links</SectionTitleBadge>
          <GlassCard style={styles.bookingCard}>
            <View style={styles.bookingHeader}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.bookingTitle}>Share Booking Page</ThemedText>
                <ThemedText style={styles.bookingLinkText} numberOfLines={1}>{business?.bookingUrl || `https://${getBookingDomain()}/book/${business?.slug}`}</ThemedText>
              </View>
              <Pressable onPress={handleCopyBookingLink} style={styles.copyIconBox}><Feather name="copy" size={18} color="rgba(255,255,255,0.6)" /></Pressable>
            </View>
            <ThemedText style={styles.qrPlacementHint}>Place QR codes at checkout or in windows</ThemedText>
            <View style={styles.bookingActions}>
              <Pressable onPress={handleOpenSharePreview} style={styles.shareLinkBtn}><Feather name="share-2" size={18} color="#fff" /><ThemedText style={styles.shareBtnText}>Share Link</ThemedText></Pressable>
              <Pressable onPress={handleShowQRCode} style={styles.shareQrBtn}><Feather name="maximize" size={18} color="#000" /><ThemedText style={styles.shareQrText}>Show QR</ThemedText></Pressable>
            </View>
          </GlassCard>

          <View style={{ height: 32 }} />
          <SectionTitleBadge label="PLAN OVERVIEW">Your Plans</SectionTitleBadge>
          <View style={{ gap: 12 }}>
            <GlassCard style={[styles.gridCard, { width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16 }]} onPress={() => showPaywall("soft_upsell")}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.gridIconCircle, { width: 32, height: 32, borderRadius: 16 }]}><Feather name="link" size={14} color="#fff" /></View>
                <ThemedText style={[styles.gridLabel, { marginLeft: 12, marginTop: 0 }]}>Booking Links</ThemedText>
              </View>
              <View style={{ backgroundColor: isPremium ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 }}>
                <ThemedText style={{ fontSize: 10, fontWeight: '800', color: isPremium ? '#22C55E' : 'rgba(255,255,255,0.4)' }}>{isPremium ? "ACTIVE" : "BASIC"}</ThemedText>
              </View>
            </GlassCard>
            <GlassCard style={[styles.gridCard, { width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.gridIconCircle, { width: 32, height: 32, borderRadius: 16 }]}><Feather name="mic" size={14} color="#fff" /></View>
                <ThemedText style={[styles.gridLabel, { marginLeft: 12, marginTop: 0 }]}>Voice Agent</ThemedText>
              </View>
              <View style={{ backgroundColor: isVoiceExhausted ? 'rgba(239, 68, 68, 0.2)' : voiceSub?.subscription.tier !== 'free' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 }}>
                <ThemedText style={{ fontSize: 10, fontWeight: '800', color: isVoiceExhausted ? '#EF4444' : voiceSub?.subscription.tier !== 'free' ? '#22C55E' : 'rgba(255,255,255,0.4)' }}>{isVoiceExhausted ? "EXHAUSTED" : voiceSub?.subscription.tier !== 'free' ? "ACTIVE" : "BASIC"}</ThemedText>
              </View>
            </GlassCard>
          </View>

          <View style={{ height: 32 }} />
          {/* Google Calendar hidden per user request */}
          {/* 
          <SectionTitleBadge label="CALENDAR SYNC">Integrations</SectionTitleBadge>
          <GlassCard 
            style={[styles.gridCard, { width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16 }]}
            onPress={async () => {
              if (isCalendarConnected) {
                Alert.alert(
                  "Disconnect Calendar",
                  `Are you sure you want to disconnect ${calendarEmail || "your Google Calendar"}?`,
                  [
                    { text: "Cancel", style: "cancel" },
                    { 
                      text: "Disconnect", 
                      style: "destructive", 
                      onPress: () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        disconnectCalendar.mutate();
                      }
                    }
                  ]
                );
              } else {
                setCalendarConnecting(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const result = await connectCalendar();
                setCalendarConnecting(false);
                if (!result.success) {
                  Alert.alert("Connection Failed", result.error || "Could not connect Google Calendar. Please try again.");
                }
              }
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={[styles.gridIconCircle, { width: 32, height: 32, borderRadius: 16, backgroundColor: isCalendarConnected ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255,255,255,0.1)' }]}>
                <Feather name="calendar" size={14} color={isCalendarConnected ? "#22C55E" : "#fff"} />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <ThemedText style={[styles.gridLabel, { marginTop: 0 }]}>Google Calendar</ThemedText>
                {isCalendarConnected && calendarEmail && (
                  <ThemedText style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }} numberOfLines={1}>{calendarEmail}</ThemedText>
                )}
              </View>
            </View>
            {calendarLoading || calendarConnecting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <View style={{ backgroundColor: isCalendarConnected ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 }}>
                <ThemedText style={{ fontSize: 10, fontWeight: '800', color: isCalendarConnected ? '#22C55E' : '#3B82F6' }}>
                  {isCalendarConnected ? "CONNECTED" : "CONNECT"}
                </ThemedText>
              </View>
            )}
          </GlassCard>
          <ThemedText style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 8, paddingHorizontal: 4 }}>
            Sync bookings to your calendar and prevent double-booking
          </ThemedText>
          */}

          <View style={{ height: 32 }} />
          <SectionTitleBadge label="BUSINESS IDENTITY">Profile Settings</SectionTitleBadge>
          <GlassCard style={{ marginBottom: 12 }}>
            <InfoRow 
              icon="globe" 
              label="TIMEZONE" 
              value={business?.timezone || "Not set"} 
              onPress={() => handleEditBusinessField("timezone")} 
            />
          </GlassCard>
          <View style={styles.gridRow}>
            <GlassCard style={styles.gridCard} onPress={() => handleEditBusinessField("name")}><View style={styles.gridIconCircle}><Feather name="briefcase" size={16} color="#fff" /></View><ThemedText style={styles.gridLabel}>BUSINESS NAME</ThemedText><ThemedText style={styles.gridValue} numberOfLines={1}>{business?.name || "My Business"}</ThemedText></GlassCard>
            <GlassCard style={styles.gridCard} onPress={() => setCurrencyModalVisible(true)}><View style={styles.gridIconCircle}><Feather name="dollar-sign" size={16} color="#fff" /></View><ThemedText style={styles.gridLabel}>CURRENCY</ThemedText><ThemedText style={styles.gridValue}>{getCurrentCurrencyShort()}</ThemedText></GlassCard>
          </View>
          <GlassCard style={[styles.multiRowCard, { marginTop: 12 }]}><InfoRow icon="globe" label="PUBLIC WEBSITE" value={business?.website || "Not set"} onPress={() => handleEditBusinessField("website")} /><View style={styles.rowDivider} /><InfoRow icon="phone" label="PUBLIC SUPPORT LINE" value={business?.phone || "Not set"} onPress={() => handleEditBusinessField("phone")} /></GlassCard>

          <View style={{ height: 32 }} />
          <SectionTitle>Automation</SectionTitle>
          <GlassCard style={styles.automationCard} onPress={() => navigation.navigate("Workflows")}>
            <View style={styles.automationHeader}><ParallaxIcon name="cpu" delay={0} /><ParallaxIcon name="zap" delay={300} /><ParallaxIcon name="bell" delay={600} /></View>
            <ThemedText style={styles.automationTitle}>Workflows</ThemedText>
            <ThemedText style={styles.automationDesc}>Intelligent reminders & confirmation sequences that work quietly in the background.</ThemedText>
            <View style={styles.automationActionRow}><ThemedText style={styles.automationAction}>CONFIGURE</ThemedText><Feather name="arrow-right" size={14} color="rgba(255,255,255,0.4)" /></View>
          </GlassCard>

          <View style={{ height: 32 }} />
          <SectionTitle>Data</SectionTitle>
          <View style={styles.gridRow}>
            <GlassCard style={styles.securityGridCard} onPress={() => setDemoTypeModalVisible(true)}><Feather name="download-cloud" size={22} color="#fff" /><ThemedText style={styles.securityTitle}>Demo Data</ThemedText><ThemedText style={styles.securityAction}>LOAD SAMPLES</ThemedText></GlassCard>
            <GlassCard style={styles.securityGridCard} onPress={handleClearAllData}><Feather name="trash-2" size={22} color="#EF4444" style={{ opacity: 0.6 }} /><ThemedText style={[styles.securityTitle, { color: "#EF4444" }]}>Reset Data</ThemedText><ThemedText style={styles.securityAction}>CLEAR ALL DATA</ThemedText></GlassCard>
          </View>

          <View style={{ height: 32 }} />
          <SectionTitle>Legal</SectionTitle>
          <GlassCard><CompactRow icon="shield" title="Privacy Protocol" onPress={() => Linking.openURL("https://confirmbooking.online/privacy-policy")} /><View style={styles.rowDivider} /><CompactRow icon="file-text" title="Terms of Use" onPress={() => Linking.openURL("https://confirmbooking.online/terms")} /></GlassCard>

          <View style={styles.footer}><ThemedText style={styles.footerText}>DESIGNED FOR EXCELLENCE</ThemedText><ThemedText style={styles.footerVersion}>V4.2.0</ThemedText></View>
        </ScrollView>
      </View>

      <Modal visible={voicePaywallVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setVoicePaywallVisible(false)}>
        <VoiceAgentPaywall businessId={business?.id || ""} onClose={() => { setVoicePaywallVisible(false); if ((voiceSub?.subscription.minutesUsed || 0) < (voiceSub?.subscription.minutesLimit || 5)) navigation.navigate("VoiceBooking", { businessSlug: business?.slug || "" }); }} onSubscribe={handleVoiceSubscribe} isLoading={voiceCheckoutLoading} />
      </Modal>

      <Modal visible={qrModalVisible} transparent animationType="fade" onRequestClose={() => setQrModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: "#111" }]}>
            <ThemedText style={styles.modalTitle}>Booking QR Code</ThemedText>
            {qrCode && (
              <Pressable 
                onPress={() => bookingUrl && Linking.openURL(bookingUrl)} 
                style={({ pressed }) => [styles.qrPressable, pressed && { opacity: 0.8 }]}
              >
                <ViewShot ref={qrViewShotRef} options={{ format: "png", quality: 1, result: "tmpfile" }}>
                  <View style={styles.qrImageContainer}>
                    <Image source={{ uri: qrCode }} style={styles.qrImage} contentFit="contain" />
                    <View style={styles.qrCenterOverlay}>
                      <ThemedText style={styles.qrCenterText}>
                        {business?.name?.toUpperCase() || "BOOK"}
                      </ThemedText>
                    </View>
                  </View>
                </ViewShot>
                <View style={styles.qrHintContainer}>
                  <Feather name="external-link" size={14} color="rgba(255,255,255,0.4)" />
                  <ThemedText style={styles.qrHint}>Tap to open link</ThemedText>
                </View>
              </Pressable>
            )}
            <Button onPress={handleDownloadQRCode}>Share QR Code Image</Button>
            <Pressable onPress={() => setQrModalVisible(false)} style={styles.secondaryButton}>
              <ThemedText style={styles.secondaryButtonText}>Close</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={editModalVisible} transparent animationType="fade" onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: "#111" }]}>
            <ThemedText style={styles.modalTitle}>
              {editingField === "timezone" ? "Select Timezone" : `Edit ${editingField}`}
            </ThemedText>
            
            {editingField === "timezone" ? (
              <ScrollView style={{ maxHeight: 400, width: '100%', marginBottom: 20 }} showsVerticalScrollIndicator={false}>
                <View style={{ gap: 8 }}>
                  {TIMEZONES.map((tz) => (
                    <Pressable
                      key={tz.value}
                      style={[
                        styles.timezoneOption,
                        editValue === tz.value && { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.3)' }
                      ]}
                      onPress={() => setEditValue(tz.value)}
                    >
                      <ThemedText style={[styles.timezoneOptionText, editValue === tz.value && { color: '#fff' }]}>
                        {tz.label}
                      </ThemedText>
                      {editValue === tz.value && <Feather name="check" size={16} color="#fff" />}
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <TextInput 
                style={[styles.editInput, { color: "#fff", borderColor: "rgba(255,255,255,0.1)" }]} 
                value={editValue} 
                onChangeText={setEditValue} 
                placeholder={`Enter ${editingField}`} 
                placeholderTextColor="#666" 
              />
            )}
            
            <Button onPress={handleSaveBusinessField} disabled={editLoading}>
              {editLoading ? "Saving..." : "Save"}
            </Button>
            <Pressable onPress={() => setEditModalVisible(false)} style={styles.secondaryButton}>
              <ThemedText style={styles.secondaryButtonText}>Cancel</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={demoTypeModalVisible} transparent animationType="slide" onRequestClose={() => setDemoTypeModalVisible(false)}>
        <View style={styles.modalOverlay}><View style={[styles.modalContent, { backgroundColor: "#111" }]}><ThemedText style={styles.modalTitle}>Choose Business Type</ThemedText><ScrollView style={{ maxHeight: 300 }}>{DEMO_TYPES.map(t => (<Pressable key={t.id} onPress={() => handleInitializeDemoData(t.id)} style={styles.demoTypeButton}><ThemedText style={styles.demoTypeLabel}>{t.label}</ThemedText></Pressable>))}</ScrollView><Pressable onPress={() => setDemoTypeModalVisible(false)} style={styles.secondaryButton}><ThemedText style={styles.secondaryButtonText}>Cancel</ThemedText></Pressable></View></View>
      </Modal>

      <Modal visible={currencyModalVisible} transparent animationType="slide" onRequestClose={() => setCurrencyModalVisible(false)}>
        <View style={styles.modalOverlay}><View style={[styles.modalContent, { backgroundColor: "#111" }]}><ThemedText style={styles.modalTitle}>Select Currency</ThemedText><ScrollView style={{ maxHeight: 300 }}>{CURRENCY_OPTIONS.map(c => (<Pressable key={c.id} onPress={() => handleSelectCurrency(c.id)} style={styles.currencyRow}><ThemedText style={styles.currencyLabel}>{c.label} ({c.symbol})</ThemedText></Pressable>))}</ScrollView></View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  backgroundWrapper: { ...StyleSheet.absoluteFillObject },
  backgroundImage: { flex: 1 },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, marginTop: 12, flexWrap: 'wrap', gap: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  sectionTitle: { fontSize: 56, fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontWeight: "800", color: "#fff", letterSpacing: -2.5 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 1, color: "#fff" },
  glassCard: { borderRadius: 32, borderWidth: 1, overflow: "hidden" },
  premiumBanner: { padding: 28, marginBottom: 12 },
  premiumBannerHeader: { flexDirection: "row", alignItems: "center" },
  premiumIconGlow: { width: 64, height: 64, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
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
  parallaxIconBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
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
  voiceCard: { padding: 32, marginTop: 12, borderRadius: 32 },
  voiceIconGroup: { flexDirection: "row", gap: 12 },
  voiceIconBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  voiceCardTitle: { fontSize: 42, fontWeight: "500", color: "#fff", letterSpacing: -1, marginBottom: 16 },
  voiceCardDesc: { fontSize: 18, color: "rgba(255,255,255,0.4)", lineHeight: 28, fontWeight: "400" },
  previewContainer: { marginTop: 32 },
  previewLink: { flexDirection: "row", alignItems: "center", gap: 12 },
  previewText: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.4)", letterSpacing: 3 },
  usageContainer: { marginTop: 32, paddingTop: 24, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)" },
  usageHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  usageLabel: { fontSize: 12, color: "rgba(255,255,255,0.4)" },
  usageValue: { fontSize: 12, color: "#fff", fontWeight: "600" },
  progressBarBg: { height: 6, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" },
  progressBarFill: { height: "100%", backgroundColor: "#fff", borderRadius: 3 },
  securityGridCard: { flex: 1, padding: 24, alignItems: "flex-start" },
  securityTitle: { fontSize: 18, fontWeight: "700", color: "#fff", marginTop: 16, marginBottom: 4 },
  securityAction: { fontSize: 9, fontWeight: "800", letterSpacing: 2, color: "rgba(255,255,255,0.4)" },
  voiceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  voiceTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  voiceSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
    marginTop: 2,
  },
  footer: { marginTop: 56, alignItems: "center" },
  footerText: { fontSize: 10, fontWeight: "800", letterSpacing: 4, color: "rgba(255,255,255,0.15)" },
  footerVersion: { fontSize: 10, fontWeight: "600", color: "rgba(255,255,255,0.1)", marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { width: "100%", borderRadius: 32, padding: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  modalTitle: { fontSize: 24, fontWeight: "700", color: "#fff", marginBottom: 24 },
  qrImage: { width: 200, height: 200, backgroundColor: "#fff", borderRadius: 16, padding: 16, alignSelf: "center" },
  qrPressable: {
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  qrImageContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#fff',
    borderRadius: 24,
  },
  qrCenterOverlay: {
    position: 'absolute',
    backgroundColor: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#000',
    maxWidth: 80,
  },
  qrCenterText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000',
    textAlign: 'center',
  },
  qrHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  qrHint: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  secondaryButton: { height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 12 },
  secondaryButtonText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
    fontWeight: "600",
  },
  timezoneOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  timezoneOptionText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
  },
  editInput: {
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 24,
    color: "#fff",
    borderColor: "rgba(255,255,255,0.1)",
  },
  compactRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  compactRowTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  compactRowSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    marginTop: 2,
  },
  demoTypeButton: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 8,
  },
  demoTypeLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  currencyRow: {
    padding: 16,
    borderRadius: 16,
  },
  currencyLabel: {
    fontSize: 16,
    color: "#fff",
  },
});
