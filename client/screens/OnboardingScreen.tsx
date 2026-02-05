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
        style={StyleSheet.absoluteFillObject}
      />
      
      <View style={styles.diagonalLines}>
        <View style={[styles.diagonalLine, { top: '30%', opacity: 0.08 }]} />
        <View style={[styles.diagonalLine, { top: '40%', opacity: 0.04 }]} />
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
  const { theme: colors, isDark } = useTheme();
  
  return (
    <View style={styles.stepIndicatorContainer}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.stepDot,
            {
              backgroundColor: index <= currentStep 
                ? colors.text 
                : isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
              width: index === currentStep ? 24 : 8,
            },
          ]}
        />
      ))}
    </View>
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
  const { theme: colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Animated.View 
      entering={FadeIn.duration(400)} 
      exiting={FadeOut.duration(200)}
      style={styles.stepContainer}
    >
      <ScrollView 
        contentContainerStyle={[styles.stepContent, { paddingTop: insets.top + 60 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepHeader}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>
            What's your business?
          </Text>
          <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
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
                      ? isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'
                      : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    borderColor: selectedType === type.id
                      ? type.color
                      : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                    borderWidth: selectedType === type.id ? 2 : 1,
                  },
                ]}
              >
                <View style={[styles.nicheIconContainer, { backgroundColor: type.color + '20' }]}>
                  <Feather name={type.icon} size={22} color={type.color} />
                </View>
                <Text 
                  style={[
                    styles.nicheName, 
                    { 
                      color: selectedType === type.id ? colors.text : colors.textSecondary,
                      fontWeight: selectedType === type.id ? '600' : '500',
                    }
                  ]}
                  numberOfLines={2}
                >
                  {type.name}
                </Text>
                {selectedType === type.id && (
                  <View style={[styles.checkBadge, { backgroundColor: type.color }]}>
                    <Feather name="check" size={10} color="#fff" />
                  </View>
                )}
              </Pressable>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <AnimatedPressable onPress={onNext} style={[styles.primaryButton, { backgroundColor: colors.text }]}>
          <Text style={[styles.primaryButtonText, { color: colors.backgroundRoot }]}>Continue</Text>
          <Feather name="arrow-right" size={20} color={colors.backgroundRoot} />
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
  const { theme: colors, isDark } = useTheme();
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
      <ScrollView 
        contentContainerStyle={[styles.stepContent, { paddingTop: insets.top + 60 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.stepHeader}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>
            Name your business
          </Text>
          <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
            This will appear on your booking page
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.businessInput,
              {
                color: colors.text,
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
              },
            ]}
            value={businessName}
            onChangeText={onNameChange}
            placeholder="Enter business name"
            placeholderTextColor={colors.textTertiary}
            autoFocus
            autoCapitalize="words"
            autoCorrect={false}
          />

          <Animated.View entering={FadeInDown.delay(200)} style={styles.slugPreview}>
            <Feather name="link" size={16} color={colors.textSecondary} />
            <Text style={[styles.slugText, { color: colors.textSecondary }]}>
              confirmbooking.online/{slug}
            </Text>
          </Animated.View>
        </View>
      </ScrollView>

      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <View style={styles.bottomActionsRow}>
          <AnimatedPressable onPress={onBack} style={[styles.backButton, { borderColor: colors.border }]}>
            <Feather name="arrow-left" size={20} color={colors.text} />
          </AnimatedPressable>
          <AnimatedPressable 
            onPress={onNext} 
            style={[styles.primaryButtonFlex, { backgroundColor: colors.text }]}
            disabled={!canContinue || isCreating}
          >
            {isCreating ? (
              <ActivityIndicator size="small" color={colors.backgroundRoot} />
            ) : (
              <>
                <Text style={[styles.primaryButtonText, { color: colors.backgroundRoot }]}>Continue</Text>
                <Feather name="arrow-right" size={20} color={colors.backgroundRoot} />
              </>
            )}
          </AnimatedPressable>
        </View>
      </View>
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
  const { theme: colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const domain = bookingUrl.replace(/^https?:\/\//, "").split("/")[0];

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
      <ScrollView 
        contentContainerStyle={[styles.stepContent, { paddingTop: insets.top + 60 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepHeader}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>
            Your booking assets
          </Text>
          <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
            Ready to share with customers
          </Text>
        </View>

        <Animated.View entering={FadeInUp.delay(100)} style={styles.previewSection}>
          <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>BOOKING LINK PREVIEW</Text>
          <Pressable onPress={handleOpenLink} style={styles.linkPreviewContainer}>
            <CinematicLinkPreview businessName={businessName} domain={domain} />
          </Pressable>
          <Text style={[styles.tapHint, { color: colors.textTertiary }]}>Tap to open your live booking page</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200)} style={styles.qrSection}>
          <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>QR CODE</Text>
          <Pressable 
            onPress={handleOpenLink}
            style={[styles.qrContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
          >
            {qrCodeUrl ? (
              <View style={styles.qrImageWrapper}>
                <Image source={{ uri: qrCodeUrl }} style={styles.qrImage} contentFit="contain" />
                <View style={styles.qrCenterOverlay}>
                  <Text style={styles.qrCenterText}>{businessName.toUpperCase().slice(0, 12)}</Text>
                </View>
              </View>
            ) : (
              <ActivityIndicator size="large" color={colors.text} />
            )}
          </Pressable>
          <Text style={[styles.tapHint, { color: colors.textTertiary }]}>Print this for your storefront</Text>
        </Animated.View>
      </ScrollView>

      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <View style={styles.bottomActionsRow}>
          <AnimatedPressable onPress={onBack} style={[styles.backButton, { borderColor: colors.border }]}>
            <Feather name="arrow-left" size={20} color={colors.text} />
          </AnimatedPressable>
          <AnimatedPressable onPress={onNext} style={[styles.primaryButtonFlex, { backgroundColor: colors.text }]}>
            <Text style={[styles.primaryButtonText, { color: colors.backgroundRoot }]}>Continue</Text>
            <Feather name="arrow-right" size={20} color={colors.backgroundRoot} />
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
  const { theme: colors, isDark } = useTheme();
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
      <ScrollView 
        contentContainerStyle={[styles.stepContent, { paddingTop: insets.top + 60 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepHeader}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>
            Meet your AI receptionist
          </Text>
          <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
            Never miss a booking call again
          </Text>
        </View>

        <Animated.View entering={FadeInUp.delay(100)} style={styles.voicePreviewContainer}>
          <View style={[styles.voiceCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <View style={[styles.voiceIconCircle, { backgroundColor: colors.text }]}>
              <Feather name="mic" size={32} color={colors.backgroundRoot} />
            </View>
            
            <Text style={[styles.voiceCardTitle, { color: colors.text }]}>
              AI Voice Agent
            </Text>
            <Text style={[styles.voiceCardDescription, { color: colors.textSecondary }]}>
              Handles incoming calls, answers questions about your services, and books appointments naturally
            </Text>

            <View style={styles.voiceFeatures}>
              <View style={styles.voiceFeatureRow}>
                <Feather name="check-circle" size={16} color="#10B981" />
                <Text style={[styles.voiceFeatureText, { color: colors.textSecondary }]}>24/7 availability</Text>
              </View>
              <View style={styles.voiceFeatureRow}>
                <Feather name="check-circle" size={16} color="#10B981" />
                <Text style={[styles.voiceFeatureText, { color: colors.textSecondary }]}>Natural conversations</Text>
              </View>
              <View style={styles.voiceFeatureRow}>
                <Feather name="check-circle" size={16} color="#10B981" />
                <Text style={[styles.voiceFeatureText, { color: colors.textSecondary }]}>Direct calendar integration</Text>
              </View>
            </View>

            <View style={[styles.trialBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <Feather name="gift" size={14} color={colors.text} />
              <Text style={[styles.trialBadgeText, { color: colors.text }]}>5 minutes free trial included</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <AnimatedPressable onPress={handleTestVoiceAgent} style={[styles.primaryButton, { backgroundColor: colors.text }]}>
          <Text style={[styles.primaryButtonText, { color: colors.backgroundRoot }]}>Test Voice Agent Now</Text>
          <Feather name="arrow-right" size={20} color={colors.backgroundRoot} />
        </AnimatedPressable>
        
        <View style={[styles.bottomActionsRow, { marginTop: Spacing.md }]}>
          <AnimatedPressable onPress={onBack} style={[styles.backButton, { borderColor: colors.border }]}>
            <Feather name="arrow-left" size={20} color={colors.text} />
          </AnimatedPressable>
          <Pressable onPress={handleSkipToHome} style={styles.skipButton}>
            <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>Skip for now</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { theme: colors, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedBusinessType, setSelectedBusinessType] = useState("salon");
  const [businessName, setBusinessName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [businessSlug, setBusinessSlug] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  const handleStep1Next = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentStep(1);
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
      
      const baseUrl = getApiUrl();
      const url = `${baseUrl}/b/${slug}`;
      setBookingUrl(url);
      
      try {
        const qrData = await api.getQRCode();
        if (qrData?.qrCode) {
          setQrCodeUrl(qrData.qrCode);
        }
      } catch (qrError) {
        console.warn("Failed to get QR code:", qrError);
      }
      
      setCurrentStep(2);
    } catch (error) {
      console.error("Error creating business:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleStep3Next = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentStep(3);
  };

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <StepIndicator currentStep={currentStep} totalSteps={4} />
      </View>

      {currentStep === 0 && (
        <Step1NicheSelection
          selectedType={selectedBusinessType}
          onSelect={setSelectedBusinessType}
          onNext={handleStep1Next}
        />
      )}

      {currentStep === 1 && (
        <Step2BusinessName
          businessName={businessName}
          onNameChange={setBusinessName}
          onNext={handleStep2Next}
          onBack={handleBack}
          isCreating={isCreating}
        />
      )}

      {currentStep === 2 && (
        <Step3AssetPreviews
          businessName={businessName || "My Business"}
          bookingUrl={bookingUrl}
          qrCodeUrl={qrCodeUrl}
          onNext={handleStep3Next}
          onBack={handleBack}
        />
      )}

      {currentStep === 3 && (
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
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1,
    marginBottom: Spacing.sm,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  stepSubtitle: {
    fontSize: 16,
    lineHeight: 24,
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  bottomActionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
  },
  primaryButtonFlex: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  inputContainer: {
    gap: Spacing.lg,
  },
  businessInput: {
    height: 56,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    fontSize: 18,
    fontWeight: '500',
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
  },
  previewSection: {
    marginBottom: Spacing["2xl"],
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: Spacing.md,
  },
  linkPreviewContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  tapHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  qrSection: {
    marginBottom: Spacing.xl,
  },
  qrContainer: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  qrImageWrapper: {
    width: 200,
    height: 200,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    position: 'relative',
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  qrCenterOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -40 }, { translateY: -12 }],
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  qrCenterText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.5,
  },
  voicePreviewContainer: {
    flex: 1,
  },
  voiceCard: {
    borderRadius: BorderRadius.xl,
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
    fontSize: 24,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  voiceCardDescription: {
    fontSize: 15,
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
    fontWeight: '500',
  },
  cinematicCard: {
    aspectRatio: 4 / 5,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  diagonalLines: {
    ...StyleSheet.absoluteFillObject,
  },
  diagonalLine: {
    position: 'absolute',
    left: -100,
    right: -100,
    height: 1,
    backgroundColor: '#fff',
    transform: [{ rotate: '25deg' }],
  },
  shadowColumn: {
    position: 'absolute',
    right: 30,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: 'rgba(0,0,0,0.4)',
    transform: [{ skewX: '-10deg' }],
  },
  cinematicContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  cinematicTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: -1.5,
    lineHeight: 40,
  },
  accentBar: {
    width: 50,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginTop: 10,
  },
  glassFooter: {
    backgroundColor: 'rgba(20,20,20,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 16,
  },
  glassFooterTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  footerLeft: {
    flex: 1,
  },
  businessNameText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    letterSpacing: 0.5,
  },
  subtitleText: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.5,
    marginTop: 3,
  },
  arrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  domainText: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1.5,
    marginTop: 10,
  },
});
