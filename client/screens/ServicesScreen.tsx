import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ImageBackground,
  Platform,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
} from "react-native-reanimated";
import Svg, { Path, Text as SvgText } from "react-native-svg";

import { Spacing } from "@/constants/theme";
import { api, Service, Business } from "@/lib/api";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { formatPriceSimple } from "@/lib/currency";
import { getApiUrl } from "@/lib/query-client";

interface AIGeneratedService {
  name: string;
  description: string;
  duration: number;
  price: number;
  bufferTime: number;
}

const silkBackground = require("../assets/stock_images/abstract_dark_fluid__e119120c.jpg");

type Navigation = NativeStackNavigationProp<RootStackParamList>;

function GlassServiceCard({ children, style }: { children: React.ReactNode; style?: any }) {
  if (Platform.OS === "ios") {
    return (
      <BlurView intensity={40} tint="dark" style={[styles.glassCard, style]}>
        {children}
      </BlurView>
    );
  }
  return (
    <View style={[styles.glassCard, styles.glassCardAndroid, style]}>
      {children}
    </View>
  );
}

function CircularMeter({ percentage }: { percentage: number }) {
  const radius = 15.9155;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
  
  return (
    <View style={styles.meterContainer}>
      <Svg viewBox="0 0 36 36" style={styles.circularChart}>
        <Path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth="3.8"
        />
        <Path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="#fff"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
        />
        <SvgText
          x="18"
          y="17.5"
          fill="#fff"
          fontSize="6"
          fontWeight="700"
          textAnchor="middle"
        >
          {percentage}%
        </SvgText>
        <SvgText
          x="18"
          y="23.5"
          fill="rgba(255, 255, 255, 0.6)"
          fontSize="2.5"
          fontWeight="600"
          textAnchor="middle"
        >
          BOOKED
        </SvgText>
      </Svg>
    </View>
  );
}

function ServiceCardCinematic({
  name,
  duration,
  price,
  currency,
  bookingRate,
  onPress,
}: {
  name: string;
  duration: number;
  price: number;
  currency: string;
  bookingRate: number;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const formatDuration = (mins: number) => {
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <GlassServiceCard>
          <View style={styles.cardContent}>
            <View style={styles.cardLeft}>
              <Text style={styles.serviceName}>{name}</Text>
              <View style={styles.serviceDetails}>
                <Text style={styles.durationText}>
                  {formatDuration(duration)}
                </Text>
                <View style={styles.dotSeparator} />
                <Text style={styles.priceText}>
                  {formatPriceSimple(price, currency)}
                </Text>
              </View>
            </View>
            <CircularMeter percentage={bookingRate} />
            <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.3)" style={styles.chevron} />
          </View>
        </GlassServiceCard>
      </Pressable>
    </Animated.View>
  );
}

export default function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<Navigation>();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<Business | null>(null);
  
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiServices, setAiServices] = useState<AIGeneratedService[]>([]);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: aiDescription,
          businessType: business?.name || "Service business",
          currency: business?.currency || "USD",
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[AI] Server error:", response.status, errorText);
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("[AI] Generated services:", data.services?.length);
      setAiServices(data.services || []);
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
      for (const svc of aiServices) {
        await api.createService({
          name: svc.name,
          description: svc.description,
          duration: svc.duration,
          price: Math.round(svc.price * 100),
        });
      }
      
      await loadServices();
      setAiModalVisible(false);
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    } catch (error) {
      console.error("Error creating services:", error);
      Alert.alert("Error", "Failed to create some services. Please try again.");
    } finally {
      setAiGenerating(false);
    }
  };

  const renderItem = ({ item }: { item: Service }) => (
    <ServiceCardCinematic
      name={item.name}
      duration={item.duration}
      price={item.price / 100}
      currency={business?.currency || "USD"}
      bookingRate={Math.floor(Math.random() * 100)}
      onPress={() => handleSelectService(item.id)}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Feather name="layers" size={48} color="rgba(255,255,255,0.2)" />
      <Text style={styles.emptyTitle}>No Services Yet</Text>
      <Text style={styles.emptyMessage}>
        Describe your services and let AI set them up for you
      </Text>
      <Pressable style={styles.aiSetupButton} onPress={handleAISetup}>
        <Feather name="zap" size={18} color="#000" />
        <Text style={styles.aiSetupText}>AI Setup</Text>
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
              {aiStep === "input" ? "AI Service Setup" : "Review Services"}
            </Text>
            <Pressable onPress={() => setAiModalVisible(false)} hitSlop={12}>
              <Feather name="x" size={24} color="#fff" />
            </Pressable>
          </View>

          {aiStep === "input" ? (
            <View style={styles.inputContainer}>
              <Text style={styles.modalSubtitle}>
                Describe your services in plain language
              </Text>
              <TextInput
                style={styles.aiInput}
                placeholder="e.g., I offer 30-minute haircuts for $25, color treatments for 2 hours at $150..."
                placeholderTextColor="rgba(255,255,255,0.4)"
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
                    <Feather name="zap" size={18} color="#000" />
                    <Text style={styles.aiGenerateText}>Generate</Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : (
            <KeyboardAwareScrollView 
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalSubtitle}>
                {aiServices.length} services generated
              </Text>
              {aiServices.map((svc, idx) => (
                <View key={idx} style={styles.aiServiceCard}>
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
              <View style={styles.aiButtonRow}>
                <Pressable style={styles.aiBackButton} onPress={() => setAiStep("input")}>
                  <Text style={styles.aiBackText}>Edit</Text>
                </Pressable>
                <Pressable
                  style={styles.aiConfirmButton}
                  onPress={handleAIConfirm}
                  disabled={aiGenerating}
                >
                  {aiGenerating ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.aiConfirmText}>Add All</Text>
                  )}
                </Pressable>
              </View>
            </KeyboardAwareScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  return (
    <ImageBackground source={silkBackground} style={styles.background} resizeMode="cover">
      <View style={styles.gradientOverlay} />
      <Animated.View 
        entering={FadeIn.duration(600)}
        style={styles.container}
      >
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.hugeTitle}>Services</Text>
        </View>

        <FlatList
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: tabBarHeight + 100,
            gap: 20,
          }}
          data={services}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={services.length > 0}
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
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  hugeTitle: {
    fontSize: 56,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -2,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  glassCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    padding: 24,
    overflow: "hidden",
  },
  glassCardAndroid: {
    backgroundColor: "rgba(0,0,0,0.4)",
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
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
    lineHeight: 32,
  },
  serviceDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  durationText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
  },
  dotSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  priceText: {
    fontSize: 16,
    color: "#4ade80",
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
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#fff",
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
    fontSize: 24,
    fontWeight: "600",
    color: "#fff",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginBottom: 24,
  },
  aiSetupButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    gap: 8,
  },
  aiSetupText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
  orText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  modalDismiss: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: "#111",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: "70%",
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: 20,
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
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
  },
  modalSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 20,
  },
  aiInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 16,
    color: "#fff",
    fontSize: 16,
    minHeight: 120,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 20,
  },
  aiGenerateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  aiGenerateText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  aiServiceCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  aiServiceName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  aiServiceDesc: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 12,
  },
  aiServiceDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  aiServiceDuration: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
  },
  aiServicePrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4ade80",
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
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
  },
  aiBackText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  aiConfirmButton: {
    flex: 2,
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  aiConfirmText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
});
