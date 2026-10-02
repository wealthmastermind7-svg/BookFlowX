import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#1C1410",
    textSecondary: "#6B5744",
    textTertiary: "#8B6F47",
    buttonText: "#FFFFFF",
    tabIconDefault: "#8B6F47",
    tabIconSelected: "#C17F3E",
    link: "#A8662F",
    backgroundRoot: "#FAF7F2",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#F4EEE6",
    backgroundTertiary: "#EFE4D7",
    border: "#E8DDD0",
    borderLight: "#F0E8DE",
    accent: "#C17F3E",
    success: "#4A7C59",
    warning: "#B87831",
    error: "#B74E42",
  },
  dark: {
    text: "#1C1410",
    textSecondary: "#6B5744",
    textTertiary: "#8B6F47",
    buttonText: "#FFFFFF",
    tabIconDefault: "#8B6F47",
    tabIconSelected: "#C17F3E",
    link: "#A8662F",
    backgroundRoot: "#FAF7F2",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#F4EEE6",
    backgroundTertiary: "#EFE4D7",
    border: "#E8DDD0",
    borderLight: "#F0E8DE",
    accent: "#C17F3E",
    success: "#4A7C59",
    warning: "#B87831",
    error: "#B74E42",
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
    fontFamily: "PlayfairDisplay-Bold",
    letterSpacing: -2,
  },
  displayLarge: {
    fontSize: 96,
    fontFamily: "PlayfairDisplay-Bold",
    letterSpacing: -2,
  },
  h1: {
    fontSize: 20,
    fontFamily: "PlayfairDisplay-Bold",
    letterSpacing: -1,
  },
  h2: {
    fontSize: 20,
    fontFamily: "PlayfairDisplay-Bold",
    letterSpacing: -1,
  },
  h3: {
    fontSize: 20,
    fontFamily: "PlayfairDisplay-Bold",
  },
  h4: {
    fontSize: 20,
    fontFamily: "PlayfairDisplay-Bold",
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
    shadowColor: "#6B5744",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: "#6B5744",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const Fonts = {
  heading: "PlayfairDisplay-Bold",
  subheading: "PlayfairDisplay-Bold",
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
