import { Button, Modal, Stack, Text, Textarea, TextInput } from "@mantine/core";
import { useEffect, useState } from "react";
import { addShoppingListItem } from "../api/shoppingList";

interface Props {
  product: { name: string; householdId: string } | null;
  onClose: () => void;
}

export function AddToShoppingListModal({ product, onClose }: Props) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product) setName(product.name);
  }, [product]);

  function handleClose() {
    setName("");
    setNotes("");
    setError(null);
    onClose();
  }

  async function handleSubmit() {
    if (!product) return;
    setLoading(true);
    setError(null);
    try {
      await addShoppingListItem(product.householdId, name, notes);
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
        <TextInput
          label="Product"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />
        <Textarea
          label="Notes"
          placeholder="Any notes..."
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
          minRows={3}
        />
        {error && <Text c="red" size="sm">{error}</Text>}
        <Button fullWidth onClick={() => void handleSubmit()} loading={loading} disabled={!name.trim()}>
          Add to Shopping List
        </Button>
      </Stack>
    </Modal>
  );
}
