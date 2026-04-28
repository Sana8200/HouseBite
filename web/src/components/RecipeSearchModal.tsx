import { Alert, Badge, Button, Checkbox, Divider, Group, Loader, Modal, Stack, Text } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import type { FoodRestriction } from "../api/schema";

interface Props {
  opened: boolean;
  onClose: () => void;
  // The modal hands back the restrictions the user actually left checked,
  // split into diets and intolerances so the search function can use them directly.
  onProceed: (diets: string[], intolerances: string[]) => Promise<void>;
  householdId: string;
  userId: string;
}

export function RecipeSearchModal({ opened, onClose, onProceed, householdId, userId }: Props) {
  const [myRestrictions, setMyRestrictions] = useState<FoodRestriction[]>([]);
  const [householdRestrictions, setHouseholdRestrictions] = useState<FoodRestriction[]>([]);
  // Tracks which restrictions are checked — all start checked so the search is as safe as possible.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [proceeding, setProceeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reload whenever the modal opens or the household changes.
  useEffect(() => {
    if (!opened) return;

    const load = async () => {
        setLoading(true);
        try {
            // Fetch the current user's personal dietary restrictions from their account.
            const { data: myData } = await supabase
                .from("member_restriction")
                .select("food_restriction(id, name, category)")
                .eq("member_id", userId);

            const myR: FoodRestriction[] = (myData ?? [])
                .map(r => r.food_restriction as unknown as FoodRestriction)
                .filter(Boolean);

            // Fetch restrictions set at the household level (via the Food Restrictions modal).
            // We exclude anything already shown under "My restrictions" to avoid duplicates.
            const { data: hhData } = await supabase
                .from("household_food_restriction")
                .select("food_restriction(id, name, category)")
                .eq("household_id", householdId);

            const myIds = new Set(myR.map((r) => r.id));
            const householdR: FoodRestriction[] = (hhData ?? [])
                .map(r => r.food_restriction as unknown as FoodRestriction)
                .filter((r: FoodRestriction | null): r is FoodRestriction => !!r && !myIds.has(r.id));

            setMyRestrictions(myR);
            setHouseholdRestrictions(householdR);
            // Pre-check everything so no restriction is accidentally ignored.
            setSelectedIds(new Set([...myR, ...householdR].map((r) => r.id)));
        } catch (e) {
            notifications.show({
                color: "red",
                title: "Could not load restrictions",
                message: e instanceof Error ? e.message : "Please try again.",
            });
        } finally {
            setLoading(false);
        }
    };

    void load();
  }, [opened, householdId, userId]);

    // Toggle a single restriction on or off.
  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleProceed = async () => {
    setProceeding(true);
    setError(null);

    // Only pass along the restrictions the user left checked,
    // split by category so the recipe search API can use them directly.
    const allRestrictions = [...myRestrictions, ...householdRestrictions];
    const checked = allRestrictions.filter((r) => selectedIds.has(r.id));
    const diets = checked.filter((r) => r.category === "diet").map((r) => r.name);
    const intolerances = checked.filter((r) => r.category === "intolerance").map((r) => r.name);

    try {
      await onProceed(diets, intolerances);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not search recipes. Check your connection and try again.");
    } finally {
      setProceeding(false);
    }
  };

  // Renders a group of restrictions split into diets and intolerances with checkboxes.
  const renderGroup = (restrictions: FoodRestriction[]) => {
    const diets = restrictions.filter((r) => r.category === "diet");
    const intolerances = restrictions.filter((r) => r.category === "intolerance");

    if (!restrictions.length) {
      return <Text size="sm" c="dimmed">None</Text>;
    }

    return (
      <Stack gap="xs">
        {diets.length > 0 && (
          <Stack gap={6}>
            <Badge variant="light" color="blue" size="sm">Diets</Badge>
            {diets.map((r) => (
              <Checkbox
                key={r.id}
                label={r.name}
                checked={selectedIds.has(r.id)}
                onChange={() => toggle(r.id)}
              />
            ))}
          </Stack>
        )}
        {intolerances.length > 0 && (
          <Stack gap={6}>
            <Badge variant="light" color="orange" size="sm">Intolerances</Badge>
            {intolerances.map((r) => (
              <Checkbox
                key={r.id}
                label={r.name}
                checked={selectedIds.has(r.id)}
                onChange={() => toggle(r.id)}
              />
            ))}
          </Stack>
        )}
      </Stack>
    );
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Recipe search" centered>
      {loading ? (
        <Group justify="center" p="xl">
          <Loader />
        </Group>
      ) : (
        <Stack gap="md">
          {error && (
            <Alert
              variant="light"
              color="red"
              radius="md"
              icon={<IconAlertCircle size={18} />}
              title="Couldn't search recipes"
              withCloseButton
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}
          <div>
            <Text fw={600} mb="xs">My restrictions</Text>
            {renderGroup(myRestrictions)}
          </div>

          <Divider />

          {/* Restrictions set for this household (not tied to any specific member). */}
          <div>
            <Text fw={600} mb="xs">Household restrictions</Text>
            {renderGroup(householdRestrictions)}
          </div>

          <Text size="xs" c="dimmed">
            Only the checked restrictions will be applied to the search. Uncheck any you want to ignore this time.
          </Text>

          <Button fullWidth mt="xs" onClick={() => void handleProceed()} loading={proceeding}>
            Proceed to Find Recipes
          </Button>
        </Stack>
      )}
    </Modal>
  );
}
