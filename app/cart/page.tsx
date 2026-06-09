'use client';

import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import Header from '@/components/Header';
import '@/styles/cart.css';

const categoryIcons: Record<string, string> = {
  'Pizza': '🍕',
  'Chicken': '🍗',
  'Pasta': '🍝',
  'Sides': '🍟',
  'Drinks': '🥤',
  'Desserts': '🍨',
};

export default function CartPage() {
  const { items, updateQuantity, removeItem, getTotal } = useCart();
  const subtotal = getTotal();
  const deliveryFee = 50.00;
  const total = subtotal + (items.length > 0 ? deliveryFee : 0);

  if (items.length === 0) {
    return (
      <div className="cart-page">
        <Header />
        <div className="min-h-[80vh] flex items-center justify-center px-4">
          <div className="cart-empty">
            <div className="cart-empty-icon">🛒</div>
            <h2 className="cart-empty-title">Your cart is empty</h2>
            <p className="cart-empty-text">
              {"Looks like you haven't added anything yet. Browse our menu to find something delicious!"}
            </p>
            <Link href="/menu" className="cart-empty-btn">
              Browse Menu
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <Header />
      
      <div className="cart-header">
        <div className="cart-header-container">
          <h1 className="cart-title">Your Cart</h1>
          <p className="cart-subtitle">{items.length} item{items.length !== 1 ? 's' : ''} in your cart</p>
        </div>
      </div>

      <div className="cart-container">
        <div className="cart-items">
          {items.map(({ menuItem, quantity }) => (
            <div key={menuItem.Menu_ID} className="cart-item">
              <div className="cart-item-image">
                <span className="cart-item-icon">
                  {categoryIcons[menuItem.Menu_Category] || '🍽️'}
                </span>
              </div>
              
              <div className="cart-item-details">
                <span className="cart-item-category">{menuItem.Menu_Category}</span>
                <h3 className="cart-item-name">{menuItem.Menu_Name}</h3>
                <p className="cart-item-price">₱{menuItem.Menu_Price.toFixed(2)} each</p>
                
                <div className="cart-item-controls">
                  <div className="cart-quantity-control">
                    <button
                      className="cart-quantity-btn"
                      onClick={() => updateQuantity(menuItem.Menu_ID, quantity - 1)}
                    >
                      −
                    </button>
                    <span className="cart-quantity-value">{quantity}</span>
                    <button
                      className="cart-quantity-btn"
                      onClick={() => updateQuantity(menuItem.Menu_ID, quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  
                  <button
                    className="cart-remove-btn"
                    onClick={() => removeItem(menuItem.Menu_ID)}
                  >
                    Remove
                  </button>
                </div>
              </div>
              
              <div className="cart-item-subtotal">
                <div className="cart-subtotal-label">Subtotal</div>
                <div className="cart-subtotal-value">
                  ₱{(menuItem.Menu_Price * quantity).toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="cart-summary">
          <div className="cart-summary-card">
            <h2 className="cart-summary-title">Order Summary</h2>
            
            <div className="cart-summary-row">
              <span className="cart-summary-label">Subtotal</span>
              <span className="cart-summary-value">₱{subtotal.toFixed(2)}</span>
            </div>
            
            <div className="cart-summary-row">
              <span className="cart-summary-label">Delivery Fee</span>
              <span className="cart-summary-value">₱{deliveryFee.toFixed(2)}</span>
            </div>
            
            <div className="cart-summary-divider" />
            
            <div className="cart-summary-total">
              <span className="cart-summary-total-label">Total</span>
              <span className="cart-summary-total-value">₱{total.toFixed(2)}</span>
            </div>
            
            <Link href="/checkout">
              <button className="cart-checkout-btn">
                Proceed to Checkout
              </button>
            </Link>
            
            <Link href="/menu" className="cart-continue-link">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}