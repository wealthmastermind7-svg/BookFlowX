import React, { useState, useEffect, useRef } from "react";
import {
  View,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  Share,
  Alert,
  Modal,
  ImageBackground,
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
} from "react-native-reanimated";

import { Spacing, BorderRadius } from "@/constants/theme";
import { api, Service, Business } from "@/lib/api";
import { getBookingDomain } from "@/lib/query-client";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getCurrencySymbol } from "@/lib/currency";
import QRCode from "react-native-qrcode-svg";

import { usePremium } from "@/contexts/PremiumContext";

const silkBackground = require("../../attached_assets/generated_images/black_silk_flowing_fabric_background_for_services.png");

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

  const fadeIn = useSharedValue(0);
  const serviceId = (route.params as any)?.serviceId;

  useEffect(() => {
    fadeIn.value = withTiming(1, { duration: 600 });
  }, []);

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
      
      if (serviceId) {
        await api.updateService(serviceId, {
          name: service.name,
          duration: service.duration,
          price: service.price || 0,
          description: service.description,
        });
      } else {
        await api.createService({
          name: service.name,
          duration: service.duration,
          price: service.price || 0,
          description: service.description,
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

  const containerStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
  }));

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
        <Animated.View style={[styles.contentContainer, containerStyle]}>
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <Pressable 
              onPress={() => navigation.goBack()} 
              style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.5 : 1 }]}
            >
              <Feather name="arrow-left" size={24} color="#fff" />
            </Pressable>
            <Animated.Text style={styles.headerTitle}>Edit Service</Animated.Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.tabCarousel}>
            <Pressable onPress={() => setActiveTab("details")}>
              <Animated.Text style={[
                styles.carouselItem,
                activeTab === "details" ? styles.carouselItemActive : styles.carouselItemInactive
              ]}>
                Details
              </Animated.Text>
            </Pressable>
            <Pressable onPress={() => setActiveTab("links")}>
              <Animated.Text style={[
                styles.carouselItem,
                activeTab === "links" ? styles.carouselItemActive : styles.carouselItemInactive
              ]}>
                Links
              </Animated.Text>
            </Pressable>
          </View>

          <KeyboardAwareScrollViewCompat
            contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === "details" && (
              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Animated.Text style={styles.inputLabel}>Service Name</Animated.Text>
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
                  <Animated.Text style={styles.inputLabel}>Duration (minutes)</Animated.Text>
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
                  <Animated.Text style={styles.inputLabel}>Price ({currencySymbol})</Animated.Text>
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
                  <Animated.Text style={styles.inputLabel}>Description</Animated.Text>
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

            {activeTab === "links" && (
              <View style={styles.linksContainer}>
                {!serviceId ? (
                  <GlassPanel style={styles.linkCard}>
                    <Animated.Text style={styles.linkCardTitle}>Save First</Animated.Text>
                    <Animated.Text style={styles.linkCardDesc}>
                      Save this service to generate its unique booking link and QR code
                    </Animated.Text>
                  </GlassPanel>
                ) : (
                  <>
                    <GlassPanel style={styles.linkCard}>
                      <Animated.Text style={styles.linkCardTitle}>Direct Booking Link</Animated.Text>
                      <Animated.Text style={styles.linkCardDesc}>
                        Share this link to let customers book directly
                      </Animated.Text>
                      
                      <Pressable onPress={handleCopyServiceLink} style={styles.linkUrlContainer}>
                        <Animated.Text style={styles.linkUrl} numberOfLines={1}>
                          {bookingLink?.replace(/^https?:\/\//, "") || "Loading..."}
                        </Animated.Text>
                        <Feather name={isPremium ? "copy" : "lock"} size={18} color="rgba(255,255,255,0.6)" />
                      </Pressable>

                      <Pressable onPress={handleShareServiceLink} style={styles.linkButton}>
                        <Feather name={isPremium ? "share" : "lock"} size={18} color="#fff" />
                        <Animated.Text style={styles.linkButtonText}>Share Link</Animated.Text>
                      </Pressable>
                    </GlassPanel>

                    <GlassPanel style={styles.linkCard}>
                      <Animated.Text style={styles.linkCardTitle}>QR Code</Animated.Text>
                      <Animated.Text style={styles.linkCardDesc}>
                        Display this QR code for customers to scan and book
                      </Animated.Text>

                      <Pressable onPress={handleShowQRCode} style={styles.linkButton}>
                        <Feather name={isPremium ? "maximize" : "lock"} size={18} color="#fff" />
                        <Animated.Text style={styles.linkButtonText}>View QR Code</Animated.Text>
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
              <Animated.Text style={styles.cancelButtonText}>Cancel</Animated.Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => [styles.saveButton, { opacity: pressed ? 0.9 : saving ? 0.5 : 1 }]}
            >
              <Animated.Text style={styles.saveButtonText}>
                {saving ? "Saving..." : "Save Service"}
              </Animated.Text>
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
                <Animated.Text style={styles.qrModalTitle}>
                  {service.name || "Service"} QR Code
                </Animated.Text>
                <Pressable onPress={() => setQrModalVisible(false)} style={styles.closeButton}>
                  <Feather name="x" size={24} color="#fff" />
                </Pressable>
              </View>

              <View style={styles.qrContainer}>
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
              </View>

              <Animated.Text style={styles.qrDescription}>
                Scan to book {service.name}
              </Animated.Text>

              <Pressable onPress={handleDownloadQRCode} style={styles.downloadButton}>
                <Animated.Text style={styles.downloadButtonText}>Download QR Code</Animated.Text>
              </Pressable>
            </View>
          </Pressable>
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
    fontSize: 48,
    fontWeight: "600",
  },
  carouselItemActive: {
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  carouselItemInactive: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 32,
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
});
