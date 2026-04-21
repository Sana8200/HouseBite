import './Dashboard.css';
import React, { useState, useRef, useEffect } from 'react';
import { ActionIcon, Badge, Button, Card, Checkbox, Group, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconLayoutGrid, IconPlus, IconReceipt, IconShoppingCart, IconTrash } from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { searchRecipes } from "../../lib/searchRecipes"
import { HouseholdMembers } from "../../components/dashboard/HouseholdMembers"

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
  route: string;
  icon: React.ReactNode;
}


const dashboardNavCards: DashboardNavCards[] = [
  {
    title: 'Shopping List',
    description: 'Manage the household shopping list and keep track of what still needs to be bought.',
    route: '/shoppinglist',
    icon: <IconShoppingCart size={24} stroke={1.8} />,
  },
  {
    title: 'Pantry',
    description: 'Review pantry items, spot products that are running low and check what expires soon.',
    route: '/pantry',
    icon: <IconLayoutGrid size={24} stroke={1.8} />,
  },
  {
    title: 'Receipts',
    description: 'Open recent receipts and review purchases already captured for the household.',
    route: '/receipts',
    icon: <IconReceipt size={24} stroke={1.8} />,
  },
];

// ----------------------------------------------------------------------------

// Products in Danger Component
const ProductsInDanger: React.FC<{
  products: Product[];
  onDelete: (id: string) => Promise<void>;
}> = ({ products, onDelete }) => {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
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

  const handleFindRecipes = async () => {
    const selected = products.filter(p => selectedProducts.includes(p.id));
    const ingredientNames = selected.map(p => p.name);
    const householdId = selected[0]?.householdId;
    if (!householdId) return;
    const results = await searchRecipes(ingredientNames, householdId);
    navigate('/recipes', { state: { recipes: results, householdId } });
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
          <Button onClick={() => void handleFindRecipes()}>
            Find Recipes ({selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected)
          </Button>
        </Group>
      )}
    </Stack>
  );
};

// ----------------------------------------------------------------------------

// Favourite Recipes Component with Carousel
const FavouriteRecipes: React.FC<FavouriteRecipesProps> = ({ recipes }) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scroll = (dir: number) => carouselRef.current?.scrollBy({ left: dir * 300, behavior: 'smooth' });

  if (!recipes.length) {
    return (
      <div className="favourite-recipes-empty">
        <p>No favourite recipes yet. Start adding some</p>
      </div>
    );
  }

  return (
    <div className="favourite-recipes-container">
      <div className="section-header">
        <h2 className="section-title">Here are your favourite recipes</h2>
      </div>

      <div className="carousel-wrapper">
        <button onClick={() => scroll(-1)} className="carousel-arrow left-arrow" aria-label="Scroll left">‹</button>
        <div className="recipes-carousel" ref={carouselRef}>
          {recipes.map(recipe => {
            const nutrition = recipe.description?.split('\n\n')[0] ?? ''
            return (
              <div
                key={recipe.id}
                className="recipe-card"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate('/recipes', { state: { openRecipeId: recipe.id } })}
              >
                <div className="recipe-info">
                  <h3 className="recipe-name">{recipe.title}</h3>
                  <p className="recipe-time">Servings: {recipe.servings ?? '?'} · Prep: {recipe.prep_time ?? '?'} min</p>
                  <p className="recipe-description">{nutrition}</p>
                </div>
              </div>
            )
          })}
        </div>
        <button onClick={() => scroll(1)} className="carousel-arrow right-arrow" aria-label="Scroll right">›</button>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------

// Main Dashboard Component
const Dashboard: React.FC = () => {
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
  const [creating, setCreating] = useState(false);

  const [newName, setNewName] = useState('');
  const [newHouseholdId, setNewHouseholdId] = useState('');
  const [newQuantity, setNewQuantity] = useState('1');
  const [newSize, setNewSize] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newExpirationDate, setNewExpirationDate] = useState('');
  const [newPrice, setNewPrice] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata;
      const displayName = meta?.display_name as string | undefined;
      const username = meta?.username as string | undefined;
      const email = data.user?.email;
      setDisplayName(displayName ?? username ?? email?.split('@')[0] ?? null);
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

    setCreating(true);
    setError(null);

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
    setCreating(false);
    void fetchProducts();
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
    <div className="page dashboard">
      <div className="section-header">
        <div>
          <h1>Hello {displayName ?? 'there'}, welcome back</h1>
          <p className="dashboard-subtitle">
            Viewing household: {selectedHouseholdName ?? 'Choose a household'}
          </p>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setShowCreateModal(true)}>
          Add Product
        </Button>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button className="error-dismiss" onClick={() => setError(null)}>×</button>
        </div>
      )}

      <SimpleGrid
        cols={{ base: 1, md: 2, xl: 3 }}
        spacing="lg"
        className="dashboard-nav"
        aria-label="Dashboard navigation"
      >
        {dashboardNavCards.map((card) => (
          <Paper
            key={card.route}
            component="button"
            className="dashboard-nav-card"
            onClick={() => navigate(card.route)}
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

      {loading ? (
        <p className="loading-text">Loading products...</p>
      ) : (
        //filter the products array in Dashboard before passing it to ProductsInDanger, keeping only products expiring in 2? days
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

      {selectedHouseholdId && (
        <HouseholdMembers
          householdId={selectedHouseholdId}
          inviteId={households.find(h => h.id === selectedHouseholdId)?.invite_id}
        />
      )}

      <FavouriteRecipes recipes={favouriteRecipes} />

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Add Product</h2>

            <div className="modal-field">
              <label>Name *</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Fresh Milk" />
            </div>

            <div className="modal-field">
              <label>Household *</label>
              <select value={newHouseholdId} onChange={e => setNewHouseholdId(e.target.value)}>
                <option value="">Select a household</option>
                {households.map(h => (
                  <option key={h.id} value={h.id}>{h.house_name}</option>
                ))}
              </select>
            </div>

            <div className="modal-field">
              <label>Expiration Date</label>
              <input type="date" value={newExpirationDate} onChange={e => setNewExpirationDate(e.target.value)} />
            </div>

            <div className="modal-field">
              <label>Quantity</label>
              <input type="number" min="1" value={newQuantity} onChange={e => setNewQuantity(e.target.value)} />
            </div>

            <div className="modal-field">
              <label>Size</label>
              <input type="text" value={newSize} onChange={e => setNewSize(e.target.value)} placeholder="e.g. 500" />
            </div>

            <div className="modal-field">
              <label>Unit</label>
              <select value={newUnit} onChange={e => setNewUnit(e.target.value)}>
                <option value="">No unit</option>
                <option value="gr">gr</option>
                <option value="ml">ml</option>
                <option value="kg">kg</option>
                <option value="L">L</option>
              </select>
            </div>

            <div className="modal-field">
              <label>Price</label>
              <input type="number" step="0.01" min="0" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="e.g. 4.99" />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => void handleCreate()} disabled={creating}>
                {creating ? 'Adding...' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
