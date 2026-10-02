import React from "react";
import { View, StyleSheet, Pressable, Switch } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface SettingsRowProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  value?: string;
  hasToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
  showChevron?: boolean;
  destructive?: boolean;
  disabled?: boolean;
}

export function SettingsRow({
  icon,
  title,
  subtitle,
  value,
  hasToggle = false,
  toggleValue = false,
  onToggle,
  onPress,
  showChevron = true,
  destructive = false,
  disabled = false,
}: SettingsRowProps) {
  const { theme } = useTheme();

  const textColor = disabled ? theme.textSecondary : destructive ? theme.error : theme.text;
  const iconBgColor = destructive ? "#FAEFED" : "#F4EEE6";
  const rowBgColor = destructive ? "#FFFDFC" : "#FFFFFF";

  const content = (
    <View style={[styles.row, { backgroundColor: rowBgColor }]}>
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
        <Feather name={icon} size={18} color={destructive ? theme.error : "#A8662F"} />
      </View>
      <View style={styles.content}>
        <ThemedText type="body" style={[styles.title, { color: textColor }]}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="caption" style={styles.subtitle}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {hasToggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: theme.borderLight, true: theme.accent }}
          thumbColor={theme.buttonText}
        />
      ) : value ? (
        <ThemedText type="small" style={styles.value}>
          {value}
        </ThemedText>
      ) : showChevron ? (
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={() => {
          if (!disabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress();
          }
        }}
        disabled={disabled}
        style={({ pressed }) => [{ opacity: disabled ? 0.5 : pressed ? 0.7 : 1 }]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E8DDD0",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  title: {
    fontSize: 14,
    fontWeight: "500",
  },
  subtitle: {
    opacity: 0.6,
    marginTop: Spacing.xs,
    fontSize: 12,
  },
  value: {
    opacity: 0.6,
    fontSize: 12,
  },
});
