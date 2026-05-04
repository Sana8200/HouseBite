import { ActionIcon, Alert, Badge, Button, Card, Checkbox, Group, Menu, Modal, NumberInput, Paper, Popover, SegmentedControl,
  Select, SimpleGrid, Stack, Table, Text, TextInput, Title, useMantineTheme } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconAlertCircle, IconArrowLeft, IconGridDots, IconList, IconPlus, IconSearch, IconShoppingCart, IconTrash } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { AddToShoppingListModal } from "../../components/AddToShoppingListModal";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { searchRecipes } from "../../api/recipe";
import { supabase } from "../../supabase";
import { RecipeSearchModal } from "../../components/RecipeSearchModal";
import type { User } from "@supabase/supabase-js";
import { getExpirationDateBounds, getDaysUntilExpiry, formatOptionalDate, formatExpiry,getExpiryLabel} from "../../utils/date";
import { getManualEntryReceipt, incrementReceiptTotal } from "../../api/receipt";
import { insertProductWithSpecs } from "../../api/product";
import { getHouseholdMembers } from "../../api/household";
import type { Household, ProductSizeUnit } from "../../api/schema";
import { useMediaQuery } from "@mantine/hooks";
import { getHouseholds } from "../../api/household";
import { HouseholdContextBadge } from "../../components/HouseholdContextBadge";
import { HouseholdContextDivider } from "../../components/HouseholdContextDivider";
import "./pantry.css";

type PantryViewMode = "grid" | "list";
type ExpiryStatusFilter = "all" | "expired" | "critical" | "warning" | "fresh" | "no-date";

/* Product data that will be displayed in the list. */
interface PantryProduct {
  id: string;
  name: string;
  householdId: string;
  current_quantity: number;
  size: string | null;
  unit: string | null;
  expirationDate: string | null;
  purchasedOn: string | null;
  shopName: string | null;
  boughtBy: string | null;
}

interface PantryLocationState {
  householdId?: string;
  householdName?: string;
}

interface PantryProps {
  user: User;
}

/* Helper for formatting the amount of a product. */
function formatAmount(product: PantryProduct): string {
  if (!product.size || !product.unit) return `${product.current_quantity}`;
  return `${product.current_quantity} x ${product.size} ${product.unit}`;
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
  return <Badge color="brand">Fresh</Badge>;
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
    <Badge color="brand" radius="xl" px="md" py={10}>
      {`Expires in ${daysUntilExpiry} day(s)`}
    </Badge>
  );
}

/* Component for rendering the pantry products in grid format. */
function PantryGrid({
  products,
  selectedProducts,
  onToggleProduct,
  confirmDeleteId,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
  onAddToShoppingList,
}: {
  products: PantryProduct[];
  selectedProducts: string[];
  onToggleProduct: (productId: string) => void;
  confirmDeleteId: string | null;
  onDeleteClick: (id: string) => void;
  onDeleteConfirm: (id: string) => void;
  onDeleteCancel: () => void;
  onAddToShoppingList: (product: PantryProduct) => void;
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
          <Card key={product.id} withBorder shadow="sm" radius="xl" padding="lg">
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

                <Group gap={4}>
                  <Button
                    size="compact-xs"
                    variant="light"
                    leftSection={<IconShoppingCart size={10} />}
                    onClick={() => onAddToShoppingList(product)}
                  >
                    Add to shopping list
                  </Button>

                  <Popover
                    opened={confirmDeleteId === product.id}
                    onClose={onDeleteCancel}
                    position="bottom-end"
                    withArrow
                    shadow="md"
                  >
                    <Popover.Target>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        aria-label={`Delete ${product.name}`}
                        onClick={() => confirmDeleteId === product.id ? onDeleteCancel() : onDeleteClick(product.id)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Popover.Target>
                    <Popover.Dropdown>
                      <Stack gap="xs">
                        <Text size="sm">Remove this product?</Text>
                        <Group gap="xs" justify="flex-end">
                          <Button size="xs" variant="default" onClick={onDeleteCancel}>Cancel</Button>
                          <Button size="xs" color="red" onClick={() => onDeleteConfirm(product.id)}>Delete</Button>
                        </Group>
                      </Stack>
                    </Popover.Dropdown>
                  </Popover>
                </Group>
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
  confirmDeleteId,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
  onAddToShoppingList,
}: {
  products: PantryProduct[];
  selectedProducts: string[];
  onToggleProduct: (productId: string) => void;
  confirmDeleteId: string | null;
  onDeleteClick: (id: string) => void;
  onDeleteConfirm: (id: string) => void;
  onDeleteCancel: () => void;
  onAddToShoppingList: (product: PantryProduct) => void;
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
        <Table.Td>{product.current_quantity}</Table.Td>
        <Table.Td>{product.size ?? "-"}</Table.Td>
        <Table.Td>{product.unit ?? "-"}</Table.Td>
        <Table.Td>{renderExpiryBadge(daysUntilExpiry)}</Table.Td>
        <Table.Td>
          <Button
            size="xs"
            variant="light"
            leftSection={<IconShoppingCart size={12} />}
            onClick={() => onAddToShoppingList(product)}
          >
            Add to shopping list
          </Button>
        </Table.Td>
        <Table.Td>
          <Popover
            opened={confirmDeleteId === product.id}
            onClose={onDeleteCancel}
            position="bottom-end"
            withArrow
            shadow="md"
          >
            <Popover.Target>
              <ActionIcon
                variant="subtle"
                color="red"
                aria-label={`Delete ${product.name}`}
                onClick={() => confirmDeleteId === product.id ? onDeleteCancel() : onDeleteClick(product.id)}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown>
              <Stack gap="xs">
                <Text size="sm">Remove this product?</Text>
                <Group gap="xs" justify="flex-end">
                  <Button size="xs" variant="default" onClick={onDeleteCancel}>Cancel</Button>
                  <Button size="xs" color="red" onClick={() => onDeleteConfirm(product.id)}>Delete</Button>
                </Group>
              </Stack>
            </Popover.Dropdown>
          </Popover>
        </Table.Td>
      </Table.Tr>
    );
  });

  return (
    <Paper withBorder radius="xl" p="md" style={{overflow: "auto"}}>
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
            <Table.Th>Shopping list</Table.Th>
            <Table.Th>Delete</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </Paper>
  );
}

/* Main pantry page component. */
export function Pantry({ user }: PantryProps) {
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  const expirationDateBounds = getExpirationDateBounds();
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = location.state as PantryLocationState | undefined;
  const householdId = locationState?.householdId;

  const [products, setProducts] = useState<PantryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_viewMode, setViewMode] = useState<PantryViewMode>("list");
  const viewMode: PantryViewMode = isMobile ? "grid" : _viewMode;
  const [statusFilter, setStatusFilter] = useState<ExpiryStatusFilter>("all");
  const [searchValue, setSearchValue] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [pendingSearch, setPendingSearch] = useState<{ ingredients: string[]; householdId: string } | null>(null);

  const [households, setHouseholds] = useState<Household[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [shoppingListProduct, setShoppingListProduct] = useState<{ name: string; householdId: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newHouseholdId, setNewHouseholdId] = useState<string | null>(null);
  const [newQuantity, setNewQuantity] = useState<number | string>(1);
  const [newSize, setNewSize] = useState("");
  const [newUnit, setNewUnit] = useState<string | null>(null);
  const [newExpirationDate, setNewExpirationDate] = useState("");
  const [newPrice, setNewPrice] = useState<number | string>("");

  const currentHousehold = useMemo(() => {
    if (!householdId || households.length === 0) return null;
    return households.find(h => h.id === householdId) ?? null;
  }, [householdId, households]);

  useEffect(() => {
    void fetchProducts();
    void fetchHouseholds();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("product")
        .select(`
          id,
          name,
          household_id,
          product_specs(current_quantity, bought_quantity, size, unit, expiration_date),
          receipt(store_name, purchase_at, buyer_id)
        `);

      if (householdId) {
        query = query.eq("household_id", householdId);
      }

      const { data, error } = await query;

      if (error) {
        setError("Could not load products");
        return;
      }

      const rows = data ?? [];

      // Resolve buyer_id → display name by fetching members for each household
      // that appears in the results. We only do this for households shown.
      const householdIdsInResults = Array.from(
        new Set(rows.map(r => r.household_id as string).filter(Boolean))
      );
      
      const buyerNames = new Map<string, string>();
      await Promise.all(
        householdIdsInResults.map(async hhId => {
          const result = await getHouseholdMembers(hhId);
          const members = result.data ?? [];
          for (const m of members) {
            if (m.display_name) buyerNames.set(m.id, m.display_name);
          }
        })
      );

      const mapped: PantryProduct[] = rows.map(p => {
        const specs = Array.isArray(p.product_specs) ? p.product_specs[0] : p.product_specs;
        const receipt = Array.isArray(p.receipt) ? p.receipt[0] : p.receipt;
        const buyerId = receipt?.buyer_id as string | undefined;
        return {
          id: p.id as string,
          name: p.name as string,
          householdId: p.household_id as string,
          current_quantity: specs?.current_quantity as number ?? 1,
          size: specs?.size as string ?? null,
          unit: specs?.unit as string ?? null,
          expirationDate: specs?.expiration_date as string ?? null,
          purchasedOn: receipt?.purchase_at as string ?? null,
          shopName: receipt?.store_name as string ?? null,
          boughtBy: buyerId ? (buyerNames.get(buyerId) ?? null) : null,
        };
      });

      setProducts(mapped);
    } catch (e) {
      console.error("pantry fetchProducts failed", e);
      setError("Could not load products");
    } finally {
      setLoading(false);
    }
  };

  const fetchHouseholds = async () => {
    try {
      const { data, error } = await getHouseholds();
      if (error) {
        notifications.show({
          color: "red",
          title: "Could not load households",
          message: error.message,
        });
        return;
      }
      setHouseholds(data ?? []);
      if (householdId) setNewHouseholdId(householdId);
    } catch (e) {
      notifications.show({
        color: "red",
        title: "Could not load households",
        message: e instanceof Error ? e.message : "Please try again.",
      });
    }
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newHouseholdId) {
      setModalError("Name and household are required");
      return;
    }

    if (
      newExpirationDate
      && (newExpirationDate < expirationDateBounds.min || newExpirationDate > expirationDateBounds.max)
    ) {
      setModalError(`Expiration date must be between ${expirationDateBounds.min} and ${expirationDateBounds.max}`);
      return;
    }

    setCreating(true);
    setModalError(null);

    try {

      // create receipt for this purchase
      const price = newPrice !== "" ? Number(newPrice) : null;

      const receiptResult = await getManualEntryReceipt(user.id, newHouseholdId);

      if (receiptResult.error) throw new Error('Could not create receipt: ' + receiptResult.error.message);

      const productResult = await insertProductWithSpecs({
        name: newName.trim(),
        household_id: newHouseholdId,
        receipt_id: receiptResult.data.id
      }, {
        bought_quantity: Number(newQuantity) || 1,
        current_quantity: Number(newQuantity) || 1,
        size: newSize || null,
        unit: newUnit as ProductSizeUnit || null,
        expiration_date: newExpirationDate || null,
        price: price, // because we compute it above already
      })

      if (productResult.error) {
        // to match try/catch pattern to prevent inconsistent state
        throw new Error("Could not create product: " + productResult.error.message);
      }

      if (price) {
        const priceResult = await incrementReceiptTotal(receiptResult.data.id, price);
        if (priceResult.error) {
          throw new Error("Could not update receipt: " + priceResult.error.message);
        }
      }

      const addedName = newName.trim();

      // reset form
      setNewName("");
      setNewHouseholdId(householdId ?? null);
      setNewQuantity(1);
      setNewSize("");
      setNewUnit(null);
      setNewExpirationDate("");
      setNewPrice("");
      setShowCreateModal(false);

      notifications.show({
        color: "green",
        title: "Added",
        message: `${addedName} added to pantry.`,
      });

      // refresh data
      await fetchProducts();

    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Could not add product');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    const { error } = await supabase
      .from("product")
      .delete()
      .eq("id", productId);

    if (error) {
      notifications.show({
        color: "red",
        title: "Could not delete product",
        message: error.message,
      });
      return;
    }

    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setSelectedProducts((prev) => prev.filter((id) => id !== productId));
    notifications.show({
      color: "orange",
      title: "Removed",
      message: `${product?.name ?? "Product"} removed from pantry.`,
    });
  };

  const handleToggleProduct = (productId: string) => {
    setSelectedProducts((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  };

  const handleFindRecipes = () => {
    const selectedProductObjects = products.filter((product) =>
      selectedProducts.includes(product.id),
    );
    const ingredientNames = selectedProductObjects.map((product) => product.name);
    const selectedHouseholdId = selectedProductObjects[0]?.householdId ?? householdId;

    if (!selectedHouseholdId || ingredientNames.length === 0) return;

    setPendingSearch({ ingredients: ingredientNames, householdId: selectedHouseholdId });
    setShowRecipeModal(true);
  };

  // Receives exactly the diets and intolerances the user left checked in the modal.
  const handleProceed = async (diets: string[], intolerances: string[]) => {
    if (!pendingSearch) return;
    const result = await searchRecipes(pendingSearch.ingredients, pendingSearch.householdId, diets, intolerances);
    void navigate("/recipes", { state: { householdId: pendingSearch.householdId, ...result } });
  };

  /* Memoized list of products after applying search, filter and expiry ordering. */
  const visibleProducts = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();
    return [...products]
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
  }, [products, searchValue, statusFilter]);

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
        state={{
          householdId,
          householdName: locationState?.householdName ?? currentHousehold?.house_name,
        }}
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
          {currentHousehold && (
            <HouseholdContextBadge
              householdColor={currentHousehold.household_color}
              householdName={currentHousehold.house_name}
            />
          )}
          <Text size="md" c="dimmed">Manage your pantry items</Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={() => { setModalError(null); setShowCreateModal(true); }}>
          Add Product
        </Button>
      </Group>

      <HouseholdContextDivider householdColor={currentHousehold?.household_color} />

      {error && (
        <Alert
          variant="light"
          color="red"
          radius="md"
          icon={<IconAlertCircle size={18} />}
          title="Couldn't load pantry"
          withCloseButton
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      <Group justify="flex-end" align="center" wrap="nowrap">
        <TextInput
          value={searchValue}
          onChange={(event) => setSearchValue(event.currentTarget.value)}
          placeholder="Search products"
          classNames={{
            root: "pantry-search",
            input: "pantry-search__input",
            section: "pantry-search__section",
          }}
          leftSection={
            <Menu shadow="md" width={180}>
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  className="pantry-search__filter-trigger"
                  aria-label="Filter products by expiry status"
                >
                  <IconList size={16} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown className="pantry-filter-menu">
                <Menu.Label className="pantry-filter-menu__label">Filter by status</Menu.Label>
                {filterOptions.map((option) => (
                  <Menu.Item
                    key={option.value}
                    className="pantry-filter-menu__item"
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
        <Button
          className="pantry-recipes-button"
          flex="0 0 auto"
          disabled={selectedProducts.length === 0}
          onClick={() => handleFindRecipes()}
        >
          Find recipes
        </Button>
        { !isMobile &&
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
        }
      </Group>

      <Paper withBorder radius="xl" p="lg" className="pantry-products-panel">
        <Stack gap="lg">
          <Group justify="space-between">
            <div>
              <Text fw={600}>All pantry products</Text>
              <Text size="sm" c="dimmed">
                {loading
                  ? "Loading..."
                  : `${visibleProducts.length} product${visibleProducts.length === 1 ? "" : "s"} · Filter: ${selectedFilterLabel}`}
              </Text>
            </div>
          </Group>

          {loading ? (
            <Text c="dimmed">Loading products...</Text>
          ) : viewMode === "grid" ? (
            <PantryGrid
              products={visibleProducts}
              selectedProducts={selectedProducts}
              onToggleProduct={handleToggleProduct}
              confirmDeleteId={confirmDeleteId}
              onDeleteClick={setConfirmDeleteId}
              onDeleteConfirm={(id) => { setConfirmDeleteId(null); void handleDelete(id); }}
              onDeleteCancel={() => setConfirmDeleteId(null)}
              onAddToShoppingList={(p) => setShoppingListProduct({ name: p.name, householdId: p.householdId })}
            />
          ) : (
            <PantryAllProductsList
              products={visibleProducts}
              selectedProducts={selectedProducts}
              onToggleProduct={handleToggleProduct}
              confirmDeleteId={confirmDeleteId}
              onDeleteClick={setConfirmDeleteId}
              onDeleteConfirm={(id) => { setConfirmDeleteId(null); void handleDelete(id); }}
              onDeleteCancel={() => setConfirmDeleteId(null)}
              onAddToShoppingList={(p) => setShoppingListProduct({ name: p.name, householdId: p.householdId })}
            />
          )}
        </Stack>
      </Paper>
      {pendingSearch && (
        <RecipeSearchModal
          opened={showRecipeModal}
          onClose={() => setShowRecipeModal(false)}
          onProceed={handleProceed}
          householdId={pendingSearch.householdId}
          userId={user.id}
        />
      )}

      <AddToShoppingListModal
        product={shoppingListProduct}
        onClose={() => setShoppingListProduct(null)}
      />

      <Modal
        opened={showCreateModal}
        onClose={() => { setShowCreateModal(false); setModalError(null); }}
        title="Add Product"
        centered
      >
        <Stack gap="sm">
          {modalError && (
            <Alert
              variant="light"
              color="red"
              radius="md"
              icon={<IconAlertCircle size={18} />}
              title="Couldn't add product"
              withCloseButton
              onClose={() => setModalError(null)}
            >
              {modalError}
            </Alert>
          )}
          <TextInput
            label="Name"
            placeholder="e.g. Fresh Milk"
            required
            value={newName}
            onChange={(e) => setNewName(e.currentTarget.value)}
          />
          <Select
            label="Household"
            placeholder="Select a household"
            required
            data={households.map((h) => ({ value: h.id, label: h.house_name }))}
            value={newHouseholdId}
            onChange={setNewHouseholdId}
          />
          <DatePickerInput
            label="Expiration Date"
            placeholder="Pick a date"
            clearable
            value={newExpirationDate || null}
            minDate={expirationDateBounds.min}
            maxDate={expirationDateBounds.max}
            onChange={(value) => setNewExpirationDate(value ?? "")}
            popoverProps={{ classNames: { dropdown: "app-date-picker__dropdown" } }}
            classNames={{
              input: "app-date-picker__input",
              calendarHeader: "app-date-picker__header",
              calendarHeaderControl: "app-date-picker__header-control",
              weekday: "app-date-picker__weekday",
              day: "app-date-picker__day",
            }}
          />
          <NumberInput
            label="Quantity"
            min={1}
            value={newQuantity}
            onChange={setNewQuantity}
          />
          <TextInput
            label="Size"
            placeholder="e.g. 500"
            value={newSize}
            onChange={(e) => setNewSize(e.currentTarget.value)}
          />
          <Select
            label="Unit"
            placeholder="No unit"
            clearable
            data={["gr", "ml", "kg", "L"]}
            value={newUnit}
            onChange={setNewUnit}
          />
          <NumberInput
            label="Price"
            placeholder="e.g. 4.99"
            min={0}
            decimalScale={2}
            value={newPrice}
            onChange={setNewPrice}
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="subtle" onClick={() => { setShowCreateModal(false); setModalError(null); }}>Cancel</Button>
            <Button onClick={() => void handleCreate()} loading={creating}>
              Add Product
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
