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

      <View style={[styles.bottomActions, { bottom: Spacing.xl + (Platform.OS === 'ios' ? 0 : insets.bottom), zIndex: 100 }]}>
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
        contentContainerStyle={[styles.stepContent, { paddingTop: insets.top + 60, paddingBottom: 120 }]}
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
              confirmbooking.online/book/{slug}
            </Text>
          </Animated.View>
        </View>
      </ScrollView>

      <View style={[styles.bottomActions, { bottom: Spacing.xl + (Platform.OS === 'ios' ? 0 : insets.bottom), zIndex: 100 }]}>
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
      <ScrollView 
        contentContainerStyle={[styles.stepContent, { paddingTop: insets.top + 60, paddingBottom: 100 }]}
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
                  <Text style={styles.qrCenterText} numberOfLines={1} adjustsFontSizeToFit>{businessName.toUpperCase()}</Text>
                </View>
              </View>
            ) : (
              <ActivityIndicator size="large" color={colors.text} />
            )}
          </Pressable>
          <Text style={[styles.tapHint, { color: colors.textTertiary }]}>Print this for your storefront</Text>
        </Animated.View>
      </ScrollView>

      <View style={[styles.bottomActions, { bottom: Spacing.xl + (Platform.OS === 'ios' ? 0 : insets.bottom), zIndex: 100 }]}>
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
        contentContainerStyle={[styles.stepContent, { paddingTop: insets.top + 60, paddingBottom: 140 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepHeader}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>
            Meet your Assistant
          </Text>
          <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
            Answers questions about your business 24/7
          </Text>
        </View>

        <Animated.View entering={FadeInUp.delay(100)} style={styles.voicePreviewContainer}>
          <View style={[styles.voiceCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <View style={[styles.voiceIconCircle, { backgroundColor: colors.text }]}>
              <Feather name="mic" size={32} color={colors.backgroundRoot} />
            </View>
            
            <Text style={[styles.voiceCardTitle, { color: colors.text }]}>
              Informational Assistant
            </Text>
            <Text style={[styles.voiceCardDescription, { color: colors.textSecondary }]}>
              Answers questions about your services, pricing, and availability, then directs customers to book via Text Booking
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
                <Text style={[styles.voiceFeatureText, { color: colors.textSecondary }]}>Trained on your services</Text>
              </View>
            </View>

            <View style={[styles.trialBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <Feather name="gift" size={14} color={colors.text} />
              <Text style={[styles.trialBadgeText, { color: colors.text }]}>5 minutes free trial included</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[styles.bottomActions, { bottom: Spacing.xl + (Platform.OS === 'ios' ? 0 : insets.bottom), zIndex: 100 }]}>
        <AnimatedPressable onPress={handleTestVoiceAgent} style={[styles.primaryButton, { backgroundColor: colors.text }]}>
          <Text style={[styles.primaryButtonText, { color: colors.backgroundRoot }]}>Test Assistant Now</Text>
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
      
      const finalBookingUrl = `https://confirmbooking.online/book/${slug}`;
      setBookingUrl(finalBookingUrl);
      
      try {
        const qrResponse = await fetch(`${getApiUrl()}/api/business/${updatedBiz.id}/qr?url=${encodeURIComponent(finalBookingUrl)}`);
        const qrData = await qrResponse.json();
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
    paddingBottom: 150,
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
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 2,
    marginBottom: Spacing.md,
  },
  linkPreviewContainer: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  tapHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  qrSection: {
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  qrContainer: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    width: '100%',
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
    maxWidth: '80%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCenterText: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 10,
    color: '#000',
    textAlign: 'center',
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
    height: 340,
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  diagonalLines: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  diagonalLine: {
    position: 'absolute',
    width: '200%',
    height: 1,
    backgroundColor: '#fff',
    transform: [{ rotate: '-45deg' }],
    left: '-50%',
  },
  shadowColumn: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '10%',
    width: '25%',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  cinematicContent: {
    padding: Spacing.xl,
    paddingTop: 40,
    flex: 1,
  },
  cinematicTitle: {
    fontFamily: 'CormorantGaramond_700Bold',
    fontSize: 48,
    color: '#fff',
    lineHeight: 44,
    letterSpacing: -1,
  },
  accentBar: {
    width: 40,
    height: 2,
    backgroundColor: '#fff',
    marginTop: Spacing.lg,
  },
  glassFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    padding: Spacing.lg,
    justifyContent: 'flex-end',
  },
  glassFooterTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Spacing.xs,
    zIndex: 1,
  },
  footerLeft: {
    flex: 1,
  },
  businessNameText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#fff',
    marginBottom: 4,
  },
  subtitleText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2,
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  domainText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1,
    zIndex: 1,
  },
});
