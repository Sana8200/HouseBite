import { Text } from "@mantine/core";

interface HouseholdContextBadgeProps {
  householdColor?: string | null;
  householdName?: string | null;
}

function withAlpha(color: string, alpha: string): string {
  if (/^#[\da-f]{6}$/i.test(color)) return `${color}${alpha}`;
  if (/^#[\da-f]{3}$/i.test(color)) {
    const [r, g, b] = color.slice(1).split("");
    return `#${r}${r}${g}${g}${b}${b}${alpha}`;
  }
  return color;
}

export function HouseholdContextBadge({ householdColor, householdName }: HouseholdContextBadgeProps) {
  const accentColor = householdColor ?? "var(--color-text-muted)";
  const backgroundColor = accentColor.startsWith("#")
    ? withAlpha(accentColor, "14")
    : "var(--color-surface-muted)";
  const borderColor = accentColor.startsWith("#")
    ? withAlpha(accentColor, "33")
    : "var(--color-border)";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "fit-content",
        minWidth: 0,
        marginTop: 8,
        padding: "8px 12px",
        borderRadius: 14,
        border: `1px solid ${borderColor}`,
        borderLeft: `4px solid ${accentColor}`,
        backgroundColor,
      }}
    >
      <Text size="sm" c="dimmed" span>
        Viewing household:{" "}
        <Text span inherit fw={600} c="var(--color-text)">
          {householdName ?? "Choose a household"}
        </Text>
      </Text>
    </div>
  );
}
