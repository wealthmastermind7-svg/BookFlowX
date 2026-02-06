import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  Platform,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
} from "react-native";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { api } from "@/lib/api";
import { getApiUrl } from "@/lib/query-client";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const ONBOARDING_COMPLETE_KEY = "@bookflow_onboarding_complete";

export async function checkOnboardingComplete(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
    return value === "true";
  } catch {
    return false;
  }
}

const BUSINESS_TYPE_DEMO_MAP: Record<string, string> = {
  salon: "salon",
  medical: "medical",
  automotive: "autodetailing",
  fitness: "fitness",
  veterinary: "veterinary",
  education: "coaching",
  photography: "photography",
  consulting: "consulting",
  contractor: "contractor",
  plumber: "plumber",
  electrician: "electrician",
  hvac: "hvac",
  cleaning: "cleaning",
  landscaping: "landscaping",
};

interface OnboardingScreenProps {
  onComplete: () => void;
}

interface BusinessType {
  id: string;
  name: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
}

const BUSINESS_TYPES: BusinessType[] = [
  { id: "salon", name: "Salons & Beauty", icon: "scissors", color: "#EC4899" },
  { id: "medical", name: "Medical & Dental", icon: "heart", color: "#3B82F6" },
  { id: "contractor", name: "Contractors", icon: "home", color: "#8B5CF6" },
  { id: "automotive", name: "Auto Detailing", icon: "truck", color: "#F59E0B" },
  { id: "fitness", name: "Fitness", icon: "zap", color: "#10B981" },
  { id: "plumber", name: "Plumbing", icon: "droplet", color: "#3B82F6" },
  { id: "electrician", name: "Electricians", icon: "battery-charging", color: "#F59E0B" },
  { id: "hvac", name: "HVAC", icon: "wind", color: "#06B6D4" },
  { id: "cleaning", name: "Cleaning", icon: "star", color: "#10B981" },
  { id: "landscaping", name: "Landscaping", icon: "sun", color: "#14B8A6" },
  { id: "photography", name: "Photography", icon: "camera", color: "#6366F1" },
  { id: "consulting", name: "Consulting", icon: "briefcase", color: "#8B5CF6" },
];

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

function AnimatedPressable({ 
  children, 
  onPress, 
  style,
  disabled = false,
}: { 
  children: React.ReactNode; 
  onPress: () => void; 
  style?: any;
  disabled?: boolean;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPressIn={() => { if (!disabled) scale.value = withSpring(0.97, springConfig); }}
        onPressOut={() => { scale.value = withSpring(1, springConfig); }}
        onPress={disabled ? undefined : onPress}
        style={[style, disabled && { opacity: 0.5 }]}
        disabled={disabled}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

function CinematicLinkPreview({ businessName, domain }: { businessName: string; domain: string }) {
  const getIndustryPhrase = (name: string): string[] => {
    const lowName = name.toLowerCase();
    if (lowName.includes('dentist') || lowName.includes('dental') || lowName.includes('teeth')) return ['RESTORE', 'YOUR', 'SMILE'];
    if (lowName.includes('consultant') || lowName.includes('coach') || lowName.includes('advisor')) return ['BOOK', 'YOUR', 'SESSION'];
    if (lowName.includes('salon') || lowName.includes('hair') || lowName.includes('barber') || lowName.includes('beauty')) return ['ELEVATE', 'YOUR', 'STYLE'];
    if (lowName.includes('spa') || lowName.includes('massage') || lowName.includes('relax')) return ['FIND', 'YOUR', 'CALM'];
    if (lowName.includes('car wash') || lowName.includes('auto') || lowName.includes('detail')) return ['SHINE', 'YOUR', 'RIDE'];
    if (lowName.includes('contractor') || lowName.includes('repair') || lowName.includes('fix')) return ['BOOK', 'YOUR', 'SERVICE'];
    return ['RESERVE', 'YOUR', 'SPACE'];
  };

  const phrases = getIndustryPhrase(businessName);

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
        <Text style={styles.cinematicTitle}>{phrases[0]}</Text>
        <Text style={styles.cinematicTitle}>{phrases[1]}</Text>
        <Text style={styles.cinematicTitle}>{phrases[2]}</Text>
        <View style={styles.accentBar} />
      </View>
      
      <View style={styles.glassFooter}>
        <View style={styles.glassFooterTop} />
        <View style={styles.footerContent}>
          <View style={styles.footerLeft}>
            <Text style={styles.businessNameText}>{businessName}</Text>
            <Text style={styles.subtitleText}>BOOK YOUR APPOINTMENT</Text>
          </View>
          <View style={styles.arrowCircle}>
            <Feather name="arrow-up-right" size={14} color="rgba(255,255,255,0.6)" />
          </View>
        </View>
        <Text style={styles.domainText}>{domain.toUpperCase()}</Text>
      </View>
    </View>
  );
}

function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <View style={styles.stepIndicatorContainer}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.stepDot,
            {
              backgroundColor: index <= currentStep 
                ? '#fff' 
                : 'rgba(255,255,255,0.2)',
              width: index === currentStep ? 24 : 8,
            },
          ]}
        />
      ))}
    </View>
  );
}

function Step0BrandIntro({ onNext }: { onNext: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      exiting={FadeOut.duration(200)}
      style={styles.stepContainer}
    >
      <LinearGradient
        colors={['#f2f2f2', '#e8e8e8']}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        contentContainerStyle={[
          styles.stepContent,
          {
            paddingTop: insets.top + 60,
            paddingBottom: 120,
            alignItems: 'center',
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.brandMockupContainer}>
          <View style={styles.brandMockupCard}>
            <View style={styles.mockupHeader}>
              <View style={styles.mockupLogoRow}>
                <View style={styles.mockupLogoIcon}>
                  <Feather name="calendar" size={14} color="#000" />
                </View>
                <Text style={styles.mockupLogoText}>BookFlow</Text>
              </View>
              <Text style={styles.mockupHeaderLabel}>DAILY GOAL</Text>
              <View style={styles.mockupDotsButton}>
                <Feather name="more-horizontal" size={16} color="#999" />
              </View>
            </View>

            <View style={styles.mockupBody}>
              <View style={styles.mockupCircleContainer}>
                <View style={styles.mockupCircle}>
                  <Text style={styles.mockupCirclePercent}>100%</Text>
                  <Text style={styles.mockupCircleLabel}>BOOKED</Text>
                </View>
                <View style={styles.mockupCalIcon}>
                  <Feather name="calendar" size={16} color="#666" />
                </View>
              </View>

              <View style={styles.mockupClientRow}>
                <View style={styles.mockupGreenDot} />
                <Text style={styles.mockupClientText}>New Client</Text>
              </View>

              <View style={styles.mockupListItem}>
                <View style={styles.mockupAvatar}>
                  <Feather name="user" size={14} color="#bbb" />
                </View>
                <View style={styles.mockupLines}>
                  <View style={[styles.mockupLine, { width: 80 }]} />
                  <View style={[styles.mockupLine, { width: 50, marginTop: 6 }]} />
                </View>
                <View style={styles.mockupCheckCircle}>
                  <Feather name="check" size={12} color="#fff" />
                </View>
              </View>

              <View style={styles.mockupListItem}>
                <View style={styles.mockupAvatar}>
                  <Feather name="user" size={14} color="#bbb" />
                </View>
                <View style={styles.mockupLines}>
                  <View style={[styles.mockupLine, { width: 70 }]} />
                  <View style={[styles.mockupLine, { width: 40, marginTop: 6 }]} />
                </View>
              </View>
            </View>

            <View style={styles.mockupIndustryRow}>
              <View style={[styles.mockupIndustryChip, styles.mockupIndustryChipActive]}>
                <Feather name="scissors" size={14} color="#EC4899" />
                <Text style={styles.mockupIndustryChipTextActive}>Salons & Beauty</Text>
              </View>
              <View style={styles.mockupIndustryChip}>
                <Feather name="heart" size={14} color="#999" />
                <Text style={styles.mockupIndustryChipText}>Dentists & Medical</Text>
              </View>
              <View style={styles.mockupIndustryChip}>
                <Feather name="home" size={14} color="#999" />
                <Text style={styles.mockupIndustryChipText}>Home Contractors</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        <View style={styles.brandPaginationDots}>
          <View style={[styles.brandDot, styles.brandDotActive]} />
          <View style={styles.brandDot} />
          <View style={styles.brandDot} />
        </View>

        <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.brandTextSection}>
          <Text style={styles.brandHeading}>
            Smart Booking{' '}
            <Text style={styles.brandHeadingItalic}>Built In</Text>
          </Text>
          <Text style={styles.brandDescription}>
            Beautiful scheduling with intelligent features that adapt to your business. Setup in seconds, not hours.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.brandPillsContainer}>
          <View style={styles.brandPill}>
            <Feather name="zap" size={14} color="#F59E0B" />
            <Text style={styles.brandPillText}>QR codes & smart links</Text>
          </View>
          <View style={styles.brandPill}>
            <Feather name="mic" size={14} color="#8B5CF6" />
            <Text style={styles.brandPillText}>Voice Assistant included</Text>
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[styles.bottomActions, { bottom: Spacing.xl + insets.bottom, zIndex: 100 }]}>
        <AnimatedPressable
          onPress={onNext}
          style={styles.brandGetStartedButton}
        >
          <Text style={styles.brandGetStartedText}>Get Started</Text>
          <Feather name="arrow-right" size={20} color="#fff" />
        </AnimatedPressable>
      </View>
    </Animated.View>
  );
}

function Step1NicheSelection({ 
  selectedType, 
  onSelect,
  onNext,
}: { 
  selectedType: string; 
  onSelect: (id: string) => void;
  onNext: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Animated.View 
      entering={FadeIn.duration(400)} 
      exiting={FadeOut.duration(200)}
      style={styles.stepContainer}
    >
      <LinearGradient
        colors={['#000', '#1a1a1a']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.backgroundSmoke, { opacity: 0.4 }]}>
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
      </View>

      <ScrollView 
        contentContainerStyle={[styles.stepContent, { paddingTop: insets.top + 80, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepHeader}>
          <Text style={[styles.stepTitle, { color: '#fff' }]}>
            What's your business?
          </Text>
          <Text style={[styles.stepSubtitle, { color: 'rgba(255,255,255,0.6)' }]}>
            Select your industry to personalize your experience
          </Text>
        </View>

        <View style={styles.nicheGrid}>
          {BUSINESS_TYPES.map((type, index) => (
            <Animated.View 
              key={type.id} 
              entering={FadeInUp.delay(index * 50).springify()}
            >
              <Pressable
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelect(type.id);
                }}
                style={[
                  styles.nicheCard,
                  {
                    backgroundColor: selectedType === type.id
                      ? 'rgba(255,255,255,0.15)'
                      : 'rgba(255,255,255,0.05)',
                    borderColor: selectedType === type.id
                      ? '#fff'
                      : 'rgba(255,255,255,0.1)',
                    borderWidth: selectedType === type.id ? 2 : 1,
                  },
                ]}
              >
                <View style={[styles.nicheIconContainer, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                  <Feather name={type.icon} size={22} color="#fff" />
                </View>
                <Text 
                  style={[
                    styles.nicheName, 
                    { 
                      color: '#fff',
                      fontWeight: selectedType === type.id ? '600' : '500',
                    }
                  ]}
                  numberOfLines={2}
                >
                  {type.name}
                </Text>
                {selectedType === type.id && (
                  <View style={[styles.checkBadge, { backgroundColor: '#fff' }]}>
                    <Feather name="check" size={10} color="#000" />
                  </View>
                )}
              </Pressable>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.bottomActions, { bottom: Spacing.xl + insets.bottom, zIndex: 100 }]}>
        <AnimatedPressable 
          onPress={onNext} 
          style={[
            styles.primaryButton, 
            { 
              backgroundColor: '#fff',
            }
          ]}
        >
          <Text style={[styles.primaryButtonText, { color: '#000' }]}>Continue</Text>
          <Feather name="arrow-right" size={20} color="#000" />
        </AnimatedPressable>
      </View>
    </Animated.View>
  );
}

function Step2BusinessName({
  businessName,
  onNameChange,
  onNext,
  onBack,
  isCreating,
}: {
  businessName: string;
  onNameChange: (name: string) => void;
  onNext: () => void;
  onBack: () => void;
  isCreating: boolean;
}) {
  const insets = useSafeAreaInsets();
  
  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'your-business';
  };

  const slug = generateSlug(businessName);
  const canContinue = businessName.trim().length >= 2;

  return (
    <Animated.View 
      entering={FadeIn.duration(400)} 
      exiting={FadeOut.duration(200)}
      style={styles.stepContainer}
    >
      <LinearGradient
        colors={['#000', '#1a1a1a']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.backgroundSmoke, { opacity: 0.4 }]}>
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={[styles.stepContent, { paddingTop: insets.top + 80, paddingBottom: 140 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.stepHeader}>
            <Text style={[styles.stepTitle, { color: '#fff' }]}>
              Name your business
            </Text>
            <Text style={[styles.stepSubtitle, { color: 'rgba(255,255,255,0.6)' }]}>
              This will appear on your booking page
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.businessInput,
                {
                  color: '#fff',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderColor: 'rgba(255,255,255,0.15)',
                },
              ]}
              value={businessName}
              onChangeText={onNameChange}
              placeholder="Enter business name"
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoFocus
              autoCapitalize="words"
              autoCorrect={false}
            />

            <Animated.View entering={FadeInDown.delay(200)} style={styles.slugPreview}>
              <Feather name="link" size={16} color="rgba(255,255,255,0.5)" />
              <Text style={[styles.slugText, { color: 'rgba(255,255,255,0.5)' }]}>
                confirmbooking.online/book/{slug}
              </Text>
            </Animated.View>
          </View>

          <View style={[styles.bottomActionsInline, { marginTop: Spacing.xl }]}>
            <View style={styles.bottomActionsRow}>
              <AnimatedPressable 
                onPress={onBack} 
                style={[
                  styles.backButton, 
                  { 
                    borderColor: 'rgba(255,255,255,0.2)', 
                    backgroundColor: 'rgba(255,255,255,0.05)',
                  }
                ]}
              >
                <Feather name="arrow-left" size={20} color="#fff" />
              </AnimatedPressable>
              <AnimatedPressable 
                onPress={onNext} 
                style={[
                  styles.primaryButtonFlex, 
                  { 
                    backgroundColor: '#fff',
                  }
                ]}
                disabled={!canContinue || isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <Text style={[styles.primaryButtonText, { color: '#000' }]}>Continue</Text>
                    <Feather name="arrow-right" size={20} color="#000" />
                  </>
                )}
              </AnimatedPressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

function Step3AssetPreviews({
  businessName,
  bookingUrl,
  qrCodeUrl,
  onNext,
  onBack,
}: {
  businessName: string;
  bookingUrl: string;
  qrCodeUrl: string;
  onNext: () => void;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  
  const displayUrl = bookingUrl.replace(/^https?:\/\//, "");
  const domain = displayUrl.split("/")[0];

  const handleOpenLink = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (bookingUrl) {
      Linking.openURL(bookingUrl);
    }
  };

  return (
    <Animated.View 
      entering={FadeIn.duration(400)} 
      exiting={FadeOut.duration(200)}
      style={styles.stepContainer}
    >
      <LinearGradient
        colors={['#000', '#1a1a1a']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.backgroundSmoke, { opacity: 0.4 }]}>
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
      </View>

      <ScrollView 
        contentContainerStyle={[styles.stepContent, { paddingTop: insets.top + 80, paddingBottom: 140 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepHeader}>
          <Text style={[styles.stepTitle, { color: '#fff' }]}>
            Share Preview
          </Text>
          <Text style={[styles.stepSubtitle, { color: 'rgba(255,255,255,0.6)' }]}>
            This is how your booking link appears when shared on iMessage, WhatsApp, LinkedIn, and social media.
          </Text>
        </View>

        <Animated.View entering={FadeInUp.delay(100)} style={styles.previewSection}>
          <Text style={[styles.previewLabel]}>LINK PREVIEW</Text>
          
          <View style={styles.messageBubbleContainer}>
            <View style={styles.messageBubble}>
              <Text style={styles.messageText}>Hey! Here's my booking link 👇</Text>
            </View>
          </View>

          <Pressable onPress={handleOpenLink} style={styles.linkPreviewContainer}>
            <CinematicLinkPreview businessName={businessName} domain={domain} />
          </Pressable>
          <Text style={[styles.tapHint]}>Tap to open your live booking page</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200)} style={styles.qrSection}>
          <Text style={[styles.previewLabel]}>QR CODE</Text>
          <View style={styles.qrCardContainer}>
            <Text style={styles.qrCardTitle}>Booking QR Code</Text>
            <Pressable 
              onPress={handleOpenLink}
              style={({ pressed }) => [
                styles.qrContainer,
                pressed && { opacity: 0.8 }
              ]}
            >
              {qrCodeUrl ? (
                <View style={styles.qrImageWrapper}>
                  <Image source={{ uri: qrCodeUrl }} style={styles.qrImage} contentFit="contain" />
                  <View style={styles.qrCenterOverlay}>
                    <Text style={styles.qrCenterText} numberOfLines={2} adjustsFontSizeToFit>{businessName.toUpperCase()}</Text>
                  </View>
                </View>
              ) : (
                <ActivityIndicator size="large" color="#fff" />
              )}
              <View style={styles.qrTapHintRow}>
                <Feather name="external-link" size={14} color="rgba(255,255,255,0.4)" />
                <Text style={styles.qrTapHintText}>Tap to open link</Text>
              </View>
            </Pressable>

            <View style={styles.qrActionContainer}>
              <AnimatedPressable style={[styles.qrShareButton]} onPress={() => {}}>
                <Text style={styles.qrShareButtonText}>Share QR Code Image</Text>
              </AnimatedPressable>
              <AnimatedPressable style={[styles.qrCloseButton]} onPress={() => {}}>
                <Text style={styles.qrCloseButtonText}>Close</Text>
              </AnimatedPressable>
            </View>
          </View>
          <Text style={[styles.tapHint]}>Print this for your storefront</Text>
        </Animated.View>
      </ScrollView>

      <View style={[styles.bottomActions, { bottom: Spacing.xl + insets.bottom, zIndex: 100 }]}>
        <View style={styles.bottomActionsRow}>
          <AnimatedPressable 
            onPress={onBack} 
            style={[
              styles.backButton, 
              { 
                borderColor: 'rgba(255,255,255,0.2)', 
                backgroundColor: 'rgba(255,255,255,0.05)',
              }
            ]}
          >
            <Feather name="arrow-left" size={20} color="#fff" />
          </AnimatedPressable>
          <AnimatedPressable 
            onPress={onNext} 
            style={[
              styles.primaryButtonFlex, 
              { 
                backgroundColor: '#fff',
              }
            ]}
          >
            <Text style={[styles.primaryButtonText, { color: '#000' }]}>Continue</Text>
            <Feather name="arrow-right" size={20} color="#000" />
          </AnimatedPressable>
        </View>
      </View>
    </Animated.View>
  );
}

function Step4VoicePreview({
  businessSlug,
  onComplete,
  onBack,
  navigation,
}: {
  businessSlug: string;
  onComplete: () => void;
  onBack: () => void;
  navigation: any;
}) {
  const insets = useSafeAreaInsets();

  const handleTestVoiceAgent = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
    onComplete();
    setTimeout(() => {
      navigation.navigate("VoiceBooking", { businessSlug });
    }, 100);
  };

  const handleSkipToHome = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
    onComplete();
  };

  return (
    <Animated.View 
      entering={FadeIn.duration(400)} 
      exiting={FadeOut.duration(200)}
      style={styles.stepContainer}
    >
      <LinearGradient
        colors={['#000', '#1a1a1a']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.backgroundSmoke, { opacity: 0.4 }]}>
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
      </View>

      <ScrollView 
        contentContainerStyle={[styles.stepContent, { paddingTop: insets.top + 80, paddingBottom: 180 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepHeader}>
          <Text style={[styles.stepTitle, { color: '#fff' }]}>
            Meet your Assistant
          </Text>
          <Text style={[styles.stepSubtitle, { color: 'rgba(255,255,255,0.6)' }]}>
            Answers questions about your business 24/7
          </Text>
        </View>

        <Animated.View entering={FadeInUp.delay(100)} style={styles.voicePreviewContainer}>
          <View style={[styles.voiceCard, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }]}>
            <View style={[styles.voiceIconCircle, { backgroundColor: '#fff' }]}>
              <Feather name="mic" size={32} color="#000" />
            </View>
            
            <Text style={[styles.voiceCardTitle, { color: '#fff' }]}>
              Informational Assistant
            </Text>
            <Text style={[styles.voiceCardDescription, { color: 'rgba(255,255,255,0.6)' }]}>
              Answers questions about your services, pricing, and availability, then directs customers to book via Text Booking
            </Text>

            <View style={styles.voiceFeatures}>
              <View style={styles.voiceFeatureRow}>
                <Feather name="check-circle" size={16} color="#10B981" />
                <Text style={[styles.voiceFeatureText, { color: 'rgba(255,255,255,0.8)' }]}>24/7 availability</Text>
              </View>
              <View style={styles.voiceFeatureRow}>
                <Feather name="check-circle" size={16} color="#10B981" />
                <Text style={[styles.voiceFeatureText, { color: 'rgba(255,255,255,0.8)' }]}>Natural conversations</Text>
              </View>
              <View style={styles.voiceFeatureRow}>
                <Feather name="check-circle" size={16} color="#10B981" />
                <Text style={[styles.voiceFeatureText, { color: 'rgba(255,255,255,0.8)' }]}>Trained on your services</Text>
              </View>
            </View>

            <View style={[styles.trialBadge, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
              <Feather name="gift" size={14} color="#fff" />
              <Text style={[styles.trialBadgeText, { color: '#fff' }]}>5 minutes free trial included</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[styles.bottomActions, { bottom: Spacing.xl + insets.bottom, zIndex: 100 }]}>
        <AnimatedPressable 
          onPress={handleTestVoiceAgent} 
          style={[
            styles.primaryButton, 
            { 
              backgroundColor: '#fff',
            }
          ]}
        >
          <Text style={[styles.primaryButtonText, { color: '#000' }]}>Test Assistant Now</Text>
          <Feather name="arrow-right" size={20} color="#000" />
        </AnimatedPressable>
        
        <View style={[styles.bottomActionsRow, { marginTop: Spacing.md }]}>
          <AnimatedPressable 
            onPress={onBack} 
            style={[
              styles.backButton, 
              { 
                borderColor: 'rgba(255,255,255,0.2)', 
                backgroundColor: 'rgba(255,255,255,0.05)',
              }
            ]}
          >
            <Feather name="arrow-left" size={20} color="#fff" />
          </AnimatedPressable>
          <Pressable 
            onPress={handleSkipToHome} 
            style={({ pressed }) => [
              styles.skipButton,
              { opacity: pressed ? 0.6 : 1 }
            ]}
          >
            <Text style={[styles.skipButtonText, { color: 'rgba(255,255,255,0.5)' }]}>Skip for now</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedBusinessType, setSelectedBusinessType] = useState("salon");
  const [businessName, setBusinessName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [businessSlug, setBusinessSlug] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  const handleStep0Next = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentStep(1);
  };

  const handleStep1Next = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentStep(2);
  };

  const handleStep2Next = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsCreating(true);
    
    try {
      const biz = await api.getOrCreateBusiness();
      await api.updateBusiness({ name: businessName.trim() });
      
      try {
        const Intl = (global as any).Intl;
        const timezone = Intl?.DateTimeFormat?.().resolvedOptions()?.timeZone;
        if (timezone) {
          await api.updateBusiness({ timezone });
        }
      } catch (tzError) {
        console.warn("Failed to detect timezone:", tzError);
      }
      
      const demoType = BUSINESS_TYPE_DEMO_MAP[selectedBusinessType] || "salon";
      await api.initializeDemoData(demoType);
      
      const updatedBiz = await api.getOrCreateBusiness();
      const slug = updatedBiz.slug || biz.slug || "business";
      setBusinessSlug(slug);
      
      const finalBookingUrl = `https://confirmbooking.online/book/${slug}`;
      setBookingUrl(finalBookingUrl);
      
      const qrUrl = `${getApiUrl()}/api/businesses/${updatedBiz.id}/qrcode?format=image`;
      setQrCodeUrl(qrUrl);
      
      setCurrentStep(3);
    } catch (error) {
      console.error("Error creating business:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleStep3Next = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentStep(4);
  };

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <StepIndicator currentStep={currentStep} totalSteps={5} />
      </View>

      {currentStep === 0 && (
        <Step0BrandIntro onNext={handleStep0Next} />
      )}

      {currentStep === 1 && (
        <Step1NicheSelection
          selectedType={selectedBusinessType}
          onSelect={setSelectedBusinessType}
          onNext={handleStep1Next}
        />
      )}

      {currentStep === 2 && (
        <Step2BusinessName
          businessName={businessName}
          onNameChange={setBusinessName}
          onNext={handleStep2Next}
          onBack={handleBack}
          isCreating={isCreating}
        />
      )}

      {currentStep === 3 && (
        <Step3AssetPreviews
          businessName={businessName || "My Business"}
          bookingUrl={bookingUrl}
          qrCodeUrl={qrCodeUrl}
          onNext={handleStep3Next}
          onBack={handleBack}
        />
      )}

      {currentStep === 4 && (
        <Step4VoicePreview
          businessSlug={businessSlug}
          onComplete={onComplete}
          onBack={handleBack}
          navigation={navigation}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: Spacing.xl,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  stepDot: {
    height: 8,
    borderRadius: 4,
  },
  stepContainer: {
    flex: 1,
  },
  stepContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
  },
  stepHeader: {
    marginBottom: Spacing["2xl"],
  },
  stepTitle: {
    fontSize: 42,
    lineHeight: 46,
    letterSpacing: -1,
    marginBottom: Spacing.sm,
    fontFamily: 'CormorantGaramond_700Bold',
  },
  stepSubtitle: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Inter_400Regular',
  },
  nicheGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  nicheCard: {
    width: (SCREEN_WIDTH - Spacing.xl * 2 - Spacing.md) / 2,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
  },
  nicheIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  nicheName: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    lineHeight: 18,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomActions: {
    position: 'absolute',
    left: Spacing.xl,
    right: Spacing.xl,
    backgroundColor: 'transparent',
  },
  bottomActionsInline: {
    backgroundColor: 'transparent',
  },
  bottomActionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    borderRadius: 32,
    gap: Spacing.sm,
  },
  primaryButtonFlex: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    borderRadius: 32,
    gap: Spacing.sm,
  },
  primaryButtonText: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  backButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    flex: 1,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  inputContainer: {
    gap: Spacing.lg,
  },
  businessInput: {
    height: 64,
    borderRadius: 20,
    paddingHorizontal: Spacing.lg,
    fontSize: 18,
    fontFamily: 'Inter_500Medium',
    borderWidth: 1,
  },
  slugPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  slugText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
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
    fontFamily: 'Inter_600SemiBold',
  },
  linkPreviewContainer: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 16,
    overflow: "hidden",
    alignSelf: 'center',
  },
  tapHint: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    textAlign: 'center',
    marginTop: 8,
  },
  qrSection: {
    marginBottom: Spacing.xl,
    alignItems: 'center',
    width: '100%',
  },
  qrCardContainer: {
    width: '100%',
    backgroundColor: '#1a1a1a',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  qrCardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 20,
    fontFamily: 'Inter_900Black',
  },
  qrContainer: {
    borderRadius: 24,
    padding: Spacing.xl,
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  qrImageWrapper: {
    width: 220,
    height: 220,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 12,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  qrCenterOverlay: {
    position: 'absolute',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#000',
    maxWidth: '75%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  qrCenterText: {
    fontFamily: 'Inter_900Black',
    fontSize: 14,
    color: '#000',
    textAlign: 'center',
    letterSpacing: -0.5,
    fontWeight: '900',
  },
  qrTapHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },
  qrTapHintText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Inter_500Medium',
  },
  qrActionContainer: {
    marginTop: 24,
    gap: 12,
    alignItems: 'center',
  },
  qrShareButton: {
    backgroundColor: '#000',
    width: '100%',
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  qrShareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  qrCloseButton: {
    paddingVertical: 12,
  },
  qrCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  messageBubbleContainer: {
    alignItems: 'flex-end',
    marginBottom: 12,
    marginRight: 4,
  },
  messageBubble: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderBottomRightRadius: 4,
    maxWidth: '85%',
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  voicePreviewContainer: {
    flex: 1,
  },
  voiceCard: {
    borderRadius: 32,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  voiceIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  voiceCardTitle: {
    fontSize: 28,
    fontFamily: 'CormorantGaramond_700Bold',
    marginBottom: Spacing.sm,
  },
  voiceCardDescription: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  voiceFeatures: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
    alignSelf: 'stretch',
  },
  voiceFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  voiceFeatureText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  trialBadgeText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
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
    fontFamily: 'Inter_900Black',
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
    fontFamily: 'Inter_500Medium',
  },
  subtitleText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 2,
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
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
    fontFamily: 'Inter_600SemiBold',
  },
  backgroundSmoke: {
    ...StyleSheet.absoluteFillObject,
  },
  brandMockupContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandMockupCard: {
    width: '92%',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 28,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  mockupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  mockupLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  mockupLogoIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockupLogoText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'Inter_700Bold',
  },
  mockupHeaderLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: '#999',
    fontWeight: '600',
  },
  mockupDotsButton: {
    marginLeft: 'auto',
    paddingLeft: 12,
  },
  mockupBody: {
    marginBottom: 16,
  },
  mockupCircleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 16,
  },
  mockupCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockupCirclePercent: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000',
    fontFamily: 'Inter_900Black',
  },
  mockupCircleLabel: {
    fontSize: 8,
    letterSpacing: 1.5,
    color: '#666',
    fontWeight: '600',
    marginTop: -2,
  },
  mockupCalIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockupClientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  mockupGreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  mockupClientText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Inter_600SemiBold',
  },
  mockupListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  mockupAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockupLines: {
    flex: 1,
  },
  mockupLine: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  mockupCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockupIndustryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mockupIndustryChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  mockupIndustryChipActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  mockupIndustryChipText: {
    fontSize: 9,
    color: '#999',
    textAlign: 'center',
    fontFamily: 'Inter_500Medium',
  },
  mockupIndustryChipTextActive: {
    fontSize: 9,
    color: '#000',
    textAlign: 'center',
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  brandPaginationDots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 28,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  brandDotActive: {
    width: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  brandTextSection: {
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  brandHeading: {
    fontSize: 36,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    fontFamily: 'CormorantGaramond_700Bold',
    lineHeight: 42,
    marginBottom: 12,
  },
  brandHeadingItalic: {
    fontStyle: 'italic',
    fontFamily: 'CormorantGaramond_500Medium',
  },
  brandDescription: {
    fontSize: 16,
    color: 'rgba(0,0,0,0.5)',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Inter_400Regular',
  },
  brandPillsContainer: {
    gap: 10,
    alignItems: 'center',
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#fff',
  },
  brandPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    fontFamily: 'Inter_500Medium',
  },
  brandGetStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    borderRadius: 32,
    backgroundColor: '#000',
    gap: Spacing.sm,
  },
  brandGetStartedText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
  },
});
