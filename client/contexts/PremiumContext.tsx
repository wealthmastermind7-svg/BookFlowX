import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Alert, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { PaywallType, PlanType } from "@/components/PaywallModal";
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
}

interface PremiumContextType {
  isPremium: boolean;
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
  const [isPremium, setIsPremium] = useState(true);
  
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [paywallType, setPaywallType] = useState<PaywallType>("soft_upsell");
  const [isLoading, setIsLoading] = useState(false);
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);

  useEffect(() => {
    async function initPurchases() {
      const initialized = await initializeRevenueCat();
      if (initialized) {
        const premium = await checkPremiumStatus();
        setIsPremium(premium);
        
        const currentOfferings = await getOfferings();
        setOfferings(currentOfferings);
      } else {
        // Fallback for web or Expo Go
        try {
          const business = await api.getBusiness();
          if (business && business.createdAt) {
            const created = new Date(business.createdAt).getTime();
            const now = new Date().getTime();
            const trialDays = 7;
            const msPerDay = 24 * 60 * 60 * 1000;
            const isTrialActive = now - created < trialDays * msPerDay;
            
            // In trial, we consider them premium for gating purposes if not on web
            if (isTrialActive && Platform.OS !== "web") {
              setIsPremium(true);
            } else if (!isTrialActive) {
              // Trial expired, strictly check premium status (already false by default)
              setIsPremium(false);
            }
          }
        } catch (error) {
          console.error("Error checking trial status:", error);
        }
      }
    }
    initPurchases();
  }, []);

  const canShare = isPremium;
  const canGenerateQr = isPremium;
  const canUseEmbeds = isPremium;

  const showPaywall = useCallback((type: PaywallType) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setPaywallType(type);
    setPaywallVisible(true);
  }, []);

  const hidePaywall = useCallback(() => {
    setPaywallVisible(false);
  }, []);

  const checkShareAccess = useCallback((): boolean => {
    if (isPremium) return true;
    showPaywall("share_limit");
    return false;
  }, [isPremium, showPaywall]);

  const checkQrAccess = useCallback((): boolean => {
    if (isPremium) return true;
    showPaywall("qr_limit");
    return false;
  }, [isPremium, showPaywall]);

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
