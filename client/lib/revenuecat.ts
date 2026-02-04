import { Platform } from "react-native";
import Purchases, {
  LOG_LEVEL,
  CustomerInfo,
  PurchasesPackage,
  PurchasesOffering,
} from "react-native-purchases";

const ENTITLEMENT_ID = "BookFlowX Pro";
const IOS_REVENUECAT_API_KEY = "appl_LqjVbACDADybafbTUXlheXxxhkF";

// Voice Agent Entitlements (App Store Connect products)
export const VOICE_ENTITLEMENTS = {
  STARTER: "voice_starter",
  PRO: "voice_pro", 
  BUSINESS: "voice_business",
} as const;

// Voice tier configuration with minutes
export const VOICE_TIER_CONFIG = {
  voice_starter: { minutes: 60, price: "$49", name: "Starter" },
  voice_pro: { minutes: 200, price: "$149", name: "Pro" },
  voice_business: { minutes: 500, price: "$349", name: "Business" },
} as const;

export type VoiceTier = keyof typeof VOICE_TIER_CONFIG | "free";

function getApiKey(): string | null {
  if (Platform.OS === "ios") {
    return IOS_REVENUECAT_API_KEY;
  } else if (Platform.OS === "android") {
    return process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || null;
  }
  return null;
}

let isInitialized = false;

export async function initializeRevenueCat(): Promise<boolean> {
  if (isInitialized) {
    return true;
  }

  if (Platform.OS === "web") {
    console.log("RevenueCat: Skipping initialization on web platform");
    return false;
  }

  // Skip initialization if we are in Expo Go to avoid native module errors
  try {
    const Constants = require("expo-constants").default;
    const isExpoGo = Constants.executionEnvironment === "storeClient";
    if (isExpoGo) {
      console.log("RevenueCat: Running in Expo Go, skipping native initialization. Use a development build for full features.");
      return false;
    }
  } catch (e) {
    // Fallback if constants aren't available
  }

  // Ensure Purchases is configured for native platforms
  if (Platform.OS === "ios" || Platform.OS === "android") {
    const apiKey = getApiKey();
    if (apiKey) {
      try {
        // Purchases.configure can be called multiple times safely in newer versions
        // but we'll guard it anyway
        if (!isInitialized) {
          Purchases.configure({ apiKey });
          isInitialized = true;
        }
      } catch (e) {
        console.error("RevenueCat early config failed", e);
      }
    }
  }

  return isInitialized;
}

export async function checkPremiumStatus(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined";
  } catch (error) {
    return false;
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (Platform.OS === "web") {
    return null;
  }

  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error("RevenueCat: Failed to get customer info", error);
    return null;
  }
}

export async function getOfferings(): Promise<PurchasesOffering | null> {
  if (Platform.OS === "web") {
    return null;
  }

  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.current) {
      console.log("RevenueCat: Current offering found", offerings.current.identifier);
      return offerings.current;
    }
    console.log("RevenueCat: No current offering available");
    return null;
  } catch (error) {
    console.error("RevenueCat: Failed to get offerings", error);
    return null;
  }
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<{
  success: boolean;
  isPremium: boolean;
  error?: string;
}> {
  if (Platform.OS === "web") {
    return { success: false, isPremium: false, error: "Purchases not available on web" };
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isPremium = typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined";
    console.log(`RevenueCat: Purchase successful, premium = ${isPremium}`);
    return { success: true, isPremium };
  } catch (error: any) {
    if (error.userCancelled) {
      console.log("RevenueCat: User cancelled purchase");
      return { success: false, isPremium: false, error: "cancelled" };
    }
    console.error("RevenueCat: Purchase failed", error);
    return { success: false, isPremium: false, error: error.message || "Purchase failed" };
  }
}

export async function restorePurchases(): Promise<{
  success: boolean;
  isPremium: boolean;
  error?: string;
}> {
  if (Platform.OS === "web") {
    return { success: false, isPremium: false, error: "Restore not available on web" };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    const isPremium = typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined";
    console.log(`RevenueCat: Restore successful, premium = ${isPremium}`);
    return { success: true, isPremium };
  } catch (error: any) {
    console.error("RevenueCat: Restore failed", error);
    return { success: false, isPremium: false, error: error.message || "Restore failed" };
  }
}

// Get voice offerings specifically
export async function getVoiceOfferings(): Promise<PurchasesOffering | null> {
  if (Platform.OS === "web") {
    return null;
  }

  try {
    const offerings = await Purchases.getOfferings();
    // Try to get the voice-specific offering, fallback to current
    if (offerings.all["default_voice"]) {
      return offerings.all["default_voice"];
    }
    // Fallback to current offering if no voice-specific one
    return offerings.current;
  } catch (error) {
    console.error("RevenueCat: Failed to get voice offerings", error);
    return null;
  }
}

// Check which voice tier the user has access to
export async function getVoiceEntitlement(): Promise<VoiceTier> {
  // Mock premium for testing in Expo Go
  try {
    const Constants = require("expo-constants").default;
    const isExpoGo = Constants.executionEnvironment === "storeClient";
    if (isExpoGo) {
      console.log("RevenueCat: Running in Expo Go, granting mock premium entitlement for testing");
      return "voice_business";
    }
  } catch (e) {}

  if (Platform.OS === "web") {
    return "free";
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const active = customerInfo.entitlements.active;

    // Check in order of highest tier first
    if (active[VOICE_ENTITLEMENTS.BUSINESS]) {
      return "voice_business";
    }
    if (active[VOICE_ENTITLEMENTS.PRO]) {
      return "voice_pro";
    }
    if (active[VOICE_ENTITLEMENTS.STARTER]) {
      return "voice_starter";
    }
    return "free";
  } catch (error) {
    console.error("RevenueCat: Failed to check voice entitlement", error);
    return "free";
  }
}

// Get minutes limit for current voice tier
export function getVoiceMinutesLimit(tier: VoiceTier): number {
  if (tier === "free") return 5; // 5 minute trial
  return VOICE_TIER_CONFIG[tier]?.minutes || 5;
}

// Purchase a voice package
export async function purchaseVoicePackage(pkg: PurchasesPackage): Promise<{
  success: boolean;
  tier: VoiceTier;
  error?: string;
}> {
  if (Platform.OS === "web") {
    return { success: false, tier: "free", error: "Purchases not available on web" };
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const tier = await getVoiceEntitlement();
    console.log(`RevenueCat: Voice purchase successful, tier = ${tier}`);
    return { success: true, tier };
  } catch (error: any) {
    if (error.userCancelled) {
      console.log("RevenueCat: User cancelled voice purchase");
      return { success: false, tier: "free", error: "cancelled" };
    }
    console.error("RevenueCat: Voice purchase failed", error);
    return { success: false, tier: "free", error: error.message || "Purchase failed" };
  }
}

export { Purchases, ENTITLEMENT_ID };
export type { CustomerInfo, PurchasesPackage, PurchasesOffering };
