import React, { useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { api, type Service } from "@/lib/api";
import { getApiUrl } from "@/lib/query-client";
import { getCustomerBookingUrl } from "@shared/booking-links";
import { OwnerGlassCard } from "@/components/owner/OwnerGlassCard";

const ONBOARDING_COMPLETE_KEY = "@bookflow_onboarding_complete";
const VIEWING_TYPES = [
  { label: "Property Viewing", serviceName: "Property Viewing", icon: "home" },
  { label: "Rental Inspection", serviceName: "Rental Inspection", icon: "clipboard" },
  { label: "Open Home", serviceName: "Open Home Session", icon: "key" },
  { label: "Move-in Walkthrough", serviceName: "Tenant Move-In Walkthrough", icon: "check-square" },
] as const;

export async function checkOnboardingComplete(): Promise<boolean> {
  try { return (await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY)) === "true"; }
  catch { return false; }
}

export default function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [agencyName, setAgencyName] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(VIEWING_TYPES.map((type) => type.serviceName));
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [slug, setSlug] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [qrFailed, setQrFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const seededServiceIds = useRef(new Set<string>());
  const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

  const readServicesSafely = async (businessId: string): Promise<Service[]> => {
    // Unlike getServices' empty-array fallback, a failed request must not be
    // interpreted as an empty agency before calling the destructive demo loader.
    const response = await fetch(new URL(`/api/businesses/${businessId}/services`, getApiUrl()).toString());
    if (!response.ok) throw new Error("Couldn't check your existing viewing types. Please try again.");
    const services = await response.json();
    if (!Array.isArray(services)) throw new Error("Couldn't verify your existing viewing types.");
    return services;
  };
  const loadQRCode = async () => {
    setQrFailed(false);
    const data = await api.getQRCode();
    if (data?.qrCode) setQrCode(data.qrCode);
    else setQrFailed(true);
  };
  const prepareAgency = async () => {
    if (creating || !selectedTypes.length) return;
    tap(); setCreating(true); setError("");
    try {
      const business = await api.getOrCreateBusiness();
      const existingServices = await readServicesSafely(business.id);
      await api.updateBusiness({ name: agencyName.trim() });
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (timezone) await api.updateBusiness({ timezone });
      } catch (timezoneError) { console.warn("Couldn't detect agency timezone", timezoneError); }
      if (existingServices.length === 0) {
        await api.initializeDemoData("property");
        const seededServices = await readServicesSafely(business.id);
        seededServiceIds.current = new Set(seededServices.map((service) => service.id));
      }
      // Only change records created by this setup. Existing agencies retain all
      // their services, clients, bookings and availability.
      if (seededServiceIds.current.size) {
        const services = await readServicesSafely(business.id);
        await Promise.all(services.filter((service) => seededServiceIds.current.has(service.id)).map((service) =>
          api.updateService(service.id, { isActive: selectedTypes.includes(service.name) }),
        ));
      }
      const updatedBusiness = await api.getOrCreateBusiness();
      if (!updatedBusiness.bookingUrl) throw new Error("Your booking link isn't available yet. Please try again.");
      setSlug(updatedBusiness.slug); setBookingUrl(getCustomerBookingUrl(updatedBusiness.slug));
      await loadQRCode();
      setStep(2);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't set up your agency. Please try again.");
    } finally { setCreating(false); }
  };
  const finish = async () => {
    if (creating) return;
    tap(); setCreating(true); setError("");
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
      onComplete();
    } catch { setError("Couldn't save your setup. Please try again."); setCreating(false); }
  };
  const toggleType = (name: string) => {
    tap();
    setSelectedTypes((current) => current.includes(name) ? current.filter((type) => type !== name) : [...current, name]);
  };
  const next = () => {
    setError("");
    if (step === 0) { tap(); setStep(1); }
    else if (step === 1) void prepareAgency();
    else void finish();
  };
  const disabled = creating || (step === 0 ? agencyName.trim().length < 2 : step === 1 ? !selectedTypes.length : !bookingUrl);

  return (
    <KeyboardAvoidingView style={styles.background} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
        <View style={styles.brand}><Feather name="home" size={20} color="#00D4FF" /><Text style={styles.brandName}>BookFlowX</Text></View>
        <View style={styles.progress} accessibilityLabel={`Step ${step + 1} of 3`}>
          {[0, 1, 2].map((index) => <View key={index} style={[styles.progressLine, index <= step && styles.progressActive]} />)}
        </View>
        <Text style={styles.label}>Step {step + 1} of 3</Text>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {step === 0 ? <>
          <View style={styles.intro}><Text style={styles.title}>Your agency name</Text><Text style={styles.body}>Let buyers and tenants know who they’re booking with.</Text></View>
          <OwnerGlassCard>
            <Text style={styles.fieldLabel}>Agency name</Text>
            <TextInput value={agencyName} onChangeText={setAgencyName} style={styles.input} placeholder="e.g. Oak Street Property Group" placeholderTextColor="#64748B" autoCapitalize="words" autoCorrect={false} maxLength={100} returnKeyType="next" onSubmitEditing={() => { if (!disabled) next(); }} accessibilityLabel="Agency name" />
            <Text style={styles.hint}>This name appears on your booking page and confirmations.</Text>
          </OwnerGlassCard>
        </> : step === 1 ? <>
          <View style={styles.intro}><Text style={styles.title}>What types of viewings do you offer?</Text><Text style={styles.body}>Choose your viewing types. You can manage them later in Settings.</Text></View>
          <OwnerGlassCard>
            <View style={styles.chips}>{VIEWING_TYPES.map((type) => {
              const selected = selectedTypes.includes(type.serviceName);
              return <Pressable key={type.serviceName} onPress={() => toggleType(type.serviceName)} disabled={creating} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} style={[styles.chip, selected && styles.chipSelected]}>
                <Feather name={type.icon} size={16} color={selected ? "#00D4FF" : "#94A3B8"} />
                <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{type.label}</Text>
                {selected ? <Feather name="check" size={14} color="#00D4FF" /> : null}
              </Pressable>;
            })}</View>
            <Text style={styles.hint}>{selectedTypes.length} selected · Existing agency records are always retained.</Text>
          </OwnerGlassCard>
        </> : <>
          <View style={styles.intro}><Text style={styles.title}>Your booking link is ready</Text><Text style={styles.body}>Share your live link or QR code. Buyers and tenants don’t need an app.</Text></View>
          <OwnerGlassCard style={styles.linkCard}>
            <View style={styles.readyIcon}><Feather name="check" size={24} color="#34D399" /></View>
            <Text style={styles.agency}>{agencyName.trim()}</Text>
            <Text style={styles.label}>Customer link preview</Text>
            <Text style={styles.shortLink}>{getCustomerBookingUrl(slug).replace(/^https?:\/\//, "")}</Text>
            <Text style={styles.liveLabel}>Live booking link — use this when sharing</Text>
            <Text style={styles.liveLink} selectable>{bookingUrl.replace(/^https?:\/\//, "")}</Text>
            {qrCode && !qrFailed ? <View style={styles.qrFrame}><Image source={{ uri: qrCode }} style={styles.qr} contentFit="contain" onError={() => setQrFailed(true)} accessibilityLabel="Live booking link QR code" /></View>
              : <View style={styles.qrEmpty}><Text style={styles.label}>QR preview unavailable</Text><Pressable onPress={() => void loadQRCode()} style={styles.smallAction} accessibilityRole="button"><Text style={styles.actionText}>Retry QR preview</Text></Pressable></View>}
            <Text style={styles.label}>Place the QR code on property listings or at open homes.</Text>
            <View style={styles.linkActions}>
              <Pressable style={styles.smallAction} accessibilityRole="button" onPress={async () => {
                try { await Clipboard.setStringAsync(bookingUrl); setCopied(true); } catch { setError("Couldn't copy the link."); }
              }}><Feather name="copy" size={14} color="#00D4FF" /><Text style={styles.actionText}>{copied ? "Copied" : "Copy live link"}</Text></Pressable>
              <Pressable style={styles.smallAction} accessibilityRole="button" onPress={() => Linking.openURL(bookingUrl).catch(() => setError("Couldn't open your booking page."))}><Feather name="external-link" size={14} color="#00D4FF" /><Text style={styles.actionText}>Open page</Text></Pressable>
            </View>
          </OwnerGlassCard>
        </>}
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {step > 0 ? <Pressable onPress={() => { tap(); setError(""); setStep(step - 1); }} disabled={creating} style={styles.backButton} accessibilityLabel="Previous setup step" accessibilityRole="button"><Feather name="arrow-left" size={20} color="#CBD5E1" /></Pressable> : null}
        <Pressable onPress={next} disabled={disabled} style={[styles.primaryButton, disabled && styles.disabled]} accessibilityRole="button">
          {creating ? <ActivityIndicator color="#0A0A0F" /> : <><Text style={styles.primaryText}>{step === 2 ? "Start Taking Viewings" : step === 1 ? "Create booking link" : "Continue"}</Text><Feather name="arrow-right" size={18} color="#0A0A0F" /></>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: "#0A0A0F" },
  header: { paddingHorizontal: 24, gap: 12, width: "100%", maxWidth: 560, alignSelf: "center" },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandName: { color: "#F8FAFC", fontSize: 20, fontWeight: "700" },
  progress: { flexDirection: "row", gap: 8, marginTop: 12 },
  progressLine: { flex: 1, height: 3, borderRadius: 2, backgroundColor: "#1E293B" },
  progressActive: { backgroundColor: "#00D4FF" },
  label: { fontSize: 12, color: "#94A3B8", lineHeight: 18 },
  content: { padding: 24, gap: 24, width: "100%", maxWidth: 560, alignSelf: "center" },
  intro: { gap: 8 },
  title: { color: "#F8FAFC", fontSize: 20, fontWeight: "700", lineHeight: 28 },
  body: { color: "#94A3B8", fontSize: 14, lineHeight: 21 },
  fieldLabel: { color: "#CBD5E1", fontSize: 12, marginBottom: 8 },
  input: { color: "#F8FAFC", fontSize: 14, backgroundColor: "rgba(10,10,15,0.7)", borderWidth: 1, borderColor: "rgba(0,212,255,0.25)", borderRadius: 12, padding: 16, minHeight: 52 },
  hint: { color: "#94A3B8", fontSize: 12, marginTop: 16, lineHeight: 18 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  chip: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "rgba(148,163,184,0.2)", borderRadius: 99, paddingHorizontal: 14, paddingVertical: 12 },
  chipSelected: { backgroundColor: "rgba(0,212,255,0.1)", borderColor: "#00D4FF" },
  chipLabel: { color: "#94A3B8", fontSize: 14 },
  chipLabelSelected: { color: "#F8FAFC" },
  linkCard: { alignItems: "center", gap: 8 },
  readyIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(52,211,153,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  agency: { color: "#F8FAFC", fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  shortLink: { color: "#00D4FF", fontSize: 14, textAlign: "center" },
  liveLabel: { color: "#94A3B8", fontSize: 12, marginTop: 8, textAlign: "center" },
  liveLink: { color: "#CBD5E1", fontSize: 12, textAlign: "center" },
  qrFrame: { padding: 8, backgroundColor: "#FFFFFF", borderRadius: 12, marginVertical: 16 },
  qr: { width: 160, height: 160 },
  qrEmpty: { alignItems: "center", paddingVertical: 24 },
  linkActions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 16, marginTop: 8 },
  smallAction: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10 },
  actionText: { color: "#00D4FF", fontSize: 12, fontWeight: "600" },
  footer: { flexDirection: "row", gap: 12, paddingHorizontal: 24, paddingTop: 16, width: "100%", maxWidth: 560, alignSelf: "center", borderTopWidth: 1, borderTopColor: "rgba(148,163,184,0.1)" },
  backButton: { width: 52, height: 52, borderWidth: 1, borderColor: "#334155", borderRadius: 14, alignItems: "center", justifyContent: "center" },
  primaryButton: { flex: 1, minHeight: 52, borderRadius: 14, paddingHorizontal: 16, backgroundColor: "#00D4FF", flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  primaryText: { fontSize: 14, fontWeight: "700", color: "#0A0A0F" },
  disabled: { opacity: 0.4 },
  error: { color: "#FB7185", fontSize: 14, lineHeight: 20 },
});