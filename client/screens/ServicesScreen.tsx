import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Platform,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";

import { api, Service, Business } from "@/lib/api";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { formatPriceSimple } from "@/lib/currency";
import { getApiUrl } from "@/lib/query-client";
import { useI18n } from "@/contexts/I18nContext";
import { ServiceCard } from "@/components/ServiceCard";

interface AIGeneratedService {
  name: string;
  description: string;
  duration: number;
  price: number;
  bufferTime: number;
}

interface AIGeneratedAddon {
  name: string;
  description: string;
  price: number;
}

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<Navigation>();
  const { t } = useI18n();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<Business | null>(null);
  
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiServices, setAiServices] = useState<AIGeneratedService[]>([]);
  const [aiAddons, setAiAddons] = useState<AIGeneratedAddon[]>([]);
  const [aiStep, setAiStep] = useState<"input" | "review">("input");

  useEffect(() => {
    initializeBusiness();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (api.getBusinessId()) {
        loadServices();
      }
    }, [])
  );

  const initializeBusiness = async () => {
    try {
      await api.getOrCreateBusiness();
      loadServices();
    } catch (error) {
      console.error("Error initializing business:", error);
    }
  };

  const loadServices = async () => {
    setLoading(true);
    try {
      const [data, biz] = await Promise.all([
        api.getServices(),
        api.getBusiness(),
      ]);
      setServices(data);
      if (biz) setBusiness(biz);
    } catch (error) {
      console.error("Error loading services:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateService = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    navigation.navigate("ServiceEditor", {});
  };

  const handleSelectService = (serviceId: string) => {
    navigation.navigate("ServiceEditor", { serviceId });
  };

  const handleAISetup = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    setAiModalVisible(true);
    setAiStep("input");
    setAiDescription("");
    setAiServices([]);
    setAiAddons([]);
  };

  const handleAIGenerate = async () => {
    if (!aiDescription.trim()) return;
    
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    setAiGenerating(true);
    
    try {
      const apiUrl = getApiUrl();
      const fullUrl = new URL("/api/ai/generate-services", apiUrl).toString();
      console.log("[AI] Calling:", fullUrl);
      
      const response = await fetch(fullUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          description: aiDescription,
          businessType: business?.name || "Service business",
          currency: business?.currency || "USD",
        }),
      });
      
      console.log("[AI] Response status:", response.status);
      
      if (!response.ok) {
        let errorMsg = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          const errorText = await response.text();
          console.error("[AI] Server error body:", errorText);
        }
        throw new Error(errorMsg);
      }
      
      const data = await response.json();
      console.log("[AI] Generated services:", data.services?.length, "addons:", data.addons?.length);
      const servicesArray = data.services || [];
      const addonsArray = data.addons || [];
      setAiServices(servicesArray);
      setAiAddons(addonsArray);
      console.log("[AI] Set aiServices to:", servicesArray.length, "items, addons:", addonsArray.length);
      setAiStep("review");
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    } catch (error: any) {
      console.error("[AI] Generation error:", error?.message || error);
      Alert.alert(
        "Connection Error", 
        "Could not reach the server. Please check your internet connection and try again."
      );
    } finally {
      setAiGenerating(false);
    }
  };

  const handleAIConfirm = async () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    setAiGenerating(true);
    
    try {
      // Convert addons to the format expected by services (JSON string)
      const upsellsForServices = aiAddons.length > 0 
        ? JSON.stringify(aiAddons.map(addon => ({
            name: addon.name,
            description: addon.description,
            price: Math.round(addon.price * 100),
          })))
        : null;
      
      for (const svc of aiServices) {
        await api.createService({
          name: svc.name,
          description: svc.description,
          duration: svc.duration,
          price: Math.round(svc.price * 100),
          upsells: upsellsForServices, // Attach addons as upsells to each service
        });
      }
      
      await loadServices();
      setAiModalVisible(false);
      const totalItems = aiServices.length + aiAddons.length;
      Alert.alert(
        "Services Created", 
        `Added ${aiServices.length} service${aiServices.length !== 1 ? 's' : ''}${aiAddons.length > 0 ? ` with ${aiAddons.length} add-on${aiAddons.length !== 1 ? 's' : ''} attached` : ''}.`
      );
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    } catch (error) {
      console.error("Error creating services:", error);
      Alert.alert("Error", "Failed to create some services. Please try again.");
    } finally {
      setAiGenerating(false);
    }
  };

  const renderItem = ({ item }: { item: Service }) => (
    <ServiceCard
      name={item.name}
      duration={item.duration}
      price={item.price / 100}
      currency={business?.currency || "USD"}
      isActive={item.isActive}
      description={item.description}
      onPress={() => handleSelectService(item.id)}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Feather name="layers" size={48} color="#CDB99F" />
      <Text style={styles.emptyTitle}>{t('services.noServices')}</Text>
      <Text style={styles.emptyMessage}>
        {t('services.noServicesSubtitle')}
      </Text>
      <Pressable style={styles.aiSetupButton} onPress={handleAISetup}>
        <Feather name="zap" size={18} color="#FFFFFF" />
        <Text style={styles.aiSetupText}>Quick Setup</Text>
      </Pressable>
      <Text style={styles.orText}>or tap + to add manually</Text>
    </View>
  );

  const renderAIModal = () => (
    <Modal visible={aiModalVisible} transparent animationType="slide">
      <KeyboardAvoidingView 
        style={styles.modalOverlay} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <Pressable style={styles.modalDismiss} onPress={() => setAiModalVisible(false)} />
        <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {aiStep === "input" ? "Service Setup" : "Review Services"}
            </Text>
            <Pressable onPress={() => setAiModalVisible(false)} hitSlop={12}>
              <Feather name="x" size={24} color="#6B5744" />
            </Pressable>
          </View>

          {aiStep === "input" ? (
            <View style={styles.inputContainer}>
              <Text style={styles.modalSubtitle}>
                Describe your services in plain language
              </Text>
              <TextInput
                style={styles.aiInput}
                placeholder="For example: weekday rental viewings, 30 minutes each; open-home inspections on Saturday..."
                placeholderTextColor="#8B6F47"
                multiline
                numberOfLines={4}
                value={aiDescription}
                onChangeText={setAiDescription}
                textAlignVertical="top"
              />
              <Pressable
                style={[styles.aiGenerateButton, !aiDescription.trim() && styles.buttonDisabled]}
                onPress={handleAIGenerate}
                disabled={!aiDescription.trim() || aiGenerating}
              >
                {aiGenerating ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <>
                    <Feather name="zap" size={18} color="#FFFFFF" />
                    <Text style={styles.aiGenerateText}>Generate</Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={styles.reviewContainer}>
              <Text style={styles.modalSubtitle}>
                {aiServices.length} service{aiServices.length !== 1 ? 's' : ''}{aiAddons.length > 0 ? ` + ${aiAddons.length} add-on${aiAddons.length !== 1 ? 's' : ''}` : ''} generated
              </Text>
              <ScrollView 
                style={styles.reviewScrollView}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.reviewScrollContent}
              >
                {aiServices.length > 0 ? (
                  <>
                    <Text style={styles.sectionLabel}>Services</Text>
                    {aiServices.map((svc, idx) => (
                      <View key={`svc-${idx}`} style={styles.aiServiceCard}>
                        <Text style={styles.aiServiceName}>{svc.name}</Text>
                        <Text style={styles.aiServiceDesc}>{svc.description}</Text>
                        <View style={styles.aiServiceDetails}>
                          <Text style={styles.aiServiceDuration}>{svc.duration} min</Text>
                          <Text style={styles.aiServicePrice}>
                            {formatPriceSimple(svc.price, business?.currency || "USD")}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </>
                ) : (
                  <Text style={styles.noServicesText}>
                    No services could be generated. Please try a different description.
                  </Text>
                )}
                
                {aiAddons.length > 0 && (
                  <>
                    <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Add-ons (Extras)</Text>
                    <Text style={styles.addonNote}>These will be attached to all services above</Text>
                    {aiAddons.map((addon, idx) => (
                      <View key={`addon-${idx}`} style={styles.aiAddonCard}>
                        <View style={styles.addonHeader}>
                          <Feather name="plus-circle" size={14} color="#4A7C59" style={{ marginRight: 8 }} />
                          <Text style={styles.aiAddonName}>{addon.name}</Text>
                        </View>
                        <Text style={styles.aiAddonDesc}>{addon.description}</Text>
                        <Text style={styles.aiAddonPrice}>
                          +{formatPriceSimple(addon.price, business?.currency || "USD")}
                        </Text>
                      </View>
                    ))}
                  </>
                )}
              </ScrollView>
              <View style={styles.aiButtonRow}>
                <Pressable style={styles.aiBackButton} onPress={() => setAiStep("input")}>
                  <Text style={styles.aiBackText}>Edit</Text>
                </Pressable>
                <Pressable
                  style={[styles.aiConfirmButton, aiServices.length === 0 && styles.buttonDisabled]}
                  onPress={handleAIConfirm}
                  disabled={aiGenerating || aiServices.length === 0}
                >
                  {aiGenerating ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.aiConfirmText}>Add All</Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  return (
      <View style={styles.background}>
      <View style={styles.gradientOverlay} />
      <Animated.View 
        entering={FadeIn.duration(600)}
        style={styles.container}
      >
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <View style={styles.headerTitleRow}>
              <Text style={styles.hugeTitle} numberOfLines={1} adjustsFontSizeToFit>Viewing types</Text>
              <View style={styles.assistantContextContainer}>
                <Text style={styles.assistantContextText}>Assistant Setup</Text>
                <Pressable 
                  style={styles.aiHeaderButton} 
                  onPress={handleAISetup}
                  hitSlop={8}
                >
                  <View style={styles.aiHeaderBlur}>
                    <Feather name="zap" size={18} color="#fff" />
                  </View>
                </Pressable>
              </View>
          </View>
        </View>

        <FlatList
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: tabBarHeight + 100,
            gap: 24,
          }}
          data={services}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          scrollEnabled
          ListEmptyComponent={!loading ? renderEmptyState : null}
          showsVerticalScrollIndicator={false}
        />

        <Pressable
          onPress={handleCreateService}
          style={({ pressed }) => [
            styles.fab,
            { bottom: tabBarHeight + 24, opacity: pressed ? 0.8 : 1 }
          ]}
        >
          <Feather name="plus" size={24} color="#1a1a1a" />
        </Pressable>
      </Animated.View>
      
      {renderAIModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: "#FAF7F2",
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  hugeTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1C1410",
    letterSpacing: -0.4,
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  aiHeaderButton: {
    borderRadius: 20,
    overflow: "hidden",
    marginLeft: 12,
  },
  aiHeaderBlur: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4EEE6",
  },
  glassCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E8DDD0",
    padding: 16,
    overflow: "hidden",
  },
  glassCardAndroid: {
    backgroundColor: "#FFFFFF",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardLeft: {
    flex: 1,
    paddingRight: 16,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1C1410",
    marginBottom: 8,
    lineHeight: 22,
  },
  serviceDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  durationText: {
    fontSize: 12,
    color: "#6B5744",
    fontWeight: "500",
  },
  dotSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E8DDD0",
  },
  priceText: {
    fontSize: 14,
    color: "#4A7C59",
    fontWeight: "500",
  },
  meterContainer: {
    width: 72,
    height: 72,
  },
  circularChart: {
    width: "100%",
    height: "100%",
  },
  chevron: {
    marginLeft: 12,
  },
  fab: {
    position: "absolute",
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#C17F3E",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6B5744",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1C1410",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: "#6B5744",
    textAlign: "center",
    marginBottom: 24,
  },
  aiSetupButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#C17F3E",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    gap: 8,
  },
  aiSetupText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  orText: {
    fontSize: 14,
    color: "#8B6F47",
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(48,35,25,0.38)",
    justifyContent: "flex-end",
  },
  modalDismiss: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: "#FAF7F2",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: "70%",
  },
  reviewContainer: {
    flex: 1,
    paddingBottom: 8,
  },
  reviewScrollView: {
    maxHeight: 300,
    marginBottom: 16,
  },
  reviewScrollContent: {
    paddingBottom: 4,
  },
  noServicesText: {
    color: "#8B6F47",
    fontSize: 14,
    textAlign: "center",
    padding: 24,
  },
  inputContainer: {
    marginTop: 8,
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
    color: "#1C1410",
  },
  assistantContextContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E8DDD0",
  },
  assistantContextText: {
    fontSize: 12,
    color: "#6B5744",
    marginRight: 8,
    fontWeight: "600",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6B5744",
    marginBottom: 20,
  },
  aiInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    color: "#1C1410",
    fontSize: 14,
    minHeight: 180,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: "#E8DDD0",
    marginBottom: 20,
  },
  aiGenerateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C17F3E",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  aiGenerateText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  aiServiceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E8DDD0",
  },
  aiServiceName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1C1410",
    marginBottom: 4,
  },
  aiServiceDesc: {
    fontSize: 14,
    color: "#6B5744",
    marginBottom: 12,
  },
  aiServiceDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  aiServiceDuration: {
    fontSize: 14,
    color: "#8B6F47",
  },
  aiServicePrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4A7C59",
  },
  aiButtonRow: {
    flexDirection: "row",
    gap: 12,
  },
  aiBackButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8DDD0",
    alignItems: "center",
  },
  aiBackText: {
    color: "#6B5744",
    fontSize: 14,
    fontWeight: "600",
  },
  aiConfirmButton: {
    flex: 2,
    backgroundColor: "#C17F3E",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  aiConfirmText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8B6F47",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  addonNote: {
    fontSize: 12,
    color: "#8B6F47",
    marginBottom: 12,
    fontStyle: "italic",
  },
  aiAddonCard: {
    backgroundColor: "rgba(74, 222, 128, 0.08)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(74, 222, 128, 0.2)",
  },
  addonHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  aiAddonName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1C1410",
  },
  aiAddonDesc: {
    fontSize: 12,
    color: "#8B6F47",
    marginBottom: 6,
    marginLeft: 22,
  },
  aiAddonPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4A7C59",
    marginLeft: 22,
  },
});
