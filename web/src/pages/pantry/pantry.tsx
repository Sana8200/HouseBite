import { ActionIcon, Badge, Button, Card, Checkbox, Group, Menu, Modal, NumberInput, Paper, SegmentedControl,
  Select, SimpleGrid, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { IconArrowLeft, IconGridDots, IconList, IconPlus, IconSearch, IconTrash } from "@tabler/icons-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { searchRecipes } from "../../lib/searchRecipes";
import { supabase } from "../../supabase";
import { RecipeSearchModal } from "../../components/RecipeSearchModal";
import type { User } from "@supabase/supabase-js";
import { getExpirationDateBounds, getDaysUntilExpiry, formatOptionalDate, formatExpiry,
  getExpiryLabel} from "../../utils/date";

type PantryViewMode = "grid" | "list";
type ExpiryStatusFilter = "all" | "expired" | "critical" | "warning" | "fresh" | "no-date";

/* Product data that will be displayed in the list. */
interface PantryProduct {
  id: string;
  name: string;
  householdId: string;
  quantity: number;
  size: string | null;
  unit: string | null;
  expirationDate: string | null;
  purchasedOn: string | null;
  shopName: string | null;
  boughtBy: string | null;
}

interface PantryLocationState {
  householdId?: string;
}

interface PantryProps {
  user: User;
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

/* Component for rendering the pantry products in grid format. */
function PantryGrid({
  products,
  selectedProducts,
  onToggleProduct,
  confirmDeleteId,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  products: PantryProduct[];
  selectedProducts: string[];
  onToggleProduct: (productId: string) => void;
  confirmDeleteId: string | null;
  onDeleteClick: (id: string) => void;
  onDeleteConfirm: (id: string) => void;
  onDeleteCancel: () => void;
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

                {confirmDeleteId === product.id ? (
                  <Group gap={6}>
                    <Text size="xs" c="dimmed">Are you sure?</Text>
                    <Button size="xs" variant="subtle" onClick={onDeleteCancel}>Cancel</Button>
                    <Button size="xs" color="red" onClick={() => onDeleteConfirm(product.id)}>Delete</Button>
                  </Group>
                ) : (
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    aria-label={`Delete ${product.name}`}
                    onClick={() => onDeleteClick(product.id)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                )}
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
}: {
  products: PantryProduct[];
  selectedProducts: string[];
  onToggleProduct: (productId: string) => void;
  confirmDeleteId: string | null;
  onDeleteClick: (id: string) => void;
  onDeleteConfirm: (id: string) => void;
  onDeleteCancel: () => void;
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
          {confirmDeleteId === product.id ? (
            <Group gap={6} wrap="nowrap">
              <Text size="xs" c="dimmed">Sure?</Text>
              <Button size="xs" variant="subtle" onClick={onDeleteCancel}>Cancel</Button>
              <Button size="xs" color="red" onClick={() => onDeleteConfirm(product.id)}>Delete</Button>
            </Group>
          ) : (
            <ActionIcon
              variant="subtle"
              color="red"
              aria-label={`Delete ${product.name}`}
              onClick={() => onDeleteClick(product.id)}
            >
              <IconTrash size={16} />
            </ActionIcon>
          )}
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
export function Pantry({ user }: PantryProps) {
  const expirationDateBounds = getExpirationDateBounds();
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = location.state as PantryLocationState | undefined;
  const householdId = locationState?.householdId;

  const [products, setProducts] = useState<PantryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<PantryViewMode>("list");
  const [statusFilter, setStatusFilter] = useState<ExpiryStatusFilter>("all");
  const [searchValue, setSearchValue] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [pendingSearch, setPendingSearch] = useState<{ ingredients: string[]; householdId: string } | null>(null);

  const [households, setHouseholds] = useState<{ id: string; house_name: string }[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newHouseholdId, setNewHouseholdId] = useState<string | null>(null);
  const [newQuantity, setNewQuantity] = useState<number | string>(1);
  const [newSize, setNewSize] = useState("");
  const [newUnit, setNewUnit] = useState<string | null>(null);
  const [newExpirationDate, setNewExpirationDate] = useState("");
  const [newPrice, setNewPrice] = useState<number | string>("");

  const currentHouseholdName = useMemo(() => {
    if (!householdId || households.length === 0) return null;
    return households.find(h => h.id === householdId)?.house_name;
  }, [householdId, households]);

  useEffect(() => {
    void fetchProducts();
    void fetchHouseholds();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId]);

  const fetchProducts = async () => {
    setLoading(true);
    let query = supabase
      .from("product")
      .select(`
        id,
        name,
        household_id,
        product_specs(quantity, size, unit, expiration_date)
      `);

    if (householdId) {
      query = query.eq("household_id", householdId);
    }

    const { data, error } = await query;

    if (error) {
      setError("Could not load products");
      setLoading(false);
      return;
    }

    const mapped: PantryProduct[] = (data ?? []).map((p: any) => {
      const specs = Array.isArray(p.product_specs) ? p.product_specs[0] : p.product_specs;
      return {
        id: p.id,
        name: p.name,
        householdId: p.household_id,
        quantity: specs?.quantity ?? 1,
        size: specs?.size ?? null,
        unit: specs?.unit ?? null,
        expirationDate: specs?.expiration_date ?? null,
        purchasedOn: null,
        shopName: null,
        boughtBy: null,
      };
    });

    setProducts(mapped);
    setLoading(false);
  };

  const fetchHouseholds = async () => {
    const { data } = await supabase.from("household").select("id, house_name");
    setHouseholds(data ?? []);
    if (householdId) setNewHouseholdId(householdId);
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newHouseholdId) {
      setError("Name and household are required");
      return;
    }

    if (
      newExpirationDate
      && (newExpirationDate < expirationDateBounds.min || newExpirationDate > expirationDateBounds.max)
    ) {
      setError(`Expiration date must be between ${expirationDateBounds.min} and ${expirationDateBounds.max}`);
      return;
    }

    setCreating(true);
    setError(null);

    try {

      // create receipt for this purchase
      const price = newPrice !== "" ? Number(newPrice) : null;
      const purchaseDate = newExpirationDate || new Date().toISOString().split('T')[0];
      
      const { data: receipt, error: receiptError } = await supabase
        .from('receipt')
        .insert({
          household_id: newHouseholdId,
          store_name: 'Manual Entry',
          total: price || 0,
          purchase_at: purchaseDate,
          buyer_id: user.id
        })
        .select()
        .single();

      if (receiptError) throw new Error('Could not create receipt: ' + receiptError.message);

      // create product linked to receipt
      const { data: product, error: productError } = await supabase
        .from("product")
      .insert({ name: newName.trim(), household_id: newHouseholdId, receipt_id: receipt.id })
        .select()
        .single();

      if (productError) {
        // to match try/catch pattern to prevent inconsistent state
        throw new Error("Could not create product: " + productError.message);
      }

      // create product specs
      const { error: specsError } = await supabase.from("product_specs").insert({
        product_id: product.id,
        quantity: Number(newQuantity) || 1,
        size: newSize || null,
        unit: newUnit || null,
        expiration_date: newExpirationDate || null,
        price: price, // because we compute it above already
      });

      if (specsError) {
        // to match try/catch pattern to prevent inconsistent state
        throw new Error("Could not save product specs: " + specsError.message);
      }

      // reset form
      setNewName(""); 
      setNewHouseholdId(householdId ?? null); 
      setNewQuantity(1);
      setNewSize(""); 
      setNewUnit(null); 
      setNewExpirationDate(""); 
      setNewPrice("");
      setShowCreateModal(false);
      
      // refresh data
      await fetchProducts();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add product');
    } finally {
      setCreating(false);
    }
  };  

  const handleDelete = async (productId: string) => {
    const { error } = await supabase
      .from("product")
      .delete()
      .eq("id", productId);

    if (error) {
      setError("Could not delete product: " + error.message);
      return;
    }

    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setSelectedProducts((prev) => prev.filter((id) => id !== productId));
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
    const {recipes, noExactRecipe, matchedIngredients, unmatchedIngredients, } = await searchRecipes(pendingSearch.ingredients, pendingSearch.householdId, diets, intolerances);
    navigate("/recipes", { state: { recipes, householdId: pendingSearch.householdId, noExactRecipe, matchedIngredients, unmatchedIngredients, } });
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
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        w="fit-content"
        px={0}
      >
        Back to dashboard
      </Button>

      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={1}>Pantry {currentHouseholdName && `- ${currentHouseholdName}`}</Title>
          <Text c="dimmed">Manage your pantry items</Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setShowCreateModal(true)}>
          Add Product
        </Button>
      </Group>

      {error && (
        <Paper withBorder p="md" bg="red.0">
          <Text c="red">{error}</Text>
        </Paper>
      )}

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
        <Button
          disabled={selectedProducts.length === 0}
          onClick={() => handleFindRecipes()}
        >
          Find recipes
        </Button>
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

      <Modal
        opened={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add Product"
        centered
      >
        <Stack gap="sm">
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
          <TextInput
            label="Expiration Date"
            type="date"
            value={newExpirationDate}
            min={expirationDateBounds.min}
            max={expirationDateBounds.max}
            onChange={(e) => setNewExpirationDate(e.currentTarget.value)}
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
            <Button variant="subtle" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={() => void handleCreate()} loading={creating}>
              Add Product
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}