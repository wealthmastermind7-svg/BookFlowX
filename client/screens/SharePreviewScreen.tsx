import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Share } from "react-native";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { usePremium } from "@/contexts/PremiumContext";

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

export default function SharePreviewScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<SharePreviewRouteParams, "SharePreview">>();
  const { theme, isDark } = useTheme();
  const { checkAndIncrementShare } = usePremium();
  
  const { businessName, bookingUrl, slug } = route.params;
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Clipboard.setStringAsync(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!checkAndIncrementShare()) {
      return;
    }
    
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
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: Spacing["2xl"],
          paddingBottom: insets.bottom + Spacing["4xl"],
          paddingHorizontal: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <View style={[styles.heroIcon, { backgroundColor: theme.link }]}>
            <Feather name="share" size={24} color={theme.buttonText} />
          </View>
          <ThemedText type="h3" style={styles.heroTitle}>
            Look Professional Everywhere
          </ThemedText>
          <ThemedText type="small" style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
            Your booking links transform into beautiful, rich cards on iMessage, WhatsApp, and social media.
          </ThemedText>
        </View>

        <View style={styles.previewContainer}>
          <ThemedText type="small" style={[styles.previewLabel, { color: theme.textSecondary }]}>
            MESSAGE PREVIEW
          </ThemedText>
          
          <View style={[styles.previewCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.messageRow}>
              <View style={styles.messageBubble}>
                <ThemedText style={styles.messageText}>
                  Hey! Here is the link to book your session.
                </ThemedText>
              </View>
            </View>

            <View style={styles.linkPreviewContainer}>
              <View style={[styles.linkPreview, { backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7" }]}>
                <View style={[styles.linkPreviewImage, { backgroundColor: isDark ? "#3A3A3C" : "#E5E5EA" }]}>
                  <View style={[styles.linkPreviewBadge, { backgroundColor: isDark ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.95)" }]}>
                    <ThemedText style={[styles.badgeText, { color: theme.text }]}>
                      BOOKFLOW
                    </ThemedText>
                  </View>
                  <Feather 
                    name="calendar" 
                    size={48} 
                    color={isDark ? "#6B6B6B" : "#9E9E9E"} 
                    style={styles.placeholderIcon}
                  />
                </View>
                <View style={styles.linkPreviewContent}>
                  <ThemedText type="body" style={[styles.linkTitle, { fontWeight: "600" }]}>
                    {businessName} - Premium Package
                  </ThemedText>
                  <ThemedText type="small" style={[styles.linkDescription, { color: theme.textSecondary }]} numberOfLines={2}>
                    Schedule your appointment instantly. No calls required.
                  </ThemedText>
                  <View style={[styles.linkDomain, { borderTopColor: isDark ? "#3A3A3C" : "#E5E5EA" }]}>
                    <Feather name="calendar" size={12} color={theme.textSecondary} />
                    <ThemedText type="caption" style={[styles.domainText, { color: theme.textSecondary }]}>
                      {domain}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.previewContainer}>
          <ThemedText type="small" style={[styles.previewLabel, { color: theme.textSecondary }]}>
            SOCIAL STICKER PREVIEW
          </ThemedText>
          
          <View style={[styles.previewCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.stickerPreview, { backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7" }]}>
              <View style={[styles.stickerGradient, { backgroundColor: isDark ? "#252525" : "#ECECEC" }]} />
              
              <View style={styles.stickerContent}>
                <AnimatedPressable 
                  onPress={handleShare}
                  style={[styles.stickerButton, { backgroundColor: theme.backgroundRoot }]}
                >
                  <View style={[styles.stickerIconContainer, { backgroundColor: theme.link }]}>
                    <Feather name="calendar" size={16} color={theme.buttonText} />
                  </View>
                  <View style={styles.stickerTextContainer}>
                    <ThemedText type="caption" style={[styles.stickerLabel, { color: theme.textSecondary }]}>
                      BOOK NOW
                    </ThemedText>
                    <ThemedText type="body" style={[styles.stickerTitle, { fontWeight: "600" }]}>
                      {businessName}
                    </ThemedText>
                  </View>
                  <Feather name="chevron-right" size={16} color={theme.textSecondary} />
                </AnimatedPressable>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.brandRow}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Brand: <ThemedText type="small" style={{ fontWeight: "500", color: theme.text }}>{businessName}</ThemedText>
          </ThemedText>
        </View>

        <View style={styles.actionsContainer}>
          <AnimatedPressable
            onPress={handleCopyLink}
            style={[styles.primaryButton, { backgroundColor: theme.link }]}
          >
            <ThemedText type="body" style={[styles.primaryButtonText, { color: theme.buttonText }]}>
              {copied ? "Copied!" : "Copy Link"}
            </ThemedText>
            <Feather 
              name={copied ? "check" : "copy"} 
              size={18} 
              color={theme.buttonText} 
              style={styles.buttonIcon}
            />
          </AnimatedPressable>

          <View style={styles.shareButtons}>
            <AnimatedPressable
              onPress={handleShare}
              style={[styles.shareButton, { backgroundColor: theme.backgroundDefault, borderColor: theme.borderLight }]}
            >
              <Feather name="share-2" size={20} color={theme.text} />
            </AnimatedPressable>
            
            <AnimatedPressable
              onPress={handleShare}
              style={[styles.shareButton, { backgroundColor: theme.backgroundDefault, borderColor: theme.borderLight }]}
            >
              <Feather name="message-circle" size={20} color={theme.text} />
            </AnimatedPressable>
            
            <AnimatedPressable
              onPress={handleShare}
              style={[styles.shareButton, { backgroundColor: theme.backgroundDefault, borderColor: theme.borderLight }]}
            >
              <Feather name="more-horizontal" size={20} color={theme.text} />
            </AnimatedPressable>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  heroTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 20,
  },
  previewContainer: {
    marginBottom: Spacing["2xl"],
  },
  previewLabel: {
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: Spacing.md,
    textTransform: "uppercase",
  },
  previewCard: {
    borderRadius: BorderRadius["2xl"],
    padding: Spacing.xl,
    overflow: "hidden",
  },
  messageRow: {
    alignItems: "flex-end",
    marginBottom: Spacing.lg,
  },
  messageBubble: {
    backgroundColor: "#007AFF",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderTopRightRadius: 4,
    maxWidth: "85%",
  },
  messageText: {
    color: "#FFFFFF",
    fontSize: 14,
  },
  linkPreviewContainer: {
    alignItems: "flex-end",
  },
  linkPreview: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    maxWidth: "85%",
    width: "100%",
  },
  linkPreviewImage: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  linkPreviewBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  placeholderIcon: {
    opacity: 0.5,
  },
  linkPreviewContent: {
    padding: Spacing.md,
  },
  linkTitle: {
    marginBottom: 4,
  },
  linkDescription: {
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },
  linkDomain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    marginTop: 4,
  },
  domainText: {
    fontSize: 10,
  },
  stickerPreview: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    aspectRatio: 4 / 3,
    position: "relative",
  },
  stickerGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  stickerContent: {
    flex: 1,
    justifyContent: "flex-end",
    padding: Spacing.xl,
  },
  stickerButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  stickerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  stickerTextContainer: {
    flex: 1,
  },
  stickerLabel: {
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    fontSize: 10,
  },
  stickerTitle: {
    fontSize: 14,
  },
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
    paddingHorizontal: 4,
  },
  actionsContainer: {
    gap: Spacing.lg,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  primaryButtonText: {
    fontWeight: "600",
  },
  buttonIcon: {
    marginLeft: 4,
  },
  shareButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.lg,
  },
  shareButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});
