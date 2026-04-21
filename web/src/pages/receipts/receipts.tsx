import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Badge, Box, Card, Divider, Grid, Group, Paper, ScrollArea, Select, SimpleGrid, Stack,
  Table, Text, TextInput, ThemeIcon, Title, UnstyledButton } from "@mantine/core";
import {IconCalendarEvent, IconChevronRight, IconCreditCard, IconFilter, IconHome, IconReceipt2, 
  IconSearch, IconShoppingBag, IconUser } from "@tabler/icons-react";

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
  buyer: string;
  paymentMethod: string;
  items: ReceiptItem[];
};

type ReceiptsLocationState = {
  householdName?: string;
};

const mockReceipts: ReceiptSummary[] = [
  {
    id: "whole-foods-2026-04-10",
    storeName: "Whole Foods Market",
    date: "Apr 10, 2026",
    itemCount: 9,
    total: "870,45 kr",
    buyer: "Arnau",
    paymentMethod: "Debit card",
    items: [
      { id: "1", name: "Organic Bananas", quantity: 6, price: "$3.99" },
      { id: "2", name: "Almond Milk", quantity: 2, price: "$5.98" },
      { id: "3", name: "Whole Wheat Bread", quantity: 1, price: "$4.49" },
      { id: "4", name: "Free Range Eggs", quantity: 1, price: "$6.99" },
      { id: "5", name: "Organic Spinach", quantity: 2, price: "$7.98" },
      { id: "6", name: "Greek Yogurt", quantity: 4, price: "$11.96" },
      { id: "7", name: "Cherry Tomatoes", quantity: 3, price: "$8.97" },
      { id: "8", name: "Chicken Breast", quantity: 2, price: "$18.50" },
      { id: "9", name: "Olive Oil", quantity: 1, price: "$12.99" },
    ],
  },
  {
    id: "coop-2026-04-06",
    storeName: "Coop Supermarket",
    date: "Apr 6, 2026",
    itemCount: 2,
    total: "13,45 kr",
    buyer: "Julia",
    paymentMethod: "Cash",
    items: [
      { id: "1", name: "Milk", quantity: 1, price: "$2.59" },
      { id: "2", name: "Pasta", quantity: 1, price: "$1.89" },
    ],
  },
  {
    id: "lidl-2026-03-29",
    storeName: "Lidl Supermarket",
    date: "Mar 29, 2026",
    itemCount: 3,
    total: "57,21 kr",
    buyer: "Arnau",
    paymentMethod: "Credit card",
    items: [
      { id: "1", name: "Tomatoes", quantity: 2, price: "$4.10" },
      { id: "2", name: "Mozzarella", quantity: 1, price: "$3.20" },
      { id: "3", name: "Olives", quantity: 1, price: "$2.45" },
    ],
  },
  {
    id: "ica-2026-03-04",
    storeName: "ICA Supermarket",
    date: "Mar 4, 2026",
    itemCount: 12,
    total: "376,32 kr",
    buyer: "Marc",
    paymentMethod: "Debit card",
    items: [
      { id: "1", name: "Rice", quantity: 1, price: "$3.45" },
      { id: "2", name: "Beans", quantity: 4, price: "$8.40" },
      { id: "3", name: "Avocado", quantity: 2, price: "$5.80" },
    ],
  },
];

function ReceiptListItem({
  receipt,
  selected,
  onSelect,
}: {
  receipt: ReceiptSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <UnstyledButton onClick={onSelect} style={{ width: "100%" }}>
      <Paper
        withBorder
        radius="xl"
        p="lg"
        bg={selected ? "brand.0" : "white"}
        style={{
          borderColor: selected ? "var(--mantine-color-brand-4)" : "var(--color-border)",
          color: "var(--color-text)",
          boxShadow: selected ? "0 10px 24px rgba(79, 134, 103, 0.12)" : "none",
          transition: "background-color 140ms ease, box-shadow 140ms ease, border-color 140ms ease",
        }}
      >
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Stack gap="sm" style={{ flex: 1, minWidth: 0 }}>
            <Group justify="space-between" align="center" wrap="nowrap">
              <Text fw={700} size="lg" truncate>
                {receipt.storeName}
              </Text>
              {selected && (
                <Badge color="brand" variant="filled" radius="xl">
                  Open
                </Badge>
              )}
            </Group>

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

            <Group gap="xs">
              <Badge variant="light" color="gray" leftSection={<IconUser size={12} />}>
                {receipt.buyer}
              </Badge>
              <Badge variant="light" color="gray" leftSection={<IconCreditCard size={12} />}>
                {receipt.paymentMethod}
              </Badge>
            </Group>
          </Stack>

          <Group gap="md" wrap="nowrap">
            <Text fw={700} size="lg">
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
  const { householdName } = (location.state as ReceiptsLocationState | null) ?? {};

  const receipts = useMemo(() => mockReceipts, []);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string>(receipts[0]?.id ?? "");
  const [searchValue, setSearchValue] = useState("");
  const [sortValue, setSortValue] = useState("latest");

  const filteredReceipts = useMemo(() => {
    const normalizedQuery = searchValue.trim().toLowerCase();
    const matches = receipts.filter(receipt => {
      if (!normalizedQuery) return true;

      return (
        receipt.storeName.toLowerCase().includes(normalizedQuery) ||
        receipt.buyer.toLowerCase().includes(normalizedQuery) ||
        receipt.date.toLowerCase().includes(normalizedQuery)
      );
    });

    const sorted = [...matches];
    if (sortValue === "store") {
      sorted.sort((a, b) => a.storeName.localeCompare(b.storeName));
    } else if (sortValue === "highest") {
      sorted.sort((a, b) => parseReceiptTotal(b.total) - parseReceiptTotal(a.total));
    }

    return sorted;
  }, [receipts, searchValue, sortValue]);

  const selectedReceipt =
    filteredReceipts.find(receipt => receipt.id === selectedReceiptId) ??
    filteredReceipts[0] ??
    null;

  const totalSpent = useMemo(
    () => receipts.reduce((sum, receipt) => sum + parseReceiptTotal(receipt.total), 0),
    [receipts]
  );

  const totalItems = useMemo(
    () => receipts.reduce((sum, receipt) => sum + receipt.itemCount, 0),
    [receipts]
  );

  return (
    <Box
      px={{ base: "md", sm: "xl", lg: 48 }}
      py={{ base: "xl", lg: 40 }}
      maw={1440}
      mx="auto"
    >
      <Stack gap="xl">
        <Paper
          radius="xl"
          p={{ base: "lg", sm: "xl" }}
          style={{
            background:
              "linear-gradient(135deg, rgba(79, 134, 103, 0.10) 0%, rgba(79, 134, 103, 0.04) 52%, rgba(255, 255, 255, 1) 100%)",
            border: "1px solid var(--color-border)",
          }}
        >
          <Stack gap="xl">
            <Group justify="space-between" align="flex-start">
              <Stack gap={8}>
                <Group gap="sm" align="center">
                  <ThemeIcon size={48} radius="xl" variant="filled" color="brand">
                    <IconReceipt2 size={26} stroke={1.8} />
                  </ThemeIcon>
                  <Badge variant="light" color="brand" size="lg">
                    Receipts hub
                  </Badge>
                </Group>

                <Stack gap={4}>
                  <Title order={1} size="h1">
                    Scanned receipts for {householdName ?? "Household_name"}
                  </Title>
                  <Text c="dimmed" size="lg">
                    Review captured purchases, inspect item lines and keep track of household spending.
                  </Text>
                </Stack>
              </Stack>

              <Badge variant="filled" color="dark" radius="xl" size="lg">
                {receipts.length} receipts
              </Badge>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <Card withBorder radius="xl" p="lg">
                <Stack gap={6}>
                  <Text size="sm" c="dimmed">
                    Total scanned
                  </Text>
                  <Text fw={800} size="1.9rem">
                    {receipts.length}
                  </Text>
                </Stack>
              </Card>

              <Card withBorder radius="xl" p="lg">
                <Stack gap={6}>
                  <Text size="sm" c="dimmed">
                    Total items
                  </Text>
                  <Text fw={800} size="1.9rem">
                    {totalItems}
                  </Text>
                </Stack>
              </Card>

              <Card withBorder radius="xl" p="lg">
                <Stack gap={6}>
                  <Text size="sm" c="dimmed">
                    Spend overview
                  </Text>
                  <Text fw={800} size="1.9rem">
                    {formatKr(totalSpent)}
                  </Text>
                </Stack>
              </Card>
            </SimpleGrid>
          </Stack>
        </Paper>

        <Grid align="start">
          <Grid.Col span={{ base: 12, lg: 4 }}>
            <Paper
              withBorder
              radius="xl"
              p="md"
              style={{
                position: "sticky",
                top: "88px",
                backgroundColor: "var(--color-surface-muted)",
              }}
            >
              <Stack gap="md">
                <Group justify="space-between" align="center">
                  <Group gap="sm">
                    <ThemeIcon size={40} radius="xl" variant="light" color="brand">
                      <IconHome size={20} stroke={1.8} />
                    </ThemeIcon>
                    <div>
                      <Title order={3}>All receipts</Title>
                      <Text size="sm" c="dimmed">
                        Browse household purchases
                      </Text>
                    </div>
                  </Group>

                  <Badge variant="light" color="brand">
                    {filteredReceipts.length}
                  </Badge>
                </Group>

                <TextInput
                  placeholder="Search by store, buyer or date"
                  value={searchValue}
                  onChange={event => setSearchValue(event.currentTarget.value)}
                  leftSection={<IconSearch size={16} stroke={1.8} />}
                  radius="xl"
                />

                <Select
                  value={sortValue}
                  onChange={value => setSortValue(value ?? "latest")}
                  data={[
                    { value: "latest", label: "Latest first" },
                    { value: "highest", label: "Highest total" },
                    { value: "store", label: "Store name" },
                  ]}
                  leftSection={<IconFilter size={16} stroke={1.8} />}
                  radius="xl"
                  allowDeselect={false}
                />

                <Divider />

                {filteredReceipts.length > 0 ? (
                  <ScrollArea.Autosize mah={640} offsetScrollbars>
                    <Stack gap="sm">
                      {filteredReceipts.map(receipt => (
                        <ReceiptListItem
                          key={receipt.id}
                          receipt={receipt}
                          selected={receipt.id === selectedReceipt?.id}
                          onSelect={() => setSelectedReceiptId(receipt.id)}
                        />
                      ))}
                    </Stack>
                  </ScrollArea.Autosize>
                ) : (
                  <Paper withBorder radius="xl" p="xl" bg="white">
                    <Stack gap="xs" align="center">
                      <ThemeIcon size={44} radius="xl" variant="light" color="gray">
                        <IconReceipt2 size={22} stroke={1.8} />
                      </ThemeIcon>
                      <Text fw={600}>No receipts match this search</Text>
                      <Text size="sm" c="dimmed" ta="center">
                        Try a different store name, buyer or date.
                      </Text>
                    </Stack>
                  </Paper>
                )}
              </Stack>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 8 }}>
            <Paper withBorder radius="xl" p={{ base: "lg", sm: "xl" }} shadow="sm">
              {selectedReceipt ? (
                <Stack gap="xl">
                  <Group justify="space-between" align="flex-start">
                    <Stack gap="xs">
                      <Text size="sm" tt="uppercase" fw={700} c="dimmed">
                        Receipt details
                      </Text>
                      <Title order={2} c="brand.7">
                        {selectedReceipt.storeName}
                      </Title>
                      <Group gap="xs" c="dimmed">
                        <IconCalendarEvent size={18} stroke={1.8} />
                        <Text>{selectedReceipt.date}</Text>
                      </Group>
                    </Stack>

                    <Badge variant="light" color="brand" size="lg" radius="xl">
                      {selectedReceipt.total}
                    </Badge>
                  </Group>

                  <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                    <Card withBorder radius="xl" p="md" bg="var(--color-surface-muted)">
                      <Stack gap={4}>
                        <Text size="sm" c="dimmed">
                          Buyer
                        </Text>
                        <Group gap="xs">
                          <IconUser size={16} stroke={1.8} />
                          <Text fw={700}>{selectedReceipt.buyer}</Text>
                        </Group>
                      </Stack>
                    </Card>

                    <Card withBorder radius="xl" p="md" bg="var(--color-surface-muted)">
                      <Stack gap={4}>
                        <Text size="sm" c="dimmed">
                          Items
                        </Text>
                        <Group gap="xs">
                          <IconShoppingBag size={16} stroke={1.8} />
                          <Text fw={700}>{selectedReceipt.itemCount}</Text>
                        </Group>
                      </Stack>
                    </Card>

                    <Card withBorder radius="xl" p="md" bg="var(--color-surface-muted)">
                      <Stack gap={4}>
                        <Text size="sm" c="dimmed">
                          Payment
                        </Text>
                        <Group gap="xs">
                          <IconCreditCard size={16} stroke={1.8} />
                          <Text fw={700}>{selectedReceipt.paymentMethod}</Text>
                        </Group>
                      </Stack>
                    </Card>
                  </SimpleGrid>

                  <Paper withBorder radius="xl" p="md">
                    <Stack gap="md">
                      <Group justify="space-between" align="center">
                        <Title order={4}>Purchased items</Title>
                        <Text size="sm" c="dimmed">
                          {selectedReceipt.items.length} line items
                        </Text>
                      </Group>

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
                    </Stack>
                  </Paper>

                  <Paper
                    radius="xl"
                    p="lg"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(79, 134, 103, 0.12) 0%, rgba(79, 134, 103, 0.04) 100%)",
                      border: "1px solid rgba(79, 134, 103, 0.18)",
                    }}
                  >
                    <Stack gap="md">
                      <Group justify="space-between" align="center">
                        <Text fw={700} size="xl">
                          Total
                        </Text>
                        <Text fw={800} size="2.2rem" c="brand.7">
                          {selectedReceipt.total}
                        </Text>
                      </Group>

                      <Divider />

                      <Text size="sm" c="dimmed">
                        Receipt summary ready to be wired to real database fields when you plug in the backend data.
                      </Text>
                    </Stack>
                  </Paper>
                </Stack>
              ) : (
                <Paper withBorder radius="xl" p="xl" bg="var(--color-surface-muted)">
                  <Stack gap="sm" align="center">
                    <ThemeIcon size={56} radius="xl" variant="light" color="gray">
                      <IconReceipt2 size={28} stroke={1.8} />
                    </ThemeIcon>
                    <Title order={3}>Select a receipt</Title>
                    <Text c="dimmed" ta="center" maw={420}>
                      Choose a receipt from the left panel to inspect products, buyer information and totals.
                    </Text>
                  </Stack>
                </Paper>
              )}
            </Paper>
          </Grid.Col>
        </Grid>
      </Stack>
    </Box>
  );
}

function parseReceiptTotal(total: string) {
  return Number(total.replace(" kr", "").replace(/\./g, "").replace(",", "."));
}

function formatKr(value: number) {
  return `${value.toFixed(2).replace(".", ",")} kr`;
}
