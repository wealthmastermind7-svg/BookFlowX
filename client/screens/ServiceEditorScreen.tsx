import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Keyboard,
  Share,
  Alert,
  Modal,
  ImageBackground,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { Paths, File as ExpoFile } from "expo-file-system";
import * as Clipboard from "expo-clipboard";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeIn,
} from "react-native-reanimated";

import { Spacing, BorderRadius } from "@/constants/theme";
import { api, Service, Business } from "@/lib/api";
import { getBookingDomain, getApiUrl } from "@/lib/query-client";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getCurrencySymbol } from "@/lib/currency";
import QRCode from "react-native-qrcode-svg";

import { usePremium } from "@/contexts/PremiumContext";

const silkBackground = require("../assets/stock_images/abstract_dark_fluid__e119120c.jpg");

type EditScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "ServiceEditor"
>;

function GlassPanel({ children, style }: { children: React.ReactNode; style?: any }) {
  if (Platform.OS === "ios") {
    return (
      <BlurView intensity={30} tint="dark" style={[styles.glassPanel, style]}>
        {children}
      </BlurView>
    );
  }
  return (
    <View style={[styles.glassPanel, styles.glassPanelAndroid, style]}>
      {children}
    </View>
  );
}

export default function ServiceEditorScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation<EditScreenNavigationProp>();
  const { isPremium, checkShareAccess, checkQrAccess, showPaywall } = usePremium();

  const isActuallyPremium = isPremium;

  const [service, setService] = useState<Partial<Service>>({
    name: "",
    duration: 30,
    price: 0,
    description: "",
  });

  const [activeTab, setActiveTab] = useState<"details" | "upsells" | "links">("details");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [businessReady, setBusinessReady] = useState(!!api.getBusinessId());
  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [business, setBusiness] = useState<Business | null>(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [upsellModalVisible, setUpsellModalVisible] = useState(false);
  const [upsells, setUpsells] = useState<any[]>([]);
  const [savedUpsells, setSavedUpsells] = useState<{name: string; description: string; price: number}[]>([]);
  const [upsellLoading, setUpsellLoading] = useState(false);
  const [editingUpsellIndex, setEditingUpsellIndex] = useState<number | null>(null);
  const qrRef = useRef<any>(null);

  const serviceId = (route.params as any)?.serviceId;

  const handleGetUpsells = async () => {
    if (!service.name) return;
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    setUpsellModalVisible(true);
    setUpsellLoading(true);
    setUpsells([]);
    
    try {
      const apiUrl = getApiUrl();
      const fullUrl = `${apiUrl}api/ai/upsell-suggestions`;
      console.log("[Upsell] Calling:", fullUrl);
      
      const response = await fetch(fullUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          serviceName: service.name,
          serviceDescription: service.description || "",
          servicePrice: (service.price || 0) / 100,
          businessType: business?.name || "Service",
          currency: business?.currency || "USD"
        })
      });
      
      console.log("[Upsell] Response status:", response.status);
      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.log("[Upsell] Non-JSON response, content-type:", contentType);
        setUpsells([]);
        return;
      }
      
      const data = await response.json();
      console.log("[Upsell] Suggestions count:", data.suggestions?.length || 0);
      
      if (response.ok && data.suggestions && data.suggestions.length > 0) {
        setUpsells(data.suggestions);
      }
    } catch (error: any) {
      console.error("[Upsell] Error:", error?.message || error);
    } finally {
      setUpsellLoading(false);
    }
  };

  const handleAddUpsell = async (upsell: any) => {
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    setSavedUpsells(prev => [...prev, {
      name: upsell.name,
      description: upsell.description || upsell.reason || "",
      price: upsell.price,
    }]);
    setUpsells(prev => prev.filter(u => u.name !== upsell.name));
  };

  const handleRemoveUpsell = (index: number) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    Alert.alert(
      "Remove Add-on",
      `Remove "${savedUpsells[index].name}" from your add-ons?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: () => setSavedUpsells(prev => prev.filter((_, i) => i !== index))
        }
      ]
    );
  };

  const handleUpdateUpsell = (index: number, field: 'name' | 'description' | 'price', value: string | number) => {
    setSavedUpsells(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

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
        if (found.upsells) {
          try {
            const parsed = JSON.parse(found.upsells);
            if (Array.isArray(parsed)) {
              setSavedUpsells(parsed);
            }
          } catch (e) {
            console.error("Error parsing upsells:", e);
          }
        }
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
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); } catch {}
    await Clipboard.setStringAsync(link);
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); } catch {}
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
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); } catch {}
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
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); } catch {}
    setQrModalVisible(true);
  };

  const handleDownloadQRCode = async () => {
    if (!qrRef.current) return;
    
    try {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); } catch {}
      
      qrRef.current.toDataURL(async (dataURL: string) => {
        try {
          if (Platform.OS === "web") {
            const link = document.createElement("a");
            link.href = `data:image/png;base64,${dataURL}`;
            link.download = `${service.name?.replace(/\s+/g, "-").toLowerCase() || "service"}-qr.png`;
            link.click();
            return;
          }

          const filename = `${service.name?.replace(/\s+/g, "-").toLowerCase() || "service"}-qr.png`;
          const file = new ExpoFile(Paths.cache, filename);
          
          const binaryData = Uint8Array.from(atob(dataURL), c => c.charCodeAt(0));
          await file.write(binaryData);

          await Share.share({
            url: file.uri,
            title: `${service.name} - Booking QR Code`,
          });
        } catch (innerError) {
          console.error("Error processing QR code data:", innerError);
          Alert.alert("Error", "Failed to process QR code image");
        }
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
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
      
      Keyboard.dismiss();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const upsellsJson = savedUpsells.length > 0 ? JSON.stringify(savedUpsells) : null;
      
      if (serviceId) {
        await api.updateService(serviceId, {
          name: service.name,
          duration: service.duration,
          price: service.price || 0,
          description: service.description,
          upsells: upsellsJson,
        });
      } else {
        await api.createService({
          name: service.name,
          duration: service.duration,
          price: service.price || 0,
          description: service.description,
          upsells: upsellsJson,
        });
      }
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
      
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  const bookingLink = getServiceBookingLink();

  return (
    <ImageBackground source={silkBackground} style={styles.background} resizeMode="cover">
      <View style={styles.gradientOverlay} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <Animated.View 
          entering={FadeIn.duration(400)}
          style={styles.contentContainer}
        >
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <Pressable 
              onPress={() => navigation.goBack()} 
              style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.5 : 1 }]}
            >
              <Feather name="arrow-left" size={24} color="#fff" />
            </Pressable>
            <Text style={styles.headerTitle}>Edit Service</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.tabCarousel}>
            <Pressable onPress={() => setActiveTab("details")}>
              <Text style={[
                styles.carouselItem,
                activeTab === "details" ? styles.carouselItemActive : styles.carouselItemInactive
              ]}>
                Details
              </Text>
            </Pressable>
            <Pressable onPress={() => setActiveTab("upsells")}>
              <Text style={[
                styles.carouselItem,
                activeTab === "upsells" ? styles.carouselItemActive : styles.carouselItemInactive
              ]}>
                Add-ons
              </Text>
            </Pressable>
            <Pressable onPress={() => setActiveTab("links")}>
              <Text style={[
                styles.carouselItem,
                activeTab === "links" ? styles.carouselItemActive : styles.carouselItemInactive,
                !isActuallyPremium && { opacity: 0.3 }
              ]}>
                Links
              </Text>
            </Pressable>
          </View>

          <KeyboardAwareScrollViewCompat
            contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === "details" && (
              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Service Name</Text>
                  <TextInput
                    value={service.name}
                    onChangeText={(text) => setService((prev) => ({ ...prev, name: text }))}
                    placeholder="Enter service name"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    editable={!saving}
                    style={styles.inputPrimary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Duration (minutes)</Text>
                  <TextInput
                    value={String(service.duration)}
                    onChangeText={(text) => setService((prev) => ({ ...prev, duration: parseInt(text) || 0 }))}
                    placeholder="30"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    keyboardType="number-pad"
                    editable={!saving}
                    style={styles.inputSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Price ({currencySymbol})</Text>
                  <TextInput
                    value={String((service.price || 0) / 100)}
                    onChangeText={(text) => setService((prev) => ({ ...prev, price: Math.round((parseFloat(text) || 0) * 100) }))}
                    placeholder="0.00"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    keyboardType="decimal-pad"
                    editable={!saving}
                    style={styles.inputSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>Description</Text>
                    {service.name ? (
                      <Pressable onPress={handleGetUpsells} style={styles.aiUpsellTrigger}>
                        <Feather name="zap" size={12} color="#fff" />
                        <Text style={styles.aiUpsellTriggerText}>AI Upsells</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <TextInput
                    value={service.description || ""}
                    onChangeText={(text) => setService((prev) => ({ ...prev, description: text }))}
                    placeholder="Enter service description"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    multiline
                    numberOfLines={4}
                    editable={!saving}
                    style={[styles.inputSecondary, styles.textArea]}
                  />
                </View>
              </View>
            )}

            {activeTab === "upsells" && (
              <View style={styles.formContainer}>
                <GlassPanel style={styles.linkCard}>
                  <View style={styles.labelRow}>
                    <Text style={styles.linkCardTitle}>Custom Add-ons</Text>
                    <Pressable onPress={handleGetUpsells} style={styles.aiUpsellTrigger}>
                      <Feather name="zap" size={12} color="#fff" />
                      <Text style={styles.aiUpsellTriggerText}>AI Suggest</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.linkCardDesc}>
                    Add-ons customers can select when booking this service
                  </Text>
                  
                  {savedUpsells.length === 0 ? (
                    <View style={styles.emptyUpsells}>
                      <Feather name="package" size={32} color="rgba(255,255,255,0.3)" />
                      <Text style={styles.emptyUpsellsText}>
                        No add-ons yet. Tap "AI Suggest" to get smart recommendations.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.savedUpsellsList}>
                      {savedUpsells.map((upsell, index) => (
                        <View key={index} style={styles.savedUpsellCard}>
                          {editingUpsellIndex === index ? (
                            <View style={styles.editUpsellForm}>
                              <TextInput
                                value={upsell.name}
                                onChangeText={(text) => handleUpdateUpsell(index, 'name', text)}
                                placeholder="Add-on name"
                                placeholderTextColor="rgba(255,255,255,0.4)"
                                style={[styles.inputSecondary, { marginBottom: 8 }]}
                              />
                              <TextInput
                                value={upsell.description}
                                onChangeText={(text) => handleUpdateUpsell(index, 'description', text)}
                                placeholder="Description"
                                placeholderTextColor="rgba(255,255,255,0.4)"
                                multiline
                                style={[styles.inputSecondary, { marginBottom: 8, minHeight: 60 }]}
                              />
                              <View style={styles.priceEditRow}>
                                <Text style={styles.inputLabel}>{currencySymbol}</Text>
                                <TextInput
                                  value={String(upsell.price)}
                                  onChangeText={(text) => handleUpdateUpsell(index, 'price', parseFloat(text) || 0)}
                                  keyboardType="decimal-pad"
                                  style={[styles.inputSecondary, { flex: 1 }]}
                                />
                              </View>
                              <Pressable 
                                onPress={() => setEditingUpsellIndex(null)} 
                                style={styles.doneEditButton}
                              >
                                <Text style={styles.doneEditButtonText}>Done</Text>
                              </Pressable>
                            </View>
                          ) : (
                            <>
                              <View style={styles.savedUpsellInfo}>
                                <Text style={styles.savedUpsellName}>{upsell.name}</Text>
                                <Text style={styles.savedUpsellDesc} numberOfLines={2}>{upsell.description}</Text>
                                <Text style={styles.savedUpsellPrice}>{currencySymbol}{upsell.price}</Text>
                              </View>
                              <View style={styles.savedUpsellActions}>
                                <Pressable 
                                  onPress={() => setEditingUpsellIndex(index)} 
                                  style={styles.upsellActionButton}
                                >
                                  <Feather name="edit-2" size={16} color="#fff" />
                                </Pressable>
                                <Pressable 
                                  onPress={() => handleRemoveUpsell(index)} 
                                  style={styles.upsellActionButton}
                                >
                                  <Feather name="trash-2" size={16} color="#ff4444" />
                                </Pressable>
                              </View>
                            </>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </GlassPanel>
              </View>
            )}

            {activeTab === "links" && (
              <View style={styles.linksContainer}>
                {!serviceId ? (
                  <GlassPanel style={styles.linkCard}>
                    <Text style={styles.linkCardTitle}>Save First</Text>
                    <Text style={styles.linkCardDesc}>
                      Save this service to generate its unique booking link and QR code
                    </Text>
                  </GlassPanel>
                ) : (
                  <>
                    <GlassPanel style={styles.linkCard}>
                      <Text style={styles.linkCardTitle}>Direct Booking Link</Text>
                      <Text style={styles.linkCardDesc}>
                        Share this link to let customers book directly
                      </Text>
                      
                      <Pressable 
                        onPress={() => {
                          if (checkShareAccess()) {
                            handleCopyServiceLink();
                          }
                        }} 
                        style={styles.linkUrlContainer}
                      >
                        <Text style={styles.linkUrl} numberOfLines={1}>
                          {bookingLink?.replace(/^https?:\/\//, "") || "Loading..."}
                        </Text>
                        <Feather name={isActuallyPremium ? "copy" : "lock"} size={18} color="rgba(255,255,255,0.6)" />
                      </Pressable>

                      <Pressable 
                        onPress={() => {
                          if (checkShareAccess()) {
                            handleShareServiceLink();
                          }
                        }} 
                        style={styles.linkButton}
                      >
                        <Feather name={isActuallyPremium ? "share" : "lock"} size={18} color="#fff" />
                        <Text style={styles.linkButtonText}>Share Link</Text>
                      </Pressable>
                    </GlassPanel>

                    <GlassPanel style={styles.linkCard}>
                      <Text style={styles.linkCardTitle}>QR Code</Text>
                      <Text style={styles.linkCardDesc}>
                        Display this QR code for customers to scan and book
                      </Text>

                      <Pressable 
                        onPress={() => {
                          if (checkQrAccess()) {
                            handleShowQRCode();
                          }
                        }} 
                        style={styles.linkButton}
                      >
                        <Feather name={isActuallyPremium ? "maximize" : "lock"} size={18} color="#fff" />
                        <Text style={styles.linkButtonText}>View QR Code</Text>
                      </Pressable>
                    </GlassPanel>
                  </>
                )}
              </View>
            )}
          </KeyboardAwareScrollViewCompat>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
            <Pressable
              onPress={() => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {} navigation.goBack(); }}
              disabled={saving}
              style={({ pressed }) => [styles.cancelButton, { opacity: pressed ? 0.7 : saving ? 0.5 : 1 }]}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => [styles.saveButton, { opacity: pressed ? 0.9 : saving ? 0.5 : 1 }]}
            >
              <Text style={styles.saveButtonText}>
                {saving ? "Saving..." : "Save Service"}
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        <Modal
          visible={qrModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setQrModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setQrModalVisible(false)}>
            <View style={styles.qrModalContent}>
              <View style={styles.qrModalHeader}>
                <Text style={styles.qrModalTitle}>
                  {service.name || "Service"} QR Code
                </Text>
                <Pressable onPress={() => setQrModalVisible(false)} style={styles.closeButton}>
                  <Feather name="x" size={24} color="#fff" />
                </Pressable>
              </View>

              <Pressable 
                onPress={() => bookingLink && Linking.openURL(bookingLink)}
                style={styles.qrContainer}
              >
                {bookingLink && (
                  <View style={{ padding: 16, backgroundColor: 'white', borderRadius: 16 }}>
                    <QRCode
                      value={bookingLink}
                      size={200}
                      backgroundColor="white"
                      color="black"
                      getRef={(ref: any) => (qrRef.current = ref)}
                    />
                  </View>
                )}
                <Text style={styles.qrDescription}>
                  Scan to book {service.name} or tap to open link
                </Text>
              </Pressable>

              <Pressable onPress={handleDownloadQRCode} style={styles.downloadButton}>
                <Text style={styles.downloadButtonText}>Download QR Code</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        <Modal
          visible={upsellModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setUpsellModalVisible(false)}
        >
          <View style={[styles.modalOverlay, { justifyContent: "flex-end", padding: 0 }]}>
            <Pressable style={styles.modalDismiss} onPress={() => setUpsellModalVisible(false)} />
            <View style={[styles.upsellModalContent, { paddingBottom: insets.bottom + 20 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Smart Upsells</Text>
                <Pressable onPress={() => setUpsellModalVisible(false)}>
                  <Feather name="x" size={24} color="#fff" />
                </Pressable>
              </View>
              
              <Text style={styles.modalSubtitle}>
                AI-powered add-on suggestions for "{service.name}"
              </Text>

              {upsellLoading && upsells.length === 0 ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.loadingText}>Thinking...</Text>
                </View>
              ) : (
                <View style={styles.upsellList}>
                  {upsells.map((item, index) => (
                    <View key={index} style={styles.upsellCard}>
                      <View style={styles.upsellCardInfo}>
                        <Text style={styles.upsellName}>{item.name}</Text>
                        <Text style={styles.upsellReason}>{item.reason}</Text>
                        <Text style={styles.upsellPrice}>
                          {currencySymbol}{item.price}
                        </Text>
                      </View>
                      <Pressable 
                        style={styles.addUpsellButton}
                        onPress={() => handleAddUpsell(item)}
                      >
                        <Feather name="plus" size={20} color="#000" />
                      </Pressable>
                    </View>
                  ))}
                  {upsells.length === 0 && !upsellLoading && (
                    <Text style={styles.emptyText}>No suggestions found</Text>
                  )}
                </View>
              )}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: "#000",
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
  },
  headerSpacer: {
    width: 44,
  },
  tabCarousel: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 40,
    paddingVertical: 24,
  },
  carouselItem: {
    fontWeight: "600",
  },
  carouselItemActive: {
    fontSize: 48,
    color: "#fff",
    fontWeight: "600",
  },
  carouselItemInactive: {
    fontSize: 32,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "600",
  },
  formContainer: {
    paddingHorizontal: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.6)",
    marginBottom: 8,
    marginLeft: 4,
  },
  inputPrimary: {
    backgroundColor: "#fff",
    color: "#000",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    fontWeight: "500",
  },
  inputSecondary: {
    backgroundColor: "rgba(255,255,255,0.15)",
    color: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
  },
  textArea: {
    minHeight: 140,
    textAlignVertical: "top",
  },
  linksContainer: {
    paddingHorizontal: 24,
  },
  glassPanel: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
  },
  glassPanelAndroid: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  linkCard: {
    padding: 24,
    marginBottom: 20,
  },
  linkCardTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  linkCardDesc: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 16,
    lineHeight: 20,
  },
  linkUrlContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  linkUrl: {
    flex: 1,
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginRight: 8,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  linkButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#fff",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 16,
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: "500",
    color: "#fff",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#000",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  qrModalContent: {
    backgroundColor: "rgba(30,30,30,0.95)",
    borderRadius: 32,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  qrModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 24,
  },
  qrModalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  qrContainer: {
    marginBottom: 16,
  },
  qrDescription: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 24,
  },
  downloadButton: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center",
  },
  downloadButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingRight: 4,
  },
  aiUpsellTrigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  aiUpsellTriggerText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  modalDismiss: {
    flex: 1,
  },
  upsellModalContent: {
    backgroundColor: "#111",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 24,
  },
  modalLoading: {
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
  },
  upsellList: {
    gap: 12,
  },
  upsellCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  upsellCardInfo: {
    flex: 1,
    paddingRight: 12,
  },
  upsellName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  upsellReason: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 8,
  },
  upsellPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4ade80",
  },
  addUpsellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    padding: 20,
  },
  emptyUpsells: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  emptyUpsellsText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
    textAlign: "center",
    maxWidth: 240,
    lineHeight: 20,
  },
  savedUpsellsList: {
    gap: 12,
    marginTop: 8,
  },
  savedUpsellCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  savedUpsellInfo: {
    flex: 1,
    paddingRight: 12,
  },
  savedUpsellName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  savedUpsellDesc: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 6,
    lineHeight: 18,
  },
  savedUpsellPrice: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4ade80",
  },
  savedUpsellActions: {
    flexDirection: "row",
    gap: 8,
  },
  upsellActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  editUpsellForm: {
    flex: 1,
  },
  priceEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  doneEditButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  doneEditButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
  },
});
