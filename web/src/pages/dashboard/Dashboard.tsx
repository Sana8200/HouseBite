import './Dashboard.css';
import React, { useState, useRef, useEffect } from 'react';
import { ActionIcon, Alert, Badge, Button, Card, Checkbox, Container, Group, Loader, Modal, NumberInput, Paper, Select, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconLayoutGrid, IconReceiptEuro, IconPlus, IconShoppingCart, IconTrash, IconToolsKitchen2Off, IconChefHat, IconUsers, IconClock } from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { searchRecipes } from "../../lib/searchRecipes"
import { RecipeSearchModal } from "../../components/RecipeSearchModal"
import { HouseholdMembers } from "../../components/dashboard/HouseholdMembers"
import { FoodRestrictionsModal } from "../../components/dashboard/FoodRestrictionsModal"
import { HouseholdBudgetSummary } from '../../components/budget_summary/HouseholdBudgetSummary';

// Types
interface Product {
  id: string;
  name: string;
  expiryDate: string | null;
  quantity: number;
  householdName: string;
  householdId: string;
}

interface Household {
  id: string;
  house_name: string;
  invite_id?: string;
}

interface DashboardLocationState {
  householdId?: string;
  householdName?: string;
}

interface FavRecipe {
  id: string;
  title: string;
  description: string | null;
  servings: number | null;
  prep_time: number | null;
}

interface FavouriteRecipesProps {
  recipes: FavRecipe[];
}

interface DashboardNavCards {
  title: string;
  description: string;
  route?: string;
  action?: string;
  icon: React.ReactNode;
}


const dashboardNavCards: DashboardNavCards[] = [
  {
    title: 'Shopping List',
    description: 'Manage the household shopping list and keep track of what still needs to be bought.',
    route: '/shoppinglist',
    icon: <IconShoppingCart size={25} stroke={1.9} />,
  },
  {
    title: 'Pantry',
    description: 'Review pantry items, spot products that are running low and check what expires soon.',
    route: '/pantry',
    icon: <IconLayoutGrid size={25} stroke={1.9} />,
  },
  {
    title: 'Receipts',
    description: 'Open recent receipts and review purchases already captured for the household.',
    route: '/receipts',
    icon: <IconReceiptEuro size={25} stroke={1.9} />,
  },
  {
    title: 'Food Restrictions',
    description: 'Manage allergies and dietary preferences of your household for better recipes and shopping.',
    action: 'food-restrictions',
    icon: <IconToolsKitchen2Off size={25} stroke={1.9} />,
  },
];

const formatDateInputValue = (date: Date) => date.toISOString().slice(0, 10);

const getExpirationDateBounds = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minDate = new Date(today);
  minDate.setFullYear(today.getFullYear() - 100);

  const maxDate = new Date(today);
  maxDate.setFullYear(today.getFullYear() + 100);

  return {
    min: formatDateInputValue(minDate),
    max: formatDateInputValue(maxDate),
  };
};

// ----------------------------------------------------------------------------

// Products in Danger Component
const ProductsInDanger: React.FC<{
  products: Product[];
  onDelete: (id: string) => Promise<void>;
}> = ({ products, onDelete }) => {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [pendingSearch, setPendingSearch] = useState<{ ingredients: string[]; householdId: string } | null>(null);
  const navigate = useNavigate();

  const getDaysUntilExpiry = (expiryDate: string | null): number | null => {
    if (!expiryDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getExpiryBadge = (days: number | null) => {
    if (days === null) return <Badge variant="light">No date</Badge>;
    if (days < 0) return <Badge color="red">Expired {Math.abs(days)}d ago</Badge>;
    if (days === 0) return <Badge color="orange">Expires today</Badge>;
    if (days < 3) return <Badge color="orange">Expires in {days}d</Badge>;
    return <Badge color="yellow">Expires in {days}d</Badge>;
  };

  const sortedProducts = [...products].sort((a, b) => {
    const da = getDaysUntilExpiry(a.expiryDate) ?? Infinity;
    const db = getDaysUntilExpiry(b.expiryDate) ?? Infinity;
    return da - db;
  });

  const handleFindRecipes = () => {
    const selected = products.filter(p => selectedProducts.includes(p.id));
    const ingredientNames = selected.map(p => p.name);
    const householdId = selected[0]?.householdId;
    if (!householdId) return;
    setPendingSearch({ ingredients: ingredientNames, householdId });
    setShowRecipeModal(true);
  };

  // Receives exactly the diets and intolerances the user left checked in the modal.
  const handleProceed = async (diets: string[], intolerances: string[]) => {
    if (!pendingSearch) return;
    const results = await searchRecipes(pendingSearch.ingredients, pendingSearch.householdId, diets, intolerances);
    navigate('/recipes', { state: { recipes: results, householdId: pendingSearch.householdId } });
  };

  if (!products.length) {
    return (
      <Paper withBorder p="xl" radius="md">
        <Text c="dimmed">No products expiring soon.</Text>
      </Paper>
    );
  }

  return (
    <Stack gap="md">
      <Title order={2} size="h3">Expiring soon</Title>

      <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }}>
        {sortedProducts.map(product => {
          const days = getDaysUntilExpiry(product.expiryDate);
          return (
            <Card key={product.id} withBorder shadow="sm" radius="md" padding="lg">
              <Stack gap="md">
                <Group justify="space-between" align="flex-start">
                  <div>
                    <Text fw={600}>{product.name}</Text>
                    <Text size="sm" c="dimmed">{product.householdName}</Text>
                  </div>
                  <Checkbox
                    aria-label={`Select ${product.name}`}
                    checked={selectedProducts.includes(product.id)}
                    onChange={() =>
                      setSelectedProducts(prev =>
                        prev.includes(product.id)
                          ? prev.filter(id => id !== product.id)
                          : [...prev, product.id]
                      )
                    }
                  />
                </Group>

                <Stack gap={4}>
                  <Text size="sm">Quantity: {product.quantity}</Text>
                  <Text size="sm">
                    Expires:{' '}
                    <Text span fw={600}>
                      {product.expiryDate
                        ? new Date(product.expiryDate).toLocaleDateString()
                        : 'No date'}
                    </Text>
                  </Text>
                </Stack>

                <Group justify="space-between" align="center">
                  {getExpiryBadge(days)}

                  {confirmDeleteId === product.id ? (
                    <Group gap={6}>
                      <Text size="xs" c="dimmed">Are you sure?</Text>
                      <Button size="xs" variant="subtle" onClick={() => setConfirmDeleteId(null)}>
                        Cancel
                      </Button>
                      <Button
                        size="xs"
                        color="red"
                        onClick={() => { setConfirmDeleteId(null); void onDelete(product.id); }}
                      >
                        Delete
                      </Button>
                    </Group>
                  ) : (
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      aria-label={`Delete ${product.name}`}
                      onClick={() => setConfirmDeleteId(product.id)}
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

      {selectedProducts.length > 0 && (
        <Group justify="center">
          <Button onClick={() => handleFindRecipes()}>
            Find Recipes ({selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected)
          </Button>
        </Group>
      )}

      {pendingSearch && (
        <RecipeSearchModal
          opened={showRecipeModal}
          onClose={() => setShowRecipeModal(false)}
          onProceed={handleProceed}
          householdId={pendingSearch.householdId}
        />
      )}
    </Stack>
  );
};

// ----------------------------------------------------------------------------

// Favourite Recipes Component with Carousel
const FavouriteRecipes: React.FC<FavouriteRecipesProps> = ({ recipes }) => {
  const navigate = useNavigate();

  if (!recipes.length) {
    return (
      <Paper withBorder p="xl" radius="md">
        <Stack align="center" gap="xs">
          <IconChefHat size={32} color="var(--color-text-muted)" />
          <Text c="dimmed" ta="center">No favourite recipes yet. Start adding some!</Text>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Title order={2} size="h3">Your favourite recipes</Title>
        <Button variant="subtle" size="sm"
          onClick={() => void navigate("/recipes")}
          rightSection={<span>→</span>}>
          View all
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {recipes.slice(0, 6).map((recipe) => {
          const nutrition = recipe.description?.split("\n\n")[0] ?? "";

          return (
            <Card
              key={recipe.id}
              withBorder
              shadow="sm"
              radius="md"
              padding="lg"
              style={{ transition: "transform 0.15s, box-shadow 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = ""; }}
            >
              <Stack gap="sm">
                <Text fw={700} size="md" lineClamp={2}>{recipe.title}</Text>

                <Group gap="lg">
                  <Group gap={4}>
                    <IconUsers size={14} color="var(--color-text-muted)" />
                    <Text size="xs" c="dimmed">{recipe.servings ?? "?"} servings</Text>
                  </Group>
                  <Group gap={4}>
                    <IconClock size={14} color="var(--color-text-muted)" />
                    <Text size="xs" c="dimmed">{recipe.prep_time ?? "?"} min</Text>
                  </Group>
                </Group>

                {nutrition && (
                  <Text size="xs" c="dimmed" lineClamp={2}>{nutrition}</Text>
                )}
              </Stack>
            </Card>
          );
        })}
      </SimpleGrid>
    </Stack>
  );
};

// ----------------------------------------------------------------------------

// Main Dashboard Component
const Dashboard: React.FC = () => {
  const expirationDateBounds = getExpirationDateBounds();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as DashboardLocationState | null) ?? null;
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string | null>(locationState?.householdId ?? null);
  const [selectedHouseholdName, setSelectedHouseholdName] = useState<string | null>(locationState?.householdName ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFoodRestrictions, setShowFoodRestrictions] = useState(false);
  const [creating, setCreating] = useState(false);

  const [newName, setNewName] = useState('');
  const [newHouseholdId, setNewHouseholdId] = useState('');
  const [newQuantity, setNewQuantity] = useState('1');
  const [newSize, setNewSize] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newExpirationDate, setNewExpirationDate] = useState('');
  const [newPrice, setNewPrice] = useState('');

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata;
      const displayName = meta?.display_name as string | undefined;
      const username = meta?.username as string | undefined;
      const email = data.user?.email;
      setDisplayName(displayName ?? username ?? email?.split('@')[0] ?? null);
      setUserId(data.user?.id ?? null);
    }).catch(() => {});
    void fetchHouseholds();
    void supabase
      .from('recipe')
      .select('id, title, description, servings, prep_time')
      .order('created_at', { ascending: false })
      .then(({ data }) => setFavouriteRecipes(data ?? []));
  }, []);

  useEffect(() => {
    if (!households.length) return;

    if (locationState?.householdId) {
      setSelectedHouseholdId(locationState.householdId);
      setSelectedHouseholdName(
        locationState.householdName
          ?? households.find((household) => household.id === locationState.householdId)?.house_name
          ?? null
      );
      return;
    }

    if (!selectedHouseholdId) {
      setSelectedHouseholdId(households[0].id);
      setSelectedHouseholdName(households[0].house_name);
    }
  }, [households, locationState?.householdId, locationState?.householdName, selectedHouseholdId]);

  useEffect(() => {
    if (!selectedHouseholdId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    void fetchProducts(selectedHouseholdId);
  }, [selectedHouseholdId]);

  const fetchHouseholds = async () => {
    const { data } = await supabase.from('household').select('id, house_name, invite_id');
    setHouseholds(data ?? []);
  };

  const fetchProducts = async (householdId: string | null) => {
    setLoading(true);
    let query = supabase
      .from('product')
      .select(`
        id,
        name,
        household_id,
        household:household_id(house_name),
        product_specs(quantity, expiration_date)
      `);

    if (householdId) {
      query = query.eq('household_id', householdId);
    }

    const { data, error } = await query;

    if (error) {
      setError('Could not load products');
      setLoading(false);
      return;
    }

    const mapped: Product[] = (data ?? []).map((p: any) => {
      // Supabase may return product_specs as an object or array depending on version
      const specs = Array.isArray(p.product_specs)
        ? p.product_specs[0]
        : p.product_specs;
      return {
        id: p.id,
        name: p.name,
        expiryDate: specs?.expiration_date ?? null,
        quantity: specs?.quantity ?? 1,
        householdName: p.household?.house_name ?? 'Unknown',
        householdId: p.household_id,
      };
    });

    setProducts(mapped);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newHouseholdId) {
      setError('Name and household are required');
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
      // get current user info
      const { data: {user}} = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create receipt for this purchase
      const price = newPrice ? parseFloat(newPrice) : null;
      const purchaseDate = newExpirationDate || new Date().toISOString().split('T')[0];
      
      const { data: receipt, error: receiptError } = await supabase
        .from('receipt')
        .insert({
          household_id: newHouseholdId,
          store_name: 'Manual Entry', // Or allow store selection
          total: price || 0,
          purchase_at: purchaseDate,
          buyer_id: user.id
        })
        .select()
        .single();

      if (receiptError) throw new Error('Could not create receipt: ' + receiptError.message);

      // create product linked to the receipt
      const { data: product, error: productError } = await supabase
        .from('product')
        .insert({ name: newName.trim(), household_id: newHouseholdId })
        .select()
        .single();

      if (productError) {
        setError('Could not create product: ' + productError.message);
        setCreating(false);
        return;
      }

      const { error: specsError } = await supabase
        .from('product_specs')
        .insert({
          product_id: product.id,
          quantity: parseInt(newQuantity) || 1,
          size: newSize || null,
          unit: newUnit || null,
          expiration_date: newExpirationDate || null,
          price: newPrice ? parseFloat(newPrice) : null,
        });

      if (specsError) {
        setError('Could not save product specs: ' + specsError.message);
        setCreating(false);
        return;
      }

    setNewName(''); setNewHouseholdId(''); setNewQuantity('1');
    setNewSize(''); setNewUnit(''); setNewExpirationDate(''); setNewPrice('');
      setShowCreateModal(false);
      
      // refresh data
      await fetchProducts(selectedHouseholdId);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add product');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (productId: string) => {
    const { error } = await supabase
      .from('product')
      .delete()
      .eq('id', productId);

    if (error) {
      setError('Could not delete product: ' + error.message);
      return;
    }
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  const [favouriteRecipes, setFavouriteRecipes] = useState<FavRecipe[]>([]);

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">

        {/* Header */}
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
          <div>
            <Title order={1}>Hello {displayName ?? 'there'}, welcome back</Title>
            <Text c="dimmed" mt={4}>
              Viewing household: {selectedHouseholdName ?? 'Choose a household'}
            </Text>
          </div>
          <Button leftSection={<IconPlus size={16} />} onClick={() => setShowCreateModal(true)}>
            Add Product
          </Button>
        </Group>

        {error && (
          <Alert color="red" withCloseButton onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Nav cards */}
        <SimpleGrid
          cols={{ base: 2, sm: 4 }}
          spacing="lg"
          className="dashboard-nav"
          aria-label="Dashboard navigation"
        >
          {dashboardNavCards.map((card) => (
            <Paper
              key={card.route ?? card.action}
              component="button"
              className="dashboard-nav-card"
              onClick={() => {
                if (card.action === 'food-restrictions') {
                  setShowFoodRestrictions(true)
                } else if (card.route) {
                  void navigate(card.route, {
                    state: { householdId: selectedHouseholdId, householdName: selectedHouseholdName }
                  })
                }
              }}
              radius="lg"
              withBorder
            >
              <span className="dashboard-nav-card__icon" aria-hidden="true">
                {card.icon}
              </span>
              <Text component="h2" className="dashboard-nav-card__title">
                {card.title}
              </Text>
              <Text className="dashboard-nav-card__description">
                {card.description}
              </Text>
            </Paper>
          ))}
        </SimpleGrid>

        {/* Expiring products */}
        {loading ? (
          <Group justify="center" py="xl"><Loader /></Group>
        ) : (
          <ProductsInDanger
            products={products.filter(p => {
              if (!p.expiryDate) return false;
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const expiry = new Date(p.expiryDate);
              expiry.setHours(0, 0, 0, 0);
              const days = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              return days < 3;
            })}
            onDelete={handleDelete}
          />
        )}

        {/* Household members */}
        {selectedHouseholdId && (
          <HouseholdMembers
            householdId={selectedHouseholdId}
            inviteId={households.find(h => h.id === selectedHouseholdId)?.invite_id}
          />
        )}

        {/* Favourite recipes */}
        <FavouriteRecipes recipes={favouriteRecipes} />

      </Stack>

      {selectedHouseholdId && (
        <FoodRestrictionsModal
          householdId={selectedHouseholdId}
          opened={showFoodRestrictions}
          onClose={() => setShowFoodRestrictions(false)}
        />
      )}

      {/* Budget Summary */}
      {selectedHouseholdId && (
        <HouseholdBudgetSummary 
          householdId={selectedHouseholdId} 
          userId={userId || undefined}
        />
      )}

      <Modal opened={showCreateModal} onClose={() => setShowCreateModal(false)}
        centered radius="lg" title={<Title order={3}>Add Product</Title>}>
        <Stack gap="md">
          <TextInput label="Name" required placeholder="e.g. Fresh Milk"
            value={newName} onChange={e => setNewName(e.target.value)} />
          <Select label="Household" required placeholder="Select a household"
            value={newHouseholdId} onChange={v => setNewHouseholdId(v ?? "")}
            data={households.map(h => ({ value: h.id, label: h.house_name }))} />
          <TextInput label="Expiration Date" type="date"
            value={newExpirationDate}
            min={expirationDateBounds.min}
            max={expirationDateBounds.max}
            onChange={e => setNewExpirationDate(e.target.value)} />
          <NumberInput label="Quantity" min={1} value={newQuantity ? parseInt(newQuantity) : 1}
            onChange={v => setNewQuantity(String(v))} />
          <TextInput label="Size" placeholder="e.g. 500"
            value={newSize} onChange={e => setNewSize(e.target.value)} />
          <Select label="Unit" placeholder="No unit" clearable
            value={newUnit || null} onChange={v => setNewUnit(v ?? "")}
            data={[
              { value: "gr", label: "gr" },
              { value: "ml", label: "ml" },
              { value: "kg", label: "kg" },
              { value: "L", label: "L" },
            ]} />
          <NumberInput label="Price" placeholder="e.g. 4.99" min={0} decimalScale={2}
            value={newPrice ? parseFloat(newPrice) : ""} onChange={v => setNewPrice(String(v))} />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={() => void handleCreate()} loading={creating}>Add Product</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
};

export default Dashboard;
