import { Platform } from "react-native";
import Purchases, {
  LOG_LEVEL,
  CustomerInfo,
  PurchasesPackage,
  PurchasesOffering,
} from "react-native-purchases";

const ENTITLEMENT_ID = "BookFlowX Pro";
const IOS_REVENUECAT_API_KEY = "appl_LqjVbACDADybafbTUXlheXxxhkF";

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

  const apiKey = getApiKey();
  if (!apiKey) {
    console.log("RevenueCat: No API key configured for platform", Platform.OS);
    return false;
  }

  try {
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
    
    console.log(`RevenueCat: Configuring with ${Platform.OS} API key`);
    if (Platform.OS === "ios") {
      console.log(`RevenueCat: Using hardcoded iOS key: ${IOS_REVENUECAT_API_KEY}`);
    }
    
    await Purchases.configure({ apiKey });
    isInitialized = true;
    console.log("RevenueCat: Successfully initialized");
    return true;
  } catch (error) {
    console.error("RevenueCat: Failed to initialize", error);
    return false;
  }
}

export async function checkPremiumStatus(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const isPremium = typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined";
    console.log(`RevenueCat: Premium status = ${isPremium}`);
    return isPremium;
  } catch (error) {
    console.error("RevenueCat: Failed to check premium status", error);
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

export { Purchases, ENTITLEMENT_ID };
export type { CustomerInfo, PurchasesPackage, PurchasesOffering };
