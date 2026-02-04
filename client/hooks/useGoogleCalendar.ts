import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import * as WebBrowser from "expo-web-browser";
import { Platform, Linking } from "react-native";

interface CalendarStatus {
  connected: boolean;
  email?: string;
}

export function useGoogleCalendar(businessId: string, ownerToken: string) {
  const queryClient = useQueryClient();

  const statusQuery = useQuery<CalendarStatus>({
    queryKey: ["/api/businesses", businessId, "google-calendar", "status"],
    queryFn: async () => {
      const url = new URL(`/api/businesses/${businessId}/google-calendar/status`, getApiUrl());
      const response = await fetch(url.toString(), {
        headers: {
          "x-owner-token": ownerToken,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch calendar status");
      }
      return response.json();
    },
    enabled: !!businessId && !!ownerToken,
    staleTime: 30000,
  });

  const connectCalendar = async () => {
    try {
      const url = new URL(`/api/businesses/${businessId}/google-calendar/auth-url`, getApiUrl());
      const response = await fetch(url.toString(), {
        headers: {
          "x-owner-token": ownerToken,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to get auth URL");
      }
      
      const { authUrl } = await response.json();
      
      if (Platform.OS === "web") {
        window.open(authUrl, "_blank");
      } else {
        await WebBrowser.openBrowserAsync(authUrl);
      }
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const disconnect = useMutation({
    mutationFn: async () => {
      const url = new URL(`/api/businesses/${businessId}/google-calendar`, getApiUrl());
      const response = await fetch(url.toString(), {
        method: "DELETE",
        headers: {
          "x-owner-token": ownerToken,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to disconnect calendar");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/businesses", businessId, "google-calendar", "status"],
      });
    },
  });

  return {
    isConnected: statusQuery.data?.connected ?? false,
    connectedEmail: statusQuery.data?.email,
    isLoading: statusQuery.isLoading,
    isError: statusQuery.isError,
    connectCalendar,
    disconnect,
    refetch: statusQuery.refetch,
  };
}
