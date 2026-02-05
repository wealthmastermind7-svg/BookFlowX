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
        <AnimatedPressable onPress={onNext} style={[styles.primaryButton, { backgroundColor: '#fff' }]}>
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
      >
        <ScrollView 
          contentContainerStyle={[styles.stepContent, { paddingTop: insets.top + 80, paddingBottom: 200 }]}
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
        </ScrollView>

        <View style={[styles.bottomActions, { bottom: Spacing.xl + 40, zIndex: 100 }]}>
          <View style={styles.bottomActionsRow}>
            <AnimatedPressable onPress={onBack} style={[styles.backButton, { borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.05)' }]}>
              <Feather name="arrow-left" size={20} color="#fff" />
            </AnimatedPressable>
            <AnimatedPressable 
              onPress={onNext} 
              style={[styles.primaryButtonFlex, { backgroundColor: '#fff' }]}
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
            Your booking assets
          </Text>
          <Text style={[styles.stepSubtitle, { color: 'rgba(255,255,255,0.6)' }]}>
            Ready to share with customers
          </Text>
        </View>

        <Animated.View entering={FadeInUp.delay(100)} style={styles.previewSection}>
          <Text style={[styles.previewLabel, { color: 'rgba(255,255,255,0.5)' }]}>BOOKING LINK PREVIEW</Text>
          <Pressable onPress={handleOpenLink} style={styles.linkPreviewContainer}>
            <CinematicLinkPreview businessName={businessName} domain={domain} />
          </Pressable>
          <Text style={[styles.tapHint, { color: 'rgba(255,255,255,0.4)' }]}>Tap to open your live booking page</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200)} style={styles.qrSection}>
          <Text style={[styles.previewLabel, { color: 'rgba(255,255,255,0.5)' }]}>QR CODE</Text>
          <View 
            style={[styles.qrContainer, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }]}
          >
            {qrCodeUrl ? (
              <View style={styles.qrImageWrapper}>
                <Image source={{ uri: qrCodeUrl }} style={styles.qrImage} contentFit="contain" />
                <View style={styles.qrCenterOverlay}>
                  <Text style={styles.qrCenterText} numberOfLines={1} adjustsFontSizeToFit>{businessName.toUpperCase()}</Text>
                </View>
              </View>
            ) : (
              <ActivityIndicator size="large" color="#fff" />
            )}
          </View>
          <Text style={[styles.tapHint, { color: 'rgba(255,255,255,0.4)' }]}>Print this for your storefront</Text>
        </Animated.View>
      </ScrollView>

      <View style={[styles.bottomActions, { bottom: Spacing.xl + insets.bottom, zIndex: 100 }]}>
        <View style={styles.bottomActionsRow}>
          <AnimatedPressable onPress={onBack} style={[styles.backButton, { borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.05)' }]}>
            <Feather name="arrow-left" size={20} color="#fff" />
          </AnimatedPressable>
          <AnimatedPressable onPress={onNext} style={[styles.primaryButtonFlex, { backgroundColor: '#fff' }]}>
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
        <AnimatedPressable onPress={handleTestVoiceAgent} style={[styles.primaryButton, { backgroundColor: '#fff' }]}>
          <Text style={[styles.primaryButtonText, { color: '#000' }]}>Test Assistant Now</Text>
          <Feather name="arrow-right" size={20} color="#000" />
        </AnimatedPressable>
        
        <View style={[styles.bottomActionsRow, { marginTop: Spacing.md }]}>
          <AnimatedPressable onPress={onBack} style={[styles.backButton, { borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.05)' }]}>
            <Feather name="arrow-left" size={20} color="#fff" />
          </AnimatedPressable>
          <Pressable onPress={handleSkipToHome} style={styles.skipButton}>
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
      
      // Instantly generate QR code URL locally to avoid delay
      const qrUrl = `${getApiUrl()}/api/business/${updatedBiz.id}/qr?url=${encodeURIComponent(finalBookingUrl)}`;
      setQrCodeUrl(qrUrl);
      
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
    <View style={styles.container}>
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
    width: 240,
    height: 240,
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 16,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  qrCenterOverlay: {
    position: 'absolute',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#000',
    maxWidth: '85%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  qrCenterText: {
    fontFamily: 'Inter_900Black',
    fontSize: 11,
    color: '#000',
    textAlign: 'center',
    letterSpacing: -0.5,
    fontWeight: '900',
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
});
