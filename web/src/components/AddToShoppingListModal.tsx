import { Button, Modal, Stack, Text, Textarea } from "@mantine/core";
import { useState } from "react";
import { supabase } from "../supabase";

interface Props {
  product: { name: string; householdId: string } | null;
  onClose: () => void;
}

export function AddToShoppingListModal({ product, onClose }: Props) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setNotes("");
    setError(null);
    onClose();
  }

  async function handleSubmit() {
    if (!product) return;
    setLoading(true);
    setError(null);
    try {
      // Find existing shopping list for this household, or create one
      let { data: list } = await supabase
        .from("shopping_list")
        .select("id")
        .eq("household_id", product.householdId)
        .limit(1)
        .maybeSingle();

      if (!list) {
        const { data: newList, error: createError } = await supabase
          .from("shopping_list")
          .insert({ household_id: product.householdId, name: "Shopping List" })
          .select("id")
          .single();
        if (createError) throw createError;
        list = newList;
      }

      const { error: insertError } = await supabase
        .from("shopping_item")
        .insert({ shopping_list_id: list!.id, name: product.name, notes: notes || null });

      if (insertError) throw insertError;

      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add to shopping list");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal opened={product !== null} onClose={handleClose} title="Add to Shopping List" centered>
      <Stack gap="md">
        <Text>
          <Text span fw={600}>Product:</Text> {product?.name}
        </Text>
        <Textarea
          label="Notes"
          placeholder="Any notes..."
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
          minRows={3}
        />
        {error && <Text c="red" size="sm">{error}</Text>}
        <Button fullWidth onClick={() => void handleSubmit()} loading={loading}>
          Add to Shopping List
        </Button>
      </Stack>
    </Modal>
  );
}
