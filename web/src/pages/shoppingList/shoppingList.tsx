import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { ActionIcon, Alert, Button, Card, Checkbox, Container, Grid, Group, Paper, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { IconAlertCircle, IconArrowLeft, IconCheck, IconDeviceFloppy, IconPlus, IconShoppingCart, IconTrash, IconX } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { Link, useLocation } from "react-router-dom";
import { addShoppingListItem, deleteShoppingItem, getShoppingItems, monitorShoppingItems, toggleShoppingItem, type ShoppingListItemView, } from "../../api/shoppingList";
import { getHouseholds } from "../../api/household";
import type { Household } from "../../api/schema";
import { HouseholdContextBadge } from "../../components/HouseholdContextBadge";
import { HouseholdContextDivider } from "../../components/HouseholdContextDivider";
import "./shoppingList.css";
import { CustomLoader } from "../../components/CustomLoader";

interface ShoppingListLocationState {
  householdId?: string;
  householdName?: string;
}

export function ShoppingList() {
  const location = useLocation();
  // Dashboard sends the selected household through route state.
  const locationState = (location.state as ShoppingListLocationState | null) ?? null;
  const householdId = locationState?.householdId ?? null;

  // Data comes from the shopping list API for the selected household.
  const [items, setItems] = useState<ShoppingListItemView[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemNotes, setNewItemNotes] = useState("");
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!householdId) {
      setItems([]);
      setLoading(false);
      setError("No household selected");
      return;
    }

    void loadShoppingItems(householdId);
  
    return monitorShoppingItems(() => {
      void loadShoppingItems(householdId, false);
    });
  }, [householdId]);

  useEffect(() => {
    void loadHouseholds();
  }, []);

  const currentHousehold = useMemo(
    () => households.find((household) => household.id === householdId) ?? null,
    [householdId, households],
  );

  // Keep pending rows first and move checked rows to the bottom of the table.
  const sortedItems = useMemo(
    () => [...items].sort((leftItem, rightItem) => Number(leftItem.purchased) - Number(rightItem.purchased)),
    [items]
  );

  // Used to draw the stronger divider between pending and purchased items.
  const firstPurchasedIndex = useMemo(
    () => sortedItems.findIndex((item) => item.purchased),
    [sortedItems]
  );

  // Summary cards still reflect the two item states.
  const pendingItems = useMemo(
    () => items.filter((item) => !item.purchased),
    [items]
  );
  const purchasedItems = useMemo(
    () => items.filter((item) => item.purchased),
    [items]
  );

  // Toggle the checkbox to move an item between pending and purchased.
  const handleToggleItem = async (itemId: string) => {
    const currentItem = items.find((item) => item.id === itemId);
    if (!currentItem) return;

    // Briefly highlight the item after it moves to the other list.
    setHighlightedItemId(itemId);
    window.setTimeout(() => {
      setHighlightedItemId((currentValue) => (currentValue === itemId ? null : currentValue));
    }, 450);

    const nextPurchasedValue = !currentItem.purchased;
    setError(null);
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId ? { ...item, purchased: nextPurchasedValue } : item
      )
    );

    try {
      await toggleShoppingItem(itemId, nextPurchasedValue);
    } catch (toggleError) {
      setItems((currentItems) =>
        currentItems.map((item) =>
          item.id === itemId ? { ...item, purchased: currentItem.purchased } : item
        )
      );
      setError(toggleError instanceof Error ? toggleError.message : "Could not update item");
    }
  };

  const handleAddItem = () => {
    if (!householdId || !newItemName.trim()) return;
    void createItem(householdId);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    handleAddItem();
  };

  // Reset the temporary row state when the user cancels.
  const handleCancelAdd = () => {
    setNewItemName("");
    setNewItemNotes("");
    setIsAddingItem(false);
  };

  // Remove an item from the local shopping list.
  const handleDeleteItem = (itemId: string) => {
    void removeItem(itemId);
  };

  const loadShoppingItems = async (selectedHouseholdId: string, showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const shoppingItems = await getShoppingItems(selectedHouseholdId);
      setItems(shoppingItems);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load shopping list");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const loadHouseholds = async () => {
    const { data, error: householdsError } = await getHouseholds();
    if (householdsError) return;
    setHouseholds(data ?? []);
  };

  const createItem = async (selectedHouseholdId: string) => {
    setSubmitting(true);
    setError(null);

    const addedName = newItemName.trim();

    try {
      const createdItem = await addShoppingListItem(selectedHouseholdId, newItemName, newItemNotes);

      setItems((currentItems) => [createdItem, ...currentItems]);
      setNewItemName("");
      setNewItemNotes("");
      setIsAddingItem(false);
      notifications.show({
        color: "green",
        title: "Added",
        message: `${addedName} added to shopping list.`,
      });
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not add item");
    } finally {
      setSubmitting(false);
    }
  };

  const removeItem = async (itemId: string) => {
    const previousItems = items;
    const removedItem = previousItems.find((item) => item.id === itemId);
    setError(null);
    setItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
    setHighlightedItemId((currentValue) => (currentValue === itemId ? null : currentValue));

    try {
      await deleteShoppingItem(itemId);
      notifications.show({
        color: "orange",
        title: "Removed",
        message: `${removedItem?.name ?? "Item"} removed from shopping list.`,
      });
    } catch (deleteError) {
      setItems(previousItems);
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete item");
    }
  };

  const renderTableRow = (item: ShoppingListItemView, itemIndex: number) => {
    const rowClassName = `shopping-list-table__row${item.purchased ? " is-purchased" : ""}${
      highlightedItemId === item.id ? " is-highlighted" : ""
    }${
      firstPurchasedIndex !== -1 && itemIndex === firstPurchasedIndex
        ? " is-first-purchased"
        : ""
    }`;

    const checkboxShellClassName = `shopping-list-checkbox-shell${item.purchased ? " is-purchased" : ""}${
      highlightedItemId === item.id ? " is-highlighted" : ""
    }`;

    return (
      <Table.Tr key={item.id} className={rowClassName}>
        <Table.Td className="shopping-list-table__checkbox-column">
          <div className={checkboxShellClassName}>
            <Checkbox
              checked={item.purchased}
              onChange={() => void handleToggleItem(item.id)}
              color={item.purchased ? "brand" : "gray"}
              size="md"
              iconColor={item.purchased ? "white" : "transparent"}
              radius="xs"
              aria-label={`Mark ${item.name} as ${item.purchased ? "pending" : "purchased"}`}
              classNames={{
                input: "shopping-list-checkbox-input",
                icon: "shopping-list-checkbox-icon",
              }}
            />
          </div>
        </Table.Td>
        <Table.Td>
          <Text fw={600} td={item.purchased ? "line-through" : undefined}>
            {item.name}
          </Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm" c="dimmed">
            {item.notes || "—"}
          </Text>
        </Table.Td>
        <Table.Td className="shopping-list-table__action-column">
          <ActionIcon
            type="button"
            variant="subtle"
            color="red"
            aria-label={`Delete ${item.name}`}
            onClick={() => handleDeleteItem(item.id)}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Table.Td>
      </Table.Tr>
    );
  };

  return (
    <Container size="lg" py="xl">
      {/* Main page stack keeps the layout aligned with the rest of the app. */}
      <Stack gap="xl">
        <Button
          component={Link}
          to="/dashboard"
          state={locationState}
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          w="fit-content"
          px={0}
        >
          Back to dashboard
        </Button>

        {/* Header block for title, description and active household context. */}
        <Stack gap="xs">
          <Title order={1}>Shopping List</Title>
          <HouseholdContextBadge
            householdColor={currentHousehold?.household_color}
            householdName={locationState?.householdName ?? currentHousehold?.house_name}
          />
          <Text size="md" c="dimmed">Manage your household shopping items</Text>
        </Stack>

        <HouseholdContextDivider householdColor={currentHousehold?.household_color} />

        {error && (
          <Alert
            variant="light"
            color="red"
            radius="md"
            icon={<IconAlertCircle size={18} />}
            title="Shopping list error"
            withCloseButton
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Summary cards mirror the two item states shown below. */}
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Card withBorder radius="xl" padding="lg">
              <Group gap="sm" align="center">
                <IconShoppingCart size={22} />
                <Text fw={600}>Pending</Text>
              </Group>
              <Title order={2} mt="xs">
                {pendingItems.length}
              </Title>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Card withBorder radius="xl" padding="lg">
              <Group gap="sm" align="center">
                <IconCheck size={22} />
                <Text fw={600}>Purchased</Text>
              </Group>
              <Title order={2} mt="xs">
                {purchasedItems.length}
              </Title>
            </Card>
          </Grid.Col>
        </Grid>

        {loading ? (
          <Group justify="center" py="xl">
            <CustomLoader />
          </Group>
        ) : (
          <Paper withBorder radius="xl" className="shopping-list-table-panel">
            <div className="shopping-list-table-scroll">
              <Table className="shopping-list-table" withColumnBorders withRowBorders highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th className="shopping-list-table__checkbox-column" />
                    <Table.Th>Product</Table.Th>
                    <Table.Th>Notes</Table.Th>
                    <Table.Th className="shopping-list-table__action-column">Delete</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {!isAddingItem && householdId && (
                    <Table.Tr
                      className="shopping-list-table__row shopping-list-table__row--add-action"
                      onClick={() => setIsAddingItem(true)}
                    >
                      <Table.Td colSpan={4}>
                        <Group gap="sm" justify="center" wrap="nowrap">
                          <IconPlus size={16} />
                          <Text fw={600}>Add new item</Text>
                          <Text size="sm" c="dimmed">
                            Add a new product and save it to the shopping list
                          </Text>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  )}
                  {isAddingItem && (
                    <Table.Tr className="shopping-list-table__row shopping-list-table__row--draft">
                      <Table.Td className="shopping-list-table__checkbox-column">
                        <div className="shopping-list-checkbox-shell">
                          <Checkbox checked={false} readOnly radius="xs" classNames={{
                            input: "shopping-list-checkbox-input",
                            icon: "shopping-list-checkbox-icon",
                          }} />
                        </div>
                      </Table.Td>
                      <Table.Td>
                        <TextInput
                          placeholder="E.g: Pineapple, Cheese"
                          value={newItemName}
                          onChange={(event) => setNewItemName(event.currentTarget.value)}
                          onKeyDown={handleInputKeyDown}
                        />
                      </Table.Td>
                      <Table.Td>
                          <TextInput
                            placeholder="E.g: 500 g, low stock, brand preference"
                            value={newItemNotes}
                            onChange={(event) => setNewItemNotes(event.currentTarget.value)}
                            onKeyDown={handleInputKeyDown}
                          />
                      </Table.Td>
                      <Table.Td className="shopping-list-table__action-column">
                        <Group justify="center" gap={6} wrap="nowrap">
                          <ActionIcon
                            type="button"
                            variant="light"
                            color="brand"
                            aria-label="Save shopping list item"
                            onClick={handleAddItem}
                            loading={submitting}
                          >
                            <IconDeviceFloppy size={16} />
                          </ActionIcon>
                          <ActionIcon
                            type="button"
                            variant="subtle"
                            color="gray"
                            aria-label="Cancel new shopping list row"
                            onClick={handleCancelAdd}
                          >
                            <IconX size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  )}
                  {sortedItems.map(renderTableRow)}
                </Table.Tbody>
              </Table>
            </div>
          </Paper>
        )}
      </Stack>
    </Container>
  );
}
