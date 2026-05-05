import './Dashboard.css';
import React, { useState, useMemo, useEffect } from 'react';
import { ActionIcon, Alert, Badge, Button, Card, Checkbox, Container, Group, Paper, Popover, SimpleGrid, Stack, Text, Title, Affix, Transition, Modal } from '@mantine/core';
import { IconLayoutGrid, IconReceiptEuro, IconShoppingCart, IconTrash, IconToolsKitchen2Off, IconChefHat, IconUsers, IconClock, IconAlertCircle } from '@tabler/icons-react';
import { AddToShoppingListModal } from "../../components/AddToShoppingListModal";
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { searchRecipes } from "../../api/recipe"
import { RecipeSearchModal } from "../../components/RecipeSearchModal"
import { HouseholdMembers } from "../../components/dashboard/HouseholdMembers"
import { FoodRestrictionsModal } from "../../components/dashboard/FoodRestrictionsModal"
import { getUsername } from "../../utils/user";
import { HouseholdBudgetSummary } from '../../components/budget_summary/HouseholdBudgetSummary';
import type { User } from '@supabase/supabase-js';
import { getHouseholds } from '../../api/household';
import type { Household } from '../../api/schema';
import { getDaysUntilExpiry, formatExpiry } from "../../utils/date";
import { notifications } from "@mantine/notifications";
import { CustomLoader } from '../../components/CustomLoader';
import { HouseholdContextBadge } from "../../components/HouseholdContextBadge";
import { HouseholdContextDivider } from "../../components/HouseholdContextDivider";


// Types
interface Product {
  id: string;
  name: string;
  expiryDate: string | null;
  current_quantity: number;
  householdName: string;
  householdId: string;
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

// ----------------------------------------------------------------------------

// Products in Danger Component
const ProductsInDanger: React.FC<{
  products: Product[];
  onDelete: (id: string) => Promise<void>;
  userId: string;
  selectedProducts: string[];
  onSelectedProductsChange: (selected: string[]) => void;
}> = ({ products, onDelete, userId, selectedProducts, onSelectedProductsChange }) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [shoppingListProduct, setShoppingListProduct] = useState<{ name: string; householdId: string } | null>(null);
  const navigate = useNavigate();

  const getExpiryBadge = (days: number | null) => {
    if (days === null) return <Badge variant="light">No date</Badge>;
    if (days < 0) return <Badge color="red">Expired {Math.abs(days)}d ago</Badge>;
    if (days === 0) return <Badge color="orange">Expires today</Badge>;
    if (days < 3) return <Badge color="orange">Expires in {days}d</Badge>;
    return <Badge color="yellow">Expires in {days}d</Badge>;
  };

  const displayedProducts = products;

  if (!products.length) {
    return (
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Title order={2} size="h3">Expiring soon</Title>
          <Button
            variant="subtle"
            size="sm"
            onClick={() => void navigate("/pantry")}
            rightSection={<span>→</span>}
          >
            View all
          </Button>
        </Group>

        <Paper withBorder p="xl" radius="md">
          <Text c="dimmed">No products expiring soon.</Text>
        </Paper>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Title order={2} size="h3">Expiring soon</Title>
        <Button
          variant="subtle"
          size="sm"
          onClick={() => void navigate("/pantry")}
          rightSection={<span>→</span>}
        >
          View all
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 1, md: 2, lg: 2, xl: 3 }}>
        {displayedProducts.map((product) => {
          const days = getDaysUntilExpiry(product.expiryDate);
          return (
            <Card key={product.id} withBorder shadow="sm" radius="xl" padding="lg">
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
                      onSelectedProductsChange(
                        selectedProducts.includes(product.id)
                          ? selectedProducts.filter(id => id !== product.id)
                          : [...selectedProducts, product.id]
                      )
                    }
                  />
                </Group>

                <Stack gap={4}>
                  <Text size="sm">Quantity: {product.current_quantity}</Text>
                  <Text size="sm">
                    Expires:{' '}
                    <Text span fw={600}>
                      {formatExpiry(product.expiryDate)}
                    </Text>
                  </Text>
                </Stack>

                <Stack gap={6}>
                  {getExpiryBadge(days)}
                  <Group justify="space-between" align="center">
                    <Button
                      size="compact-xs"
                      variant="light"
                      leftSection={<IconShoppingCart size={10} />}
                      onClick={() => setShoppingListProduct({ name: product.name, householdId: product.householdId })}
                    >
                      Add to shopping list
                    </Button>

                    <Popover
                      opened={confirmDeleteId === product.id}
                      onClose={() => setConfirmDeleteId(null)}
                      position="bottom-end"
                      withArrow
                      shadow="md"
                    >
                      <Popover.Target>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          aria-label={`Delete ${product.name}`}
                          onClick={() => setConfirmDeleteId(prev => prev === product.id ? null : product.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Popover.Target>
                      <Popover.Dropdown>
                        <Stack gap="xs">
                          <Text size="sm">Remove this product?</Text>
                          <Group gap="xs" justify="flex-end">
                            <Button
                              size="xs"
                              variant="default"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="xs"
                              color="red"
                              onClick={() => {
                                setConfirmDeleteId(null);
                                void onDelete(product.id);
                              }}
                            >
                              Delete
                            </Button>
                          </Group>
                        </Stack>
                      </Popover.Dropdown>
                    </Popover>
                  </Group>
                </Stack>
              </Stack>
            </Card>
          );
        })}
      </SimpleGrid>

      <AddToShoppingListModal
        product={shoppingListProduct}
        onClose={() => setShoppingListProduct(null)}
      />
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
              radius="xl"
              padding="lg"
              style={{ transition: "transform 0.15s, box-shadow 0.15s", cursor: "pointer" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = ""; }}
              onClick={() => void navigate("/recipes", { state: { openRecipeId: recipe.id } })}
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

export interface DashboardProps {
  user: User;
}

// Main Dashboard Component
export default function Dashboard(props: DashboardProps) {
  const { user } = props;

  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as DashboardLocationState | null) ?? null;
  const [products, setProducts] = useState<Product[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string | null>(locationState?.householdId ?? null);
  const [selectedHouseholdName, setSelectedHouseholdName] = useState<string | null>(locationState?.householdName ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFoodRestrictions, setShowFoodRestrictions] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [pendingSearch, setPendingSearch] = useState<{ ingredients: string[]; householdId: string } | null>(null);

  const displayName = getUsername(user);
  const selectedHousehold = useMemo(
    () => households.find((household) => household.id === selectedHouseholdId) ?? null,
    [households, selectedHouseholdId],
  );

  // Calculate how many products to show based on screen width
  const getProductLimit = () => {
    const width = window.innerWidth;
    if (width >= 1200) return 12; // xl: 4 rows x 3 columns
    if (width >= 768) return 8;   // md/lg: 4 rows x 2 columns
    return 4;                      // base/sm: 4 rows x 1 column
  };

  const [productLimit, setProductLimit] = useState(getProductLimit());

  useEffect(() => {
    const handleResize = () => {
      setProductLimit(getProductLimit());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const expiringProducts = useMemo(() => {
    const filtered = products.filter(p => {
      const days = getDaysUntilExpiry(p.expiryDate);
      return days !== null && days < 3;
    });
    // Sort by expiry date (closest first)
    filtered.sort((a, b) => {
      const da = getDaysUntilExpiry(a.expiryDate) ?? Infinity;
      const db = getDaysUntilExpiry(b.expiryDate) ?? Infinity;
      return da - db;
    });
    // Show 4 rows worth of products based on current screen size
    return filtered.slice(0, productLimit);
  }, [products, productLimit]);

  // Get selected product objects
  const selectedProductObjects = useMemo(() => {
    return products.filter(p => selectedProducts.includes(p.id));
  }, [products, selectedProducts]);

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

    if (!selectedHouseholdId && households.length > 0) {
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

  useEffect(() => {
    void load();
    async function load() {
      try {
        const { data } = await getHouseholds();
        setHouseholds(data ?? []);
      } catch (e) {
        notifications.show({
          color: "red",
          title: "Could not load households",
          message: e instanceof Error ? e.message : "Please try again.",
        });
      }
    }
  }, []);

  const fetchProducts = async (householdId: string | null) => {
    setLoading(true);
    try {
      let query = supabase
        .from('product')
        .select(`
          id,
          name,
          household_id,
          household:household_id(house_name),
          product_specs(current_quantity, expiration_date)
        `);

      if (householdId) {
        query = query.eq('household_id', householdId);
      }

      const { data, error } = await query;

      if (error) {
        setError('Could not load products');
        return;
      }

        const mapped: Product[] = (data ?? []).map(p => {
            const specs = Array.isArray(p.product_specs)
                ? p.product_specs[0]
                : p.product_specs;
            return {
                id: p.id as string,
                name: p.name as string,
                expiryDate: (specs?.expiration_date as string | null) ?? null,
                current_quantity: (specs?.current_quantity as number | null) ?? 1,
                householdName: ((p.household as unknown as {house_name: string | null})?.house_name) ?? 'Unknown',
                householdId: p.household_id as string,
            };
        });

        setProducts(mapped);
    } catch (e) {
      console.error('Dashboard fetchProducts failed', e);
      setError('Could not load products');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    const { error } = await supabase
      .from('product')
      .delete()
      .eq('id', productId);
    if (error) {
      notifications.show({
        color: "red",
        title: "Could not delete product",
        message: error.message,
      });
      return;
    }
    setProducts(prev => prev.filter(p => p.id !== productId));
    setSelectedProducts(prev => prev.filter(id => id !== productId));
    notifications.show({
      color: "orange",
      title: "Removed",
      message: `${product?.name ?? "Product"} removed from pantry.`,
    });
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;
    setBulkDeleting(true);
    const idsToDelete = [...selectedProducts];
    const { error } = await supabase
      .from("product")
      .delete()
      .in("id", idsToDelete);
    setBulkDeleting(false);

    if (error) {
      notifications.show({
        color: "red",
        title: "Could not delete products",
        message: error.message,
      });
      return;
    }

    setProducts((prev) => prev.filter((p) => !idsToDelete.includes(p.id)));
    setSelectedProducts([]);
    setConfirmBulkDelete(false);
    notifications.show({
      color: "orange",
      title: "Removed",
      message: `${idsToDelete.length} ${idsToDelete.length === 1 ? "product" : "products"} removed from pantry.`,
    });
  };

  const handleFindRecipes = () => {
    const ingredientNames = selectedProductObjects.map(p => p.name);
    const householdId = selectedProductObjects[0]?.householdId ?? selectedHouseholdId;
    
    if (!householdId || ingredientNames.length === 0) return;
    
    setPendingSearch({ ingredients: ingredientNames, householdId });
    setShowRecipeModal(true);
  };

  const handleProceed = async (diets: string[], intolerances: string[]) => {
    if (!pendingSearch) return;
    const result = await searchRecipes(pendingSearch.ingredients, pendingSearch.householdId, diets, intolerances);
    void navigate('/recipes', { state: { householdId: pendingSearch.householdId, ...result } });
  };

  const [favouriteRecipes, setFavouriteRecipes] = useState<FavRecipe[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('recipe')
          .select('id, title, description, servings, prep_time')
          .order('created_at', { ascending: false });
        if (error) {
          notifications.show({
            color: "red",
            title: "Could not load favourite recipes",
            message: error.message,
          });
          return;
        }
        setFavouriteRecipes(data ?? []);
      } catch (e) {
        notifications.show({
          color: "red",
          title: "Could not load favourite recipes",
          message: e instanceof Error ? e.message : "Please try again.",
        });
      }
    })();
  }, []);

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <div>
          <Title order={1}>Hello {displayName || 'there'}, welcome back</Title>
          <div style={{ marginTop: 4 }}>
            <HouseholdContextBadge
              householdColor={selectedHousehold?.household_color}
              householdName={selectedHouseholdName}
            />
          </div>
        </div>

        <HouseholdContextDivider householdColor={selectedHousehold?.household_color} />

        {error && (
          <Alert
            variant="light"
            color="red"
            radius="md"
            icon={<IconAlertCircle size={18} />}
            title="Couldn't load dashboard"
            withCloseButton
            onClose={() => setError(null)}
          >
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
              radius="xl"
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
          <Group justify="center" py="xl"><CustomLoader /></Group>
        ) : (
          <ProductsInDanger
            products={expiringProducts}
            onDelete={handleDelete}
            userId={user.id}
            selectedProducts={selectedProducts}
            onSelectedProductsChange={setSelectedProducts}
          />
        )}

        {/* Household members */}
        {selectedHouseholdId && (
          <HouseholdMembers
            householdId={selectedHouseholdId}
            inviteId={households.find(h => h.id === selectedHouseholdId)?.invite_id ?? undefined}
            adminId={households.find(h => h.id === selectedHouseholdId)?.admin_id}
            currentUserId={user.id}
            onInviteIdChange={(newId) => {
              setHouseholds(prev =>
                prev.map(h => h.id === selectedHouseholdId ? { ...h, invite_id: newId } : h)
              )
            }}
            onAdminChange={(newAdminId) => {
              setHouseholds(prev =>
                prev.map(h => h.id === selectedHouseholdId ? { ...h, admin_id: newAdminId } : h)
              )
            }}
          />
        )}

        {/* Favourite recipes */}
        <FavouriteRecipes recipes={favouriteRecipes} />

      </Stack>

      {selectedHouseholdId && (
        <FoodRestrictionsModal
          householdId={selectedHouseholdId}
          householdName={selectedHouseholdName}
          householdColor={selectedHousehold?.household_color}
          opened={showFoodRestrictions}
          onClose={() => setShowFoodRestrictions(false)}
        />
      )}

      {/* Budget Summary */}
      {selectedHouseholdId && (
        <HouseholdBudgetSummary
          householdId={selectedHouseholdId}
          userId={user.id || undefined}
        />
      )}

      {/* Floating Action Buttons - centered and higher */}
      {selectedProducts.length > 0 && (
        <Affix position={{ bottom: 40, left: 0, right: 0 }}>
          <Group justify="center" gap="lg">
            <Button
              color="red"
              variant="filled"
              size="lg"
              leftSection={<IconTrash size={20} />}
              onClick={() => setConfirmBulkDelete(true)}
              style={{ minWidth: '160px', height: '48px' }}
            >
              Delete ({selectedProducts.length})
            </Button>
            <Button
              variant="filled"
              size="lg"
              leftSection={<IconChefHat size={20} />}
              onClick={handleFindRecipes}
              style={{ minWidth: '200px', height: '48px' }}
            >
              Find Recipes ({selectedProducts.length})
            </Button>
          </Group>
        </Affix>
      )}

      {/* Recipe Search Modal */}
      {pendingSearch && (
        <RecipeSearchModal
          opened={showRecipeModal}
          onClose={() => {
            setShowRecipeModal(false);
            setPendingSearch(null);
          }}
          onProceed={handleProceed}
          householdId={pendingSearch.householdId}
          userId={user.id}
        />
      )}

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        opened={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        title="Delete selected products?"
        centered
        radius="md"
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to delete{" "}
            <Text span fw={700}>
              {selectedProducts.length} {selectedProducts.length === 1 ? "product" : "products"}
            </Text>
            ? This action cannot be undone.
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={() => setConfirmBulkDelete(false)} disabled={bulkDeleting}>
              Cancel
            </Button>
            <Button color="red" loading={bulkDeleting} onClick={() => void handleBulkDelete()}>
              Delete all
            </Button>
          </Group>
        </Stack>
      </Modal>

    </Container>
  );
};