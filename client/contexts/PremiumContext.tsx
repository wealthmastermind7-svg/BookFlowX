import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo } from "react";
import { Alert, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { PaywallType, PlanType } from "@/components/PaywallModal";
import { api } from "@/lib/api";
import {
  initializeRevenueCat,
  checkPremiumStatus,
  getOfferings,
  purchasePackage,
  restorePurchases,
  PurchasesPackage,
  PurchasesOffering,
} from "@/lib/revenuecat";

interface PremiumState {
  isPremium: boolean;
  trialEndsAt: string | null;
}

interface PremiumContextType {
  isPremium: boolean;
  isTrialActive: boolean;
  trialDaysLeft: number;
  canShare: boolean;
  canGenerateQr: boolean;
  canUseEmbeds: boolean;
  paywallVisible: boolean;
  paywallType: PaywallType;
  isLoading: boolean;
  offerings: PurchasesOffering | null;
  showPaywall: (type: PaywallType) => void;
  hidePaywall: () => void;
  checkShareAccess: () => boolean;
  checkQrAccess: () => boolean;
  checkEmbedAccess: () => boolean;
  handleUpgrade: (plan: PlanType) => Promise<void>;
  purchaseProduct: (pkg: PurchasesPackage) => Promise<boolean>;
  restoreSubscription: () => Promise<boolean>;
  updatePremiumState: (state: Partial<PremiumState>) => void;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

interface PremiumProviderProps {
  children: ReactNode;
  initialState?: Partial<PremiumState>;
}

export function PremiumProvider({ children, initialState }: PremiumProviderProps) {
  const [isPremium, setIsPremium] = useState(false);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [stats, setStats] = useState({ services: 0, bookings: 0 });
  
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [paywallType, setPaywallType] = useState<PaywallType>("soft_upsell");
  const [isLoading, setIsLoading] = useState(false);
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);

  useEffect(() => {
    async function initPurchases() {
      const initialized = await initializeRevenueCat();
      
      // Load business and stats first to determine trial
      try {
        const business = await api.getBusiness();
        if (business) {
          if (business.createdAt) {
            const createdDate = new Date(business.createdAt);
            const trialDays = 7;
            // Ensure trial lasts full 7 days from creation
            const endsAt = new Date(createdDate.getTime() + (trialDays + 1) * 24 * 60 * 60 * 1000);
            setTrialEndsAt(endsAt.toISOString());
          }

          const [services, bookings] = await Promise.all([
            api.getServices(),
            api.getBookings()
          ]);
          setStats({ 
            services: services?.length || 0, 
            bookings: bookings?.length || 0 
          });
        }
      } catch (error) {
        console.error("Error loading stats/trial for gating:", error);
      }

      if (initialized) {
        const premium = await checkPremiumStatus();
        setIsPremium(premium);
        
        const currentOfferings = await getOfferings();
        setOfferings(currentOfferings);
      }
    }
    initPurchases();
  }, []);

  const isTrialActive = useMemo(() => {
    if (isPremium) return false;
    if (!trialEndsAt) return true; // Default to active if we don't know yet
    return new Date() < new Date(trialEndsAt);
  }, [isPremium, trialEndsAt]);

  const trialDaysLeft = useMemo(() => {
    if (!trialEndsAt) return 0;
    const diff = new Date(trialEndsAt).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [trialEndsAt]);

  const canShare = isPremium || isTrialActive;
  const canGenerateQr = isPremium || isTrialActive;
  const canUseEmbeds = isPremium; // Embeds still premium-only

  const showPaywall = useCallback((type: PaywallType) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    } catch (e) {
      // Ignore haptic errors
    }
    setPaywallType(type);
    setPaywallVisible(true);
  }, []);

  const hidePaywall = useCallback(() => {
    setPaywallVisible(false);
  }, []);

  const checkShareAccess = useCallback((): boolean => {
    if (isPremium || isTrialActive) return true;
    showPaywall("share_limit");
    return false;
  }, [isPremium, isTrialActive, showPaywall]);

  const checkQrAccess = useCallback((): boolean => {
    if (isPremium || isTrialActive) return true;
    showPaywall("qr_limit");
    return false;
  }, [isPremium, isTrialActive, showPaywall]);

  const checkEmbedAccess = useCallback((): boolean => {
    if (isPremium) return true;
    showPaywall("embed_locked");
    return false;
  }, [isPremium, showPaywall]);

  const purchaseProduct = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    if (Platform.OS === "web") {
      Alert.alert("Not Available", "Subscriptions are only available in the mobile app.");
      return false;
    }

    setIsLoading(true);
    try {
      const result = await purchasePackage(pkg);
      if (result.success && result.isPremium) {
        setIsPremium(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        hidePaywall();
        Alert.alert("Welcome to Premium!", "You now have unlimited access to all BookFlow features.");
        return true;
      } else if (result.error === "cancelled") {
        return false;
      } else {
        Alert.alert("Purchase Failed", result.error || "Please try again.");
        return false;
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong. Please try again.");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [hidePaywall]);

  const restoreSubscription = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web") {
      Alert.alert("Not Available", "Restore is only available in the mobile app.");
      return false;
    }

    setIsLoading(true);
    try {
      const result = await restorePurchases();
      if (result.success && result.isPremium) {
        setIsPremium(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        hidePaywall();
        Alert.alert("Restored!", "Your premium subscription has been restored.");
        return true;
      } else {
        Alert.alert("No Subscription Found", "We couldn't find an active subscription to restore.");
        return false;
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong. Please try again.");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [hidePaywall]);

  const handleUpgrade = useCallback(async (plan: PlanType) => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Mobile Only",
        "Subscriptions are available in the iOS and Android app.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    if (!offerings || offerings.availablePackages.length === 0) {
      Alert.alert(
        "Products Not Available",
        "Unable to load subscription options. Please try again.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    const selectedPackage = offerings.availablePackages.find((pkg) => {
      const identifier = pkg.identifier.toLowerCase();
      if (plan === "yearly") {
        return identifier.includes("annual") || identifier.includes("yearly") || identifier.includes("year");
      } else if (plan === "lifetime") {
        return identifier.includes("lifetime") || identifier.includes("forever") || identifier.includes("one-time");
      } else {
        return identifier.includes("monthly") || identifier.includes("month");
      }
    });

    if (!selectedPackage) {
      Alert.alert(
        "Plan Not Available",
        `The ${plan} plan is not available. Please try again.`,
        [{ text: "OK", style: "default" }]
      );
      console.error(`Could not find ${plan} package in offerings:`, offerings.availablePackages.map((p) => p.identifier));
      return;
    }

    await purchaseProduct(selectedPackage);
  }, [offerings, purchaseProduct]);

  const updatePremiumState = useCallback((state: Partial<PremiumState>) => {
    if (state.isPremium !== undefined) setIsPremium(state.isPremium);
  }, []);

  return (
    <PremiumContext.Provider
      value={{
        isPremium,
        isTrialActive,
        trialDaysLeft,
        canShare,
        canGenerateQr,
        canUseEmbeds,
        paywallVisible,
        paywallType,
        isLoading,
        offerings,
        showPaywall,
        hidePaywall,
        checkShareAccess,
        checkQrAccess,
        checkEmbedAccess,
        handleUpgrade,
        purchaseProduct,
        restoreSubscription,
        updatePremiumState,
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const context = useContext(PremiumContext);
  if (!context) {
    throw new Error("usePremium must be used within a PremiumProvider");
  }
  return context;
}
