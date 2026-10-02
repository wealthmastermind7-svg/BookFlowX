import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#F8FAFC",
    textSecondary: "#94A3B8",
    textTertiary: "#64748B",
    buttonText: "#0A0A0F",
    tabIconDefault: "#64748B",
    tabIconSelected: "#00D4FF",
    link: "#00D4FF",
    backgroundRoot: "#0A0A0F",
    backgroundDefault: "#111827",
    backgroundSecondary: "#1A1A2E",
    backgroundTertiary: "#16213E",
    border: "rgba(0,212,255,0.24)",
    borderLight: "rgba(148,163,184,0.12)",
    accent: "#00D4FF",
    success: "#34D399",
    warning: "#FBBF24",
    error: "#FB7185",
  },
  dark: {
    text: "#F8FAFC",
    textSecondary: "#94A3B8",
    textTertiary: "#64748B",
    buttonText: "#0A0A0F",
    tabIconDefault: "#64748B",
    tabIconSelected: "#00D4FF",
    link: "#00D4FF",
    backgroundRoot: "#0A0A0F",
    backgroundDefault: "#111827",
    backgroundSecondary: "#1A1A2E",
    backgroundTertiary: "#16213E",
    border: "rgba(0,212,255,0.24)",
    borderLight: "rgba(148,163,184,0.12)",
    accent: "#00D4FF",
    success: "#34D399",
    warning: "#FBBF24",
    error: "#FB7185",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 56,
  "7xl": 64,
  "8xl": 72,
  inputHeight: 56,
  buttonHeight: 56,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  full: 9999,
};

export const Typography = {
  display: {
    fontSize: 72,
    fontFamily: "Inter-SemiBold",
    letterSpacing: -2,
  },
  displayLarge: {
    fontSize: 96,
    fontFamily: "Inter-Bold",
    letterSpacing: -2,
  },
  h1: {
    fontSize: 20,
    fontFamily: "Inter-Bold",
    letterSpacing: -1,
  },
  h2: {
    fontSize: 20,
    fontFamily: "Inter-Bold",
    letterSpacing: -1,
  },
  h3: {
    fontSize: 20,
    fontFamily: "Inter-Bold",
  },
  h4: {
    fontSize: 20,
    fontFamily: "Inter-Bold",
  },
  body: {
    fontSize: 14,
    fontFamily: "Inter-Regular",
  },
  bodyLarge: {
    fontSize: 14,
    fontFamily: "Inter-Regular",
  },
  small: {
    fontSize: 12,
    fontFamily: "Inter-Regular",
  },
  caption: {
    fontSize: 12,
    fontFamily: "Inter-Regular",
    letterSpacing: 2,
    textTransform: "uppercase" as const,
  },
  link: {
    fontSize: 14,
    fontFamily: "Inter-SemiBold",
  },
  mono: {
    fontFamily: "JetBrainsMono-Regular",
    fontSize: 14,
  },
};

export const Shadows = {
  subtle: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const Fonts = {
  heading: "Inter-Bold",
  subheading: "Inter-SemiBold",
  body: "Inter-Regular",
  mono: "JetBrainsMono-Regular",
};

export const AnimationConfig = {
  spring: {
    damping: 15,
    mass: 0.3,
    stiffness: 150,
    overshootClamping: true,
  },
  timing: {
    fast: 150,
    normal: 200,
    slow: 300,
    cinematic: 400,
    graph: 600,
  },
};
