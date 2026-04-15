import './Dashboard.css';
import React, { useState, useRef, useEffect } from 'react';
import { Paper, SimpleGrid, Text } from '@mantine/core';
import { IconLayoutGrid, IconReceipt, IconShoppingCart } from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { searchRecipes } from "../../lib/searchRecipes"

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

// Filter types
type FilterType = 'all' | 'expired' | 'critical' | 'warning' | 'normal';

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

// Products in Danger Component with Filters
const ProductsInDanger: React.FC<{ products: Product[] }> = ({ products }) => {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedHousehold, setSelectedHousehold] = useState<string>('all');
  const [selectedFilterType, setSelectedFilterType] = useState<FilterType>('all');
  const navigate = useNavigate();

  const getDaysUntilExpiry = (expiryDate: string | null): number | null => {
    if (!expiryDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getPriorityLevel = (days: number | null): 'expired' | 'critical' | 'warning' | 'normal' => {
    if (days === null) return 'normal';
    if (days < 0) return 'expired';
    if (days < 3) return 'critical';
    if (days < 7) return 'warning';
    return 'normal';
  };

  const households = ['all', ...new Set(products.map(p => p.householdName))];

  const filteredProducts = products.filter(product => {
    const days = getDaysUntilExpiry(product.expiryDate);
    const priority = getPriorityLevel(days);
    if (selectedHousehold !== 'all' && product.householdName !== selectedHousehold) return false;
    if (selectedFilterType !== 'all' && priority !== selectedFilterType) return false;
    return true;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const da = getDaysUntilExpiry(a.expiryDate) ?? Infinity;
    const db = getDaysUntilExpiry(b.expiryDate) ?? Infinity;
    return da - db;
  });

  const handleCheckboxChange = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const handleFindRecipes = async () => {
    const selectedProductObjects = products.filter(p => selectedProducts.includes(p.id))
    const ingredientNames = selectedProductObjects.map(p => p.name)
    const householdId = selectedProductObjects[0]?.householdId
    if (!householdId) return
    const results = await searchRecipes(ingredientNames, householdId)
    navigate('/recipes', { state: { recipes: results, householdId } })
  };

  const clearFilters = () => {
    setSelectedHousehold('all');
    setSelectedFilterType('all');
    setSelectedProducts([]);
  };

  if (!products.length) {
    return (
      <div className="products-in-danger-empty">
        <p>No products in danger of expiring</p>
      </div>
    );
  }

  return (
    <div className="products-in-danger-container">
      <h2 className="section-title">These products will expire soon</h2>

      <div className="filter-section">

        <div className="filter-group">
          <label htmlFor="status-filter">Status:</label>
          <select
            id="status-filter"
            value={selectedFilterType}
            onChange={e => { setSelectedFilterType(e.target.value as FilterType); setSelectedProducts([]); }}
            className="filter-select"
          >
            <option value="all">All Products</option>
            <option value="expired">Expired Only</option>
            <option value="critical">Critical (expires in less than 3 days)</option>
            <option value="warning">Warning (expires in 3-7 days)</option>
            <option value="normal">Normal (expires in more than 7 days)</option>
          </select>
        </div>

        {(selectedHousehold !== 'all' || selectedFilterType !== 'all') && (
          <button onClick={clearFilters} className="clear-filters-button">Clear Filters</button>
        )}
      </div>

      <div className="results-count">
        Showing {sortedProducts.length} product{sortedProducts.length !== 1 ? 's' : ''}
        {selectedHousehold !== 'all' && ` from ${selectedHousehold}`}
        {selectedFilterType !== 'all' && ` (${selectedFilterType})`}
      </div>

      {sortedProducts.length === 0 ? (
        <div className="no-results">
          <p>No products match the selected filters.</p>
          <button onClick={clearFilters} className="clear-filters-link">Clear filters to see all products</button>
        </div>
      ) : (
        <div className="products-grid">
          {sortedProducts.map(product => {
            const days = getDaysUntilExpiry(product.expiryDate);
            const priority = getPriorityLevel(days ?? null);
            return (
              <div key={product.id} className={`product-card priority-${priority}`}>
                <div className="checkbox-container">
                  <input
                    type="checkbox"
                    id={`product-${product.id}`}
                    checked={selectedProducts.includes(product.id)}
                    onChange={() => handleCheckboxChange(product.id)}
                    className="product-checkbox"
                  />
                  <label htmlFor={`product-${product.id}`} className="checkbox-label">Select</label>
                </div>

                <div className="product-info">
                  <h3 className="product-name">{product.name}</h3>
                  {product.expiryDate && days !== null ? (
                    <p className="product-detail">
                      Expires: {new Date(product.expiryDate).toLocaleDateString()}
                      {' '}<span className="days-left">
                        {days < 0
                          ? `(Expired ${Math.abs(days)} days ago)`
                          : `(Expires in ${days} days)`}
                      </span>
                    </p>
                  ) : (
                    <p className="product-detail">No expiration date</p>
                  )}
                  <p className="product-detail">Quantity: {product.quantity}</p>
                  <p className="product-detail">From household: {product.householdName}</p>
                  {priority === 'expired' && <div className="expired-badge">Expired</div>}
                  {priority === 'critical' && days !== null && (
                    <div className="danger-badge critical">Use within {days} days</div>
                  )}
                  {priority === 'warning' && days !== null && (
                    <div className="danger-badge warning">Use soon (expires in {days} days)</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedProducts.length > 0 && (
        <div className="find-recipes-container">
          <button onClick={handleFindRecipes} className="find-recipes-button">
            Find Recipes ({selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected)
          </button>
        </div>
      )}
    </div>
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
    const { data } = await supabase.from('household').select('id, house_name');
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
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>+ Add Product</button>
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
        <ProductsInDanger products={products} />
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
