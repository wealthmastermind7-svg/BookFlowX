import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Dimensions, ImageBackground, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BlurView } from "expo-blur";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInDown,
} from "react-native-reanimated";
import { Spacing, BorderRadius } from "@/constants/theme";
import { StorageService, Service } from "@/lib/storage";
import { BookingFlowParamList } from "@/navigation/BookingFlowNavigator";
import { formatPrice } from "@/lib/currency";

type Navigation = NativeStackNavigationProp<BookingFlowParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const SPRING_CONFIG = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

const silkBackground = require("../../../attached_assets/generated_images/black_silk_flowing_fabric_background_for_services.png");

interface ServiceCardProps {
  service: Service;
  index: number;
  onPress: () => void;
}

function GlassServiceCard({ service, index, onPress }: ServiceCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, SPRING_CONFIG);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SPRING_CONFIG);
  };

  const handlePress = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    onPress();
  };

  const formatDuration = (minutes: number): string => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes} min`;
  };

  const CardContent = () => (
    <View style={styles.cardContent}>
      <Text style={styles.serviceName}>{service.name}</Text>
      <View style={styles.priceRow}>
        <Text style={styles.servicePrice}>{formatPrice(service.price)}</Text>
        <Text style={styles.serviceDuration}>{formatDuration(service.duration)}</Text>
      </View>
      {service.description && (
        <Text style={styles.serviceDescription} numberOfLines={2}>
          {service.description}
        </Text>
      )}
    </View>
  );

  return (
    <Animated.View
      style={animatedStyle}
      entering={FadeInDown.delay(index * 100).springify()}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.cardWrapper}
      >
        {Platform.OS === "ios" ? (
          <BlurView intensity={20} tint="dark" style={styles.glassCard}>
            <CardContent />
          </BlurView>
        ) : (
          <View style={[styles.glassCard, styles.glassCardAndroid]}>
            <CardContent />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

import { Text } from "react-native";

export default function SelectServiceScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Navigation>();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const data = await StorageService.getServices();
      setServices(data);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectService = (service: Service) => {
    navigation.navigate("SelectTime", { serviceId: service.id });
  };

  return (
    <ImageBackground source={silkBackground} style={styles.container} resizeMode="cover">
      <View style={styles.overlay} />
      
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          entering={FadeInDown.delay(0).springify()}
          style={styles.header}
        >
          <Text style={styles.brandTitle}>Black Edition</Text>
          <Text style={styles.brandSubtitle}>Premium Booking</Text>
        </Animated.View>

        <View style={styles.servicesList}>
          {services.map((service, index) => (
            <GlassServiceCard
              key={service.id}
              service={service}
              index={index}
              onPress={() => handleSelectService(service)}
            />
          ))}

          {services.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No services available</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  header: {
    alignItems: "center",
    marginBottom: 80,
  },
  brandTitle: {
    fontFamily: Platform.OS === "ios" ? "Times New Roman" : "serif",
    fontSize: 64,
    fontWeight: "400",
    color: "#fff",
    textAlign: "center",
    letterSpacing: 1,
    lineHeight: 72,
  },
  brandSubtitle: {
    fontFamily: Platform.OS === "ios" ? "Times New Roman" : "serif",
    fontSize: 20,
    fontWeight: "400",
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    letterSpacing: 2,
    marginTop: 8,
    fontStyle: "italic",
  },
  servicesList: {
    gap: Spacing.lg,
  },
  cardWrapper: {
    borderRadius: 20,
    overflow: "hidden",
  },
  glassCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    padding: Spacing["2xl"],
    overflow: "hidden",
  },
  glassCardAndroid: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  cardContent: {
    gap: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "400",
    color: "rgba(255,255,255,0.9)",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 16,
    marginVertical: 8,
  },
  servicePrice: {
    fontFamily: Platform.OS === "ios" ? "Times New Roman" : "serif",
    fontSize: 48,
    fontWeight: "500",
    color: "#fff",
    letterSpacing: -1,
  },
  serviceDuration: {
    fontSize: 14,
    fontWeight: "300",
    color: "rgba(255,255,255,0.6)",
  },
  serviceDescription: {
    fontSize: 14,
    fontWeight: "300",
    color: "rgba(255,255,255,0.5)",
    lineHeight: 20,
    marginTop: 4,
  },
  emptyState: {
    padding: Spacing["3xl"],
    alignItems: "center",
  },
  emptyText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 16,
  },
});
