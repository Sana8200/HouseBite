import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Badge, Box, Divider, Grid, Group, Paper, SegmentedControl, SimpleGrid, Stack, Table, Text, ThemeIcon, Title, UnstyledButton } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import "@mantine/dates/styles.css";
import { IconCalendarEvent, IconChevronRight, IconReceipt2, IconShoppingBag } from "@tabler/icons-react";
import { fetchReceiptsByHousehold } from "../../api/receipt";
import { formatCurrency, formatDate } from "../../utils/date";

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
  rawDate: string;
  itemCount: number;
  total: string;
  items: ReceiptItem[];
};

type ReceiptsLocationState = {
  householdId?: string;
  householdName?: string;
};

type Preset = "all" | "7d" | "1m" | "3m" | "custom";

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

  // Optional route state. The page still works if no household info is passed in navigation.
  const { householdId, householdName } = (location.state as ReceiptsLocationState | null) ?? {};

  const [receipts, setReceipts] = useState<ReceiptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tracks which receipt is currently shown in the detail panel.
  const [selectedReceiptId, setSelectedReceiptId] = useState<string>("");

  // Filter state
  const [preset, setPreset] = useState<Preset>("all");
  const [customRange, setCustomRange] = useState<[Date | null, Date | null]>([null, null]);

  useEffect(() => {
    void fetchReceipts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId]);

  const fetchReceipts = async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await fetchReceiptsByHousehold(householdId);

    if (fetchError) {
      setError("Could not load receipts");
      setLoading(false);
      return;
    }

    const mapped: ReceiptSummary[] = (data ?? []).map(r => ({
      id: r.id,
      storeName: r.store_name ?? "Unknown Store",
      date: formatDate(r.purchase_at),
      rawDate: r.purchase_at ?? "",
      itemCount: r.products.length,
      total: formatCurrency(r.total),
      items: r.products.map(p => ({
        id: p.id,
        name: p.name,
        quantity: p.quantity,
        price: formatCurrency(p.price),
      })),
    }));

    setReceipts(mapped);
    setSelectedReceiptId(mapped[0]?.id ?? "");
    setLoading(false);
  };

  const visibleReceipts = useMemo(() => {
    const now = new Date();

    let from: Date | null = null;
    let to: Date | null = null;

    if (preset === "7d") {
      from = new Date(now);
      from.setDate(from.getDate() - 7);
    } else if (preset === "1m") {
      from = new Date(now);
      from.setMonth(from.getMonth() - 1);
    } else if (preset === "3m") {
      from = new Date(now);
      from.setMonth(from.getMonth() - 3);
    } else if (preset === "custom") {
      [from, to] = customRange;
    }

    return receipts.filter(r => {
      if (!r.rawDate) return true;
      const date = new Date(r.rawDate + "T00:00:00");
      if (from) {
        const fromStart = new Date(from);
        fromStart.setHours(0, 0, 0, 0);
        if (date < fromStart) return false;
      }
      if (to) {
        const toEnd = new Date(to);
        toEnd.setHours(23, 59, 59, 999);
        if (date > toEnd) return false;
      }
      return true;
    });
  }, [receipts, preset, customRange]);

  // Fallback to the first receipt so the detail area is never empty on initial load.
  const selectedReceipt =
    visibleReceipts.find(receipt => receipt.id === selectedReceiptId) ?? visibleReceipts[0] ?? null;

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

        {/* Section title + filter controls */}
        <Stack gap="md">
          <Group gap="sm" align="center">
            <ThemeIcon size={48} radius="md" variant="light" color="brand">
              <IconReceipt2 size={28} stroke={1.8} />
            </ThemeIcon>
            <Title order={2}>All receipts</Title>
            <Badge variant="light" color="brand" size="lg">
              {visibleReceipts.length}
            </Badge>
          </Group>

          <Group align="flex-end" gap="md">
            <SegmentedControl
              value={preset}
              onChange={(v) => setPreset(v as Preset)}
              data={[
                { label: "All", value: "all" },
                { label: "7 days", value: "7d" },
                { label: "1 month", value: "1m" },
                { label: "3 months", value: "3m" },
                { label: "Custom", value: "custom" },
              ]}
            />
            {preset === "custom" && (
              <DatePickerInput
                type="range"
                placeholder="Pick date range"
                value={customRange}
                onChange={setCustomRange}
                clearable
              />
            )}
          </Group>
        </Stack>

        {error && (
          <Paper withBorder p="md" bg="red.0">
            <Text c="red">{error}</Text>
          </Paper>
        )}

        {/* Main split layout: list on the left, detail on the right */}
        <Grid align="start">
          <Grid.Col span={{ base: 12, lg: 5 }}>
            <Stack gap="md">
              {loading ? (
                <Text c="dimmed">Loading receipts...</Text>
              ) : visibleReceipts.length === 0 ? (
                <Text c="dimmed">No receipts found for this period.</Text>
              ) : (
                visibleReceipts.map(receipt => (
                  <ReceiptListItem
                    key={receipt.id}
                    receipt={receipt}
                    selected={receipt.id === selectedReceipt?.id}
                    onSelect={() => setSelectedReceiptId(receipt.id)}
                  />
                ))
              )}
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
