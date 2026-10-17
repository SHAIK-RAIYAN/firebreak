export type WidgetTheme = {
  bg: string;
  cardBg: string;
  cardBorder: string;
  fg: string;
  muted: string;
  accent: string;
  green: string;
  greenMuted: string;
  red: string;
  redMuted: string;
  amber: string;
  amberMuted: string;
  blue: string;
  blueMuted: string;
  surfaceHover: string;
  fontSans: string;
  fontMono: string;
};

export const darkTheme: WidgetTheme = {
  bg: "#0a0b0d",
  cardBg: "#111317",
  cardBorder: "rgba(255, 255, 255, 0.08)",
  fg: "#f0f2f5",
  muted: "#8a919e",
  accent: "#ff4b3e",
  green: "#10b981",
  greenMuted: "rgba(16, 185, 129, 0.15)",
  red: "#ef4444",
  redMuted: "rgba(239, 68, 68, 0.15)",
  amber: "#f59e0b",
  amberMuted: "rgba(245, 158, 11, 0.15)",
  blue: "#3b82f6",
  blueMuted: "rgba(59, 130, 246, 0.15)",
  surfaceHover: "rgba(255, 255, 255, 0.04)",
  fontSans:
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontMono:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
};

export const lightTheme: WidgetTheme = {
  bg: "#f9fafb",
  cardBg: "#ffffff",
  cardBorder: "rgba(0, 0, 0, 0.08)",
  fg: "#111827",
  muted: "#6b7280",
  accent: "#d93829",
  green: "#059669",
  greenMuted: "rgba(5, 150, 105, 0.12)",
  red: "#dc2626",
  redMuted: "rgba(220, 38, 38, 0.12)",
  amber: "#d97706",
  amberMuted: "rgba(217, 119, 6, 0.12)",
  blue: "#2563eb",
  blueMuted: "rgba(37, 99, 235, 0.12)",
  surfaceHover: "rgba(0, 0, 0, 0.03)",
  fontSans:
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontMono:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
};

export function getTheme(themeName?: string | null): WidgetTheme {
  return themeName === "light" ? lightTheme : darkTheme;
}
