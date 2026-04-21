import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Badge, Box, Divider, Grid, Group, Paper, SimpleGrid, Stack, Table, Text, ThemeIcon, Title, UnstyledButton } from "@mantine/core";
import { IconCalendarEvent, IconChevronRight, IconReceipt2, IconShoppingBag } from "@tabler/icons-react";

type ReceiptItem = {
  id: string;
  name: string;
  quantity: number;
  price: string;
};

type ReceiptSummary = {
  id: string;
  storeName: string;
  date: string;
  itemCount: number;
  total: string;
  items: ReceiptItem[];
};

type ReceiptsLocationState = {
  householdName?: string;
};

/* Hardcoded data for design testing purposes. TO BE REMOVED ONCE LINKED DATA FROM DATABASE */
const mockReceipts: ReceiptSummary[] = [
  {
    id: "whole-foods-2026-04-10",
    storeName: "Whole Foods Market",
    date: "Apr 10, 2026",
    itemCount: 9,
    total: "870,45 kr",
    items: [
      { id: "1", name: "Organic Bananas", quantity: 6, price: "59,90 kr" },
      { id: "2", name: "Almond Milk", quantity: 2, price: "49,80 kr" },
      { id: "3", name: "Whole Wheat Bread", quantity: 1, price: "32,50 kr" },
      { id: "4", name: "Free Range Eggs", quantity: 1, price: "46,90 kr" },
      { id: "5", name: "Organic Spinach", quantity: 2, price: "39,80 kr" },
      { id: "6", name: "Greek Yogurt", quantity: 4, price: "79,60 kr" },
      { id: "7", name: "Cherry Tomatoes", quantity: 3, price: "44,85 kr" },
      { id: "8", name: "Chicken Breast", quantity: 2, price: "287,30 kr" },
      { id: "9", name: "Olive Oil", quantity: 1, price: "229,80 kr" },
    ],
  },
  {
    id: "coop-2026-04-06",
    storeName: "Coop Supermarket",
    date: "Apr 6, 2026",
    itemCount: 2,
    total: "13,45 kr",
    items: [
      { id: "1", name: "Milk", quantity: 1, price: "8,95 kr" },
      { id: "2", name: "Pasta", quantity: 1, price: "4,50 kr" },
    ],
  },
  {
    id: "lidl-2026-03-29",
    storeName: "Lidl Supermarket",
    date: "Mar 29, 2026",
    itemCount: 3,
    total: "57,21 kr",
    items: [
      { id: "1", name: "Tomatoes", quantity: 2, price: "18,40 kr" },
      { id: "2", name: "Mozzarella", quantity: 1, price: "22,95 kr" },
      { id: "3", name: "Olives", quantity: 1, price: "15,86 kr" },
    ],
  },
  {
    id: "ica-2026-03-04",
    storeName: "ICA Supermarket",
    date: "Mar 4, 2026",
    itemCount: 12,
    total: "376,32 kr",
    items: [
      { id: "1", name: "Rice", quantity: 1, price: "42,90 kr" },
      { id: "2", name: "Beans", quantity: 4, price: "167,60 kr" },
      { id: "3", name: "Avocado", quantity: 2, price: "165,82 kr" },
    ],
  },
];
/* TO BE REMOVED ONCE LINKED DATA FROM DATABASE */


function ReceiptListItem({ receipt, selected, onSelect }: { receipt: ReceiptSummary; selected: boolean; onSelect: () => void; }) {
  return (
    /* One selectable receipt card in the left column. */
    <UnstyledButton onClick={onSelect} style={{ width: "100%" }}>
      <Paper
        withBorder
        radius="xl"
        p="lg"
        bg={selected ? "brand.7" : "white"}
        style={{
          borderColor: selected ? "transparent" : "var(--color-border)",
          color: selected ? "var(--color-white)" : "var(--color-text)",
          transition: "background-color 140ms ease, color 140ms ease, border-color 140ms ease",
        }}
      >
        <Group justify="space-between" align="center" wrap="nowrap">
          <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
            <Text fw={700} size="xl" truncate>
              {receipt.storeName}
            </Text>

            <SimpleGrid cols={2} spacing="xs" verticalSpacing="xs">
              <Group gap={8} wrap="nowrap">
                <IconCalendarEvent size={18} stroke={1.8} />
                <Text size="sm">{receipt.date}</Text>
              </Group>

              <Group gap={8} wrap="nowrap">
                <IconShoppingBag size={18} stroke={1.8} />
                <Text size="sm">
                  {receipt.itemCount} item{receipt.itemCount === 1 ? "" : "s"}
                </Text>
              </Group>
            </SimpleGrid>
          </Stack>

          <Group gap="md" wrap="nowrap">
            <Text fw={700} size="xl">
              {receipt.total}
            </Text>
            <IconChevronRight size={20} stroke={1.8} />
          </Group>
        </Group>
      </Paper>
    </UnstyledButton>
  );
}

export function Receipts() {
  const location = useLocation();

  // Optional route state. The page still works if no household name is passed in navigation.
  const { householdName } = (location.state as ReceiptsLocationState | null) ?? {};

  // Mocked receipt collection for now. Later this can be REPLACED with mapped BACKEND DATA.
  const receipts = useMemo(() => mockReceipts, []);

  // Tracks which receipt is currently shown in the detail panel.
  const [selectedReceiptId, setSelectedReceiptId] = useState<string>(receipts[0]?.id ?? "");

  // Fallback to the first receipt so the detail area is never empty on initial load.
  const selectedReceipt =
    receipts.find(receipt => receipt.id === selectedReceiptId) ?? receipts[0] ?? null;

  return (
    <Box px={{ base: "md", sm: "xl", lg: 48 }} py={{ base: "xl", lg: 40 }}>
      <Stack gap="xl">
        {/* Page title and context */}
        <Stack gap={6}>
          <Title order={1} size="h1">
            Scanned receipts for {householdName ?? "Household_name"}
          </Title>
          <Text c="dimmed" size="lg">
            View and manage your shopping receipts
          </Text>
        </Stack>

        {/* Section title for the receipts browser */}
        <Group gap="sm" align="center">
          <ThemeIcon size={48} radius="md" variant="light" color="brand">
            <IconReceipt2 size={28} stroke={1.8} />
          </ThemeIcon>
          <Title order={2}>All receipts</Title>
          <Badge variant="light" color="brand" size="lg">
            {receipts.length}
          </Badge>
        </Group>

        {/* Main split layout: list on the left, detail on the right */}
        <Grid align="start">
          <Grid.Col span={{ base: 12, lg: 5 }}>
            <Stack gap="md">
              {receipts.map(receipt => (
                <ReceiptListItem
                  key={receipt.id}
                  receipt={receipt}
                  selected={receipt.id === selectedReceipt?.id}
                  onSelect={() => setSelectedReceiptId(receipt.id)}
                />
              ))}
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 7 }}>
            <Paper withBorder radius="xl" p={{ base: "lg", sm: "xl" }} shadow="sm">
              {selectedReceipt ? (
                <Stack gap="xl">
                  {/* Header of the selected receipt */}
                  <Stack gap="xs">
                    <Title order={3} c="brand.7">
                      {selectedReceipt.storeName}
                    </Title>

                    <Group gap="xs" c="dimmed">
                      <IconCalendarEvent size={18} stroke={1.8} />
                      <Text>{selectedReceipt.date}</Text>
                    </Group>
                  </Stack>

                  {/* Items that belong to the selected receipt */}
                  <Table
                    verticalSpacing="md"
                    horizontalSpacing="sm"
                    highlightOnHover={false}
                    withRowBorders={false}
                  >
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Product</Table.Th>
                        <Table.Th ta="center">Qty</Table.Th>
                        <Table.Th ta="right">Price</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {selectedReceipt.items.map(item => (
                        <Table.Tr key={item.id}>
                          <Table.Td>
                            <Text fw={500}>{item.name}</Text>
                          </Table.Td>
                          <Table.Td ta="center">
                            <Text c="dimmed" fw={600}>
                              {item.quantity}
                            </Text>
                          </Table.Td>
                          <Table.Td ta="right">
                            <Text fw={500}>{item.price}</Text>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>

                  {/* Summary footer with the total amount */}
                  <Divider />

                  <Group justify="space-between" align="center">
                    <Group gap="sm">
                      <ThemeIcon size={34} radius="xl" variant="light" color="brand">
                        <IconReceipt2 size={18} stroke={1.8} />
                      </ThemeIcon>
                      <Text fw={700} size="xl">
                        Total
                      </Text>
                    </Group>

                    <Text fw={800} size="2rem" c="brand.7">
                      {selectedReceipt.total}
                    </Text>
                  </Group>
                </Stack>
              ) : (
                /* Empty state in case there is no receipt data. */
                <Text c="dimmed">No receipts available.</Text>
              )}
            </Paper>
          </Grid.Col>
        </Grid>
      </Stack>
    </Box>
  );
}
