import React, { useState, useEffect } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  ImageBackground,
  Platform,
  Dimensions,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import Svg, { Path, Text as SvgText } from "react-native-svg";

import { Spacing } from "@/constants/theme";
import { api, Service, Business } from "@/lib/api";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { formatPriceSimple } from "@/lib/currency";

const silkBackground = require("../../attached_assets/generated_images/black_silk_flowing_fabric_background_for_services.png");

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
              <Animated.Text style={styles.serviceName}>{name}</Animated.Text>
              <View style={styles.serviceDetails}>
                <Animated.Text style={styles.durationText}>
                  {formatDuration(duration)}
                </Animated.Text>
                <View style={styles.dotSeparator} />
                <Animated.Text style={styles.priceText}>
                  {formatPriceSimple(price, currency)}
                </Animated.Text>
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

  const fadeIn = useSharedValue(0);

  useEffect(() => {
    fadeIn.value = withTiming(1, { duration: 800 });
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

  const containerStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
  }));

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
      <Animated.Text style={styles.emptyTitle}>No Services Yet</Animated.Text>
      <Animated.Text style={styles.emptyMessage}>
        Create your first service by tapping the + button
      </Animated.Text>
    </View>
  );

  return (
    <ImageBackground source={silkBackground} style={styles.background} resizeMode="cover">
      <View style={styles.gradientOverlay} />
      <Animated.View style={[styles.container, containerStyle]}>
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Animated.Text style={styles.hugeTitle}>Services</Animated.Text>
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
  },
});
