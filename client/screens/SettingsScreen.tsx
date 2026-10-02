import React, { useState, useEffect, useRef } from "react";
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
  Animated,
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
import { api, Business, EmbedCode } from "@/lib/api";
import { getApiUrl } from "@/lib/query-client";
import { getCustomerBookingUrl } from "@shared/booking-links";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { usePremium } from "@/contexts/PremiumContext";
import { restorePurchases } from "@/lib/revenuecat";
import { SettingsStackParamList } from "@/navigation/SettingsStackNavigator";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { CURRENCY_OPTIONS } from "@/lib/currency";
import { useVoiceSubscription } from "@/hooks/useVoiceSubscription";

import { VoiceAgentPaywall } from "@/components/VoiceAgentPaywall";
import { useI18n } from "@/contexts/I18nContext";
import { SettingsRow } from "@/components/SettingsRow";

type EmbedType = "inline" | "popup-button" | "popup-text";
type CombinedNavigation = NativeStackNavigationProp<SettingsStackParamList & RootStackParamList>;

const CircularMeter = ({ value, label }: { value: number; label: string }) => {
  return (
    <View style={{ alignItems: "flex-start", flex: 1 }}>
      <ThemedText style={{ fontSize: 20, fontWeight: "700", color: "#1C1410" }}>{value}</ThemedText>
      <ThemedText style={{ fontSize: 12, fontWeight: "700", color: "#8B6F47", letterSpacing: 0.8, marginTop: 5 }}>{label}</ThemedText>
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
        <Feather name={name} size={24} color="#A8662F" />
      </View>
    </Animated.View>
  );
};

export default function SettingsScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<CombinedNavigation>();
  const { checkShareAccess, checkQrAccess, checkEmbedAccess, isPremium, showPaywall, isTrialActive } = usePremium();
  const { t, lang, changeLanguage, languages } = useI18n();

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
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
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

  const DEMO_TYPES = [
    { id: "property", label: "Property & Real Estate", description: "Viewings, inspections & move-ins" },
    { id: "salon", label: "Salon", description: "Hair & beauty services" },
    { id: "barbershop", label: "Barbershop", description: "Haircuts & grooming" },
    { id: "spa", label: "Spa", description: "Relaxation & wellness" },
    { id: "medical", label: "Medical", description: "Healthcare & clinics" },
    { id: "dental", label: "Dental", description: "Dental care services" },
    { id: "veterinary", label: "Veterinary", description: "Pet care services" },
    { id: "autodetailing", label: "Auto Detailing", description: "Car detailing services" },
    { id: "fitness", label: "Fitness", description: "Gym & fitness training" },
    { id: "yoga", label: "Yoga", description: "Yoga classes & sessions" },
    { id: "tattoo", label: "Tattoo", description: "Tattoo & body art" },
    { id: "massage", label: "Massage", description: "Massage therapy" },
    { id: "photography", label: "Photography", description: "Photo & video services" },
    { id: "tutoring", label: "Tutoring", description: "Academic tutoring" },
    { id: "consulting", label: "Consulting", description: "Business consulting" },
    { id: "coaching", label: "Coaching", description: "Personal & executive coaching" },
    { id: "cleaning", label: "Cleaning", description: "Home & office cleaning" },
    { id: "plumbing", label: "Plumbing", description: "Plumbing services" },
    { id: "electrical", label: "Electrical", description: "Electrical services" },
    { id: "hvac", label: "HVAC", description: "Heating & cooling" },
    { id: "landscaping", label: "Landscaping", description: "Lawn & garden care" },
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
    const bookingLink = getCustomerBookingUrl(business.slug);
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
      setBookingUrl(business?.slug ? getCustomerBookingUrl(business.slug) : "");
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
    const bookingLink = getCustomerBookingUrl(business.slug);
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
    if (!business?.id) return;
    setVoiceCheckoutLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const { url } = await api.createVoiceCheckout(business.id, tierId);
      await Linking.openURL(url);
      setVoicePaywallVisible(false);
    } catch (error) {
      Alert.alert("Checkout unavailable", "We couldn't open the secure subscription checkout. Please try again.");
    } finally {
      setVoiceCheckoutLoading(false);
    }
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
          backgroundColor: "#FFFFFF",
          borderColor: "#E8DDD0"
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
        {label && <ThemedText style={{ fontSize: 12, fontWeight: "700", color: "#8B6F47", letterSpacing: 1.2, marginTop: 4 }}>{label}</ThemedText>}
      </View>
    </View>
  );

  const SectionTitle = ({ children, badge }: any) => (
    <View style={styles.sectionTitleRow}>
      <ThemedText style={styles.sectionTitle}>{children}</ThemedText>
      {badge && <View style={[styles.badge, { borderColor: "#E8DDD0" }]}><ThemedText style={styles.badgeText}>{badge}</ThemedText></View>}
    </View>
  );

  const CompactRow = ({ icon, title, subtitle, onPress, destructive }: any) => (
    <Pressable onPress={onPress} style={styles.compactRow}>
      <Feather name={icon} size={20} color={destructive ? "#B74E42" : "#A8662F"} />
      <View style={{ flex: 1, marginLeft: 16 }}>
        <ThemedText style={[styles.compactRowTitle, destructive && { color: "#EF4444" }]}>{title}</ThemedText>
        {subtitle && <ThemedText style={styles.compactRowSubtitle}>{subtitle}</ThemedText>}
      </View>
      <Feather name="chevron-right" size={18} color="#8B6F47" />
    </Pressable>
  );

  const InfoRow = ({ icon, label, value, onPress }: any) => (
    <Pressable onPress={onPress} style={styles.infoRow}>
      <Feather name={icon} size={18} color="#8B6F47" />
      <View style={{ flex: 1, marginLeft: 16 }}>
        <ThemedText style={styles.infoLabel}>{label}</ThemedText>
        <ThemedText style={styles.infoValue}>{value}</ThemedText>
      </View>
      <Feather name="edit-2" size={14} color="#8B6F47" />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.backgroundOverlay} />
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingTop: headerHeight + 40, paddingBottom: tabBarHeight + 60, paddingHorizontal: 24 }}>

          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>
              {isPremium ? "Booking Premium" : "Booking Plan"}
            </ThemedText>
            {isPremium ? (
              <View style={[styles.badge, { borderColor: "#E8DDD0" }]}><ThemedText style={styles.badgeText}>PREMIUM</ThemedText></View>
            ) : isTrialActive ? (
              <View style={[styles.badge, { borderColor: "#E8DDD0" }]}><ThemedText style={styles.badgeText}>TRIAL</ThemedText></View>
            ) : (
              <View style={[styles.badge, { borderColor: "#E8DDD0" }]}><ThemedText style={styles.badgeText}>BASIC</ThemedText></View>
            )}
          </View>
          
          <GlassCard style={styles.premiumBanner} onPress={() => showPaywall("soft_upsell")} highlight>
            <View style={styles.premiumBannerHeader}>
              <View style={styles.premiumIconGlow}>
                <Feather name="zap" size={28} color="#A8662F" />
              </View>
              <View style={{ flex: 1, marginLeft: 20 }}>
                 <ThemedText style={styles.premiumBannerTitle}>
                  {isPremium ? "Booking Premium" : "Unlock Booking Premium"}
                </ThemedText>
                <ThemedText style={styles.premiumBannerSubtitle}>
                  {isPremium ? "Advanced automation active" : "Smart automation & unlimited tools"}
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={24} color="#8B6F47" />
            </View>
            
            <View style={styles.premiumFeatures}>
              <View style={styles.featureRow}>
                <Feather name="check" size={16} color="#4A7C59" />
                <ThemedText style={styles.featureText}>Smart reminders that reduce no-shows</ThemedText>
              </View>
              <View style={styles.featureRow}>
                <Feather name="check" size={16} color="#4A7C59" />
                <ThemedText style={styles.featureText}>Smart service setup in seconds</ThemedText>
              </View>
              <View style={styles.featureRow}>
                <Feather name="check" size={16} color="#4A7C59" />
                <ThemedText style={styles.featureText}>Intelligent upsell suggestions</ThemedText>
              </View>
              <View style={styles.featureRow}>
                <Feather name="check" size={16} color="#4A7C59" />
                <ThemedText style={styles.featureText}>Unlimited booking links & QR codes</ThemedText>
              </View>
              <View style={{ height: 12 }} />
              <ThemedText style={[styles.featureText, { fontSize: 12, fontStyle: 'italic', opacity: 0.7 }]}>
                Voice Assistant sold separately as optional add-on.
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
              <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#E8DDD0" }}>
                <ThemedText style={{ fontSize: 12, color: "#8B6F47", textAlign: 'center' }}>
                  Includes 7-day free trial for booking links and QR codes.
                </ThemedText>
              </View>
            )}
          </GlassCard>
          
          <GlassCard style={styles.restoreRow} onPress={handleRestorePurchases}>
            <Feather name="refresh-cw" size={18} color="#8B6F47" />
            <ThemedText style={styles.restoreText}>{t('settings.restorePurchases')}</ThemedText>
            {restoreLoading && <ActivityIndicator size="small" color="#C17F3E" />}
          </GlassCard>

          <View style={{ height: 24 }} />
          <SectionTitle>Workspace tools</SectionTitle>
          <View style={{ gap: 10 }}>
            <SettingsRow
              icon="users"
              title="Clients"
              subtitle="Manage your viewing contacts"
              onPress={() => navigation.navigate("Customers")}
            />
            <SettingsRow
              icon="home"
              title="Listings & services"
              subtitle="Manage property offerings, services, durations and prices"
              onPress={() => navigation.navigate("Services")}
            />
            <SettingsRow
              icon="cpu"
              title="AI Assistant"
              subtitle="Briefings, scheduling and client follow-ups"
              onPress={() => navigation.navigate("AIAssistant")}
            />
          </View>

          <View style={{ height: 24 }} />

          <GlassCard style={styles.voiceCard} onPress={() => setVoicePaywallVisible(true)} highlight>
            <View style={styles.voiceHeader}>
              <View style={styles.voiceIconBox}>
                <Feather name="mic" size={24} color="#A8662F" />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                 <ThemedText style={styles.voiceTitle} numberOfLines={1} adjustsFontSizeToFit>Informational Assistant</ThemedText>
                <ThemedText style={styles.voiceSubtitle}>Answers questions about your services</ThemedText>
              </View>
              <Button 
                onPress={handleOpenAgentTraining}
                style={{ backgroundColor: "#F4EEE6", borderColor: "#E8DDD0", height: 36, paddingHorizontal: 12 }}
              >
                <ThemedText style={{ fontSize: 14, fontWeight: "600", color: "#A8662F" }}>{t('settings.trainAgent')}</ThemedText>
              </Button>
            </View>
            <View style={styles.voiceIconGroup}>
              <View style={styles.voiceIconBox}><Feather name="mic" size={20} color="#A8662F" /></View>
              <View style={styles.voiceIconBox}><Feather name="message-square" size={20} color="#A8662F" /></View>
              <View style={styles.voiceIconBox}><Feather name="volume-2" size={20} color="#A8662F" /></View>
            </View>
            <View style={{ marginTop: 24 }}>
              <ThemedText style={styles.voiceCardTitle}>{t('settings.voiceAssistant')}</ThemedText>
              <ThemedText style={styles.voiceCardDesc}>Let customers ask questions about your services and get directed to book via Text Booking.</ThemedText>
            </View>
            <View style={styles.previewContainer}>
              <Pressable style={styles.previewLink} onPress={() => navigation.navigate("VoiceBooking", { businessSlug: business?.slug || "" })}>
                <Feather name="play-circle" size={18} color="#8B6F47" />
                <ThemedText style={styles.previewText}>QUICK PREVIEW</ThemedText>
              </Pressable>
              <ThemedText style={[styles.featureText, { fontSize: 12, marginTop: 12, fontStyle: 'italic', opacity: 0.6 }]}>
                Booking links and automation plans are separate.
              </ThemedText>
            </View>
            <View style={styles.usageContainer}>
              <View style={styles.usageHeader}>
                <ThemedText style={styles.usageLabel}>
                  {voiceSub?.subscription.tier === 'free' ? 'Trial Limit' : 'Voice Limit'}
                </ThemedText>
                <ThemedText style={[styles.usageValue, isVoiceExhausted && { color: '#EF4444' }, !isVoiceExhausted && percentUsed > 80 && { color: '#F59E0B' }]}>
                  {voiceSub ? `${voiceSub.usage.remaining} / ${voiceSub.subscription.minutesLimit} min` : '5 min'}
                </ThemedText>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { 
                  width: `${voiceSub ? Math.min(voiceSub.usage.percentUsed, 100) : 0}%`, 
                  backgroundColor: isVoiceExhausted ? '#EF4444' : percentUsed > 80 ? '#F59E0B' : '#fff' 
                }]} />
              </View>
              {isVoiceExhausted ? (
                <ThemedText style={{ fontSize: 12, color: '#EF4444', marginTop: 8, fontWeight: '600' }}>
                  Limit reached — upgrade to continue assisting customers
                </ThemedText>
              ) : voiceSub?.subscription.tier === 'free' ? (
                <ThemedText style={{ fontSize: 12, color: "#8B6F47", marginTop: 8 }}>
                  {voiceSub.usage.remaining} minutes remaining — one-time trial
                </ThemedText>
              ) : percentUsed > 80 ? (
                <ThemedText style={{ fontSize: 12, color: '#F59E0B', marginTop: 8 }}>
                  Running low — consider upgrading for more minutes
                </ThemedText>
              ) : null}
            </View>
          </GlassCard>

          <View style={{ height: 24 }} />
          <SectionTitle>Activity</SectionTitle>
          <GlassCard style={styles.metersCard}>
            <View style={styles.metersRow}>
              <CircularMeter value={bookingsCount} label="BOOKINGS" />
              <CircularMeter value={servicesCount} label="VIEWING TYPES" />
              <CircularMeter value={customersCount} label="CLIENTS" />
            </View>
          </GlassCard>

          <View style={{ height: 24 }} />
          <SectionTitleBadge label="REVENUE & SHARING">Booking Links</SectionTitleBadge>
          <GlassCard style={styles.bookingCard}>
            <View style={styles.bookingHeader}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.bookingTitle}>Share Booking Page</ThemedText>
                <ThemedText style={styles.bookingLinkText} numberOfLines={1}>{business?.slug ? getCustomerBookingUrl(business.slug) : ""}</ThemedText>
              </View>
              <Pressable onPress={handleCopyBookingLink} style={styles.copyIconBox}><Feather name="copy" size={18} color="#8B6F47" /></Pressable>
            </View>
            <ThemedText style={styles.qrPlacementHint}>Place QR codes at checkout or in windows</ThemedText>
            <View style={styles.bookingActions}>
              <Pressable onPress={handleOpenSharePreview} style={styles.shareLinkBtn}><Feather name="share-2" size={18} color="#A8662F" /><ThemedText style={styles.shareBtnText}>Share Link</ThemedText></Pressable>
              <Pressable onPress={handleShowQRCode} style={styles.shareQrBtn}><Feather name="maximize" size={18} color="#FFFFFF" /><ThemedText style={styles.shareQrText}>Show QR</ThemedText></Pressable>
            </View>
          </GlassCard>

          <View style={{ height: 24 }} />
          <SectionTitleBadge label="PLAN OVERVIEW">{t('settings.yourPlans')}</SectionTitleBadge>
          <View style={{ gap: 12 }}>
            <GlassCard style={[styles.gridCard, { width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16 }]} onPress={() => showPaywall("soft_upsell")}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.gridIconCircle, { width: 32, height: 32, borderRadius: 16 }]}><Feather name="link" size={14} color="#A8662F" /></View>
                <ThemedText style={[styles.gridLabel, { marginLeft: 12, marginTop: 0 }]}>Booking Links</ThemedText>
              </View>
              <View style={{ backgroundColor: isPremium ? "#EFF5EF" : "#F4EEE6", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 }}>
                <ThemedText style={{ fontSize: 12, fontWeight: '800', color: isPremium ? "#4A7C59" : "#8B6F47" }}>{isPremium ? "ACTIVE" : "BASIC"}</ThemedText>
              </View>
            </GlassCard>
            <GlassCard style={[styles.gridCard, { width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.gridIconCircle, { width: 32, height: 32, borderRadius: 16 }]}><Feather name="mic" size={14} color="#A8662F" /></View>
                <ThemedText style={[styles.gridLabel, { marginLeft: 12, marginTop: 0 }]}>Voice Agent</ThemedText>
              </View>
              <View style={{ backgroundColor: isVoiceExhausted ? "#FAEFED" : voiceSub?.subscription.tier !== 'free' ? "#EFF5EF" : "#F4EEE6", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 }}>
                <ThemedText style={{ fontSize: 12, fontWeight: '800', color: isVoiceExhausted ? "#B74E42" : voiceSub?.subscription.tier !== 'free' ? "#4A7C59" : "#8B6F47" }}>{isVoiceExhausted ? "EXHAUSTED" : voiceSub?.subscription.tier !== 'free' ? "ACTIVE" : "BASIC"}</ThemedText>
              </View>
            </GlassCard>
          </View>

          <View style={{ height: 24 }} />
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
              <View style={[styles.gridIconCircle, { width: 32, height: 32, borderRadius: 16, backgroundColor: isCalendarConnected ? "#EFF5EF" : "#F4EEE6" }]}>
                <Feather name="calendar" size={14} color={isCalendarConnected ? "#22C55E" : "#fff"} />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <ThemedText style={[styles.gridLabel, { marginTop: 0 }]}>Google Calendar</ThemedText>
                {isCalendarConnected && calendarEmail && (
                  <ThemedText style={{ fontSize: 12, color: "#8B6F47", marginTop: 2 }} numberOfLines={1}>{calendarEmail}</ThemedText>
                )}
              </View>
            </View>
            {calendarLoading || calendarConnecting ? (
              <ActivityIndicator size="small" color="#C17F3E" />
            ) : (
              <View style={{ backgroundColor: isCalendarConnected ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 }}>
                <ThemedText style={{ fontSize: 12, fontWeight: '800', color: isCalendarConnected ? '#22C55E' : '#3B82F6' }}>
                  {isCalendarConnected ? "CONNECTED" : "CONNECT"}
                </ThemedText>
              </View>
            )}
          </GlassCard>
          <ThemedText style={{ fontSize: 12, color: "#8B6F47", marginTop: 8, paddingHorizontal: 4 }}>
            Sync bookings to your calendar and prevent double-booking
          </ThemedText>
          */}

          <View style={{ height: 24 }} />
          <SectionTitleBadge label="BUSINESS IDENTITY">{t('settings.businessIdentity')}</SectionTitleBadge>
          <GlassCard style={{ marginBottom: 12 }}>
            <InfoRow 
              icon="globe" 
              label={t('settings.timezone')} 
              value={business?.timezone || "Not set"} 
              onPress={() => handleEditBusinessField("timezone")} 
            />
          </GlassCard>
          <View style={styles.gridRow}>
            <GlassCard style={styles.gridCard} onPress={() => handleEditBusinessField("name")}><View style={styles.gridIconCircle}><Feather name="briefcase" size={16} color="#A8662F" /></View><ThemedText style={styles.gridLabel}>BUSINESS NAME</ThemedText><ThemedText style={styles.gridValue} numberOfLines={1}>{business?.name || "My Business"}</ThemedText></GlassCard>
            <GlassCard style={styles.gridCard} onPress={() => setCurrencyModalVisible(true)}><View style={styles.gridIconCircle}><Feather name="dollar-sign" size={16} color="#A8662F" /></View><ThemedText style={styles.gridLabel}>{t('settings.currency').toUpperCase()}</ThemedText><ThemedText style={styles.gridValue}>{getCurrentCurrencyShort()}</ThemedText></GlassCard>
          </View>
          <GlassCard style={{ marginTop: 12, marginBottom: 12 }}>
            <Pressable onPress={() => setLanguageModalVisible(true)} style={styles.infoRow}>
              <Feather name="globe" size={18} color="#8B6F47" />
              <View style={{ flex: 1, marginLeft: 16 }}>
                <ThemedText style={styles.infoLabel}>{t('settings.language').toUpperCase()}</ThemedText>
                <ThemedText style={styles.infoValue}>{languages.find(l => l.code === lang)?.nativeName || 'English'}</ThemedText>
              </View>
              <Feather name="chevron-right" size={18} color="#8B6F47" />
            </Pressable>
          </GlassCard>
          <GlassCard style={[styles.multiRowCard, { marginTop: 0 }]}><InfoRow icon="globe" label={t('settings.publicWebsite')} value={business?.website || "Not set"} onPress={() => handleEditBusinessField("website")} /><View style={styles.rowDivider} /><InfoRow icon="phone" label={t('settings.publicSupportLine')} value={business?.phone || "Not set"} onPress={() => handleEditBusinessField("phone")} /></GlassCard>

          <View style={{ height: 24 }} />
          <SectionTitle>{t('settings.automationWorkflows')}</SectionTitle>
          <GlassCard style={styles.automationCard} onPress={() => navigation.navigate("Workflows")}>
            <View style={styles.automationHeader}><ParallaxIcon name="cpu" delay={0} /><ParallaxIcon name="zap" delay={300} /><ParallaxIcon name="bell" delay={600} /></View>
            <ThemedText style={styles.automationTitle}>Workflows</ThemedText>
            <ThemedText style={styles.automationDesc}>Intelligent reminders & confirmation sequences that work quietly in the background.</ThemedText>
            <View style={styles.automationActionRow}><ThemedText style={styles.automationAction}>CONFIGURE</ThemedText><Feather name="arrow-right" size={14} color="#A8662F" /></View>
          </GlassCard>

          <View style={{ height: 24 }} />
          <SectionTitle>{t('settings.data')}</SectionTitle>
          <View style={styles.gridRow}>
            <GlassCard style={styles.securityGridCard} onPress={() => setDemoTypeModalVisible(true)}><Feather name="download-cloud" size={22} color="#A8662F" /><ThemedText style={styles.securityTitle}>{t('settings.demoData')}</ThemedText><ThemedText style={styles.securityAction}>LOAD SAMPLES</ThemedText></GlassCard>
            <GlassCard style={styles.securityGridCard} onPress={handleClearAllData}><Feather name="trash-2" size={22} color="#EF4444" style={{ opacity: 0.6 }} /><ThemedText style={[styles.securityTitle, { color: "#EF4444" }]}>Reset Data</ThemedText><ThemedText style={styles.securityAction}>CLEAR ALL DATA</ThemedText></GlassCard>
          </View>

          <View style={{ height: 24 }} />
          <SectionTitle>{t('settings.legal')}</SectionTitle>
          <GlassCard><CompactRow icon="shield" title={t('settings.privacyProtocol')} onPress={() => Linking.openURL("https://confirmbooking.online/privacy-policy")} /><View style={styles.rowDivider} /><CompactRow icon="file-text" title={t('settings.termsOfUse')} onPress={() => Linking.openURL("https://confirmbooking.online/terms")} /></GlassCard>

          <View style={styles.footer}><ThemedText style={styles.footerText}>{t('settings.designedForExcellence')}</ThemedText><ThemedText style={styles.footerVersion}>V4.2.0</ThemedText></View>
        </ScrollView>
      </View>

      <Modal visible={voicePaywallVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setVoicePaywallVisible(false)}>
        <VoiceAgentPaywall businessId={business?.id || ""} onClose={() => { setVoicePaywallVisible(false); if ((voiceSub?.subscription.minutesUsed || 0) < (voiceSub?.subscription.minutesLimit || 5)) navigation.navigate("VoiceBooking", { businessSlug: business?.slug || "" }); }} onSubscribe={handleVoiceSubscribe} isLoading={voiceCheckoutLoading} />
      </Modal>

      <Modal visible={qrModalVisible} transparent animationType="fade" onRequestClose={() => setQrModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: "#FAF7F2" }]}>
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
                  <Feather name="external-link" size={14} color="#8B6F47" />
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
          <View style={[styles.modalContent, { backgroundColor: "#FAF7F2" }]}>
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
                        editValue === tz.value && { backgroundColor: "#F4EEE6", borderColor: "#C17F3E" }
                      ]}
                      onPress={() => setEditValue(tz.value)}
                    >
                      <ThemedText style={[styles.timezoneOptionText, editValue === tz.value && { color: '#fff' }]}>
                        {tz.label}
                      </ThemedText>
                      {editValue === tz.value && <Feather name="check" size={16} color="#C17F3E" />}
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <TextInput
                style={[styles.editInput, { color: "#1C1410", borderColor: "#E8DDD0" }]}
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
        <View style={styles.modalOverlay}><View style={[styles.modalContent, { backgroundColor: "#FAF7F2" }]}><ThemedText style={styles.modalTitle}>{t('settings.chooseDemoType')}</ThemedText><ScrollView style={{ maxHeight: 300 }}>{DEMO_TYPES.map(dt => (<Pressable key={dt.id} onPress={() => handleInitializeDemoData(dt.id)} style={styles.demoTypeButton}><ThemedText style={styles.demoTypeLabel}>{t('businessTypes.' + dt.id) || dt.label}</ThemedText></Pressable>))}</ScrollView><Pressable onPress={() => setDemoTypeModalVisible(false)} style={styles.secondaryButton}><ThemedText style={styles.secondaryButtonText}>{t('common.cancel')}</ThemedText></Pressable></View></View>
      </Modal>

      <Modal visible={currencyModalVisible} transparent animationType="slide" onRequestClose={() => setCurrencyModalVisible(false)}>
        <View style={styles.modalOverlay}><View style={[styles.modalContent, { backgroundColor: "#FAF7F2" }]}><ThemedText style={styles.modalTitle}>{t('settings.selectCurrency')}</ThemedText><ScrollView style={{ maxHeight: 300 }}>{CURRENCY_OPTIONS.map(c => (<Pressable key={c.id} onPress={() => handleSelectCurrency(c.id)} style={styles.currencyRow}><ThemedText style={styles.currencyLabel}>{c.label} ({c.symbol})</ThemedText></Pressable>))}</ScrollView></View></View>
      </Modal>

      <Modal visible={languageModalVisible} transparent animationType="slide" onRequestClose={() => setLanguageModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: "#FAF7F2" }]}>
            <ThemedText style={styles.modalTitle}>{t('settings.selectLanguage')}</ThemedText>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {languages.map(l => (
                <Pressable
                  key={l.code}
                  onPress={async () => { 
                    changeLanguage(l.code); 
                    setLanguageModalVisible(false);
                    try {
                      await api.updateBusiness({ language: l.code });
                      const updated = await api.getBusiness();
                      if (updated) setBusiness(updated);
                    } catch (error) {
                      console.error("Error updating business language:", error);
                    }
                  }}
                  style={[styles.currencyRow, lang === l.code && { backgroundColor: "#F4EEE6" }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <ThemedText style={[styles.currencyLabel, { fontWeight: lang === l.code ? '700' : '400' }]}>{l.nativeName}</ThemedText>
                      <ThemedText style={{ fontSize: 12, color: "#8B6F47", marginTop: 2 }}>{l.name}</ThemedText>
                    </View>
                    {lang === l.code && <Feather name="check" size={18} color="#C17F3E" />}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={() => setLanguageModalVisible(false)} style={styles.secondaryButton}>
              <ThemedText style={styles.secondaryButtonText}>{t('common.close')}</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF7F2" },
  backgroundWrapper: { ...StyleSheet.absoluteFillObject },
  backgroundImage: { flex: 1 },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(250,247,242,0.96)",
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, marginTop: 4, flexWrap: 'wrap', gap: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  sectionTitle: { fontSize: 22, fontWeight: "700", color: "#1C1410", letterSpacing: -0.2, fontFamily: "PlayfairDisplay-Bold" },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontSize: 12, fontWeight: "800", letterSpacing: 1, color: "#A8662F" },
  glassCard: { borderRadius: 20, borderWidth: 1, borderColor: "#E8DDD0", overflow: "hidden", backgroundColor: "#FFFFFF" },
  premiumBanner: { padding: 16, marginBottom: 12 },
  premiumBannerHeader: { flexDirection: "row", alignItems: "center" },
  premiumIconGlow: { width: 64, height: 64, borderRadius: 20, backgroundColor: "#F4EEE6", alignItems: "center", justifyContent: "center" },
  premiumBannerTitle: { fontSize: 20, fontWeight: "700", color: "#1C1410", marginBottom: 4, fontFamily: "PlayfairDisplay-Bold" },
  premiumBannerSubtitle: { fontSize: 14, color: "#6B5744" },
  premiumFeatures: { marginTop: 24, marginBottom: 20 },
  featureRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 12 },
  featureText: { fontSize: 14, color: "#6B5744" },
  pricingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingTop: 20, borderTopWidth: 1, borderTopColor: "#E8DDD0" },
  priceOption: { alignItems: "center" },
  priceAmount: { fontSize: 20, fontWeight: "800", color: "#1C1410" },
  pricePeriod: { fontSize: 12, color: "#8B6F47", marginTop: 2 },
  priceDivider: { width: 1, height: 36, backgroundColor: "#E8DDD0" },
  restoreRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, gap: 10 },
  restoreText: { fontSize: 14, color: "#6B5744" },
  metersCard: { padding: 16 },
  metersRow: { flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  gridRow: { flexDirection: "row", gap: 12 },
  gridCard: { flex: 1, padding: 16, alignItems: "center", justifyContent: "center" },
  gridIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#F4EEE6", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  gridLabel: { fontSize: 12, fontWeight: "700", color: "#8B6F47", letterSpacing: 1.2, marginBottom: 4 },
  gridValue: { fontSize: 14, fontWeight: "700", color: "#1C1410" },
  multiRowCard: { paddingVertical: 8 },
  infoRow: { flexDirection: "row", alignItems: "center", padding: 16 },
  rowDivider: { height: 1, backgroundColor: "#E8DDD0", marginHorizontal: 24 },
  infoLabel: { fontSize: 12, fontWeight: "700", color: "#8B6F47", letterSpacing: 1.2 },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#1C1410", marginTop: 2 },
  parallaxIconBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: "#F4EEE6", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E8DDD0" },
  automationCard: { padding: 16 },
  automationHeader: { flexDirection: "row", gap: 16, marginBottom: 28 },
  automationTitle: { fontSize: 20, fontWeight: "700", color: "#1C1410", marginBottom: 12, fontFamily: "PlayfairDisplay-Bold" },
  automationDesc: { fontSize: 14, color: "#6B5744", lineHeight: 21, marginBottom: 24 },
  automationActionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  automationAction: { fontSize: 12, fontWeight: "800", letterSpacing: 1.4, color: "#A8662F" },
  bookingCard: { padding: 16 },
  bookingHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  bookingTitle: { fontSize: 20, fontWeight: "700", color: "#1C1410", marginBottom: 4, fontFamily: "PlayfairDisplay-Bold" },
  bookingLinkText: { fontSize: 12, color: "#8B6F47" },
  qrPlacementHint: { fontSize: 12, color: "#8B6F47", marginBottom: 20, fontStyle: "italic" },
  copyIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#F4EEE6", alignItems: "center", justifyContent: "center" },
  bookingActions: { flexDirection: "row", gap: 12 },
  shareLinkBtn: { flex: 1, height: 56, borderRadius: 16, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "#E8DDD0" },
  shareQrBtn: { flex: 1, height: 56, borderRadius: 16, backgroundColor: "#C17F3E", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  shareBtnText: { fontSize: 14, fontWeight: "700", color: "#A8662F" },
  shareQrText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  voiceCard: { padding: 16, marginTop: 12, borderRadius: 20 },
  voiceIconGroup: { flexDirection: "row", gap: 12 },
  voiceIconBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: "#F4EEE6", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E8DDD0" },
  voiceCardTitle: { fontSize: 20, fontWeight: "700", color: "#1C1410", letterSpacing: -0.2, marginBottom: 10, fontFamily: "PlayfairDisplay-Bold" },
  voiceCardDesc: { fontSize: 14, color: "#6B5744", lineHeight: 21, fontWeight: "400" },
  previewContainer: { marginTop: 24 },
  previewLink: { flexDirection: "row", alignItems: "center", gap: 12 },
  previewText: { fontSize: 12, fontWeight: "700", color: "#A8662F", letterSpacing: 1.4 },
  usageContainer: { marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: "#E8DDD0" },
  usageHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  usageLabel: { fontSize: 12, color: "#8B6F47" },
  usageValue: { fontSize: 12, color: "#1C1410", fontWeight: "600" },
  progressBarBg: { height: 6, backgroundColor: "#E8DDD0", borderRadius: 3, overflow: "hidden" },
  progressBarFill: { height: "100%", backgroundColor: "#C17F3E", borderRadius: 3 },
  securityGridCard: { flex: 1, padding: 16, alignItems: "flex-start" },
  securityTitle: { fontSize: 20, fontWeight: "700", color: "#1C1410", marginTop: 16, marginBottom: 4, fontFamily: "PlayfairDisplay-Bold" },
  securityAction: { fontSize: 12, fontWeight: "800", letterSpacing: 1, color: "#A8662F" },
  voiceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  voiceTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1C1410",
  },
  voiceSubtitle: {
    fontSize: 14,
    color: "#8B6F47",
    marginTop: 2,
  },
  footer: { marginTop: 56, alignItems: "center" },
  footerText: { fontSize: 12, fontWeight: "800", letterSpacing: 2, color: "#8B6F47" },
  footerVersion: { fontSize: 12, fontWeight: "600", color: "#8B6F47", marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(48,35,25,0.38)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { width: "100%", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#E8DDD0", backgroundColor: "#FAF7F2" },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#1C1410", marginBottom: 24, fontFamily: "PlayfairDisplay-Bold" },
  qrImage: { width: 200, height: 200, backgroundColor: "#fff", borderRadius: 16, padding: 16, alignSelf: "center" },
  qrPressable: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E8DDD0",
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
    borderColor: '#E8DDD0',
    maxWidth: 80,
  },
  qrCenterText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1C1410',
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
    fontSize: 12,
    color: "#8B6F47",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  secondaryButton: { height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 12 },
  secondaryButtonText: {
    color: "#8B6F47",
    fontSize: 14,
    fontWeight: "600",
  },
  timezoneOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8DDD0',
    backgroundColor: '#FFFFFF',
  },
  timezoneOptionText: {
    fontSize: 14,
    color: '#6B5744',
  },
  editInput: {
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 14,
    borderWidth: 1,
    marginBottom: 24,
    color: "#1C1410",
    backgroundColor: "#FFFFFF",
    borderColor: "#E8DDD0",
  },
  compactRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  compactRowTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1C1410",
  },
  compactRowSubtitle: {
    fontSize: 12,
    color: "#8B6F47",
    marginTop: 2,
  },
  demoTypeButton: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8DDD0",
    marginBottom: 8,
  },
  demoTypeLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1C1410",
  },
  currencyRow: {
    padding: 16,
    borderRadius: 16,
  },
  currencyLabel: {
    fontSize: 14,
    color: "#1C1410",
  },
});
