import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ImageBackground,
  Platform,
  Alert,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  interpolate,
  useAnimatedScrollHandler,
} from "react-native-reanimated";

import { Spacing } from "@/constants/theme";
import { api, Customer } from "@/lib/api";

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

function GlassCustomerCard({ children, style }: { children: React.ReactNode; style?: any }) {
  if (Platform.OS === "ios") {
    return (
      <BlurView intensity={40} tint="light" style={[styles.glassCard, style]}>
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

function BookingRing({ count, maxCount = 10 }: { count: number; maxCount?: number }) {
  const percentage = Math.min((count / maxCount) * 100, 100);
  const strokeDasharray = 2 * Math.PI * 18;
  const strokeDashoffset = strokeDasharray - (percentage / 100) * strokeDasharray;

  return (
    <View style={styles.ringContainer}>
      <View style={styles.ringOuter}>
        {percentage > 50 ? (
          <View style={[styles.ringProgress, { 
            borderTopColor: '#fff',
            borderRightColor: '#fff',
            borderBottomColor: percentage > 75 ? '#fff' : 'rgba(255,255,255,0.3)',
            borderLeftColor: percentage > 75 ? '#fff' : 'rgba(255,255,255,0.3)',
          }]} />
        ) : (
          <View style={[styles.ringProgress, { 
            borderTopColor: percentage > 0 ? '#fff' : 'rgba(255,255,255,0.3)',
            borderRightColor: percentage > 25 ? '#fff' : 'rgba(255,255,255,0.3)',
            borderBottomColor: 'rgba(255,255,255,0.3)',
            borderLeftColor: 'rgba(255,255,255,0.3)',
          }]} />
        )}
        <Text style={styles.ringCount}>{count}</Text>
      </View>
    </View>
  );
}

function CustomerCardCinematic({
  name,
  email,
  phone,
  totalBookings,
  onPress,
}: {
  name: string;
  email: string;
  phone?: string;
  totalBookings: number;
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

  const getInitials = (n: string) => {
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <GlassCustomerCard>
          <View style={styles.cardContent}>
            <View style={styles.initialsCircle}>
              <Text style={styles.initialsText}>{getInitials(name)}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.customerName}>{name}</Text>
              <Text style={styles.customerEmail} numberOfLines={1}>{email}</Text>
            </View>
            <BookingRing count={totalBookings} />
          </View>
        </GlassCustomerCard>
      </Pressable>
    </Animated.View>
  );
}

export default function CustomersScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scrollY.value, [0, 100], [0, -20], 'clamp');
    const opacity = interpolate(scrollY.value, [0, 80], [1, 0.8], 'clamp');
    return {
      transform: [{ translateY }],
      opacity,
    };
  });

  useEffect(() => {
    initializeBusiness();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (api.getBusinessId()) {
        loadCustomers();
      }
    }, [])
  );

  const initializeBusiness = async () => {
    try {
      await api.getOrCreateBusiness();
      loadCustomers();
    } catch (error) {
      console.error("Error initializing business:", error);
    }
  };

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await api.getCustomers();
      setCustomers(data);
    } catch (error) {
      console.error("Error loading customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    Alert.alert(
      customer.name,
      `Email: ${customer.email}\nPhone: ${customer.phone || "N/A"}\nTotal Bookings: ${customer.totalBookings || 0}`,
      [{ text: "Close", style: "default" }]
    );
  };

  const renderItem = ({ item }: { item: unknown }) => {
    const customer = item as Customer;
    return (
      <CustomerCardCinematic
        name={customer.name}
        email={customer.email}
        phone={customer.phone || undefined}
        totalBookings={customer.totalBookings || 0}
        onPress={() => handleSelectCustomer(customer)}
      />
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Feather name="users" size={48} color="rgba(255,255,255,0.2)" />
      <Text style={styles.emptyTitle}>No Customers Yet</Text>
      <Text style={styles.emptyMessage}>
        Customers will appear here after bookings are made
      </Text>
    </View>
  );

  return (
    <ImageBackground 
      source={require("../../attached_assets/generated_images/swirling_ink_smoke_background.png")} 
      style={styles.background} 
      resizeMode="cover"
    >
      <View style={styles.gradientOverlay} />
      <Animated.View 
        entering={FadeIn.duration(600)}
        style={styles.container}
      >
        <Animated.View style={[styles.header, { paddingTop: insets.top + 20 }, headerAnimatedStyle]}>
          <Text style={styles.hugeTitle}>Customers</Text>
        </Animated.View>

        <AnimatedFlatList
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: tabBarHeight + 100,
            gap: 16,
          }}
          data={customers}
          renderItem={renderItem}
          keyExtractor={(item) => (item as Customer).id}
          scrollEnabled={customers.length > 0}
          ListEmptyComponent={!loading ? renderEmptyState : null}
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  hugeTitle: {
    fontSize: 72,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -3,
    lineHeight: 88,
    paddingBottom: 8,
    textShadowColor: "rgba(255,255,255,0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
  },
  glassCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    padding: 16,
    overflow: "hidden",
  },
  glassCardAndroid: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  initialsCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  initialsText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  cardInfo: {
    flex: 1,
    marginLeft: 16,
    marginRight: 12,
  },
  customerName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  customerEmail: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
  },
  ringContainer: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  ringOuter: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  ringProgress: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
  },
  ringCount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
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
