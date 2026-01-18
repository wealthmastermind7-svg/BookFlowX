import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#000000",
    textSecondary: "#6B6B6B",
    textTertiary: "#9E9E9E",
    buttonText: "#FFFFFF",
    tabIconDefault: "#6B6B6B",
    tabIconSelected: "#000000",
    link: "#000000",
    backgroundRoot: "#FFFFFF",
    backgroundDefault: "#F5F5F5",
    backgroundSecondary: "#EBEBEB",
    backgroundTertiary: "#D4D4D4",
    border: "#4A4A4A",
    borderLight: "#D4D4D4",
    accent: "#000000",
    success: "#2D2D2D",
    warning: "#4A4A4A",
    error: "#1A1A1A",
  },
  dark: {
    text: "#FFFFFF",
    textSecondary: "#9E9E9E",
    textTertiary: "#6B6B6B",
    buttonText: "#000000",
    tabIconDefault: "#6B6B6B",
    tabIconSelected: "#FFFFFF",
    link: "#FFFFFF",
    backgroundRoot: "#000000",
    backgroundDefault: "#1A1A1A",
    backgroundSecondary: "#2D2D2D",
    backgroundTertiary: "#4A4A4A",
    border: "#4A4A4A",
    borderLight: "#2D2D2D",
    accent: "#FFFFFF",
    success: "#D4D4D4",
    warning: "#9E9E9E",
    error: "#EBEBEB",
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
    fontFamily: "CormorantGaramond-Medium",
    letterSpacing: -2,
  },
  displayLarge: {
    fontSize: 96,
    fontFamily: "CormorantGaramond-Bold",
    letterSpacing: -2,
  },
  h1: {
    fontSize: 48,
    fontFamily: "CormorantGaramond-Bold",
    letterSpacing: -1,
  },
  h2: {
    fontSize: 40,
    fontFamily: "CormorantGaramond-Bold",
    letterSpacing: -1,
  },
  h3: {
    fontSize: 32,
    fontFamily: "CormorantGaramond-SemiBold",
  },
  h4: {
    fontSize: 24,
    fontFamily: "Inter-SemiBold",
  },
  body: {
    fontSize: 18,
    fontFamily: "Inter-Regular",
  },
  bodyLarge: {
    fontSize: 24,
    fontFamily: "Inter-Light",
  },
  small: {
    fontSize: 14,
    fontFamily: "Inter-Regular",
  },
  caption: {
    fontSize: 12,
    fontFamily: "Inter-Light",
    letterSpacing: 2,
    textTransform: "uppercase" as const,
  },
  link: {
    fontSize: 18,
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
  heading: "CormorantGaramond-Bold",
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
