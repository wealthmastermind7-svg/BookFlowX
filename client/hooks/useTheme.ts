import { Colors } from "@/constants/theme";
export function useTheme() {
  // BookFlowX uses a deliberately dark owner workspace in every system mode.
  const isDark = true;
  const theme = Colors.dark;

  return {
    theme,
    isDark,
  };
}
