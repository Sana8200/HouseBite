import './Dashboard.css';
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';

// Types
interface Product {
  id: string;
  name: string;
  expiryDate: string;
  quantity: number;
  householdName: string;
  imageUrl?: string;
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

  // Helper function to calculate days until expiry
  const getDaysUntilExpiry = (expiryDate: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // Get priority level based on days until expiry
  const getPriorityLevel = (daysUntilExpiry: number): 'expired' | 'critical' | 'warning' | 'normal' => {
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry < 3) return 'critical';
    if (daysUntilExpiry < 7) return 'warning';
    return 'normal';
  };

  // Get unique households for filter dropdown
  const households = ['all', ...new Set(products.map(p => p.householdName))];

  // Apply filters
  const filteredProducts = products.filter(product => {
    const daysUntilExpiry = getDaysUntilExpiry(product.expiryDate);
    const priority = getPriorityLevel(daysUntilExpiry);
    
    // Filter by household
    if (selectedHousehold !== 'all' && product.householdName !== selectedHousehold) {
      return false;
    }
    
    // Filter by expiry status
    if (selectedFilterType !== 'all' && priority !== selectedFilterType) {
      return false;
    }
    
    return true;
  });

  // Sort filtered products by priority
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const daysA = getDaysUntilExpiry(a.expiryDate);
    const daysB = getDaysUntilExpiry(b.expiryDate);
    return daysA - daysB;
  });

  const handleCheckboxChange = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleFindRecipes = () => {
    const selectedProductObjects = products.filter(p => 
      selectedProducts.includes(p.id)
    );
    
    navigate('/recipe-suggestions', {
      state: { 
        selectedProducts: selectedProductObjects,
        selectedProductIds: selectedProducts
      }
    });
  };

  const handleHouseholdChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedHousehold(event.target.value);
    setSelectedProducts([]); // Clear selections when filter changes
  };

  const handleFilterTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFilterType(event.target.value as FilterType);
    setSelectedProducts([]); // Clear selections when filter changes
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
      
      {/* Filter Section */}
      <div className="filter-section">
        <div className="filter-group">
          <label htmlFor="household-filter">Household:</label>
          <select 
            id="household-filter"
            value={selectedHousehold} 
            onChange={handleHouseholdChange}
            className="filter-select"
          >
            {households.map(household => (
              <option key={household} value={household}>
                {household === 'all' ? 'All Households' : household}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="status-filter">Status:</label>
          <select 
            id="status-filter"
            value={selectedFilterType} 
            onChange={handleFilterTypeChange}
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
          <button onClick={clearFilters} className="clear-filters-button">
            Clear Filters
          </button>
        )}
      </div>

      {/* Results count */}
      <div className="results-count">
        Showing {sortedProducts.length} product{sortedProducts.length !== 1 ? 's' : ''}
        {selectedHousehold !== 'all' && ` from ${selectedHousehold}`}
        {selectedFilterType !== 'all' && ` (${selectedFilterType})`}
      </div>
      
      {/* Products Grid */}
      {sortedProducts.length === 0 ? (
        <div className="no-results">
          <p>No products match the selected filters.</p>
          <button onClick={clearFilters} className="clear-filters-link">
            Clear filters to see all products
          </button>
        </div>
      ) : (
        <div className="products-grid">
          {sortedProducts.map((product) => {
            const daysUntilExpiry = getDaysUntilExpiry(product.expiryDate);
            const priority = getPriorityLevel(daysUntilExpiry);
            
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
                  <label htmlFor={`product-${product.id}`} className="checkbox-label">
                    Select
                  </label>
                </div>
                
                {product.imageUrl && (
                  <img 
                    src={product.imageUrl} 
                    alt={product.name}
                    className="product-image"
                  />
                )}
                
                <div className="product-info">
                  <h3 className="product-name">{product.name}</h3>
                  <p className="product-detail">
                    Expires: {new Date(product.expiryDate).toLocaleDateString()}
                    {' '}<span className="days-left">
                      {daysUntilExpiry < 0 
                        ? `(Expired ${Math.abs(daysUntilExpiry)} days ago)` 
                        : `(Expires in ${daysUntilExpiry} days)`}
                    </span>
                  </p>
                  <p className="product-detail">
                    Quantity: {product.quantity}
                  </p>
                  <p className="product-detail">
                    From household: {product.householdName}
                  </p>
                  {priority === 'expired' && (
                    <div className="expired-badge">
                      Expired
                    </div>
                  )}
                  {priority === 'critical' && (
                    <div className="danger-badge critical">
                      Use within {daysUntilExpiry} days
                    </div>
                  )}
                  {priority === 'warning' && (
                    <div className="danger-badge warning">
                      Use soon (expires in {daysUntilExpiry} days)
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedProducts.length > 0 && (
        <div className="find-recipes-container">
          <button 
            onClick={handleFindRecipes}
            className="find-recipes-button"
          >
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
    navigate('/all-recipes', {
      state: { favouriteRecipes: recipes }
    });
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
        <button onClick={handleViewAll} className="view-all-button">
          View all →
        </button>
      </div>
      
      <div className="carousel-wrapper">
        {recipes.length > 3 && (
          <button onClick={scrollLeft} className="carousel-arrow left-arrow" aria-label="Scroll left">
            ‹
          </button>
        )}
        
        <div className="recipes-carousel" ref={carouselRef}>
          {recipes.map((recipe) => (
            <div key={recipe.id} className="recipe-card">
              
              {recipe.imageUrl && (
                <img 
                  src={recipe.imageUrl} 
                  alt={recipe.name}
                  className="recipe-image"
                />
              )}
              
              <div className="recipe-info">
                <h3 className="recipe-name">{recipe.name}</h3>
                {recipe.description && (
                  <p className="recipe-description">{recipe.description}</p>
                )}
                {recipe.cookingTime && (
                  <p className="recipe-time">{recipe.cookingTime} min</p>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {recipes.length > 3 && (
          <button onClick={scrollRight} className="carousel-arrow right-arrow" aria-label="Scroll right">
            ›
          </button>
        )}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------

// Main Dashboard Component
const Dashboard: React.FC = () => {
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
    })
  }, [])

  // Example product data replace with actual data source
  const [productsInDanger] = useState<Product[]>([
    {
      id: '1',
      name: 'Fresh Milk',
      expiryDate: '2026-04-14',
      quantity: 2,
      householdName: 'Household A',
      imageUrl: 'https://via.placeholder.com/300x180?text=Milk'
    },
    {
      id: '2',
      name: 'Tomatoes',
      expiryDate: '2026-03-18',
      quantity: 5,
      householdName: 'Household B',
      imageUrl: 'https://via.placeholder.com/300x180?text=Tomatoes'
    },
    {
      id: '3',
      name: 'Chicken Breast',
      expiryDate: '2026-04-18',
      quantity: 1,
      householdName: 'Household C',
      imageUrl: 'https://via.placeholder.com/300x180?text=Chicken'
    },
    {
      id: '4',
      name: 'Spinach',
      expiryDate: '2026-04-23',
      quantity: 1,
      householdName: 'Household A',
      imageUrl: 'https://via.placeholder.com/300x180?text=Spinach'
    },
    {
      id: '5',
      name: 'Yogurt',
      expiryDate: '2026-04-21',
      quantity: 3,
      householdName: 'Household B',
      imageUrl: 'https://via.placeholder.com/300x180?text=Yogurt'
    }
  ]);

  const [favouriteRecipes] = useState<Recipe[]>([
    {
      id: '1',
      name: 'Spaghetti Bolognese',
      imageUrl: 'https://via.placeholder.com/300x180?text=Spaghetti+Bolognese',
      description: 'Classic Italian pasta with meat sauce',
      cookingTime: 35
    },
    {
      id: '2',
      name: 'Chicken Curry',
      imageUrl: 'https://via.placeholder.com/300x180?text=Chicken+Curry',
      description: 'Creamy and spicy Indian curry',
      cookingTime: 45
    },  
    {
      id: '3',
      name: 'Grilled Salmon',
      imageUrl: 'https://via.placeholder.com/300x180?text=Grilled+Salmon',
      description: 'Healthy grilled salmon with lemon',
      cookingTime: 20
    },
    {
      id: '4',
      name: 'Vegetable Stir Fry',
      imageUrl: 'https://via.placeholder.com/300x180?text=Vegetable+Stir+Fry',
      description: 'Quick and healthy vegetable stir fry',
      cookingTime: 15
    },
    {
      id: '5',
      name: 'Margherita Pizza',
      imageUrl: 'https://via.placeholder.com/300x180?text=Pizza',
      description: 'Classic Italian pizza with fresh basil',
      cookingTime: 25
    }
  ]);

  return (
    <div className="page dashboard">
      <h1>Hello {email ?? 'there'}, welcome back</h1>
      
      <ProductsInDanger products={productsInDanger} />
      <FavouriteRecipes recipes={favouriteRecipes} />
    </div>
  );
};

export default Dashboard;