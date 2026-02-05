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

  const { data: voiceSubscription } = useVoiceSubscription(
    business?.id || "",
    ownerToken || ""
  );

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
    { label: "London (GMT)", value: "Europe/London" },
    { label: "New York (EST)", value: "America/New_York" },
    { label: "Los Angeles (PST)", value: "America/Los_Angeles" },
    { label: "Tokyo (JST)", value: "Asia/Tokyo" },
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
      <View style={styles.backgroundWrapper}>
        <ImageBackground source={silkBackground} style={styles.backgroundImage} resizeMode="cover">
          <View style={styles.backgroundOverlay} />
        </ImageBackground>
      </View>
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
          </GlassCard>

          <View style={{ height: 32 }} />
          <SectionTitleBadge label="VOICE AGENT">AI Assistant</SectionTitleBadge>
          <GlassCard style={styles.voiceAgentCard}>
            <View style={styles.voiceAgentHeader}>
              <View style={styles.voiceAgentIconBox}>
                <Feather name="mic" size={24} color="#fff" />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <ThemedText style={styles.voiceAgentTitle}>AI Assistant</ThemedText>
                <ThemedText style={styles.voiceAgentSubtitle}>Answers questions about your services</ThemedText>
              </View>
              <Button 
                title="Train Agent" 
                onPress={handleOpenAgentTraining}
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)', height: 36, paddingHorizontal: 12 }}
              />
            </View>

            <View style={styles.voiceAgentDisplay}>
              <ThemedText style={styles.voiceAgentDisplayText}>AI Voice Assistant</ThemedText>
              <ThemedText style={styles.voiceAgentDisplaySub}>Let customers ask questions about your services and get directed to book via Text Booking.</ThemedText>
            </View>

            <View style={styles.voiceAgentControls}>
              <Pressable 
                onPress={() => setVoicePaywallVisible(true)}
                style={styles.voiceControlBtn}
              >
                <Feather name="mic" size={24} color="#fff" />
              </Pressable>
              <Pressable 
                onPress={() => setVoicePaywallVisible(true)}
                style={styles.voiceControlBtn}
              >
                <Feather name="message-square" size={24} color="#fff" />
              </Pressable>
              <Pressable 
                onPress={() => setVoicePaywallVisible(true)}
                style={styles.voiceControlBtn}
              >
                <Feather name="volume-2" size={24} color="#fff" />
              </Pressable>
            </View>

            <Pressable 
              onPress={() => setVoicePaywallVisible(true)}
              style={styles.quickPreviewBtn}
            >
              <Feather name="play-circle" size={16} color="rgba(255,255,255,0.6)" />
              <ThemedText style={styles.quickPreviewText}>QUICK PREVIEW</ThemedText>
            </Pressable>
            
            <ThemedText style={styles.voiceAgentFootnote}>
              Booking links and automation plans are separate.
            </ThemedText>
          </GlassCard>

          <View style={{ height: 32 }} />
          <SectionTitle label="STATS">Presence & Reach</SectionTitle>
          <View style={styles.gridRow}>
            <GlassCard style={styles.statsCard} onPress={handleOpenSharePreview}>
              <CircularMeter value={bookingsCount} max={100} label="BOOKINGS" />
            </GlassCard>
            <GlassCard style={styles.statsCard} onPress={() => navigation.navigate("Services")}>
              <CircularMeter value={servicesCount} max={20} label="SERVICES" />
            </GlassCard>
            <GlassCard style={styles.statsCard} onPress={() => navigation.navigate("Customers")}>
              <CircularMeter value={customersCount} max={500} label="CUSTOMERS" />
            </GlassCard>
          </View>

          <View style={{ height: 32 }} />
          <SectionTitleBadge label="PUBLIC VISIBILITY">Growth Tools</SectionTitleBadge>
          <View style={styles.gridRow}>
            <GlassCard style={styles.gridCard} onPress={handleOpenSharePreview}>
              <View style={styles.gridIconCircle}><Feather name="share-2" size={16} color="#fff" /></View>
              <ThemedText style={styles.gridLabel}>SHARE</ThemedText>
              <ThemedText style={styles.gridValue}>Booking Link</ThemedText>
            </GlassCard>
            <GlassCard style={styles.gridCard} onPress={handleShowQRCode}>
              <View style={styles.gridIconCircle}><Feather name="maximize" size={16} color="#fff" /></View>
              <ThemedText style={styles.gridLabel}>QR CODE</ThemedText>
              <ThemedText style={styles.gridValue}>Scan to Book</ThemedText>
            </GlassCard>
          </View>
          
          <View style={styles.gridRow}>
            <GlassCard style={styles.gridCard} onPress={handleShowEmbedModal}>
              <View style={styles.gridIconCircle}><Feather name="code" size={16} color="#fff" /></View>
              <ThemedText style={styles.gridLabel}>WIDGET</ThemedText>
              <ThemedText style={styles.gridValue}>Website Embed</ThemedText>
            </GlassCard>
            <GlassCard style={styles.gridCard} onPress={handleCopyBookingLink}>
              <View style={styles.gridIconCircle}><Feather name="copy" size={16} color="#fff" /></View>
              <ThemedText style={styles.gridLabel}>COPY URL</ThemedText>
              <ThemedText style={styles.gridValue}>{business?.slug || "link"}</ThemedText>
            </GlassCard>
          </View>

          <View style={{ height: 32 }} />
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
            <GlassCard style={styles.securityGridCard} onPress={handleClearAllData}><Feather name="trash-2" size={22} color="#EF4444" style={{ opacity: 0.6 }} /><ThemedText style={[styles.securityTitle, { color: "#EF4444" }]}>Wipe Cloud</ThemedText><ThemedText style={styles.securityAction}>CLEAR ALL DATA</ThemedText></GlassCard>
          </View>

          <View style={{ height: 32 }} />
          <SectionTitle>Legal</SectionTitle>
          <GlassCard><CompactRow icon="shield" title="Privacy Protocol" onPress={() => Linking.openURL("https://confirmbooking.online/privacy-policy")} /><View style={styles.rowDivider} /><CompactRow icon="file-text" title="Terms of Use" onPress={() => Linking.openURL("https://confirmbooking.online/terms")} /></GlassCard>

          <View style={styles.footer}><ThemedText style={styles.footerText}>DESIGNED FOR EXCELLENCE</ThemedText><ThemedText style={styles.footerVersion}>V4.2.0</ThemedText></View>
        </ScrollView>
      </View>

      {/* Voice Agent Paywall Modal */}
      <Modal
        visible={voicePaywallVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setVoicePaywallVisible(false)}
      >
        <VoiceAgentPaywall 
          businessId={business?.id || ""}
          onClose={() => setVoicePaywallVisible(false)}
          onSubscribe={handleVoiceSubscribe}
        />
      </Modal>

      {/* QR Code Modal */}
      <Modal
        visible={qrModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Your Booking QR</ThemedText>
              <Pressable onPress={() => setQrModalVisible(false)} style={styles.closeBtn}>
                <Feather name="x" size={20} color={theme.text} />
              </Pressable>
            </View>
            
            <ViewShot ref={qrViewShotRef} options={{ format: "png", quality: 1.0 }}>
              <View style={styles.qrCaptureContainer}>
                <ThemedText style={styles.qrBusinessName}>{business?.name}</ThemedText>
                <ThemedText style={styles.qrSubtitle}>Scan to book an appointment</ThemedText>
                <View style={styles.qrWrapper}>
                  {qrCode && (
                    <Image
                      source={{ uri: qrCode }}
                      style={styles.qrImage}
                      contentFit="contain"
                    />
                  )}
                </View>
                <ThemedText style={styles.qrBookingUrl}>{bookingUrl}</ThemedText>
              </View>
            </ViewShot>

            <View style={styles.qrActions}>
              <Button
                title="Download & Share"
                onPress={handleDownloadQRCode}
                icon="download"
                style={styles.qrActionBtn}
              />
              <Button
                title="Copy URL"
                onPress={handleCopyBookingLink}
                type="outline"
                icon="copy"
                style={styles.qrActionBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Business Field Modal */}
      <Modal
        visible={editModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Update {editingField?.toUpperCase()}</ThemedText>
              <Pressable onPress={() => setEditModalVisible(false)} style={styles.closeBtn}>
                <Feather name="x" size={20} color={theme.text} />
              </Pressable>
            </View>

            <View style={styles.editContainer}>
              {editingField === "timezone" ? (
                <View style={styles.timezoneList}>
                  {TIMEZONES.map((tz) => (
                    <Pressable
                      key={tz.value}
                      onPress={() => setEditValue(tz.value)}
                      style={[
                        styles.timezoneItem,
                        editValue === tz.value && styles.timezoneItemSelected
                      ]}
                    >
                      <ThemedText style={[
                        styles.timezoneLabel,
                        editValue === tz.value && { color: "#fff" }
                      ]}>{tz.label}</ThemedText>
                      {editValue === tz.value && <Feather name="check" size={16} color="#fff" />}
                    </Pressable>
                  ))}
                </View>
              ) : (
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  value={editValue}
                  onChangeText={setEditValue}
                  placeholder={`Enter ${editingField}...`}
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  autoFocus
                  autoCapitalize={editingField === "name" ? "words" : "none"}
                />
              )}
              
              <Button
                title={editLoading ? "Saving..." : "Save Changes"}
                onPress={handleSaveBusinessField}
                disabled={editLoading}
                style={styles.saveBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Demo Type Selection Modal */}
      <Modal
        visible={demoTypeModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDemoTypeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background, maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Choose Demo Niche</ThemedText>
              <Pressable onPress={() => setDemoTypeModalVisible(false)} style={styles.closeBtn}>
                <Feather name="x" size={20} color={theme.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.demoList}>
              {DEMO_TYPES.map((type) => (
                <Pressable
                  key={type.id}
                  onPress={() => handleInitializeDemoData(type.id)}
                  style={({ pressed }) => [
                    styles.demoItem,
                    pressed && { backgroundColor: 'rgba(255,255,255,0.05)' }
                  ]}
                >
                  <View style={styles.demoIconBox}>
                    <Feather name="briefcase" size={18} color="#fff" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <ThemedText style={styles.demoLabel}>{type.label}</ThemedText>
                    <ThemedText style={styles.demoDesc}>{type.description}</ThemedText>
                  </View>
                  <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.3)" />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Embed Code Modal */}
      <Modal
        visible={embedModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEmbedModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background, width: '90%' }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Embed Widget</ThemedText>
              <Pressable onPress={() => setEmbedModalVisible(false)} style={styles.closeBtn}>
                <Feather name="x" size={20} color={theme.text} />
              </Pressable>
            </View>
            
            {embedLoading ? (
              <ActivityIndicator size="large" color="#fff" style={{ marginVertical: 40 }} />
            ) : (
              <ScrollView>
                <ThemedText style={styles.embedLabel}>CHOOSE STYLE</ThemedText>
                <View style={styles.embedTypeTabs}>
                  {(["inline", "popup-button", "popup-text"] as EmbedType[]).map((type) => (
                    <Pressable
                      key={type}
                      onPress={() => setSelectedEmbedType(type)}
                      style={[
                        styles.embedTypeTab,
                        selectedEmbedType === type && styles.embedTypeTabActive
                      ]}
                    >
                      <ThemedText style={[
                        styles.embedTypeTabText,
                        selectedEmbedType === type && { color: "#000" }
                      ]}>
                        {type === "inline" ? "Inline" : type === "popup-button" ? "Button" : "Text"}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>

                <ThemedText style={styles.embedDescription}>
                  {selectedEmbedType === "inline" 
                    ? "A fixed booking calendar that loads directly on your page."
                    : "A floating element that opens the booking flow in a popup."}
                </ThemedText>

                <View style={styles.codeContainer}>
                  <ThemedText style={styles.codeText}>
                    {selectedEmbedType === "inline" 
                      ? embedCode?.inline 
                      : selectedEmbedType === "popup-button"
                        ? embedCode?.popupButton
                        : embedCode?.popupText}
                  </ThemedText>
                </View>

                <Button
                  title="Copy Code"
                  onPress={async () => {
                    const code = selectedEmbedType === "inline" 
                      ? embedCode?.inline 
                      : selectedEmbedType === "popup-button"
                        ? embedCode?.popupButton
                        : embedCode?.popupText;
                    if (code) {
                      await Clipboard.setStringAsync(code);
                      Alert.alert("Copied", "Embed code copied to clipboard.");
                    }
                  }}
                  icon="copy"
                  style={{ marginTop: 20 }}
                />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Currency Modal */}
      <Modal
        visible={currencyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCurrencyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background, maxHeight: '70%' }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Choose Currency</ThemedText>
              <Pressable onPress={() => setCurrencyModalVisible(false)} style={styles.closeBtn}>
                <Feather name="x" size={20} color={theme.text} />
              </Pressable>
            </View>
            <ScrollView>
              {CURRENCY_OPTIONS.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => handleSelectCurrency(c.id)}
                  style={[
                    styles.currencyItem,
                    business?.currency === c.id && { backgroundColor: 'rgba(255,255,255,0.1)' }
                  ]}
                >
                  <View>
                    <ThemedText style={styles.currencyCode}>{c.id}</ThemedText>
                    <ThemedText style={styles.currencyName}>{c.name}</ThemedText>
                  </View>
                  <ThemedText style={styles.currencySymbol}>{c.symbol}</ThemedText>
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
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  backgroundWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.85)",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  glassCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    overflow: "hidden",
  },
  premiumBanner: {
    marginBottom: 12,
  },
  premiumBannerHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  premiumIconGlow: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  premiumBannerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.5,
  },
  premiumBannerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  premiumFeatures: {
    marginTop: 24,
    gap: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  pricingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  priceOption: {
    flex: 1,
    alignItems: "center",
  },
  priceAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  pricePeriod: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
    marginTop: 2,
    fontWeight: "600",
  },
  priceDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  restoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 10,
    borderColor: "transparent",
  },
  restoreText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.4)",
    textDecorationLine: "underline",
  },
  voiceAgentCard: {
    marginBottom: 24,
  },
  voiceAgentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  voiceAgentIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  voiceAgentTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  voiceAgentSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  voiceAgentDisplay: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
  },
  voiceAgentDisplayText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 12,
  },
  voiceAgentDisplaySub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 20,
  },
  voiceAgentControls: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 24,
  },
  voiceControlBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  quickPreviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  quickPreviewText: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 2,
  },
  voiceAgentFootnote: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    textAlign: "center",
    marginTop: 12,
    fontStyle: 'italic'
  },
  gridRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  gridCard: {
    flex: 1,
    padding: 20,
  },
  gridIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1.5,
  },
  gridValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    marginTop: 4,
  },
  statsCard: {
    flex: 1,
    padding: 16,
    alignItems: "center",
  },
  multiRowCard: {
    padding: 0,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1.5,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    marginTop: 2,
  },
  rowDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginHorizontal: 20,
  },
  automationCard: {
    padding: 24,
  },
  automationHeader: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  parallaxIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  automationTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.5,
  },
  automationDesc: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    marginTop: 6,
    lineHeight: 20,
  },
  automationActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
  },
  automationAction: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1.5,
  },
  securityGridCard: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    marginTop: 12,
  },
  securityAction: {
    fontSize: 9,
    fontWeight: "800",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 1,
  },
  footer: {
    marginTop: 40,
    alignItems: "center",
    gap: 8,
  },
  footerText: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255,255,255,0.2)",
    letterSpacing: 3,
  },
  footerVersion: {
    fontSize: 9,
    fontWeight: "600",
    color: "rgba(255,255,255,0.15)",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  closeBtn: {
    padding: 8,
  },
  qrCaptureContainer: {
    backgroundColor: "#fff",
    padding: 32,
    borderRadius: 24,
    alignItems: "center",
  },
  qrBusinessName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
  },
  qrSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    marginBottom: 24,
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
  },
  qrImage: {
    width: SCREEN_WIDTH * 0.5,
    height: SCREEN_WIDTH * 0.5,
  },
  qrBookingUrl: {
    fontSize: 12,
    color: "#999",
    marginTop: 24,
    textAlign: "center",
  },
  qrActions: {
    marginTop: 24,
    gap: 12,
  },
  qrActionBtn: {
    width: "100%",
  },
  editContainer: {
    gap: 20,
  },
  input: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 20,
    fontSize: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  saveBtn: {
    width: "100%",
  },
  demoList: {
    marginVertical: 10,
  },
  demoItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  demoIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  demoLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  demoDesc: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  embedLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  embedTypeTabs: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  embedTypeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  embedTypeTabActive: {
    backgroundColor: "#fff",
  },
  embedTypeTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.5)",
  },
  embedDescription: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 16,
    lineHeight: 18,
  },
  codeContainer: {
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  codeText: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
  },
  currencyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  currencyName: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
  },
  timezoneList: {
    gap: 8,
  },
  timezoneItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  timezoneItemSelected: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderColor: "rgba(255,255,255,0.3)",
    borderWidth: 1,
  },
  timezoneLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.7)",
  }
});
