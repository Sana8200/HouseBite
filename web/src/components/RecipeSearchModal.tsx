import { Badge, Button, Checkbox, Divider, Group, Loader, Modal, Stack, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import { supabase } from "../supabase";

interface Restriction {
  id: string;
  name: string;
  category: "diet" | "intolerance";
}

interface Props {
  opened: boolean;
  onClose: () => void;
  // The modal hands back the restrictions the user actually left checked,
  // split into diets and intolerances so the search function can use them directly.
  onProceed: (diets: string[], intolerances: string[]) => Promise<void>;
  householdId: string;
}

export function RecipeSearchModal({ opened, onClose, onProceed, householdId }: Props) {
  const [myRestrictions, setMyRestrictions] = useState<Restriction[]>([]);
  const [householdRestrictions, setHouseholdRestrictions] = useState<Restriction[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [proceeding, setProceeding] = useState(false);

  useEffect(() => {
    if (!opened) return;
    void load();
  }, [opened, householdId]);

  const load = async () => {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    // My restrictions
    const { data: myData } = userId
      ? await supabase
          .from("member_restriction")
          .select("food_restriction(id, name, category)")
          .eq("member_id", userId)
      : { data: null };

    const myR: Restriction[] = (myData ?? [])
      .map((r: any) => r.food_restriction)
      .filter(Boolean);

    // All household restrictions via SECURITY DEFINER RPC
    const { data: householdData } = await supabase.rpc("get_household_restrictions", {
      p_household_id: householdId,
    });

    const myIds = new Set(myR.map((r) => r.id));
    const householdR: Restriction[] = (householdData ?? []).filter(
      (r: Restriction) => !myIds.has(r.id),
    );

    setMyRestrictions(myR);
    setHouseholdRestrictions(householdR);
    setSelectedIds(new Set([...myR, ...householdR].map((r) => r.id)));
    setLoading(false);
  };

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleProceed = async () => {
    setProceeding(true);

    // Collect every restriction the user left checked, then split them by
    // category so the search API knows which are diets and which are intolerances.
    const allRestrictions = [...myRestrictions, ...householdRestrictions];
    const checked = allRestrictions.filter((r) => selectedIds.has(r.id));
    const diets = checked.filter((r) => r.category === "diet").map((r) => r.name);
    const intolerances = checked.filter((r) => r.category === "intolerance").map((r) => r.name);

    await onProceed(diets, intolerances);
    setProceeding(false);
    onClose();
  };

  const renderGroup = (restrictions: Restriction[]) => {
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
          <div>
            <Text fw={600} mb="xs">My restrictions</Text>
            {renderGroup(myRestrictions)}
          </div>

          <Divider />

          <div>
            <Text fw={600} mb="xs">Other household members' restrictions</Text>
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
