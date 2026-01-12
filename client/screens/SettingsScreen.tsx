import React, { useState, useEffect } from "react";
import * as FileSystem from "expo-file-system/legacy";
import { View, StyleSheet, Alert, Share, Platform, Modal, Pressable, ActivityIndicator, TextInput, Linking, Keyboard, ScrollView } from "react-native";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { api, Business, EmbedCode } from "@/lib/api";
import { getBookingDomain } from "@/lib/query-client";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { getApiUrl } from "@/lib/query-client";
import { usePremium } from "@/contexts/PremiumContext";
import {
  restorePurchases,
} from "@/lib/revenuecat";
import { SettingsStackParamList } from "@/navigation/SettingsStackNavigator";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { CURRENCY_OPTIONS } from "@/lib/currency";

type EmbedType = "inline" | "popup-button" | "popup-text";

type CombinedNavigation = NativeStackNavigationProp<SettingsStackParamList & RootStackParamList>;

const ACCENT_GOLD = "#FFFFFF";
const ACCENT_SILVER = "#FFFFFF";

export default function SettingsScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
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
  const [embedError, setEmbedError] = useState(false);
  const [selectedEmbedType, setSelectedEmbedType] = useState<EmbedType>("inline");
  const [copiedCode, setCopiedCode] = useState(false);
  const copiedTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [currencyLoading, setCurrencyLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

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

  const handleRestorePurchases = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRestoreLoading(true);
    try {
      const result = await restorePurchases();
      if (result.success) {
        Alert.alert("Success", result.isPremium ? "Purchases restored! You now have Pro access." : "Restore complete, but no active subscriptions were found.");
      } else {
        Alert.alert("Error", result.error || "Failed to restore purchases.");
      }
    } catch (error) {
      console.error("Error restoring purchases:", error);
      Alert.alert("Error", "An unexpected error occurred during restoration.");
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleShowCurrencyModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrencyModalVisible(true);
  };

  const handleSelectCurrency = async (currencyId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrencyLoading(true);
    setCurrencyModalVisible(false);
    try {
      const updated = await api.updateBusiness({ currency: currencyId });
      setBusiness(updated);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error("Error updating currency:", error);
      Alert.alert("Error", "Failed to update currency. Please try again.");
    } finally {
      setCurrencyLoading(false);
    }
  };

  const getCurrentCurrencyLabel = (): string => {
    const currency = CURRENCY_OPTIONS.find(c => c.id === (business?.currency || "USD"));
    return currency ? `${currency.symbol} ${currency.label}` : "$ US Dollar";
  };

  const getCurrentCurrencyShort = (): string => {
    const currency = CURRENCY_OPTIONS.find(c => c.id === (business?.currency || "USD"));
    return currency ? `${currency.id} ${currency.symbol}` : "USD $";
  };

  const handleOpenSharePreview = () => {
    if (!business) return;
    
    if (!checkShareAccess()) {
      return;
    }
    
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
    
    if (!checkShareAccess()) {
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
    if (!checkQrAccess()) {
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
    if (!business || !qrCode) return;
    if (!checkQrAccess()) return;
    
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
      
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Share.share({
        url: fileUri,
        title: `${business.name} - Booking QR Code`,
      });
    } catch (error) {
      console.error("Error sharing QR code:", error);
      Alert.alert("Error", "Failed to share QR code image");
    }
  };

  const generateLocalEmbedCode = (): EmbedCode | null => {
    if (!business?.slug) return null;
    const origin = getBookingDomain();
    const embedUrl = `${origin}/embed/${business.slug}`;
    const scriptUrl = `${origin}/embed.js`;
    
    return {
      embedUrl,
      scriptUrl,
      businessSlug: business.slug,
      inlineCode: `<iframe src="${embedUrl}" style="width:100%;height:600px;border:none;border-radius:12px;" title="Book with ${business.name || 'us'}"></iframe>`,
      popupButtonCode: `<script src="${scriptUrl}"></script>\n<button onclick="BookFlow.open('${business.slug}')" style="background:#000;color:#fff;padding:12px 24px;border:none;border-radius:999px;cursor:pointer;font-weight:600;">Book Appointment</button>`,
      popupTextCode: `<script src="${scriptUrl}"></script>\n<a href="#" onclick="BookFlow.open('${business.slug}');return false;" style="color:#C5A059;font-weight:600;">Schedule a call</a>`,
    };
  };

  const handleShowEmbedModal = async () => {
    if (!checkEmbedAccess()) {
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCopiedCode(false);
    setSelectedEmbedType("inline");
    setEmbedModalVisible(true);
    setEmbedLoading(true);
    
    // Try API first, fallback to local generation
    try {
      const data = await api.getEmbedCode();
      if (data) {
        setEmbedCode(data);
      } else {
        setEmbedCode(generateLocalEmbedCode());
      }
    } catch (error) {
      console.error("Error getting embed code, using local generation:", error);
      setEmbedCode(generateLocalEmbedCode());
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
    if (!checkEmbedAccess()) return;
    
    // Use existing or generate fresh
    const codeData = embedCode || generateLocalEmbedCode();
    if (!codeData) {
      Alert.alert("Error", "Unable to generate embed code");
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let codeToCopy = "";
    switch (selectedEmbedType) {
      case "inline":
        codeToCopy = codeData.inlineCode;
        break;
      case "popup-button":
        codeToCopy = codeData.popupButtonCode;
        break;
      case "popup-text":
        codeToCopy = codeData.popupTextCode;
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

  const handleDownloadInstructions = async () => {
    if (!business || !embedCode) return;
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const instructions = `
BOOKFLOW WIDGET INSTALLATION INSTRUCTIONS
-----------------------------------------
Business: ${business.name}
Slug: ${business.slug}

1. EMBED TYPES
--------------

A. INLINE WIDGET (Displays directly on page)
Code:
${embedCode.inlineCode}

B. POPUP BUTTON (Opens booking window when clicked)
Code:
${embedCode.popupButtonCode}

C. POPUP TEXT LINK (Opens booking window from text link)
Code:
${embedCode.popupTextCode}


2. INSTALLATION STEPS
---------------------

STEP 1: Copy the code for your preferred embed type above.

STEP 2: Open your website editor (WordPress, Webflow, Shopify, Wix, or custom HTML).

STEP 3: Paste the code where you want the widget or button to appear.
   - For WordPress: Use a "Custom HTML" block.
   - For Webflow/Wix: Use an "Embed" or "HTML" element.
   - For custom sites: Paste directly into your .html file.

STEP 4: Save and publish your website.


Need help? Contact support at bookings@confirmbooking.online
      `.trim();

      if (Platform.OS === "web") {
        const element = document.createElement("a");
        const file = new Blob([instructions], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `${business.slug}-embed-instructions.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        return;
      }

      const filename = `${business.slug}-instructions.txt`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, instructions);

      await Share.share({
        url: fileUri,
        title: `${business.name} - Embed Instructions`,
      });
    } catch (error) {
      console.error("Error downloading instructions:", error);
      Alert.alert("Error", "Failed to generate instructions file");
    }
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

  const generateSlugFromName = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50);
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
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const updates: Partial<Business> = { [editingField]: editValue };
      
      if (editingField === "name" && editValue.trim()) {
        const generatedSlug = generateSlugFromName(editValue);
        updates.slug = generatedSlug;
      }
      
      const updated = await api.updateBusiness(updates);
      setBusiness(updated);
      
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

  const handleCopyBookingLink = async () => {
    if (!business) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const bookingLink = business.bookingUrl || `https://${getBookingDomain()}/book/${business.slug}`;
    await Clipboard.setStringAsync(bookingLink);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Copied", "Booking link copied to clipboard");
  };

  const GlassCard = ({ children, style, onPress }: { children: React.ReactNode; style?: any; onPress?: () => void }) => {
    const content = (
      <View style={[styles.glassCard, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }, style]}>
        {children}
      </View>
    );
    
    if (onPress) {
      return (
        <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}>
          {content}
        </Pressable>
      );
    }
    return content;
  };

  const SectionTitle = ({ children, badge }: { children: string; badge?: string }) => (
    <View style={styles.sectionTitleRow}>
      <ThemedText style={[styles.sectionTitle]}>{children}</ThemedText>
      {badge && (
        <View style={[styles.badge, { backgroundColor: theme.text + "15", borderColor: theme.text + "30" }]}>
          <ThemedText style={[styles.badgeText, { color: theme.text }]}>{badge}</ThemedText>
        </View>
      )}
    </View>
  );

  const PremiumRow = ({ icon, title, subtitle, onPress, isGold = false, disabled = false }: any) => (
    <GlassCard onPress={disabled ? undefined : onPress} style={styles.premiumRow}>
      <View style={[styles.premiumIconBox, { backgroundColor: theme.text + "15" }]}>
        <Feather name={icon} size={22} color={theme.text} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText style={styles.premiumRowTitle}>{title}</ThemedText>
        <ThemedText style={[styles.premiumRowSubtitle]}>{subtitle}</ThemedText>
      </View>
      {disabled ? (
        <ActivityIndicator size="small" color={theme.textTertiary} />
      ) : (
        <Feather name="chevron-right" size={20} color={theme.textTertiary} style={{ opacity: 0.3 }} />
      )}
    </GlassCard>
  );

  const InfoRow = ({ icon, label, value, onPress }: any) => (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.infoRow, pressed && { opacity: 0.7 }]}>
      <Feather name={icon} size={18} color={theme.text} style={{ opacity: 0.6 }} />
      <View style={{ flex: 1, marginLeft: Spacing.md }}>
        <ThemedText style={styles.infoLabel}>{label}</ThemedText>
        <ThemedText style={styles.infoValue}>{value}</ThemedText>
      </View>
      <Feather name="edit-2" size={14} color={theme.textTertiary} style={{ opacity: 0.3 }} />
    </Pressable>
  );

  const CompactRow = ({ icon, title, subtitle, onPress, disabled = false, destructive = false, comingSoon = false }: any) => (
    <Pressable 
      onPress={disabled ? undefined : onPress} 
      style={({ pressed }) => [styles.compactRow, pressed && !disabled && { opacity: 0.7 }, disabled && { opacity: 0.5 }]}
    >
      <Feather name={icon} size={20} color={destructive ? "#EF4444" : theme.text} style={{ opacity: destructive ? 0.6 : 0.8 }} />
      <View style={{ flex: 1, marginLeft: Spacing.md }}>
        <ThemedText style={[styles.compactRowTitle, destructive && { color: "#EF4444" }]}>{title}</ThemedText>
        {subtitle && <ThemedText style={styles.compactRowSubtitle}>{subtitle}</ThemedText>}
      </View>
      {comingSoon ? (
        <View style={[styles.soonBadge, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" }]}>
          <ThemedText style={styles.soonBadgeText}>Soon</ThemedText>
        </View>
      ) : (
        <Feather name="chevron-right" size={18} color={theme.textTertiary} style={{ opacity: 0.3 }} />
      )}
    </Pressable>
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing["4xl"],
          paddingHorizontal: Spacing.lg,
        }}
      >
        {/* Premium Section */}
        <SectionTitle badge={isPremium ? "Member" : undefined}>Premium</SectionTitle>
        <View style={styles.sectionContent}>
          <PremiumRow
            icon="star"
            title="Upgrade Plan"
            subtitle={isPremium ? "You're a Pro member" : "Access premium tools"}
            onPress={() => showPaywall("soft_upsell")}
            isGold
          />
          <PremiumRow
            icon="rotate-ccw"
            title="Restore"
            subtitle="Previous purchases"
            onPress={handleRestorePurchases}
            disabled={restoreLoading}
          />
        </View>

        {/* Business Section */}
        <SectionTitle>Business</SectionTitle>
        <View style={styles.gridRow}>
          <GlassCard style={styles.gridCard} onPress={() => handleEditBusinessField("name")}>
            <View style={[styles.gridIconCircle, { backgroundColor: theme.text + "15" }]}>
              <Feather name="briefcase" size={16} color={theme.text} />
            </View>
            <View style={styles.gridCardContent}>
              <ThemedText style={styles.gridLabel}>Entity</ThemedText>
              <ThemedText style={styles.gridValue} numberOfLines={1}>{business?.name || "My Business"}</ThemedText>
            </View>
          </GlassCard>
          <GlassCard style={styles.gridCard} onPress={handleShowCurrencyModal}>
            <View style={[styles.gridIconCircle, { backgroundColor: theme.text + "15" }]}>
              <Feather name="dollar-sign" size={16} color={theme.text} />
            </View>
            <View style={styles.gridCardContent}>
              <ThemedText style={styles.gridLabel}>Currency</ThemedText>
              <ThemedText style={styles.gridValue}>{getCurrentCurrencyShort()}</ThemedText>
            </View>
          </GlassCard>
        </View>
        <GlassCard style={{ marginBottom: Spacing["2xl"] }}>
          <InfoRow icon="globe" label="Website" value={business?.website || "Not set"} onPress={() => handleEditBusinessField("website")} />
          <View style={[styles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]} />
          <InfoRow icon="phone" label="Support Line" value={business?.phone || "Not set"} onPress={() => handleEditBusinessField("phone")} />
        </GlassCard>

        {/* Automation Section */}
        <SectionTitle>Automation</SectionTitle>
        <GlassCard style={styles.workflowCard} onPress={() => navigation.navigate("Workflows")}>
          <View style={styles.workflowIconContainer}>
            <View style={[styles.workflowIconCircle, { borderColor: `${ACCENT_GOLD}30` }]}>
              <Feather name="zap" size={28} color={ACCENT_GOLD} />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.workflowTitle}>Workflows</ThemedText>
            <ThemedText style={styles.workflowSubtitle}>Intelligent reminders & cinematic confirmation sequences.</ThemedText>
            <ThemedText style={[styles.workflowCta, { color: ACCENT_GOLD }]}>Configure</ThemedText>
          </View>
        </GlassCard>
        
        {/* Booking Section */}
        <SectionTitle>Booking</SectionTitle>
        <GlassCard style={{ marginBottom: Spacing.md }}>
          <View style={styles.bookingLinkHeader}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.bookingLinkTitle}>Booking Link</ThemedText>
              <ThemedText style={[styles.bookingLinkUrl, { color: ACCENT_GOLD }]} numberOfLines={1}>
                {getBookingDomain()}/book/{business?.slug || "..."}
              </ThemedText>
            </View>
            <Pressable 
              onPress={handleCopyBookingLink}
              style={[styles.copyButton, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]}
            >
              <Feather name="copy" size={16} color={theme.text} />
            </Pressable>
          </View>
          <View style={styles.bookingActions}>
            <Pressable 
              onPress={handleOpenSharePreview}
              style={[styles.shareButton, { backgroundColor: theme.text }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                <Feather name="share-2" size={18} color={theme.backgroundDefault} />
                <ThemedText style={[styles.shareButtonText, { color: theme.backgroundDefault }]}>Share Link</ThemedText>
              </View>
            </Pressable>
            <Pressable 
              onPress={handleShowQRCode}
              style={[styles.qrButton, { borderColor: theme.text + "30" }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                <Feather name="grid" size={18} color={theme.text} />
                <ThemedText style={[styles.shareButtonText, { color: theme.text }]}>Share QR</ThemedText>
              </View>
            </Pressable>
          </View>
        </GlassCard>
        <GlassCard style={{ marginBottom: Spacing["2xl"] }} onPress={handleShowEmbedModal}>
          <View style={styles.compactInnerRow}>
            <View style={[styles.compactIconBox, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]}>
              <Feather name="code" size={18} color={theme.text} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.compactRowTitle}>Embed Widget</ThemedText>
              <ThemedText style={styles.compactRowSubtitle}>Add to your website</ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color={theme.textTertiary} style={{ opacity: 0.3 }} />
          </View>
        </GlassCard>

        {/* Security Section */}
        <SectionTitle>Security</SectionTitle>
        <View style={styles.gridRow}>
          <GlassCard style={styles.securityCard} onPress={handleShowDemoTypeModal}>
            <Feather name="download-cloud" size={22} color={ACCENT_GOLD} style={{ marginBottom: Spacing.sm }} />
            <ThemedText style={styles.securityCardTitle}>Demo Data</ThemedText>
            <ThemedText style={styles.securityCardSubtitle}>LOAD SAMPLES</ThemedText>
          </GlassCard>
          <GlassCard style={[styles.securityCard, { borderColor: "rgba(239,68,68,0.2)" }]} onPress={handleClearAllData}>
            <Feather name="trash-2" size={22} color="#EF4444" style={{ marginBottom: Spacing.sm, opacity: 0.6 }} />
            <ThemedText style={styles.securityCardTitle}>Wipe Cloud</ThemedText>
            <ThemedText style={styles.securityCardSubtitle}>Clear all data</ThemedText>
          </GlassCard>
        </View>
        <GlassCard style={{ marginBottom: Spacing["2xl"] }}>
          <CompactRow icon="shield" title="Privacy Protocol" onPress={() => Linking.openURL("https://confirmbooking.online/privacy-policy")} />
          <View style={[styles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]} />
          <CompactRow icon="file-text" title="Terms of Use" onPress={() => Linking.openURL("https://confirmbooking.online/terms")} />
        </GlassCard>

        {/* Footer */}
        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>Designed for Excellence • v4.2.0</ThemedText>
        </View>
      </ScrollView>

      {/* QR Code Modal */}
      <Modal
        visible={qrModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Booking QR Code</ThemedText>
              <Pressable onPress={() => setQrModalVisible(false)} style={styles.closeButton}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            <View style={styles.qrContainer}>
              {qrCode ? (
                <Image
                  source={{ uri: qrCode }}
                  style={styles.qrImage}
                  contentFit="contain"
                />
              ) : (
                <ActivityIndicator size="large" color={theme.text} />
              )}
              <ThemedText style={styles.qrUrl}>{bookingUrl}</ThemedText>
            </View>
            <View style={styles.modalActions}>
              <Button onPress={handleDownloadQRCode}>Share QR Code Image</Button>
              <Pressable onPress={() => setQrModalVisible(false)} style={[styles.secondaryButton, { backgroundColor: theme.backgroundSecondary }]}>
                <ThemedText style={styles.secondaryButtonText}>Close</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Field Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                Edit {editingField === "name" ? "Business Name" : 
                      editingField === "website" ? "Website" : 
                      editingField === "phone" ? "Phone" : "Business Link ID"}
              </ThemedText>
              <Pressable onPress={() => setEditModalVisible(false)} style={styles.closeButton}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            {editingField === "slug" && (
              <ThemedText style={styles.slugHelper}>
                Your booking link will be: {getBookingDomain()}/book/{editValue || "..."}
              </ThemedText>
            )}
            <TextInput
              style={[styles.editInput, { 
                backgroundColor: theme.backgroundSecondary, 
                color: theme.text,
                borderColor: theme.border 
              }]}
              value={editValue}
              onChangeText={setEditValue}
              placeholder={`Enter ${editingField}`}
              placeholderTextColor={theme.textTertiary}
              autoCapitalize={editingField === "slug" ? "none" : "sentences"}
              autoCorrect={editingField !== "slug"}
              keyboardType={editingField === "phone" ? "phone-pad" : editingField === "website" ? "url" : "default"}
            />
            <View style={styles.modalActions}>
              <Button onPress={handleSaveBusinessField} disabled={editLoading}>
                {editLoading ? "Saving..." : "Save"}
              </Button>
              <Pressable onPress={() => setEditModalVisible(false)} style={[styles.secondaryButton, { backgroundColor: theme.backgroundSecondary }]}>
                <ThemedText style={styles.secondaryButtonText}>Cancel</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Demo Type Modal */}
      <Modal
        visible={demoTypeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDemoTypeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Choose Business Type</ThemedText>
              <Pressable onPress={() => setDemoTypeModalVisible(false)} style={styles.closeButton}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            <View style={styles.demoTypeGrid}>
              {DEMO_TYPES.map((type) => (
                <Pressable
                  key={type.id}
                  style={[
                    styles.demoTypeButton,
                    { backgroundColor: selectedDemoType === type.id ? theme.accent : theme.backgroundSecondary }
                  ]}
                  onPress={() => setSelectedDemoType(type.id)}
                >
                  <ThemedText style={[styles.demoTypeLabel, { color: selectedDemoType === type.id ? theme.buttonText : theme.text }]}>
                    {type.label}
                  </ThemedText>
                  <ThemedText style={[styles.demoTypeDescription, { color: selectedDemoType === type.id ? theme.buttonText : theme.textSecondary }]}>
                    {type.description}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            <View style={styles.modalActions}>
              <Button onPress={() => handleInitializeDemoData(selectedDemoType)} disabled={demoDataLoading}>
                {demoDataLoading ? "Loading..." : "Load Demo Data"}
              </Button>
              <Pressable onPress={() => setDemoTypeModalVisible(false)} style={[styles.secondaryButton, { backgroundColor: theme.backgroundSecondary }]}>
                <ThemedText style={styles.secondaryButtonText}>Cancel</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Embed Code Modal */}
      <Modal
        visible={embedModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseEmbedModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.embedModalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Embed Widget</ThemedText>
              <Pressable onPress={handleCloseEmbedModal} style={styles.closeButton}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            {embedLoading ? (
              <View style={styles.embedLoading}>
                <ActivityIndicator size="large" color={theme.text} />
                <ThemedText style={styles.embedLoadingText}>Loading widget options...</ThemedText>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
                <ThemedText style={styles.embedDescription}>
                  Add a booking widget to your website. Select a style:
                </ThemedText>

                {/* Inline Widget Preview */}
                <Pressable 
                  style={[styles.embedPreviewCard, { borderColor: selectedEmbedType === "inline" ? ACCENT_GOLD : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)") }]}
                  onPress={() => setSelectedEmbedType("inline")}
                >
                  <View style={styles.embedPreviewHeader}>
                    <View style={[styles.embedPreviewIcon, { backgroundColor: selectedEmbedType === "inline" ? ACCENT_GOLD + "20" : theme.backgroundSecondary }]}>
                      <Feather name="layout" size={20} color={selectedEmbedType === "inline" ? ACCENT_GOLD : theme.text} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.embedPreviewTitle}>Inline Widget</ThemedText>
                      <ThemedText style={styles.embedPreviewSubtitle}>Embedded directly on your page</ThemedText>
                    </View>
                    {selectedEmbedType === "inline" && <Feather name="check-circle" size={20} color={ACCENT_GOLD} />}
                  </View>
                  <View style={[styles.embedPreviewMockup, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }]}>
                    <View style={[styles.mockupHeader, { backgroundColor: theme.backgroundSecondary }]}>
                      <View style={[styles.mockupDot, { backgroundColor: "#FF5F56" }]} />
                      <View style={[styles.mockupDot, { backgroundColor: "#FFBD2E" }]} />
                      <View style={[styles.mockupDot, { backgroundColor: "#27CA40" }]} />
                    </View>
                    <View style={styles.mockupContent}>
                      <View style={[styles.mockupLine, { width: "60%", backgroundColor: theme.textTertiary + "30" }]} />
                      <View style={[styles.mockupLine, { width: "40%", backgroundColor: theme.textTertiary + "20" }]} />
                      <View style={[styles.mockupWidget, { backgroundColor: theme.text, borderRadius: BorderRadius.md }]}>
                        <Feather name="calendar" size={12} color={theme.backgroundDefault} />
                        <ThemedText style={[styles.mockupWidgetText, { color: theme.backgroundDefault }]}>Book Now</ThemedText>
                      </View>
                      <View style={[styles.mockupLine, { width: "80%", backgroundColor: theme.textTertiary + "20" }]} />
                    </View>
                  </View>
                </Pressable>

                {/* Popup Button Preview */}
                <Pressable 
                  style={[styles.embedPreviewCard, { borderColor: selectedEmbedType === "popup-button" ? ACCENT_GOLD : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)") }]}
                  onPress={() => setSelectedEmbedType("popup-button")}
                >
                  <View style={styles.embedPreviewHeader}>
                    <View style={[styles.embedPreviewIcon, { backgroundColor: selectedEmbedType === "popup-button" ? ACCENT_GOLD + "20" : theme.backgroundSecondary }]}>
                      <Feather name="square" size={20} color={selectedEmbedType === "popup-button" ? ACCENT_GOLD : theme.text} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.embedPreviewTitle}>Popup Button</ThemedText>
                      <ThemedText style={styles.embedPreviewSubtitle}>Styled button opens a popup</ThemedText>
                    </View>
                    {selectedEmbedType === "popup-button" && <Feather name="check-circle" size={20} color={ACCENT_GOLD} />}
                  </View>
                  <View style={[styles.embedPreviewMockup, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }]}>
                    <View style={[styles.mockupHeader, { backgroundColor: theme.backgroundSecondary }]}>
                      <View style={[styles.mockupDot, { backgroundColor: "#FF5F56" }]} />
                      <View style={[styles.mockupDot, { backgroundColor: "#FFBD2E" }]} />
                      <View style={[styles.mockupDot, { backgroundColor: "#27CA40" }]} />
                    </View>
                    <View style={styles.mockupContent}>
                      <View style={[styles.mockupLine, { width: "70%", backgroundColor: theme.textTertiary + "30" }]} />
                      <View style={[styles.mockupButton, { backgroundColor: theme.text }]}>
                        <ThemedText style={[styles.mockupButtonText, { color: theme.backgroundDefault }]}>Book Appointment</ThemedText>
                      </View>
                      <View style={[styles.mockupLine, { width: "50%", backgroundColor: theme.textTertiary + "20" }]} />
                    </View>
                  </View>
                </Pressable>

                {/* Popup Link Preview */}
                <Pressable 
                  style={[styles.embedPreviewCard, { borderColor: selectedEmbedType === "popup-text" ? ACCENT_GOLD : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)") }]}
                  onPress={() => setSelectedEmbedType("popup-text")}
                >
                  <View style={styles.embedPreviewHeader}>
                    <View style={[styles.embedPreviewIcon, { backgroundColor: selectedEmbedType === "popup-text" ? ACCENT_GOLD + "20" : theme.backgroundSecondary }]}>
                      <Feather name="link" size={20} color={selectedEmbedType === "popup-text" ? ACCENT_GOLD : theme.text} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.embedPreviewTitle}>Text Link</ThemedText>
                      <ThemedText style={styles.embedPreviewSubtitle}>Minimal link opens a popup</ThemedText>
                    </View>
                    {selectedEmbedType === "popup-text" && <Feather name="check-circle" size={20} color={ACCENT_GOLD} />}
                  </View>
                  <View style={[styles.embedPreviewMockup, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }]}>
                    <View style={[styles.mockupHeader, { backgroundColor: theme.backgroundSecondary }]}>
                      <View style={[styles.mockupDot, { backgroundColor: "#FF5F56" }]} />
                      <View style={[styles.mockupDot, { backgroundColor: "#FFBD2E" }]} />
                      <View style={[styles.mockupDot, { backgroundColor: "#27CA40" }]} />
                    </View>
                    <View style={styles.mockupContent}>
                      <View style={[styles.mockupLine, { width: "60%", backgroundColor: theme.textTertiary + "30" }]} />
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <View style={[styles.mockupLine, { width: "30%", backgroundColor: theme.textTertiary + "20" }]} />
                        <ThemedText style={[styles.mockupLinkText, { color: ACCENT_GOLD }]}>Schedule a call</ThemedText>
                      </View>
                      <View style={[styles.mockupLine, { width: "75%", backgroundColor: theme.textTertiary + "20" }]} />
                    </View>
                  </View>
                </Pressable>

                <View style={styles.modalActions}>
                  <Button 
                    onPress={handleCopyEmbedCode}
                    children={copiedCode ? "Copied!" : "Copy Embed Code"}
                  />
                  <Button 
                    onPress={() => setEmbedInstructionsVisible(true)}
                  >
                    How to Install?
                  </Button>
                  <Pressable onPress={handleCloseEmbedModal} style={[styles.secondaryButton, { backgroundColor: theme.backgroundSecondary }]}>
                    <ThemedText style={styles.secondaryButtonText}>Close</ThemedText>
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Embed Instructions Modal */}
      <Modal
        visible={embedInstructionsVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEmbedInstructionsVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setEmbedInstructionsVisible(false)}
        >
          <ThemedView style={[styles.modalContent, { padding: Spacing.xl, maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Installation Guide</ThemedText>
              <Pressable onPress={() => setEmbedInstructionsVisible(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ marginBottom: Spacing.xl }}>
                <ThemedText style={{ fontWeight: '700', marginBottom: Spacing.xs }}>Step 1: Copy the Code</ThemedText>
                <ThemedText style={{ opacity: 0.7 }}>Choose your preferred embed style and click "Copy Code".</ThemedText>
              </View>

              <View style={{ marginBottom: Spacing.xl }}>
                <ThemedText style={{ fontWeight: '700', marginBottom: Spacing.xs }}>Step 2: Add to Website</ThemedText>
                <ThemedText style={{ opacity: 0.7 }}>Open your website editor (Wix, WordPress, Webflow, etc.) and add a "Custom HTML" or "Embed" block.</ThemedText>
              </View>

              <View style={{ marginBottom: Spacing.xl }}>
                <ThemedText style={{ fontWeight: '700', marginBottom: Spacing.xs }}>Step 3: Paste & Publish</ThemedText>
                <ThemedText style={{ opacity: 0.7 }}>Paste the copied code into that block, then save and publish your changes.</ThemedText>
              </View>

              <View style={[styles.glassCard, { padding: Spacing.md, backgroundColor: theme.text + "05" }]}>
                <ThemedText style={{ fontSize: 14, fontStyle: 'italic', opacity: 0.6 }}>
                  Tip: The "Inline" type is best for dedicated booking pages, while "Popup Button" works great on your home page.
                </ThemedText>
              </View>
            </ScrollView>

            <Button 
              onPress={handleDownloadInstructions}
              children="Download Instructions (.txt)"
              style={{ marginTop: Spacing.xl }}
            />
          </ThemedView>
        </Pressable>
      </Modal>

      {/* Currency Modal */}
      <Modal
        visible={currencyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCurrencyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.currencyModalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Select Currency</ThemedText>
              <Pressable onPress={() => setCurrencyModalVisible(false)} style={styles.closeButton}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.currencyList} showsVerticalScrollIndicator={false}>
              {CURRENCY_OPTIONS.map((currency) => (
                <Pressable
                  key={currency.id}
                  style={[
                    styles.currencyItem,
                    { backgroundColor: business?.currency === currency.id ? theme.accent : "transparent" }
                  ]}
                  onPress={() => handleSelectCurrency(currency.id)}
                >
                  <ThemedText style={[styles.currencySymbol, { color: business?.currency === currency.id ? theme.buttonText : theme.text }]}>
                    {currency.symbol}
                  </ThemedText>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.currencyLabel, { color: business?.currency === currency.id ? theme.buttonText : theme.text }]}>
                      {currency.label}
                    </ThemedText>
                    <ThemedText style={[styles.currencyCode, { color: business?.currency === currency.id ? theme.buttonText : theme.textSecondary }]}>
                      {currency.id}
                    </ThemedText>
                  </View>
                  {business?.currency === currency.id && (
                    <Feather name="check" size={20} color={theme.buttonText} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
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
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -1,
    opacity: 0.9,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  sectionContent: {
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
  },
  glassCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  premiumRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  premiumIconBox: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  premiumRowTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  premiumRowSubtitle: {
    fontSize: 13,
    opacity: 0.5,
  },
  gridRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  gridCard: {
    flex: 1,
    height: 140,
    justifyContent: "space-between",
  },
  gridIconCircle: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  gridCardContent: {
    marginTop: "auto",
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    opacity: 0.4,
    marginBottom: 4,
  },
  gridValue: {
    fontSize: 17,
    fontWeight: "700",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    opacity: 0.4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  workflowCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.xl,
  },
  workflowIconContainer: {
    position: "relative",
  },
  workflowIconCircle: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  workflowTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  workflowSubtitle: {
    fontSize: 13,
    opacity: 0.5,
    lineHeight: 18,
  },
  workflowCta: {
    marginTop: Spacing.md,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  compactInnerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  compactIconBox: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  compactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  compactRowTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  compactRowSubtitle: {
    fontSize: 12,
    opacity: 0.4,
  },
  soonBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  soonBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  bookingLinkHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  bookingLinkTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  bookingLinkUrl: {
    fontSize: 12,
    fontWeight: "500",
  },
  copyButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  bookingActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  shareButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    height: 52,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  qrButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderWidth: 1,
  },
  securityCard: {
    flex: 1,
    padding: Spacing.lg,
  },
  securityCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  securityCardSubtitle: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    opacity: 0.4,
  },
  footer: {
    alignItems: "center",
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  footerText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 3,
    opacity: 0.2,
    fontStyle: "italic",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
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
  embedPreviewCard: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  embedPreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  embedPreviewIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  embedPreviewTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  embedPreviewSubtitle: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  embedPreviewMockup: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  mockupHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 5,
  },
  mockupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mockupContent: {
    padding: Spacing.md,
    gap: 8,
  },
  mockupLine: {
    height: 8,
    borderRadius: 4,
  },
  mockupWidget: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    alignSelf: "flex-start",
    gap: 6,
    marginVertical: 4,
  },
  mockupWidgetText: {
    fontSize: 11,
    fontWeight: "600",
  },
  mockupButton: {
    paddingVertical: 8,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    alignSelf: "flex-start",
    marginVertical: 4,
  },
  mockupButtonText: {
    fontSize: 11,
    fontWeight: "600",
  },
  mockupLinkText: {
    fontSize: 11,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  currencyModalContent: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "70%",
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  currencyList: {
    maxHeight: 400,
  },
  currencyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: "600",
    width: 40,
    textAlign: "center",
    marginRight: Spacing.md,
  },
  currencyLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  currencyCode: {
    fontSize: 12,
    opacity: 0.6,
  },
  secondaryButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: "600",
  },
});
