import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Alert, Badge, Button, Container, Divider, Grid, Group, Paper, SegmentedControl, SimpleGrid, Stack, Table, Text, ThemeIcon, Title, UnstyledButton, Menu, Popover } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconAlertCircle, IconArrowLeft, IconCalendarEvent, IconChevronRight, IconReceipt2, IconShoppingBag, IconDownload, IconFileSpreadsheet, IconFileText, IconTrash, IconUser } from "@tabler/icons-react";
import * as XLSX from "xlsx";
import { fetchReceiptsByHousehold, deleteReceipt } from "../../api/receipt";
import { notifications } from "@mantine/notifications";
import { formatDate } from "../../utils/date";
import { formatCurrency } from "../../utils/currency";
import { getHouseholds, getHouseholdMembers } from "../../api/household";
import { HouseholdContextBadge } from "../../components/HouseholdContextBadge";
import { HouseholdContextDivider } from "../../components/HouseholdContextDivider";
import type { Household } from "../../api/schema";
import "./receipts.css";
import { DelayedCustomLoader } from "../../components/CustomLoader";
import { getUsername } from "../../utils/user";

type ReceiptItem = {
  id: string;
  name: string;
  bought_quantity: number;
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
  buyerName: string | null;
};

type ReceiptsLocationState = {
  householdId?: string;
  householdName?: string;
};

type Preset = "all" | "7d" | "1m" | "3m" | "custom";

function ReceiptListItem({ receipt, selected, onSelect }: { receipt: ReceiptSummary; selected: boolean; onSelect: () => void; }) {
  return (
    /* One selectable receipt card in the left column. */
    <UnstyledButton
      onClick={onSelect}
      style={{ width: "100%" }}
      className="receipt-list-item"
      data-selected={selected ? "true" : undefined}
    >
      <Paper
        withBorder
        radius="xl"
        p="lg"
        bg={selected ? "brand.7" : "var(--color-surface)"}
        style={{
          borderColor: selected ? "var(--color-primary-700)" : "var(--color-border)",
          color: selected ? "var(--color-white)" : "var(--color-text)",
          transition: "transform 180ms ease, background-color 180ms ease, color 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
          transform: selected ? "translateY(-2px)" : "translateY(0)",
          boxShadow: selected ? "var(--shadow-md)" : "var(--shadow-sm)",
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

              <Group gap={8} wrap="nowrap" style={{ gridColumn: "1 / -1" }}>
                <IconUser size={18} stroke={1.8} />
                <Text size="sm" truncate>
                  {receipt.buyerName ?? "Unknown buyer"}
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
  const locationState = (location.state as ReceiptsLocationState | null) ?? null;
  const { householdId, householdName } = locationState ?? {};

  const [receipts, setReceipts] = useState<ReceiptSummary[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tracks which receipt is currently shown in the detail panel.
  const [selectedReceiptId, setSelectedReceiptId] = useState<string>("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Filter state
  const [preset, setPreset] = useState<Preset>("all");
  const [customRange, setCustomRange] = useState<[Date | string | null, Date | string | null]>([null, null]);

  useEffect(() => {
    void fetchReceipts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId]);

  useEffect(() => {
    void loadHouseholds();
  }, []);

  const currentHousehold = useMemo(
    () => households.find((household) => household.id === householdId) ?? null,
    [householdId, households],
  );

  const loadHouseholds = async () => {
    const { data, error: householdsError } = await getHouseholds();
    if (householdsError) return;
    setHouseholds(data ?? []);
  };

  const fetchReceipts = async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await fetchReceiptsByHousehold(householdId);

    if (fetchError) {
      setError(fetchError.message || "Could not load receipts");
      setLoading(false);
      return;
    }

    const rows = data ?? [];

    // Resolve buyer_id → display name by fetching members for each household in the results.
    const householdIdsInResults = Array.from(
      new Set(rows.map(r => r.household_id).filter(Boolean))
    );
    const buyerNames = new Map<string, string>();
    await Promise.all(
      householdIdsInResults.map(async hhId => {
        const result = await getHouseholdMembers(hhId);
        const members = result.data ?? [];
        for (const m of members) {
          buyerNames.set(m.id, getUsername(m));
        }
      })
    );

    const mapped: ReceiptSummary[] = rows.map(r => ({
      id: r.id,
      storeName: r.store_name ?? "Unknown Store",
      date: formatDate(r.purchase_at),
      rawDate: r.purchase_at ?? "",
      itemCount: r.products.length,
      total: formatCurrency(r.total),
      buyerName: r.buyer_id ? (buyerNames.get(r.buyer_id) ?? null) : null,
      items: r.products.map(p => ({
        id: p.id,
        name: p.name,
        bought_quantity: p.bought_quantity,
        price: formatCurrency(p.price),
      })),
    }));

    setReceipts(mapped);
    setSelectedReceiptId(mapped[0]?.id ?? "");
    setLoading(false);
  };

  const handleDeleteReceipt = async (receiptId: string) => {
    setDeleting(true);
    const { error } = await deleteReceipt(receiptId);
    setDeleting(false);
    setConfirmDelete(false);
    if (error) {
      notifications.show({ color: "red", title: "Couldn't delete receipt", message: error.message });
      return;
    }
    notifications.show({ color: "green", title: "Receipt deleted", message: "The receipt and its products have been removed." });
    const remaining = receipts.filter(r => r.id !== receiptId);
    setReceipts(remaining);
    setSelectedReceiptId(remaining[0]?.id ?? "");
  };

  const visibleReceipts = useMemo(() => {
    const now = new Date();

    let from: Date | string | null = null;
    let to: Date | string | null = null;

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

  const exportRows = visibleReceipts.flatMap(r =>
    r.items.map(item => ({
      Store: r.storeName,
      Date: r.date,
      Product: item.name,
      Quantity: item.bought_quantity,
      Price: item.price,
    }))
  );

  function exportCSV() {
    const headers = ["Store", "Date", "Product", "Quantity", "Price"];
    const rows = exportRows.map(r => headers.map(h => `"${String(r[h as keyof typeof r]).replace(/"/g, '""')}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "receipts.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportExcel() {
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Receipts");
    XLSX.writeFile(wb, "receipts.xlsx");
  }

  return (
    <Container size="lg" py="xl">
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

        {/* Page title and context */}
        <Stack gap="xs">
          <Title order={1} size="h1">Scanned receipts</Title>
          <HouseholdContextBadge
            householdColor={currentHousehold?.household_color}
            householdName={householdName ?? currentHousehold?.house_name}
          />
          <Text size="md" c="dimmed">
            View and manage your shopping receipts
          </Text>
        </Stack>

        <HouseholdContextDivider householdColor={currentHousehold?.household_color} />

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
                popoverProps={{ classNames: { dropdown: "app-date-picker__dropdown" } }}
                classNames={{
                  input: "app-date-picker__input",
                  calendarHeader: "app-date-picker__header",
                  calendarHeaderControl: "app-date-picker__header-control",
                  weekday: "app-date-picker__weekday",
                  day: "app-date-picker__day",
                }}
              />
            )}
            <Menu shadow="md" position="bottom-end">
              <Menu.Target>
                <Button
                  variant="light"
                  leftSection={<IconDownload size={16} />}
                  disabled={visibleReceipts.length === 0}
                >
                  Export
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconFileText size={14} />} onClick={exportCSV}>
                  Export as CSV
                </Menu.Item>
                <Menu.Item leftSection={<IconFileSpreadsheet size={14} />} onClick={exportExcel}>
                  Export as Excel
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Stack>

        {error && (
          <Alert
            variant="light"
            color="red"
            radius="md"
            icon={<IconAlertCircle size={18} />}
            title="Couldn't load receipts"
            withCloseButton
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Main split layout: list on the left, detail on the right */}
        <Grid align="start">
          <Grid.Col span={{ base: 12, lg: 5 }}>
            <Stack gap="md">
              {loading ? (
                <Group justify="center" py="md"><DelayedCustomLoader size="sm" /></Group>
              ) : visibleReceipts.length === 0 ? (
                <Text c="dimmed">No receipts found for this period.</Text>
              ) : (
                visibleReceipts.map(receipt => (
                  <ReceiptListItem
                    key={receipt.id}
                    receipt={receipt}
                    selected={receipt.id === selectedReceipt?.id}
                    onSelect={() => { setSelectedReceiptId(receipt.id); setConfirmDelete(false); }}
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

                    <Group gap="lg" c="dimmed">
                      <Group gap="xs">
                        <IconCalendarEvent size={18} stroke={1.8} />
                        <Text>{selectedReceipt.date}</Text>
                      </Group>
                      <Group gap="xs">
                        <IconUser size={18} stroke={1.8} />
                        <Text>Bought by {selectedReceipt.buyerName ?? "Unknown"}</Text>
                      </Group>
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
                              {item.bought_quantity}
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

                  <Group justify="flex-end">
                    <Popover
                      opened={confirmDelete}
                      onClose={() => setConfirmDelete(false)}
                      position="bottom-end"
                      withArrow
                      shadow="md"
                    >
                      <Popover.Target>
                        <Button
                          variant="subtle"
                          color="red"
                          size="xs"
                          leftSection={<IconTrash size={14} />}
                          onClick={() => setConfirmDelete(prev => !prev)}
                        >
                          Delete receipt
                        </Button>
                      </Popover.Target>
                      <Popover.Dropdown>
                        <Stack gap="xs">
                          <Text size="sm">Delete this receipt and all its products?</Text>
                          <Group gap="xs" justify="flex-end">
                            <Button size="xs" variant="default" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                              Cancel
                            </Button>
                            <Button size="xs" color="red" loading={deleting} onClick={() => void handleDeleteReceipt(selectedReceipt.id)}>
                              Yes, delete
                            </Button>
                          </Group>
                        </Stack>
                      </Popover.Dropdown>
                    </Popover>
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
    </Container>
  );
}
