import './Dashboard.css';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Types
interface Product {
  id: string;
  name: string;
  expiryDate: string;
  quantity: number;
  householdName: string;
  imageUrl?: string;
}

// Helper function to calculate days until expiry
const getDaysUntilExpiry = (expiryDate: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};


// ----------------------------------------------------------------------------


// Products in Danger Component (embedded in Dashboard)
const ProductsInDanger: React.FC<{ products: Product[] }> = ({ products }) => {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
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

  // Sort products by priority (expired first, then critical, then warning, then normal)
  const sortedProducts = [...products].sort((a, b) => {
    const daysA = getDaysUntilExpiry(a.expiryDate);
    const daysB = getDaysUntilExpiry(b.expiryDate);
    
    // Priority order: expired (negative) < critical (0-2) < warning (3-6) < normal (7+)
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

  if (!products.length) {
    return (
      <div className="products-in-danger-empty">
        <p>No products in danger of expiring</p>
      </div>
    );
  }

  return (
    <div className="products-in-danger-container">
      <h2 className="section-title">⚠️ Products in Danger</h2>
      
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
                  📅 Expires: {new Date(product.expiryDate).toLocaleDateString()}
                  {' '}<span className="days-left">
                    {daysUntilExpiry < 0 
                      ? `(Expired ${Math.abs(daysUntilExpiry)} days ago)` 
                      : `(Expires in ${daysUntilExpiry} days)`}
                  </span>
                </p>
                <p className="product-detail">
                  📦 Quantity: {product.quantity}
                </p>
                <p className="product-detail">
                  🏠 From household: {product.householdName}
                </p>
                {priority === 'expired' && (
                  <div className="expired-badge">
                    Expired!
                  </div>
                )}
                {priority === 'critical' && (
                  <div className="danger-badge critical">
                    Use within {daysUntilExpiry} days!
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

      {selectedProducts.length > 0 && (
        <div className="find-recipes-container">
          <button 
            onClick={handleFindRecipes}
            className="find-recipes-button"
          >
            🍳 Find Recipes ({selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected)
          </button>
        </div>
      )}
    </div>
  );
};


// ----------------------------------------------------------------------------

// Main Dashboard Component
const Dashboard: React.FC = () => {
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

  return (
    <div className="dashboard-container">
      <h1>Hello [user_name], welcome back!</h1>
      
      {/* Only Products in Danger section for now */}
      <ProductsInDanger products={productsInDanger} />
    </div>
  );
};

export default Dashboard;