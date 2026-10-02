import { Colors } from "@/constants/theme";
export function useTheme() {
  // The owner workspace stays in its warm cream palette in every system mode.
  const isDark = false;
  const theme = Colors.light;

  return {
    theme,
    isDark,
  };
}
