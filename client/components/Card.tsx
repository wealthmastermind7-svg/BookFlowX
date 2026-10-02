import React from "react";
import { StyleSheet, Pressable, View, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface CardProps {
  elevation?: number;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const getBackgroundColorForElevation = (
  elevation: number,
  theme: any,
): string => {
  switch (elevation) {
    case 1:
      return theme.backgroundDefault;
    case 2:
      return theme.backgroundSecondary;
    case 3:
      return theme.backgroundTertiary;
    default:
      return theme.backgroundRoot;
  }
};

export function Card({
  elevation = 1,
  title,
  description,
  children,
  onPress,
  style,
}: CardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const cardBackgroundColor = getBackgroundColorForElevation(elevation, theme);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  const content = (
    <>
      {title ? <ThemedText type="h4" style={styles.cardTitle}>{title}</ThemedText> : null}
      {description ? <ThemedText type="small" style={styles.cardDescription}>{description}</ThemedText> : null}
      {children}
    </>
  );
  const cardStyle = [
    styles.card,
    { backgroundColor: cardBackgroundColor, borderWidth: 1, borderColor: theme.borderLight },
    style,
  ];
  return (
    <Animated.View style={animatedStyle}>
      {onPress ? <Pressable
        onPress={onPress}
        accessibilityRole="button"
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={cardStyle}
      >
        {content}
      </Pressable> : <View style={cardStyle}>{content}</View>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    shadowColor: "#6B5744",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  cardTitle: {
    marginBottom: Spacing.sm,
  },
  cardDescription: {
    opacity: 0.7,
  },
});
