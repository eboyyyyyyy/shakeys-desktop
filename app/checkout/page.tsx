'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useCustomer } from '@/context/CustomerContext';
import { useBranch } from '@/context/BranchContext';
import Header from '@/components/Header';
import { fetchActiveBranches, type CompatBranch } from '@/lib/firebase/catalogService';
import { placeCustomerOrder, type OrderItem } from '@/lib/firebase/orderService';
import '@/styles/checkout.css';

type OrderType = 'Delivery' | 'Takeout' | 'Dine-in';
type PaymentMethod = 'Cash' | 'Credit Card' | 'GCash' | 'Maya';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotal, clearCart } = useCart();
  const { customer, isLoggedIn } = useCustomer();
  const { selectedBranch: contextBranch } = useBranch();

  const [branches, setBranches] = useState<CompatBranch[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('Delivery');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  const subtotal = getTotal();
  const deliveryFee = orderType === 'Delivery' ? 50 : 0;
  const total = subtotal + deliveryFee;

  useEffect(() => {
    async function loadBranches() {
      try {
        let data = await fetchActiveBranches();
        if (data.length === 0) {
          const res = await fetch('/api/branches?active=true');
          const fallback = await res.json();
          data = Array.isArray(fallback) ? fallback : [];
        }
        setBranches(data);

        if (contextBranch) {
          setSelectedBranchId(String(contextBranch.Brnch_ID));
        } else if (data.length > 0) {
          setSelectedBranchId(String(data[0].Brnch_ID));
        }
      } catch (error) {
        console.error('Error fetching branches:', error);
      }
    }

    void loadBranches();
  }, [contextBranch]);

  useEffect(() => {
    const savedAddress = customer?.address?.trim() || customer?.Cust_Address?.trim() || '';
    if (savedAddress) {
      setDeliveryAddress(savedAddress);
    }
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoggedIn || !customer) {
      router.push('/login?redirect=/checkout');
      return;
    }

    if (items.length === 0) {
      return;
    }

    const branch = branches.find((entry) => String(entry.Brnch_ID) === selectedBranchId);
    if (!branch) {
      alert('Please select a branch before placing your order.');
      return;
    }

    setLoading(true);

    try {
      const orderItems: OrderItem[] = items.map(({ menuItem, quantity }) => ({
        menuItemId: String(menuItem.Menu_ID),
        name: menuItem.Menu_Name,
        category: menuItem.Menu_Category,
        quantity,
        unitPrice: menuItem.Menu_Price,
        subtotal: menuItem.Menu_Price * quantity,
      }));

      const orderId = await placeCustomerOrder({
        customer,
        branch,
        orderType,
        items: orderItems,
        paymentMethod,
        paymentAmount: total,
        deliveryAddress: orderType === 'Delivery' ? deliveryAddress : null,
        deliveryFee,
      });

      setOrderSuccess(orderId);
      clearCart();
    } catch (error) {
      console.error('Error submitting order:', error);
      alert(error instanceof Error ? error.message : 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="checkout-page">
        <Header />
        <div className="min-h-[80vh] flex items-center justify-center px-4">
          <div className="checkout-success">
            <div className="checkout-success-icon">OK</div>
            <h1 className="checkout-success-title">Order Placed Successfully!</h1>
            <p className="checkout-success-text">Thank you for your order.</p>
            <p className="checkout-success-order-id">Order #{orderSuccess}</p>
            <Link href={`/track?id=${orderSuccess}`} className="checkout-success-btn">
              Track Order
            </Link>
            <Link href="/menu" className="checkout-success-btn checkout-success-btn-secondary">
              Order Again
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="checkout-page">
        <Header />
        <div className="min-h-[80vh] flex items-center justify-center px-4">
          <div className="checkout-success">
            <div className="checkout-success-icon">Cart</div>
            <h1 className="checkout-success-title">Your cart is empty</h1>
            <p className="checkout-success-text">Add some items before checking out.</p>
            <Link href="/menu" className="checkout-success-btn">
              Browse Menu
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <Header />

      <div className="checkout-header">
        <div className="checkout-header-container">
          <h1 className="checkout-title">Checkout</h1>
          <div className="checkout-steps">
            <div className="checkout-step completed">
              <span className="checkout-step-number">1</span>
              <span>Cart</span>
            </div>
            <div className="checkout-step-divider" />
            <div className="checkout-step active">
              <span className="checkout-step-number">2</span>
              <span>Checkout</span>
            </div>
            <div className="checkout-step-divider" />
            <div className="checkout-step">
              <span className="checkout-step-number">3</span>
              <span>Confirmation</span>
            </div>
          </div>
        </div>
      </div>

      <form className="checkout-container" onSubmit={handleSubmit}>
        <div className="checkout-form">
          {!isLoggedIn && (
            <div className="checkout-section">
              <h2 className="checkout-section-title">Sign In Required</h2>
              <p style={{ marginBottom: '16px', color: '#666' }}>
                Please sign in to complete your order.
              </p>
              <Link
                href="/login?redirect=/checkout"
                className="checkout-submit-btn"
                style={{ display: 'inline-block', textAlign: 'center', textDecoration: 'none' }}
              >
                Sign In to Continue
              </Link>
            </div>
          )}

          <div className="checkout-section">
            <h2 className="checkout-section-title">Order Type</h2>
            <div className="checkout-order-types">
              {(['Delivery', 'Takeout', 'Dine-in'] as OrderType[]).map((type) => (
                <div
                  key={type}
                  className={`checkout-order-type ${orderType === type ? 'selected' : ''}`}
                  onClick={() => setOrderType(type)}
                >
                  <div className="checkout-order-type-icon">
                    {type === 'Delivery' ? 'Delivery' : type === 'Takeout' ? 'Takeout' : 'Dine-in'}
                  </div>
                  <div className="checkout-order-type-label">{type}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="checkout-section">
            <h2 className="checkout-section-title">Branch</h2>
            <select
              className="checkout-select"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
            >
              {branches.map((branch) => (
                <option key={String(branch.Brnch_ID)} value={String(branch.Brnch_ID)}>
                  {branch.Brnch_Name} - {branch.Brnch_City}
                </option>
              ))}
            </select>
          </div>

          {orderType === 'Delivery' && (
            <div className="checkout-section">
              <h2 className="checkout-section-title">Delivery Address</h2>
              <div className="checkout-form-group">
                <label className="checkout-label">
                  Address <span className="checkout-label-required">*</span>
                </label>
                <textarea
                  className="checkout-textarea"
                  placeholder="Enter your complete delivery address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  required={orderType === 'Delivery'}
                />
              </div>
            </div>
          )}

          <div className="checkout-section">
            <h2 className="checkout-section-title">Payment Method</h2>
            <div className="checkout-payment-methods">
              {(['Cash', 'Credit Card', 'GCash', 'Maya'] as PaymentMethod[]).map((method) => (
                <div
                  key={method}
                  className={`checkout-payment-method ${paymentMethod === method ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod(method)}
                >
                  <div className="checkout-payment-radio">
                    <div className="checkout-payment-radio-inner" />
                  </div>
                  <span className="checkout-payment-label">{method}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="checkout-summary">
          <div className="checkout-summary-card">
            <h2 className="checkout-summary-title">Order Summary</h2>

            <div className="checkout-summary-items">
              {items.map(({ menuItem, quantity }) => (
                <div key={menuItem.Menu_ID} className="checkout-summary-item">
                  <div>
                    <div className="checkout-summary-item-name">{menuItem.Menu_Name}</div>
                    <div className="checkout-summary-item-qty">Qty: {quantity}</div>
                  </div>
                  <div className="checkout-summary-item-price">
                    PHP {(menuItem.Menu_Price * quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div className="checkout-summary-divider" />

            <div className="checkout-summary-row">
              <span className="checkout-summary-label">Subtotal</span>
              <span className="checkout-summary-value">PHP {subtotal.toFixed(2)}</span>
            </div>

            {orderType === 'Delivery' && (
              <div className="checkout-summary-row">
                <span className="checkout-summary-label">Delivery Fee</span>
                <span className="checkout-summary-value">PHP {deliveryFee.toFixed(2)}</span>
              </div>
            )}

            <div className="checkout-summary-total">
              <span className="checkout-summary-total-label">Total</span>
              <span className="checkout-summary-total-value">PHP {total.toFixed(2)}</span>
            </div>

            <button
              type="submit"
              className="checkout-submit-btn"
              disabled={loading || !isLoggedIn || !selectedBranchId || (orderType === 'Delivery' && !deliveryAddress)}
            >
              {loading ? 'Placing Order...' : `Place Order - PHP ${total.toFixed(2)}`}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
