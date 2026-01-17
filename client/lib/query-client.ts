import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Gets the base URL for the Express API server (e.g., "http://localhost:3000")
 * @returns {string} The API base URL
 */
export function getApiUrl(): string {
  // Check if we're in a true browser environment (not React Native)
  const isRealBrowser = typeof window !== "undefined" && 
    window.location && 
    typeof window.location.hostname === "string" && 
    window.location.hostname.length > 0;

  if (isRealBrowser) {
    const currentHost = window.location.hostname;
    const currentProtocol = window.location.protocol;
    
    // If running on Replit domain, use port 5000 on the same host
    if (currentHost.includes("replit.dev") || currentHost.includes("replit.app")) {
      return `${currentProtocol}//${currentHost}:5000/`;
    }
    
    // If running on custom production domain
    if (currentHost.includes("confirmbooking.online")) {
      return `${currentProtocol}//${currentHost}/`;
    }
    
    // Local development - use localhost:5000
    if (currentHost === "localhost" || currentHost === "127.0.0.1") {
      return "http://localhost:5000/";
    }
  }

  // For native apps (Expo Go, TestFlight, etc.)
  // First try expo-constants (works for TestFlight/production builds)
  try {
    const Constants = require("expo-constants").default;
    
    // In Expo Go, check if we're debugging against a local/dev server
    // hostUri is present when running in Expo Go
    const isExpoGo = Constants?.expoConfig?.hostUri || Constants?.manifest?.hostUri || Constants?.manifest2?.extra?.expoClient?.hostUri;
    
    if (isExpoGo) {
      const packagerHostname = process.env.REACT_NATIVE_PACKAGER_HOSTNAME;
      if (packagerHostname && !packagerHostname.includes("$")) {
        return `http://${packagerHostname}:5000/`;
      }
    }

    // Try multiple paths for different Expo SDK versions
    const apiDomain = 
      Constants?.expoConfig?.extra?.apiDomain ||
      Constants?.manifest?.extra?.apiDomain ||
      Constants?.manifest2?.extra?.expoClient?.extra?.apiDomain ||
      "";
    
    if (apiDomain && apiDomain.length > 0) {
      const protocol = apiDomain.includes("localhost") ? "http" : "https";
      return `${protocol}://${apiDomain}/`;
    }
  } catch (e) {
    // expo-constants not available
  }

  // Try EXPO_PUBLIC_DOMAIN environment variable (works for Expo Go dev)
  let host = process.env.EXPO_PUBLIC_DOMAIN || "";
  
  // Handle case where env var contains literal $REPLIT_DEV_DOMAIN (not interpolated)
  if (host.includes("$REPLIT_DEV_DOMAIN") || !host) {
    // For native Expo Go, construct domain from packager hostname if available
    const packagerHostname = process.env.REACT_NATIVE_PACKAGER_HOSTNAME;
    if (packagerHostname && !packagerHostname.includes("$")) {
      host = `${packagerHostname}:5000`;
    } else {
      // Final fallback
      host = "localhost:5000";
    }
  }

  // Check if host already has a protocol
  let url: URL;
  if (host.startsWith("http://") || host.startsWith("https://")) {
    url = new URL(host);
  } else {
    // Assume https for production domains, http for localhost
    const protocol = host.includes("localhost") ? "http" : "https";
    url = new URL(`${protocol}://${host}`);
  }

  return url.href;
}

/**
 * Gets the public booking domain (clean domain without protocol)
 * Used for generating public booking URLs and QR codes
 * @returns {string} The clean domain (e.g., "confirmbooking.online")
 */
export function getBookingDomain(): string {
  // Check if we're in a true browser environment (not React Native)
  const isRealBrowser = typeof window !== "undefined" && 
    window.location && 
    typeof window.location.hostname === "string" && 
    window.location.hostname.length > 0;

  if (isRealBrowser) {
    const currentHost = window.location.hostname;
    
    // If running on Replit domain, use localhost for development
    if (currentHost.includes("replit.dev") || currentHost.includes("replit.app")) {
      return `${currentHost}:5000`;
    }
    
    // If running on custom production domain or localhost, use it
    if (currentHost.includes("confirmbooking.online") || currentHost === "localhost" || currentHost === "127.0.0.1") {
      // For production domain, just use the domain
      if (currentHost.includes("confirmbooking.online")) {
        return currentHost;
      }
      // For localhost, include port
      return currentHost === "localhost" ? "localhost:5000" : currentHost;
    }
  }

  // For native apps (Expo Go, TestFlight, etc.)
  // First try expo-constants (works for TestFlight/production builds)
  try {
    const Constants = require("expo-constants").default;
    
    // In Expo Go, check if we're debugging against a local/dev server
    const isExpoGo = Constants?.expoConfig?.hostUri || Constants?.manifest?.hostUri || Constants?.manifest2?.extra?.expoClient?.hostUri;
    
    if (isExpoGo) {
      const packagerHostname = process.env.REACT_NATIVE_PACKAGER_HOSTNAME;
      if (packagerHostname && !packagerHostname.includes("$")) {
        return `${packagerHostname}:5000`;
      }
    }

    // Try multiple paths for different Expo SDK versions
    const apiDomain = 
      Constants?.expoConfig?.extra?.apiDomain ||
      Constants?.manifest?.extra?.apiDomain ||
      Constants?.manifest2?.extra?.expoClient?.extra?.apiDomain ||
      "";
    
    if (apiDomain && apiDomain.length > 0) {
      return apiDomain.replace(/^https?:\/\//, "");
    }
  } catch (e) {
    // expo-constants not available
  }

  // Try EXPO_PUBLIC_DOMAIN environment variable (works for Expo Go dev)
  let domain = process.env.EXPO_PUBLIC_DOMAIN || "";

  // Handle literal template strings
  if (domain.includes("$REPLIT_DEV_DOMAIN") || !domain) {
    const packagerHostname = process.env.REACT_NATIVE_PACKAGER_HOSTNAME;
    if (packagerHostname && !packagerHostname.includes("$")) {
      domain = packagerHostname;
    } else {
      domain = "localhost:5000";
    }
  }

  // Strip any protocol if present
  return domain.replace(/^https?:\/\//, "");
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
