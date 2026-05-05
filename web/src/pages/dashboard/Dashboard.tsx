import './Dashboard.css';
import React, { useState, useMemo, useEffect } from 'react';
import { ActionIcon, Alert, Badge, Button, Card, Checkbox, Container, Group, Paper, Popover, SimpleGrid, Stack, Text, Title } from '@mantine/core';
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
import { DelayedCustomLoader } from '../../components/CustomLoader';
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
}> = ({ products, onDelete, userId }) => {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [pendingSearch, setPendingSearch] = useState<{ ingredients: string[]; householdId: string } | null>(null);
  const [shoppingListProduct, setShoppingListProduct] = useState<{ name: string; householdId: string } | null>(null);
  const navigate = useNavigate();

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
    const result = await searchRecipes(pendingSearch.ingredients, pendingSearch.householdId, diets, intolerances);
    void navigate('/recipes', { state: { householdId: pendingSearch.householdId, ...result } });
  };

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

      <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }}>
        {sortedProducts.map(product => {
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
                      setSelectedProducts(prev =>
                        prev.includes(product.id)
                          ? prev.filter(id => id !== product.id)
                          : [...prev, product.id]
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
          userId={userId}
        />
      )}

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

  const displayName = getUsername(user);
  const selectedHousehold = useMemo(
    () => households.find((household) => household.id === selectedHouseholdId) ?? null,
    [households, selectedHouseholdId],
  );

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
            // Supabase may return product_specs as an object or array depending on version
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
    notifications.show({
      color: "orange",
      title: "Removed",
      message: `${product?.name ?? "Product"} removed from pantry.`,
    });
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
          <Group justify="center" py="xl"><DelayedCustomLoader /></Group>
        ) : (
          <ProductsInDanger
            products={products.filter(p => {
              const days = getDaysUntilExpiry(p.expiryDate);
              return days !== null && days < 3;
            }).slice(0, 27)}
            onDelete={handleDelete}
            userId={user.id}
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

    </Container>
  );
};
