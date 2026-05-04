interface HouseholdContextDividerProps {
  householdColor?: string | null;
}

export function HouseholdContextDivider({ householdColor }: HouseholdContextDividerProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        bottom: 0,
        left: 0,
        width: 8,
        backgroundColor: householdColor ?? "transparent",
        pointerEvents: "none",
        zIndex: 1,
      }}
    />
  );
}
