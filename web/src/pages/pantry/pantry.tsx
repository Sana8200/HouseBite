import { ActionIcon, Badge, Button, Card, Checkbox, Group, Menu, Paper, SegmentedControl, SimpleGrid,
  Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { IconArrowLeft, IconGridDots, IconList, IconSearch, IconTrash } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";

type PantryViewMode = "grid" | "list";
type ExpiryStatusFilter = "all" | "expired" | "critical" | "warning" | "fresh" | "no-date";

/* Product data that will be displayed in the list. */
interface PantryProduct {
  id: string;
  name: string;
  quantity: number;
  size: string | null;
  unit: string | null;
  expirationDate: string | null;
  purchasedOn: string | null;
  shopName: string | null;
  boughtBy: string | null;
}

/* Hardcoded values, to be REMOVED once functionality and data linked to DB is implemented. */
const mockProducts: PantryProduct[] = [
  {
    id: "1",
    name: "Milk",
    quantity: 2,
    size: "1",
    unit: "L",
    expirationDate: "2026-04-21",
    purchasedOn: "2026-04-18",
    shopName: "ICA",
    boughtBy: null,
  },
  {
    id: "2",
    name: "Eggs",
    quantity: 12,
    size: null,
    unit: null,
    expirationDate: "2026-04-24",
    purchasedOn: "2026-04-17",
    shopName: "Lidl",
    boughtBy: null,
  },
  {
    id: "3",
    name: "Spinach",
    quantity: 1,
    size: "250",
    unit: "gr",
    expirationDate: "2026-04-20",
    purchasedOn: "2026-04-15",
    shopName: "Coop",
    boughtBy: null,
  },
  {
    id: "4",
    name: "Rice",
    quantity: 1,
    size: "1",
    unit: "kg",
    expirationDate: "2026-06-10",
    purchasedOn: "2026-04-11",
    shopName: "Willys",
    boughtBy: null,
  },
  {
    id: "5",
    name: "Tomato Sauce",
    quantity: 3,
    size: "500",
    unit: "ml",
    expirationDate: "2026-04-27",
    purchasedOn: "2026-04-19",
    shopName: "ICA",
    boughtBy: null,
  },
  {
    id: "6",
    name: "Chicken Breast",
    quantity: 2,
    size: "400",
    unit: "gr",
    expirationDate: "2026-04-18",
    purchasedOn: "2026-04-16",
    shopName: "Lidl",
    boughtBy: null,
  },
];
/* Data above to be REMOVED once functionality and data linked to DB is implemented. */

/* Helper for getting the number of days remaining for expiring a product. */
function getDaysUntilExpiry(expirationDate: string | null): number | null {
  if (!expirationDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expirationDate);
  expiry.setHours(0, 0, 0, 0);

  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/* Helper for formatting the expiration date. */
function formatExpiry(expirationDate: string | null): string {
  if (!expirationDate) return "No expiration date";
  return new Date(expirationDate).toLocaleDateString();
}

/* Helper for formatting the purchasedOn date or other Optional dates needed. */
function formatOptionalDate(date: string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString();
}

/* Helper for formatting the amount of a product. */
function formatAmount(product: PantryProduct): string {
  if (!product.size || !product.unit) return `${product.quantity}`;
  return `${product.quantity} x ${product.size} ${product.unit}`;
}

/* Helper for getting the expiring status for a product. */
function getExpiryStatus(daysUntilExpiry: number | null): ExpiryStatusFilter {
  if (daysUntilExpiry === null) return "no-date";
  if (daysUntilExpiry < 0) return "expired";
  if (daysUntilExpiry <= 3) return "critical";
  if (daysUntilExpiry <= 7) return "warning";
  return "fresh";
}

/* Helper for rendering the badge with colours for each expiring status to filter. */
function renderExpiryBadge(daysUntilExpiry: number | null) {
  const status = getExpiryStatus(daysUntilExpiry);

  if (status === "no-date") return <Badge variant="light">No date</Badge>;
  if (status === "expired") return <Badge color="red">Expired</Badge>;
  if (status === "critical") return <Badge color="orange">Critical</Badge>;
  if (status === "warning") return <Badge color="yellow">Soon</Badge>;
  return <Badge color="green">Fresh</Badge>;
}


/* Helper for rendering the bottom status tag used in the grid view. */
function renderGridStatusTag(daysUntilExpiry: number | null) {
  const status = getExpiryStatus(daysUntilExpiry);

  if (status === "no-date") {
    return <Badge variant="light" radius="xl" px="md" py={10}>No date</Badge>;
  }

  if (status === "expired") {
    return (
      <Badge color="red" radius="xl" px="md" py={10}>
        {`Expired ${Math.abs(daysUntilExpiry ?? 0)} day(s) ago`}
      </Badge>
    );
  }

  if (status === "critical") {
    return (
      <Badge color="orange" radius="xl" px="md" py={10}>
        {daysUntilExpiry === 0 ? "Expires today" : `Expires in ${daysUntilExpiry} day(s)`}
      </Badge>
    );
  }

  if (status === "warning") {
    return (
      <Badge color="yellow" radius="xl" px="md" py={10}>
        {`Expires in ${daysUntilExpiry} day(s)`}
      </Badge>
    );
  }

  return (
    <Badge color="green" radius="xl" px="md" py={10}>
      {`Expires in ${daysUntilExpiry} day(s)`}
    </Badge>
  );
}

/* Helper for returning the expiration label shown in the table view. */
function getExpiryLabel(daysUntilExpiry: number | null): string {
  if (daysUntilExpiry === null) return "No date";
  if (daysUntilExpiry < 0) return `Expired ${Math.abs(daysUntilExpiry)} day(s) ago`;
  if (daysUntilExpiry === 0) return "Expires today";
  return `Expires in ${daysUntilExpiry} day(s)`;
}

/* Component for rendering the pantry products in grid format. */
function PantryGrid({
  products,
  selectedProducts,
  onToggleProduct,
}: {
  products: PantryProduct[];
  selectedProducts: string[];
  onToggleProduct: (productId: string) => void;
}) {
  if (!products.length) {
    return (
      <Paper withBorder p="xl">
        <Text>No pantry products found.</Text>
      </Paper>
    );
  }

  return (
    <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }}>
      {products.map((product) => {
        const daysUntilExpiry = getDaysUntilExpiry(product.expirationDate);

        return (
          <Card key={product.id} withBorder shadow="sm" radius="md" padding="lg">
            <Stack gap="md">
              <Group justify="space-between" align="flex-start">
                <div>
                  <Text fw={600}>{product.name}</Text>
                  <Text size="sm" c="dimmed">
                    Pantry product
                  </Text>
                </div>
                <Checkbox
                  aria-label={`Select ${product.name}`}
                  checked={selectedProducts.includes(product.id)}
                  onChange={() => onToggleProduct(product.id)}
                />
              </Group>

              <Stack gap={4}>
                <Text size="sm">Amount: {formatAmount(product)}</Text>
                <Text size="sm">
                  Expires:{" "}
                  <Text span fw={600}>
                    {formatExpiry(product.expirationDate)}
                  </Text>
                </Text>
              </Stack>

              <Group justify="space-between" align="center">
                {renderGridStatusTag(daysUntilExpiry)}
                <ActionIcon variant="subtle" color="red" aria-label={`Delete ${product.name}`}>
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Stack>
          </Card>
        );
      })}
    </SimpleGrid>
  );
}

/* Component for rendering the pantry products in compact table format. */
function PantryAllProductsList({
  products,
  selectedProducts,
  onToggleProduct,
}: {
  products: PantryProduct[];
  selectedProducts: string[];
  onToggleProduct: (productId: string) => void;
}) {
  if (!products.length) {
    return (
      <Paper withBorder p="xl">
        <Text>No pantry products found.</Text>
      </Paper>
    );
  }

  const rows = products.map((product) => {
    const daysUntilExpiry = getDaysUntilExpiry(product.expirationDate);

    return (
      <Table.Tr key={product.id}>
        <Table.Td>
          <Checkbox
            aria-label={`Select ${product.name}`}
            checked={selectedProducts.includes(product.id)}
            onChange={() => onToggleProduct(product.id)}
          />
        </Table.Td>
        <Table.Td>{product.name}</Table.Td>
        <Table.Td>{formatExpiry(product.expirationDate)}</Table.Td>
        <Table.Td>{getExpiryLabel(daysUntilExpiry)}</Table.Td>
        <Table.Td>{formatOptionalDate(product.purchasedOn)}</Table.Td>
        <Table.Td>{product.shopName ?? "-"}</Table.Td>
        <Table.Td>{product.boughtBy ?? "-"}</Table.Td>
        <Table.Td>{product.quantity}</Table.Td>
        <Table.Td>{product.size ?? "-"}</Table.Td>
        <Table.Td>{product.unit ?? "-"}</Table.Td>
        <Table.Td>{renderExpiryBadge(daysUntilExpiry)}</Table.Td>
        <Table.Td>
          <ActionIcon variant="subtle" color="red" aria-label={`Delete ${product.name}`}>
            <IconTrash size={16} />
          </ActionIcon>
        </Table.Td>
      </Table.Tr>
    );
  });

  return (
    <Paper withBorder radius="md" p="md">
      <Table highlightOnHover stickyHeader>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Select</Table.Th>
            <Table.Th>Product</Table.Th>
            <Table.Th>Expires</Table.Th>
            <Table.Th>Label</Table.Th>
            <Table.Th>Purchased on</Table.Th>
            <Table.Th>Shop name</Table.Th>
            <Table.Th>Bought by</Table.Th>
            <Table.Th>Quantity</Table.Th>
            <Table.Th>Size</Table.Th>
            <Table.Th>Unit</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Delete</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </Paper>
  );
}

/* Main pantry page component. */
export function Pantry() {
  const [viewMode, setViewMode] = useState<PantryViewMode>("list");
  const [statusFilter, setStatusFilter] = useState<ExpiryStatusFilter>("all");
  const [searchValue, setSearchValue] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const handleToggleProduct = (productId: string) => {
    setSelectedProducts((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  };

  /* Memoized list of products after applying search, filter and expiry ordering. */
  const visibleProducts = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();
    return [...mockProducts]
      .filter((product) => {
        const daysUntilExpiry = getDaysUntilExpiry(product.expirationDate);
        const productStatus = getExpiryStatus(daysUntilExpiry);

        if (statusFilter !== "all" && productStatus !== statusFilter) {
          return false;
        }

        if (!normalizedSearch) return true;

        return [
          product.name,
          product.shopName ?? "",
          product.boughtBy ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort((left, right) => {
        const leftDays = getDaysUntilExpiry(left.expirationDate);
        const rightDays = getDaysUntilExpiry(right.expirationDate);
        const leftValue = leftDays === null ? Number.POSITIVE_INFINITY : leftDays;
        const rightValue = rightDays === null ? Number.POSITIVE_INFINITY : rightDays;
        return leftValue - rightValue;
      });
  }, [searchValue, statusFilter]);

  /* Helper label used to display the currently selected filter in the UI. */
  const selectedFilterLabel = useMemo(() => {
    if (statusFilter === "all") return "All";
    if (statusFilter === "expired") return "Expired";
    if (statusFilter === "critical") return "Critical";
    if (statusFilter === "warning") return "Soon";
    if (statusFilter === "fresh") return "Fresh";
    return "No date";
  }, [statusFilter]);

  /* Options displayed in the status filter dropdown menu. */
  const filterOptions: Array<{
    value: ExpiryStatusFilter;
    label: string;
    color: string;
  }> = [
    { value: "all", label: "All", color: "gray" },
    { value: "expired", label: "Expired", color: "red" },
    { value: "critical", label: "Critical", color: "orange" },
    { value: "warning", label: "Soon", color: "yellow" },
    { value: "fresh", label: "Fresh", color: "green" },
    { value: "no-date", label: "No date", color: "gray" },
  ];

  return (
    <Stack gap="xl" p="xl">
      <Button
        component={Link}
        to="/dashboard"
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        w="fit-content"
        px={0}
      >
        Back to dashboard
      </Button>

      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={1}>Pantry</Title>
          <Text c="dimmed">Manage your pantry items</Text>
        </div>
      </Group>

      <Group justify="space-between" align="center" wrap="nowrap">
        <div style={{ flex: 1 }} />
        <TextInput
          value={searchValue}
          onChange={(event) => setSearchValue(event.currentTarget.value)}
          placeholder="Search products"
          leftSection={
            <Menu shadow="md" width={180}>
              <Menu.Target>
                <ActionIcon variant="subtle" aria-label="Filter products by expiry status">
                  <IconList size={16} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>Filter by status</Menu.Label>
                {filterOptions.map((option) => (
                  <Menu.Item
                    key={option.value}
                    onClick={() => setStatusFilter(option.value)}
                    leftSection={
                      <Badge color={option.color} variant="filled" size="xs">
                        {" "}
                      </Badge>
                    }
                  >
                    {option.label}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          }
          leftSectionPointerEvents="all"
          rightSection={<IconSearch size={16} />}
          style={{ flex: "0 1 420px" }}
        />
        <SegmentedControl
          value={viewMode}
          onChange={(value) => setViewMode(value as PantryViewMode)}
          data={[
            {
              label: (
                <Group gap={6} wrap="nowrap">
                  <IconGridDots size={14} />
                  <span>Grid</span>
                </Group>
              ),
              value: "grid",
            },
            {
              label: (
                <Group gap={6} wrap="nowrap">
                  <IconList size={14} />
                  <span>List</span>
                </Group>
              ),
              value: "list",
            },
          ]}
        />
      </Group>

      <Paper withBorder radius="md" p="lg">
        <Stack gap="lg">
          <Group justify="space-between">
            <div>
              <Text fw={600}>All pantry products</Text>
              <Text size="sm" c="dimmed">
                {visibleProducts.length} product{visibleProducts.length === 1 ? "" : "s"} · Filter: {selectedFilterLabel}
              </Text>
            </div>
          </Group>

          {viewMode === "grid" ? (
            <PantryGrid
              products={visibleProducts}
              selectedProducts={selectedProducts}
              onToggleProduct={handleToggleProduct}
            />
          ) : (
            <PantryAllProductsList
              products={visibleProducts}
              selectedProducts={selectedProducts}
              onToggleProduct={handleToggleProduct}
            />
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
