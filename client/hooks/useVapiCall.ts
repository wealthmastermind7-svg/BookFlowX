import { useState, useEffect, useRef, useCallback } from "react";
import Vapi from "@vapi-ai/web";
import { getApiUrl } from "@/lib/query-client";

interface VapiMessage {
  role: "user" | "assistant";
  text: string;
}

interface UseVapiCallOptions {
  businessSlug: string;
  publicKey: string;
}

interface VapiCallState {
  isConnected: boolean;
  isConnecting: boolean;
  isSpeaking: boolean;
  transcript: VapiMessage[];
  error: string | null;
}

export function useVapiCall({ businessSlug, publicKey }: UseVapiCallOptions) {
  const vapiRef = useRef<Vapi | null>(null);
  const [state, setState] = useState<VapiCallState>({
    isConnected: false,
    isConnecting: false,
    isSpeaking: false,
    transcript: [],
    error: null,
  });

  useEffect(() => {
    if (!publicKey) return;

    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

    vapi.on("call-start", () => {
      setState((prev) => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        error: null,
      }));
    });

    vapi.on("call-end", () => {
      setState((prev) => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        isSpeaking: false,
      }));
    });

    vapi.on("speech-start", () => {
      setState((prev) => ({ ...prev, isSpeaking: true }));
    });

    vapi.on("speech-end", () => {
      setState((prev) => ({ ...prev, isSpeaking: false }));
    });

    vapi.on("message", (message: any) => {
      if (message.type === "transcript" && message.transcriptType === "final") {
        setState((prev) => ({
          ...prev,
          transcript: [
            ...prev.transcript,
            { role: message.role, text: message.transcript },
          ],
        }));
      }
    });

    vapi.on("error", (error: any) => {
      console.error("Vapi error:", error);
      setState((prev) => ({
        ...prev,
        error: error?.message || "Connection error",
        isConnecting: false,
      }));
    });

    return () => {
      vapi.stop();
    };
  }, [publicKey]);

  const startCall = useCallback(async () => {
    if (!vapiRef.current || !businessSlug) return;

    setState((prev) => ({
      ...prev,
      isConnecting: true,
      error: null,
      transcript: [],
    }));

    try {
      const configUrl = new URL(
        `/api/vapi/assistant-config/${businessSlug}`,
        getApiUrl()
      );
      const response = await fetch(configUrl.toString());

      if (!response.ok) {
        throw new Error("Failed to load assistant configuration");
      }

      const assistantConfig = await response.json();
      await vapiRef.current.start(assistantConfig);
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: err.message || "Failed to start call",
      }));
    }
  }, [businessSlug]);

  const stopCall = useCallback(() => {
    vapiRef.current?.stop();
  }, []);

  const toggleCall = useCallback(() => {
    if (state.isConnected) {
      stopCall();
    } else if (!state.isConnecting) {
      startCall();
    }
  }, [state.isConnected, state.isConnecting, startCall, stopCall]);

  return {
    ...state,
    startCall,
    stopCall,
    toggleCall,
  };
}
