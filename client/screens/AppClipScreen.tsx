import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Share,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";

import { useTheme } from "@/hooks/useTheme";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

type AppClipMode = "customer" | "owner" | "loading";

interface AppClipScreenProps {
  businessSlug?: string;
  ownerToken?: string;
  onInstallFullApp?: () => void;
}

export default function AppClipScreen({
  businessSlug,
  ownerToken,
  onInstallFullApp,
}: AppClipScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<AppClipMode>("loading");
  const [businessName, setBusinessName] = useState<string>("");
  const [bookingUrl, setBookingUrl] = useState<string>("");
  const [todayBookings, setTodayBookings] = useState<number>(0);

  useEffect(() => {
    determineMode();
  }, [businessSlug, ownerToken]);

  const determineMode = async () => {
    if (ownerToken) {
      setMode("owner");
      await loadOwnerData();
    } else if (businessSlug) {
      setMode("customer");
      await loadBusinessData();
    } else {
      setMode("customer");
    }
  };

  const loadOwnerData = async () => {
    setBusinessName("Your Business");
    setBookingUrl(`https://book.confirmbooking.online/${businessSlug || "demo"}`);
    setTodayBookings(3);
  };

  const loadBusinessData = async () => {
    setBusinessName("Business Name");
  };

  const handleShareBookingLink = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      await Share.share({
        message: `Book an appointment: ${bookingUrl}`,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleInstallFullApp = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    if (onInstallFullApp) {
      onInstallFullApp();
    } else {
      Linking.openURL("https://apps.apple.com/app/bookflow");
    }
  };

  if (mode === "loading") {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.xl }]}>
        <ActivityIndicator size="large" color={theme.text} />
      </ThemedView>
    );
  }

  if (mode === "owner") {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.xl }]}>
        <View style={styles.header}>
          <ThemedText type="h2" style={styles.title}>
            Quick Actions
          </ThemedText>
          <ThemedText type="small" style={styles.subtitle}>
            {businessName}
          </ThemedText>
        </View>

        <View style={styles.statsCard}>
          <ThemedText type="display" style={styles.statNumber}>
            {todayBookings}
          </ThemedText>
          <ThemedText type="caption">BOOKINGS TODAY</ThemedText>
        </View>

        <View style={styles.actionsContainer}>
          <Pressable
            style={[styles.actionButton, { backgroundColor: theme.text }]}
            onPress={handleShareBookingLink}
          >
            <Feather name="share" size={20} color={theme.backgroundRoot} />
            <Text style={[styles.actionButtonText, { color: theme.backgroundRoot }]}>
              Share Booking Link
            </Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
            onPress={() => {}}
          >
            <Feather name="calendar" size={20} color={theme.text} />
            <Text style={[styles.actionButtonText, { color: theme.text }]}>
              View Today's Bookings
            </Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <ThemedText type="small" style={styles.footerText}>
            For full management, get the app
          </ThemedText>
          <Pressable
            style={[styles.installButton, { borderColor: theme.border }]}
            onPress={handleInstallFullApp}
          >
            <Feather name="download" size={16} color={theme.text} />
            <Text style={[styles.installButtonText, { color: theme.text }]}>
              Install BookFlow
            </Text>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.xl }]}>
      <View style={styles.header}>
        <ThemedText type="h1" style={styles.title}>
          Book Now
        </ThemedText>
        <ThemedText type="body" style={styles.subtitle}>
          {businessName || "Select a service to get started"}
        </ThemedText>
      </View>

      <View style={styles.servicesPlaceholder}>
        <Feather name="calendar" size={48} color={theme.textSecondary} />
        <ThemedText type="body" style={{ textAlign: "center", marginTop: Spacing.lg }}>
          Loading available services...
        </ThemedText>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.installButton, { borderColor: theme.border }]}
          onPress={handleInstallFullApp}
        >
          <Feather name="download" size={16} color={theme.text} />
          <Text style={[styles.installButtonText, { color: theme.text }]}>
            Get BookFlow App
          </Text>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    textAlign: "center",
    opacity: 0.7,
  },
  statsCard: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
    marginBottom: Spacing["2xl"],
  },
  statNumber: {
    marginBottom: Spacing.xs,
  },
  actionsContainer: {
    gap: Spacing.md,
    marginBottom: Spacing["3xl"],
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: "Inter-SemiBold",
  },
  servicesPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    alignItems: "center",
    paddingBottom: Spacing["3xl"],
  },
  footerText: {
    marginBottom: Spacing.md,
    opacity: 0.6,
  },
  installButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  installButtonText: {
    fontSize: 14,
    fontFamily: "Inter-SemiBold",
  },
});
