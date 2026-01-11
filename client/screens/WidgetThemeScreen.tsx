import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, TextInput } from "react-native";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import * as Haptics from "expo-haptics";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { api, WidgetTheme } from "@/lib/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const COLOR_PRESETS = [
  { name: "Classic", primary: "#000000", accent: "#C5A059", bg: "#FFFFFF", text: "#1A1C1E" },
  { name: "Dark Mode", primary: "#FFFFFF", accent: "#C5A059", bg: "#0A0A0B", text: "#FFFFFF" },
  { name: "Charcoal", primary: "#2D2D2D", accent: "#A8A8A8", bg: "#FAFAFA", text: "#1A1C1E" },
  { name: "Graphite", primary: "#3D3D3D", accent: "#C5A059", bg: "#F5F5F5", text: "#2D2D2D" },
  { name: "Pearl", primary: "#1A1C1E", accent: "#E8E8E8", bg: "#FFFFFF", text: "#1A1C1E" },
  { name: "Smoke", primary: "#4A4A4A", accent: "#8C8C8C", bg: "#F0F0F0", text: "#2D2D2D" },
];

const BUTTON_STYLES: { value: "rounded" | "pill" | "square"; label: string }[] = [
  { value: "rounded", label: "Rounded" },
  { value: "pill", label: "Pill" },
  { value: "square", label: "Square" },
];

const FONT_OPTIONS = [
  "Inter",
  "System",
  "Helvetica",
  "Arial",
  "Georgia",
  "Times New Roman",
];

export default function WidgetThemeScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme: appTheme, isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [widgetTheme, setWidgetTheme] = useState<WidgetTheme>({
    primaryColor: "#000000",
    accentColor: "#C5A059",
    backgroundColor: "#FFFFFF",
    textColor: "#1A1C1E",
    borderRadius: 12,
    glassBlurIntensity: 20,
    fontFamily: "Inter",
    buttonStyle: "rounded",
    showPoweredBy: true,
  });

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const theme = await api.getWidgetTheme();
      if (theme) {
        setWidgetTheme(theme);
      }
    } catch (error) {
      console.error("Error loading theme:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      await api.updateWidgetTheme(widgetTheme);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Widget theme saved successfully");
    } catch (error) {
      console.error("Error saving theme:", error);
      Alert.alert("Error", "Failed to save theme");
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWidgetTheme(prev => ({
      ...prev,
      primaryColor: preset.primary,
      accentColor: preset.accent,
      backgroundColor: preset.bg,
      textColor: preset.text,
    }));
  };

  const handleFetchWebsiteTheme = async () => {
    try {
      const business = await api.getCurrentBusiness();
      if (!business?.website) {
        Alert.alert("No Website", "Please add a website in Settings first.");
        return;
      }

      setSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Add a client-side timeout to prevent UI hang
      const extractionPromise = api.extractThemeFromWebsite(business.website);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 10000)
      );

      const extracted = await Promise.race([extractionPromise, timeoutPromise]) as Partial<WidgetTheme>;
      
      setWidgetTheme(prev => ({
        ...prev,
        ...extracted
      }));
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Theme Extracted", "We've matched your widget colors to your website!");
    } catch (error) {
      console.error("Error fetching website theme:", error);
      const message = error instanceof Error && error.message === "Timeout" 
        ? "The website is taking too long to respond. Please try again or enter colors manually."
        : "We couldn't reach your website right now. Please check the URL and try again.";
      Alert.alert("Extraction Failed", message);
    } finally {
      setSaving(false);
    }
  };

  const GlassCard = ({ children, style }: { children: React.ReactNode; style?: any }) => (
    <View style={[styles.glassCard, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }, style]}>
      {children}
    </View>
  );

  const SectionTitle = ({ children }: { children: string }) => (
    <ThemedText style={styles.sectionTitle}>{children}</ThemedText>
  );

  const ColorPicker = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <View style={styles.colorRow}>
      <ThemedText style={styles.colorLabel}>{label}</ThemedText>
      <View style={styles.colorInputRow}>
        <View style={[styles.colorSwatch, { backgroundColor: value }]} />
        <TextInput
          style={[styles.colorInput, { backgroundColor: appTheme.backgroundSecondary, color: appTheme.text, borderColor: appTheme.border }]}
          value={value}
          onChangeText={onChange}
          placeholder="#000000"
          placeholderTextColor={appTheme.textTertiary}
          autoCapitalize="characters"
          maxLength={7}
        />
      </View>
    </View>
  );

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.loadingContainer, { paddingTop: headerHeight }]}>
          <ActivityIndicator size="large" color={appTheme.text} />
          <ThemedText style={styles.loadingText}>Loading theme...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: Spacing.lg,
        }}
      >
        <SectionTitle>Color Presets</SectionTitle>
        <View style={styles.headerActionRow}>
          <Button 
            onPress={handleFetchWebsiteTheme} 
            style={styles.magicButton}
          >
            <View style={styles.magicButtonContent}>
              <Feather name="zap" size={14} color={appTheme.backgroundDefault} style={{ marginRight: 6 }} />
              <ThemedText style={[styles.magicButtonText, { color: appTheme.backgroundDefault }]}>Detect Brand Colors (beta)</ThemedText>
            </View>
          </Button>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsScroll}>
          {COLOR_PRESETS.map((preset) => (
            <Pressable
              key={preset.name}
              onPress={() => applyPreset(preset)}
              style={[styles.presetCard, { backgroundColor: preset.bg, borderColor: preset.primary + "30" }]}
            >
              <View style={styles.presetColors}>
                <View style={[styles.presetDot, { backgroundColor: preset.primary }]} />
                <View style={[styles.presetDot, { backgroundColor: preset.accent }]} />
              </View>
              <ThemedText style={[styles.presetName, { color: preset.text }]}>{preset.name}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        <SectionTitle>Colors</SectionTitle>
        <GlassCard>
          <ColorPicker
            label="Primary Color"
            value={widgetTheme.primaryColor}
            onChange={(v) => setWidgetTheme(prev => ({ ...prev, primaryColor: v }))}
          />
          <View style={[styles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]} />
          <ColorPicker
            label="Accent Color"
            value={widgetTheme.accentColor}
            onChange={(v) => setWidgetTheme(prev => ({ ...prev, accentColor: v }))}
          />
          <View style={[styles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]} />
          <ColorPicker
            label="Background"
            value={widgetTheme.backgroundColor}
            onChange={(v) => setWidgetTheme(prev => ({ ...prev, backgroundColor: v }))}
          />
          <View style={[styles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]} />
          <ColorPicker
            label="Text Color"
            value={widgetTheme.textColor}
            onChange={(v) => setWidgetTheme(prev => ({ ...prev, textColor: v }))}
          />
        </GlassCard>

        <SectionTitle>Button Style</SectionTitle>
        <GlassCard style={styles.buttonStyleRow}>
          {BUTTON_STYLES.map((style) => (
            <Pressable
              key={style.value}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setWidgetTheme(prev => ({ ...prev, buttonStyle: style.value }));
              }}
              style={[
                styles.buttonStyleOption,
                { backgroundColor: widgetTheme.buttonStyle === style.value ? appTheme.text : appTheme.backgroundSecondary }
              ]}
            >
              <ThemedText style={[styles.buttonStyleLabel, { color: widgetTheme.buttonStyle === style.value ? appTheme.backgroundDefault : appTheme.text }]}>
                {style.label}
              </ThemedText>
            </Pressable>
          ))}
        </GlassCard>

        <SectionTitle>Typography</SectionTitle>
        <GlassCard>
          <ThemedText style={styles.fieldLabel}>Font Family</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fontScroll}>
            {FONT_OPTIONS.map((font) => (
              <Pressable
                key={font}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setWidgetTheme(prev => ({ ...prev, fontFamily: font }));
                }}
                style={[
                  styles.fontOption,
                  { 
                    backgroundColor: widgetTheme.fontFamily === font ? appTheme.text : appTheme.backgroundSecondary,
                    borderColor: widgetTheme.fontFamily === font ? appTheme.text : appTheme.border,
                  }
                ]}
              >
                <ThemedText style={[styles.fontLabel, { color: widgetTheme.fontFamily === font ? appTheme.backgroundDefault : appTheme.text, fontFamily: font === "System" ? undefined : font }]}>
                  {font}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </GlassCard>

        <SectionTitle>Advanced</SectionTitle>
        <GlassCard>
          <View style={styles.sliderRow}>
            <ThemedText style={styles.fieldLabel}>Border Radius</ThemedText>
            <View style={styles.sliderControls}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setWidgetTheme(prev => ({ ...prev, borderRadius: Math.max(0, prev.borderRadius - 4) }));
                }}
                style={[styles.sliderButton, { backgroundColor: appTheme.backgroundSecondary }]}
              >
                <Feather name="minus" size={16} color={appTheme.text} />
              </Pressable>
              <ThemedText style={styles.sliderValue}>{widgetTheme.borderRadius}px</ThemedText>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setWidgetTheme(prev => ({ ...prev, borderRadius: Math.min(32, prev.borderRadius + 4) }));
                }}
                style={[styles.sliderButton, { backgroundColor: appTheme.backgroundSecondary }]}
              >
                <Feather name="plus" size={16} color={appTheme.text} />
              </Pressable>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]} />
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setWidgetTheme(prev => ({ ...prev, showPoweredBy: !prev.showPoweredBy }));
            }}
            style={styles.toggleRow}
          >
            <ThemedText style={styles.fieldLabel}>Show "Powered by BookFlow"</ThemedText>
            <View style={[styles.toggle, { backgroundColor: widgetTheme.showPoweredBy ? appTheme.text : appTheme.backgroundSecondary }]}>
              <View style={[styles.toggleKnob, { transform: [{ translateX: widgetTheme.showPoweredBy ? 20 : 0 }], backgroundColor: widgetTheme.showPoweredBy ? appTheme.backgroundDefault : appTheme.textTertiary }]} />
            </View>
          </Pressable>
        </GlassCard>

        <SectionTitle>Preview</SectionTitle>
        <View style={[styles.previewContainer, { backgroundColor: widgetTheme.backgroundColor, borderColor: widgetTheme.primaryColor + "20" }]}>
          <ThemedText style={[styles.previewTitle, { color: widgetTheme.textColor }]}>Book an Appointment</ThemedText>
          <View style={[styles.previewButton, { backgroundColor: widgetTheme.primaryColor, borderRadius: widgetTheme.buttonStyle === "pill" ? 999 : widgetTheme.buttonStyle === "square" ? 0 : widgetTheme.borderRadius }]}>
            <ThemedText style={[styles.previewButtonText, { color: widgetTheme.backgroundColor }]}>Select Service</ThemedText>
          </View>
          <View style={[styles.previewCard, { borderColor: widgetTheme.primaryColor + "15", borderRadius: widgetTheme.borderRadius }]}>
            <View style={[styles.previewAccent, { backgroundColor: widgetTheme.accentColor }]} />
            <ThemedText style={[styles.previewCardTitle, { color: widgetTheme.textColor }]}>Consultation</ThemedText>
            <ThemedText style={[styles.previewCardSubtitle, { color: widgetTheme.textColor + "80" }]}>30 min • $50</ThemedText>
          </View>
          {widgetTheme.showPoweredBy && (
            <ThemedText style={[styles.previewPoweredBy, { color: widgetTheme.textColor + "40" }]}>Powered by BookFlow</ThemedText>
          )}
        </View>
      </KeyboardAwareScrollViewCompat>

      <View style={[styles.saveContainer, { backgroundColor: appTheme.backgroundDefault, borderTopColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", paddingBottom: insets.bottom + Spacing.md }]}>
        <Button onPress={handleSave} disabled={saving} style={{ flex: 1 }}>
          {saving ? "Saving..." : "Save Theme"}
        </Button>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 14,
    opacity: 0.6,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  headerActionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: -Spacing.xl - Spacing.md,
    marginBottom: Spacing.md,
  },
  magicButton: {
    paddingHorizontal: Spacing.md,
    height: 36,
    borderRadius: 18,
  },
  magicButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  magicButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  glassCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  presetsScroll: {
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  presetCard: {
    width: 100,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginRight: Spacing.sm,
    alignItems: "center",
  },
  presetColors: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  presetDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  presetName: {
    fontSize: 12,
    fontWeight: "600",
  },
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
  },
  colorLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  colorInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  colorInput: {
    width: 90,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    fontSize: 14,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  buttonStyleRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  buttonStyleOption: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  buttonStyleLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: Spacing.sm,
  },
  fontScroll: {
    marginTop: Spacing.xs,
  },
  fontOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  fontLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
  },
  sliderControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  sliderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: "600",
    minWidth: 50,
    textAlign: "center",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 2,
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  previewContainer: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  previewButton: {
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  previewButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  previewCard: {
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  previewAccent: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  previewCardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  previewCardSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  previewPoweredBy: {
    fontSize: 11,
    textAlign: "center",
    marginTop: Spacing.lg,
  },
  saveContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
});
