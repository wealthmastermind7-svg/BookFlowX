import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Share, ImageBackground, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
  FadeIn,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { usePremium } from "@/contexts/PremiumContext";

const backgroundImage = require("../assets/stock_images/abstract_dark_fluid__e119120c.jpg");

type SharePreviewRouteParams = {
  SharePreview: {
    businessName: string;
    bookingUrl: string;
    slug: string;
  };
};

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

function AnimatedPressable({ 
  children, 
  onPress, 
  style 
}: { 
  children: React.ReactNode; 
  onPress: () => void; 
  style?: any;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97, springConfig); }}
        onPressOut={() => { scale.value = withSpring(1, springConfig); }}
        onPress={onPress}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

function GlassPanel({ children, style }: { children: React.ReactNode; style?: any }) {
  if (Platform.OS === "ios") {
    return (
      <BlurView intensity={40} tint="dark" style={[styles.glassPanel, style]}>
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

function CinematicLinkPreview({ businessName, domain }: { businessName: string; domain: string }) {
  return (
    <View style={styles.cinematicCard}>
      <LinearGradient
        colors={['#1a1a1a', '#000000', '#0a0a0a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cinematicGradient}
      />
      
      <View style={styles.diagonalLines}>
        <View style={[styles.diagonalLine, { top: '30%', opacity: 0.08 }]} />
        <View style={[styles.diagonalLine, { top: '40%', opacity: 0.04 }]} />
        <View style={[styles.diagonalLine, { top: '50%', opacity: 0.02 }]} />
      </View>
      
      <View style={styles.shadowColumn} />
      
      <View style={styles.cinematicContent}>
        <ThemedText style={styles.cinematicTitle}>
          RESERVE
        </ThemedText>
        <ThemedText style={styles.cinematicTitle}>
          YOUR
        </ThemedText>
        <ThemedText style={styles.cinematicTitle}>
          SPACE
        </ThemedText>
        <View style={styles.accentBar} />
      </View>
      
      <View style={styles.glassFooter}>
        <View style={styles.glassFooterTop} />
        <View style={styles.footerContent}>
          <View style={styles.footerLeft}>
            <ThemedText style={styles.businessNameText}>{businessName}</ThemedText>
            <ThemedText style={styles.subtitleText}>BOOK YOUR APPOINTMENT</ThemedText>
          </View>
          <View style={styles.arrowCircle}>
            <Feather name="arrow-up-right" size={14} color="rgba(255,255,255,0.6)" />
          </View>
        </View>
        <ThemedText style={styles.domainText}>{domain.toUpperCase()}</ThemedText>
      </View>
    </View>
  );
}

export default function SharePreviewScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<SharePreviewRouteParams, "SharePreview">>();
  const { theme } = useTheme();
  const { checkShareAccess } = usePremium();
  
  const { businessName, bookingUrl, slug } = route.params;
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    const hasAccess = checkShareAccess();
    if (!hasAccess) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Clipboard.setStringAsync(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!checkShareAccess()) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: `Book an appointment with ${businessName}:\n${bookingUrl}`,
        url: bookingUrl,
        title: `${businessName} - Book Now`,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const domain = bookingUrl.replace(/^https?:\/\//, "").split("/")[0];

  return (
    <ImageBackground source={backgroundImage} style={styles.container} resizeMode="cover">
      <View style={styles.overlay} />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + Spacing["2xl"],
          paddingBottom: insets.bottom + Spacing["4xl"],
          paddingHorizontal: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(600)} style={styles.heroSection}>
          <ThemedText style={styles.heroTitle}>
            Share Preview
          </ThemedText>
          <ThemedText style={styles.heroSubtitle}>
            This is how your booking link appears when shared on iMessage, WhatsApp, LinkedIn, and social media.
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(600).delay(200)} style={styles.previewSection}>
          <ThemedText style={styles.previewLabel}>
            LINK PREVIEW
          </ThemedText>
          
          <View style={styles.messageContainer}>
            <View style={styles.messageBubble}>
              <ThemedText style={styles.messageText}>
                Hey! Here's my booking link 👇
              </ThemedText>
            </View>
            
            <View style={styles.linkCardWrapper}>
              <CinematicLinkPreview businessName={businessName} domain={domain} />
            </View>
            
            <ThemedText style={styles.timestamp}>
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </ThemedText>
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(600).delay(400)} style={styles.infoSection}>
          <GlassPanel style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Feather name="link" size={18} color="rgba(255,255,255,0.6)" />
              <View style={styles.infoContent}>
                <ThemedText style={styles.infoLabel}>Your Booking URL</ThemedText>
                <ThemedText style={styles.infoValue} numberOfLines={1}>{bookingUrl}</ThemedText>
              </View>
            </View>
          </GlassPanel>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(600).delay(500)} style={styles.actionsContainer}>
          <AnimatedPressable onPress={handleCopyLink} style={styles.primaryButton}>
            <Feather name={copied ? "check" : "copy"} size={20} color="#000" />
            <ThemedText style={styles.primaryButtonText}>
              {copied ? "Copied!" : "Copy Link"}
            </ThemedText>
          </AnimatedPressable>

          <AnimatedPressable onPress={handleShare} style={styles.secondaryButton}>
            <Feather name="share-2" size={20} color="#fff" />
            <ThemedText style={styles.secondaryButtonText}>Share Now</ThemedText>
          </AnimatedPressable>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(600).delay(600)} style={styles.platformsSection}>
          <ThemedText style={styles.platformsTitle}>WORKS ON</ThemedText>
          <View style={styles.platformsRow}>
            <View style={styles.platformBadge}>
              <Feather name="message-circle" size={16} color="rgba(255,255,255,0.8)" />
              <ThemedText style={styles.platformText}>iMessage</ThemedText>
            </View>
            <View style={styles.platformBadge}>
              <Feather name="phone" size={16} color="rgba(255,255,255,0.8)" />
              <ThemedText style={styles.platformText}>WhatsApp</ThemedText>
            </View>
            <View style={styles.platformBadge}>
              <Feather name="linkedin" size={16} color="rgba(255,255,255,0.8)" />
              <ThemedText style={styles.platformText}>LinkedIn</ThemedText>
            </View>
          </View>
        </Animated.View>
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
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  heroSection: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -2,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    maxWidth: 300,
    lineHeight: 24,
  },
  previewSection: {
    marginBottom: Spacing["2xl"],
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2,
    color: "rgba(255,255,255,0.4)",
    marginBottom: Spacing.md,
  },
  messageContainer: {
    alignItems: "flex-end",
  },
  messageBubble: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    marginBottom: Spacing.md,
    maxWidth: "80%",
  },
  messageText: {
    color: "#fff",
    fontSize: 15,
  },
  linkCardWrapper: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 16,
    overflow: "hidden",
  },
  timestamp: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    marginTop: 8,
  },
  cinematicCard: {
    aspectRatio: 4 / 5,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  cinematicGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  diagonalLines: {
    ...StyleSheet.absoluteFillObject,
  },
  diagonalLine: {
    position: "absolute",
    left: -100,
    right: -100,
    height: 1,
    backgroundColor: "#fff",
    transform: [{ rotate: "25deg" }],
  },
  shadowColumn: {
    position: "absolute",
    right: 30,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: "rgba(0,0,0,0.4)",
    transform: [{ skewX: "-10deg" }],
  },
  cinematicContent: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  cinematicTitle: {
    fontSize: 42,
    fontWeight: "800",
    color: "rgba(255,255,255,0.95)",
    letterSpacing: -2,
    lineHeight: 46,
  },
  accentBar: {
    width: 60,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
    marginTop: 12,
  },
  glassFooter: {
    backgroundColor: "rgba(20,20,20,0.9)",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 20,
  },
  glassFooterTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  footerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  footerLeft: {
    flex: 1,
  },
  businessNameText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#fff",
    letterSpacing: 0.5,
  },
  subtitleText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 2,
    marginTop: 4,
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  domainText: {
    fontSize: 9,
    color: "rgba(255,255,255,0.3)",
    letterSpacing: 2,
    marginTop: 12,
  },
  infoSection: {
    marginBottom: Spacing["2xl"],
  },
  infoCard: {
    padding: 20,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: "#fff",
  },
  actionsContainer: {
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: 16,
    backgroundColor: "#fff",
    gap: 10,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#000",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    gap: 10,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#fff",
  },
  platformsSection: {
    alignItems: "center",
  },
  platformsTitle: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 2,
    color: "rgba(255,255,255,0.3)",
    marginBottom: Spacing.md,
  },
  platformsRow: {
    flexDirection: "row",
    gap: 12,
  },
  platformBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  platformText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },
  glassPanel: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  glassPanelAndroid: {
    backgroundColor: "rgba(30,30,30,0.9)",
  },
});
