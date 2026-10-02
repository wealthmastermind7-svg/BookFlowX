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
import { Spacing, BorderRadius, AnimationConfig } from "@/constants/theme";

interface TimeSlotButtonProps {
  time: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export function TimeSlotButton({
  time,
  selected,
  onPress,
  disabled = false,
}: TimeSlotButtonProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.95, AnimationConfig.spring);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, AnimationConfig.spring);
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={disabled ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.button,
          {
            backgroundColor: selected ? theme.accent : theme.backgroundDefault,
            borderWidth: 1,
            borderColor: selected ? theme.accent : theme.borderLight,
            opacity: disabled ? 0.4 : 1,
          },
        ]}
      >
        <ThemedText
          type="body"
          style={[
            styles.text,
            { color: selected ? theme.buttonText : theme.text },
          ]}
        >
          {time}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing["2xl"],
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
    shadowColor: "#6B5744",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 2,
  },
  text: {
    fontWeight: "500",
  },
});
