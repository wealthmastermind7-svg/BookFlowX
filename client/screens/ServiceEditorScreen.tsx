import React, { useState, useEffect } from "react";
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
  ImageBackground,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeIn,
} from "react-native-reanimated";

import { api, Service, Business } from "@/lib/api";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getCurrencySymbol } from "@/lib/currency";

const silkBackground = require("@assets/generated_images/black_silk_flowing_fabric_background_for_services.png");

type EditScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "ServiceEditor"
>;

export default function ServiceEditorScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation<EditScreenNavigationProp>();

  const [service, setService] = useState<Partial<Service>>({
    name: "",
    duration: 30,
    price: 0,
    description: "",
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [businessReady, setBusinessReady] = useState(!!api.getBusinessId());
  const [currencySymbol, setCurrencySymbol] = useState("$");

  const serviceId = (route.params as any)?.serviceId;

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

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
            <Text style={styles.carouselItemActive}>Details</Text>
          </View>

          <KeyboardAwareScrollViewCompat
            contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
            showsVerticalScrollIndicator={false}
          >
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
                <Text style={styles.inputLabel}>Description</Text>
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
  carouselItemActive: {
    fontSize: 48,
    color: "#fff",
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
    fontWeight: "600",
    color: "#000",
  },
});
