import './Dashboard.css';
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';

// Types
interface Product {
  id: string;
  name: string;
  expiryDate: string | null;
  quantity: number;
  householdName: string;
}

interface Household {
  id: string;
  house_name: string;
}

interface Recipe {
  id: string;
  name: string;
  imageUrl?: string;
  description?: string;
  cookingTime?: number;
}

interface FavouriteRecipesProps {
  recipes: Recipe[];
}

// Filter types
type FilterType = 'all' | 'expired' | 'critical' | 'warning' | 'normal';

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

  const handleFindRecipes = () => {
    const selectedProductObjects = products.filter(p => selectedProducts.includes(p.id));
    navigate('/recipe-suggestions', {
      state: { selectedProducts: selectedProductObjects, selectedProductIds: selectedProducts }
    });
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
          <label htmlFor="household-filter">Household:</label>
          <select
            id="household-filter"
            value={selectedHousehold}
            onChange={e => { setSelectedHousehold(e.target.value); setSelectedProducts([]); }}
            className="filter-select"
          >
            {households.map(h => (
              <option key={h} value={h}>{h === 'all' ? 'All Households' : h}</option>
            ))}
          </select>
        </div>

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
  const [scrollPosition, setScrollPosition] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleViewAll = () => {
    navigate('/all-recipes', { state: { favouriteRecipes: recipes } });
  };

  const scrollLeft = () => {
    if (carouselRef.current) {
      const newPosition = scrollPosition - 300;
      carouselRef.current.scrollTo({ left: newPosition, behavior: 'smooth' });
      setScrollPosition(newPosition);
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      const newPosition = scrollPosition + 300;
      carouselRef.current.scrollTo({ left: newPosition, behavior: 'smooth' });
      setScrollPosition(newPosition);
    }
  };

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
        <button onClick={handleViewAll} className="view-all-button">View all →</button>
      </div>

      <div className="carousel-wrapper">
        {recipes.length > 3 && (
          <button onClick={scrollLeft} className="carousel-arrow left-arrow" aria-label="Scroll left">‹</button>
        )}
        <div className="recipes-carousel" ref={carouselRef}>
          {recipes.map(recipe => (
            <div key={recipe.id} className="recipe-card">
              {recipe.imageUrl && (
                <img src={recipe.imageUrl} alt={recipe.name} className="recipe-image" />
              )}
              <div className="recipe-info">
                <h3 className="recipe-name">{recipe.name}</h3>
                {recipe.description && <p className="recipe-description">{recipe.description}</p>}
                {recipe.cookingTime && <p className="recipe-time">{recipe.cookingTime} min</p>}
              </div>
            </div>
          ))}
        </div>
        {recipes.length > 3 && (
          <button onClick={scrollRight} className="carousel-arrow right-arrow" aria-label="Scroll right">›</button>
        )}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------

// Main Dashboard Component
const Dashboard: React.FC = () => {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
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
      const displayName = data.user?.user_metadata?.display_name as string | undefined;
      const email = data.user?.email;
      setDisplayName(displayName ?? email ?? null);
    }).catch(() => {});
    void fetchHouseholds();
    void fetchProducts();
  }, []);

  const fetchHouseholds = async () => {
    const { data } = await supabase.from('household').select('id, house_name');
    setHouseholds(data ?? []);
  };

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('product')
      .select(`
        id,
        name,
        household:household_id(house_name),
        product_specs(quantity, expiration_date)
      `);

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

  const [favouriteRecipes] = useState<Recipe[]>([
    { id: '1', name: 'Spaghetti Bolognese', imageUrl: 'https://via.placeholder.com/300x180?text=Spaghetti+Bolognese', description: 'Classic Italian pasta with meat sauce', cookingTime: 35 },
    { id: '2', name: 'Chicken Curry', imageUrl: 'https://via.placeholder.com/300x180?text=Chicken+Curry', description: 'Creamy and spicy Indian curry', cookingTime: 45 },
    { id: '3', name: 'Grilled Salmon', imageUrl: 'https://via.placeholder.com/300x180?text=Grilled+Salmon', description: 'Healthy grilled salmon with lemon', cookingTime: 20 },
    { id: '4', name: 'Vegetable Stir Fry', imageUrl: 'https://via.placeholder.com/300x180?text=Vegetable+Stir+Fry', description: 'Quick and healthy vegetable stir fry', cookingTime: 15 },
    { id: '5', name: 'Margherita Pizza', imageUrl: 'https://via.placeholder.com/300x180?text=Pizza', description: 'Classic Italian pizza with fresh basil', cookingTime: 25 },
  ]);

  return (
    <div className="page dashboard">
      <div className="section-header">
        <h1>Hello {displayName ?? 'there'}, welcome back</h1>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>+ Add Product</button>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button className="error-dismiss" onClick={() => setError(null)}>×</button>
        </div>
      )}

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
