import React, { useEffect, useState } from "react";
import { View, StyleSheet, Pressable, Dimensions, Text, Platform, ImageBackground } from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
  FadeIn,
  FadeInUp,
} from "react-native-reanimated";
import { Spacing, BorderRadius } from "@/constants/theme";
import { BookingFlowParamList } from "@/navigation/BookingFlowNavigator";
import { StorageService, Booking } from "@/lib/storage";
import { formatPrice } from "@/lib/currency";

type Navigation = NativeStackNavigationProp<BookingFlowParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const SPRING_CONFIG = {
  damping: 12,
  mass: 0.5,
  stiffness: 100,
};

const silkBackground = require("@assets/generated_images/black_silk_flowing_fabric_background_for_services.png");

export default function ConfirmationScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Navigation>();
  const route = useRoute();

  const bookingId = (route.params as any)?.bookingId || "";
  const [booking, setBooking] = useState<Booking | null>(null);

  const checkScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);

  React.useEffect(() => {
    loadBooking();
    animateCheckmark();
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
  }, []);

  const loadBooking = async () => {
    const found = await StorageService.getBookingById(bookingId);
    if (found) setBooking(found);
  };

  const animateCheckmark = () => {
    checkOpacity.value = withDelay(200, withSpring(1, SPRING_CONFIG));
    checkScale.value = withDelay(
      200,
      withSequence(
        withSpring(1.2, { ...SPRING_CONFIG, stiffness: 200 }),
        withSpring(1, SPRING_CONFIG)
      )
    );
  };

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkOpacity.value,
  }));

  const handleDone = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    const parent = navigation.getParent();
    if (parent) {
      parent.goBack();
    } else {
      navigation.goBack();
    }
  };

  const formatDate = () => {
    if (!booking?.date) return "--";
    const date = new Date(booking.date);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).replace(/\//g, "-");
  };

  const generateBookingCode = () => {
    return bookingId.replace("booking_", "").slice(0, 8).toUpperCase();
  };

  return (
    <ImageBackground source={silkBackground} style={styles.container} resizeMode="cover">
      <View style={styles.overlay} />

      <View style={styles.backgroundTextContainer}>
        <Text style={styles.backgroundText}>DONE</Text>
      </View>

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 80,
            paddingBottom: insets.bottom + 140,
          },
        ]}
      >
        <Animated.View style={[styles.checkmarkContainer, checkAnimatedStyle]}>
          <View style={styles.checkmarkInner}>
            <Feather name="check" size={40} color="#000" />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400).springify()}>
          <Text style={styles.title}>Confirmed</Text>
        </Animated.View>

        <Animated.View 
          entering={FadeInUp.delay(600).springify()}
          style={styles.detailsCard}
        >
          <View style={styles.detailsInner}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>BOOKING ID</Text>
              <Text style={styles.detailValue}>{generateBookingCode()}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>SERVICE</Text>
              <Text style={styles.detailValue}>{booking?.serviceName || "--"}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>TIME</Text>
              <Text style={styles.detailValue}>
                {formatDate()} at {booking?.time || "--"}
              </Text>
            </View>
          </View>
        </Animated.View>
      </View>

      <View
        style={[
          styles.bottomSection,
          { paddingBottom: insets.bottom + Spacing.lg },
        ]}
      >
        <Animated.View 
          entering={FadeInUp.delay(700).springify()}
          style={{ width: "100%" }}
        >
          <Pressable
            onPress={handleDone}
            style={styles.doneButton}
          >
            <Text style={styles.doneButtonText}>Book Another</Text>
          </Pressable>
        </Animated.View>
      </View>
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
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  backgroundTextContainer: {
    position: "absolute",
    top: 20,
    left: 0,
    right: 0,
    alignItems: "center",
    overflow: "hidden",
    pointerEvents: "none",
  },
  backgroundText: {
    fontSize: 180,
    fontWeight: "700",
    color: "transparent",
    letterSpacing: -5,
    textAlign: "center",
    opacity: 0.5,
    ...Platform.select({
      ios: {
        WebkitTextStroke: "1px rgba(255,255,255,0.3)",
      },
      android: {
        textShadowColor: "rgba(255,255,255,0.15)",
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 1,
        color: "rgba(255,255,255,0.08)",
      },
    }),
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  checkmarkContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 5,
    borderColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    backgroundColor: "transparent",
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  checkmarkInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: Platform.OS === "ios" ? "Times New Roman" : "serif",
    fontSize: 48,
    fontWeight: "400",
    color: "#fff",
    textAlign: "center",
    marginBottom: 48,
    letterSpacing: 1,
    fontStyle: "italic",
  },
  detailsCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  detailsInner: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 14,
    padding: 24,
  },
  detailRow: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "300",
    letterSpacing: 2,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 18,
    fontWeight: "400",
    color: "#fff",
    letterSpacing: 1,
  },
  bottomSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: Spacing["2xl"],
    paddingHorizontal: Spacing.lg,
  },
  doneButton: {
    width: "100%",
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    backgroundColor: "transparent",
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: "500",
    color: "#fff",
    letterSpacing: 1,
  },
});
