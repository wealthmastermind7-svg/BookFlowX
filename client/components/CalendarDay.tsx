import React from "react";
import { StyleSheet, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { AnimationConfig } from "@/constants/theme";

interface CalendarDayProps {
  day: number;
  isSelected: boolean;
  hasBookings: boolean;
  isToday: boolean;
  isDisabled: boolean;
  onPress: () => void;
}

export function CalendarDay({
  day,
  isSelected,
  hasBookings,
  isToday,
  isDisabled,
  onPress,
}: CalendarDayProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!isDisabled) {
      scale.value = withSpring(0.9, AnimationConfig.spring);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, AnimationConfig.spring);
  };

  const getBackgroundColor = () => {
    if (isSelected) return theme.accent;
    if (hasBookings) return "rgba(0,212,255,0.10)";
    return "transparent";
  };

  const getTextColor = () => {
    if (isSelected) return theme.buttonText;
    if (isDisabled) return theme.textTertiary;
    return theme.text;
  };

  const getBorderColor = () => {
    if (isToday && !isSelected) return theme.accent;
    return "transparent";
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={isDisabled ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.day,
          {
            backgroundColor: getBackgroundColor(),
            borderColor: getBorderColor(),
            borderWidth: isToday && !isSelected ? 2 : 0,
          },
        ]}
      >
        <ThemedText
          type="body"
          style={[styles.dayText, { color: getTextColor() }]}
        >
          {day}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  day: {
    width: 42,
    height: 42,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  dayText: {
    fontWeight: "600",
    fontSize: 14,
  },
});
