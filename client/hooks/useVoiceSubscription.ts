import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiUrl, apiRequest } from "@/lib/query-client";

interface VoiceSubscription {
  tier: "free" | "starter" | "pro" | "business";
  status: "active" | "canceled" | "past_due" | "trialing";
  minutesLimit: number;
  minutesUsed: number;
  periodStart: string;
  periodEnd: string;
  stripeSubscriptionId?: string;
}

interface VoiceUsage {
  available: boolean;
  remaining: number;
  percentUsed: number;
}

interface VoiceStats {
  totalCalls: number;
  bookingsCreated: number;
  conversionRate: number;
}

interface VoiceSubscriptionResponse {
  subscription: VoiceSubscription;
  usage: VoiceUsage;
  stats: VoiceStats;
}

interface VoiceTier {
  id: string;
  name: string;
  price: number;
  priceDisplay?: string;
  minutes: number;
  features: string[];
  popular?: boolean;
}

interface VoiceCallLog {
  id: number;
  businessId: string;
  callId?: string;
  durationSeconds: number;
  durationMinutes: number;
  customerPhone?: string;
  customerName?: string;
  bookingCreated: boolean;
  bookingId?: string;
  status: string;
  cost: number;
  createdAt: string;
}

interface UpgradeTier {
  tier: string;
  name: string;
  price: string;
  minutes: number;
}

const UPGRADE_MAP: Record<string, UpgradeTier | null> = {
  free: { tier: "starter", name: "Starter", price: "$49/mo", minutes: 60 },
  starter: { tier: "pro", name: "Pro", price: "$149/mo", minutes: 200 },
  pro: { tier: "business", name: "Business", price: "$349/mo", minutes: 500 },
  business: null,
};

export function useVoiceSubscription(businessId: string, ownerToken: string) {
  const query = useQuery<VoiceSubscriptionResponse>({
    queryKey: ["/api/businesses", businessId, "voice-subscription"],
    queryFn: async () => {
      const url = new URL(`/api/businesses/${businessId}/voice-subscription`, getApiUrl());
      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch voice subscription");
      }
      return response.json();
    },
    enabled: !!businessId && !!ownerToken,
    staleTime: 60000,
  });

  const subscription = query.data?.subscription;
  const usage = query.data?.usage;

  const isExhausted = usage ? !usage.available : false;
  const upgradeTo = subscription ? UPGRADE_MAP[subscription.tier] || null : null;

  return {
    ...query,
    isExhausted,
    upgradeTo,
  };
}

export function useVoiceTiers() {
  return useQuery<{ tiers: VoiceTier[] }>({
    queryKey: ["/api/voice-tiers"],
    staleTime: 300000,
  });
}

export function useVoiceCallLogs(businessId: string, ownerToken: string, limit = 50) {
  return useQuery<{ calls: VoiceCallLog[] }>({
    queryKey: ["/api/businesses", businessId, "voice-calls", limit],
    queryFn: async () => {
      const url = new URL(`/api/businesses/${businessId}/voice-calls?limit=${limit}`, getApiUrl());
      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch voice call logs");
      }
      return response.json();
    },
    enabled: !!businessId && !!ownerToken,
    staleTime: 30000,
  });
}

export function getTierColor(tier: string): string {
  switch (tier) {
    case "free":
      return "#6B7280";
    case "starter":
      return "#3B82F6";
    case "pro":
      return "#8B5CF6";
    case "business":
      return "#F59E0B";
    default:
      return "#6B7280";
  }
}

export function getTierName(tier: string): string {
  switch (tier) {
    case "free":
      return "Free Trial";
    case "starter":
      return "Starter";
    case "pro":
      return "Pro";
    case "business":
      return "Business";
    default:
      return tier;
  }
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${remainingMinutes} min`;
}
