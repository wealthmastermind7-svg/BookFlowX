import { useState, useEffect, useCallback } from "react";
import { getApiUrl } from "@/lib/query-client";

interface SmartSuggestion {
  type: "upsell" | "addon" | "timing" | "message";
  title: string;
  description: string;
  value?: string;
  confidence: number;
  reasoning: string;
}

interface DynamicMessaging {
  heroPhrase: string;
  confirmationTone: string;
  reminderStyle: string;
  ctaText: string;
}

interface UpsellResponse {
  suggestion: SmartSuggestion | null;
  context: {
    industry: string;
    timeOfDay: string;
    dayOfWeek: string;
  };
}

interface MessagingResponse {
  messaging: DynamicMessaging;
  industry: string;
}

interface UseSmartSuggestionsOptions {
  businessId: string;
  serviceId: string;
  customerType?: "new" | "returning";
  bookingChannel?: "qr" | "link" | "app" | "widget";
  mobileService?: boolean;
}

export function useSmartSuggestions(options: UseSmartSuggestionsOptions) {
  const [upsell, setUpsell] = useState<SmartSuggestion | null>(null);
  const [messaging, setMessaging] = useState<DynamicMessaging | null>(null);
  const [industry, setIndustry] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUpsellSuggestion = useCallback(async () => {
    if (!options.businessId || !options.serviceId) return;

    try {
      const response = await fetch(new URL("/api/smart-suggestions/upsell", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: options.businessId,
          serviceId: options.serviceId,
          customerType: options.customerType || "new",
          bookingChannel: options.bookingChannel || "link",
          mobileService: options.mobileService || false,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch upsell suggestion");
      }

      const data: UpsellResponse = await response.json();
      setUpsell(data.suggestion);
      setIndustry(data.context.industry);
    } catch (err) {
      console.warn("[SmartSuggestions] Upsell fetch failed:", err);
    }
  }, [options.businessId, options.serviceId, options.customerType, options.bookingChannel, options.mobileService]);

  const fetchMessaging = useCallback(async () => {
    if (!options.businessId || !options.serviceId) return;

    try {
      const response = await fetch(new URL("/api/smart-suggestions/messaging", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: options.businessId,
          serviceId: options.serviceId,
          customerType: options.customerType || "new",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch messaging");
      }

      const data: MessagingResponse = await response.json();
      setMessaging(data.messaging);
      if (!industry) setIndustry(data.industry);
    } catch (err) {
      console.warn("[SmartSuggestions] Messaging fetch failed:", err);
    }
  }, [options.businessId, options.serviceId, options.customerType, industry]);

  const loadSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([fetchUpsellSuggestion(), fetchMessaging()]);
    } catch (err) {
      setError("Failed to load smart suggestions");
    } finally {
      setLoading(false);
    }
  }, [fetchUpsellSuggestion, fetchMessaging]);

  useEffect(() => {
    if (options.businessId && options.serviceId) {
      loadSuggestions();
    }
  }, [options.businessId, options.serviceId]);

  return {
    upsell,
    messaging,
    industry,
    loading,
    error,
    refresh: loadSuggestions,
  };
}

export function useRevenueInsight(businessId: string, serviceId: string, percentageIncrease?: number) {
  const [explanation, setExplanation] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const fetchInsight = useCallback(async () => {
    if (!businessId || !serviceId) return;

    setLoading(true);
    try {
      const response = await fetch(new URL("/api/smart-suggestions/revenue-insight", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          serviceId,
          percentageIncrease: percentageIncrease || 15,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setExplanation(data.explanation);
      }
    } catch (err) {
      console.warn("[SmartSuggestions] Revenue insight fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, [businessId, serviceId, percentageIncrease]);

  useEffect(() => {
    fetchInsight();
  }, [fetchInsight]);

  return { explanation, loading, refresh: fetchInsight };
}
