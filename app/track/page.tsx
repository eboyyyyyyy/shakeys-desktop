'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { subscribeToOrder, type Order } from '@/lib/firebase/orderService';
import '@/styles/tracking.css';

const deliverySteps = [
  { key: 'Pending', label: 'Order Placed', icon: '1' },
  { key: 'Order_Accepted', label: 'Order Accepted', icon: '2' },
  { key: 'Preparing', label: 'Preparing', icon: '3' },
  { key: 'Ready_For_Delivery', label: 'Ready for Pickup', icon: '4' },
  { key: 'In_Transit', label: 'On the Way', icon: '5' },
  { key: 'Completed', label: 'Delivered', icon: '6' },
];

const nonDeliverySteps = [
  { key: 'Pending', label: 'Order Placed', icon: '1' },
  { key: 'Order_Accepted', label: 'Accepted', icon: '2' },
  { key: 'Preparing', label: 'Preparing', icon: '3' },
  { key: 'Completed', label: 'Completed', icon: '4' },
];

const STATUS_LABELS: Record<string, string> = {
  Pending: 'Order Placed',
  Order_Accepted: 'Order Accepted',
  Preparing: 'Preparing',
  Ready_For_Delivery: 'Ready for Delivery',
  In_Transit: 'Out for Delivery',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
};

function TrackingContent() {
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get('id') || '');
  const [activeOrderId, setActiveOrderId] = useState(searchParams.get('id') || '');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setOrderId(id);
      setActiveOrderId(id);
    }
  }, [searchParams]);

  useEffect(() => {
    const trimmed = activeOrderId.trim();
    if (!trimmed) {
      return;
    }

    setSearched(true);
    setLoading(true);

    const unsub = subscribeToOrder(trimmed, (nextOrder) => {
      setOrder(nextOrder);
      setLoading(false);
    });

    return () => unsub();
  }, [activeOrderId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = orderId.trim();
    if (!trimmed) {
      return;
    }
    setActiveOrderId(trimmed);
  };

  const statusOrder = [
    'Pending',
    'Order_Accepted',
    'Preparing',
    'Ready_For_Delivery',
    'In_Transit',
    'Completed',
  ];

  const getStepStatus = (stepKey: string) => {
    if (!order) {
      return 'pending';
    }
    const currentIndex = statusOrder.indexOf(order.status);
    const stepIndex = statusOrder.indexOf(stepKey);
    const isFinalStatus = currentIndex === statusOrder.length - 1;
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return isFinalStatus ? 'completed' : 'current';
    return 'pending';
  };

  const displaySteps = order?.orderType === 'Delivery' ? deliverySteps : nonDeliverySteps;
  const riderVisible = order ? ['In_Transit', 'Completed'].includes(order.status) : false;
  const statusLabel = order ? STATUS_LABELS[order.status] || order.status : '';
  const visibleOrderId = order?.orderId || activeOrderId.trim();

  return (
    <>
      <div className="tracking-search">
        <h2 className="tracking-search-title">Track Your Order</h2>
        <form className="tracking-search-form" onSubmit={handleSearch}>
          <input
            type="text"
            className="tracking-search-input"
            placeholder="Enter your Firestore order ID"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
          />
          <button type="submit" className="tracking-search-btn" disabled={loading}>
            {loading ? 'Searching...' : 'Track'}
          </button>
        </form>
        {visibleOrderId && (
          <div
            style={{
              marginTop: '16px',
              padding: '14px 16px',
              borderRadius: '14px',
              background: '#fff5f5',
              border: '1px solid #fecaca',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Current Order ID
            </span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#7f1d1d', wordBreak: 'break-all' }}>
              {visibleOrderId}
            </span>
          </div>
        )}
      </div>

      {loading && (
        <div className="menu-loading">
          <div className="menu-loading-spinner" />
          <p className="menu-loading-text">Loading order details...</p>
        </div>
      )}

      {!loading && searched && !order && (
        <div className="tracking-not-found">
          <div className="tracking-not-found-icon">Search</div>
          <h2 className="tracking-not-found-title">Order Not Found</h2>
          <p className="tracking-not-found-text">
            We could not find an order with that ID. Please check and try again.
          </p>
        </div>
      )}

      {!loading && order && (
        <div className="tracking-order">
          <div className="tracking-order-header">
            <div className="tracking-order-id">Order #{order.orderId}</div>
            <div className="tracking-order-status">
              {statusLabel}
              <span className="tracking-order-status-badge">{order.orderType}</span>
            </div>
          </div>

          {order.status === 'Cancelled' ? (
            <div className="tracking-timeline">
              <h3 className="tracking-timeline-title">Order Status</h3>
              <div className="flex items-center gap-3 px-4 py-6 bg-red-50 rounded-xl border border-red-100">
                <span className="text-2xl">X</span>
                <div>
                  <div className="font-bold text-red-700 text-base">Order Cancelled</div>
                  <div className="text-sm text-red-500 mt-0.5">
                    This order has been cancelled. Please contact the branch for assistance.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="tracking-timeline">
              <h3 className="tracking-timeline-title">Order Progress</h3>
              <div className="tracking-timeline-steps">
                {displaySteps.map((step) => {
                  const status = getStepStatus(step.key);
                  return (
                    <div key={step.key} className={`tracking-timeline-step ${status}`}>
                      <div className="tracking-timeline-dot">
                        {status === 'completed' ? 'OK' : step.icon}
                      </div>
                      <div className="tracking-timeline-content">
                        <div className="tracking-timeline-label">{step.label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="tracking-details">
            <div className="tracking-details-grid">
              <div className="tracking-details-section">
                <h4 className="tracking-details-title">Customer</h4>
                <p className="tracking-details-text">
                  {order.customerName}
                  <br />
                  {order.customerPhone}
                </p>
              </div>

              <div className="tracking-details-section">
                <h4 className="tracking-details-title">Branch</h4>
                <p className="tracking-details-text">
                  {order.branchName}
                  <br />
                  {order.branchAddress}
                </p>
              </div>

              {order.delivery && (
                <div className="tracking-details-section">
                  <h4 className="tracking-details-title">Delivery Address</h4>
                  <p className="tracking-details-text">{order.delivery.address}</p>
                </div>
              )}

              {order.delivery && riderVisible && order.delivery.riderName && (
                <div className="tracking-details-section">
                  <h4 className="tracking-details-title">Rider</h4>
                  <div className="tracking-details-rider">
                    <div className="tracking-details-rider-avatar">
                      {order.delivery.riderName.charAt(0)}
                    </div>
                    <div>
                      <div className="tracking-details-rider-name">{order.delivery.riderName}</div>
                      <div className="tracking-details-rider-phone">{order.delivery.riderPhone}</div>
                    </div>
                  </div>
                </div>
              )}

              {order.payment && (
                <div className="tracking-details-section">
                  <h4 className="tracking-details-title">Payment</h4>
                  <p className="tracking-details-text">
                    {order.payment.method}
                    <br />
                    Status: {order.payment.status}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="tracking-items">
            <h3 className="tracking-items-title">Order Items</h3>
            {order.items.map((item) => (
              <div key={`${item.menuItemId}-${item.name}`} className="tracking-item">
                <div>
                  <div className="tracking-item-name">{item.name}</div>
                  <div className="tracking-item-qty">Qty: {item.quantity}</div>
                </div>
                <div className="tracking-item-price">PHP {item.subtotal.toFixed(2)}</div>
              </div>
            ))}

            {order.delivery && (
              <div className="tracking-item">
                <div>
                  <div className="tracking-item-name">Delivery Fee</div>
                </div>
                <div className="tracking-item-price">PHP {order.delivery.fee.toFixed(2)}</div>
              </div>
            )}

            <div className="tracking-total">
              <span className="tracking-total-label">Total</span>
              <span className="tracking-total-value">PHP {order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function TrackingPage() {
  return (
    <div className="tracking-page">
      <Header />

      <div className="tracking-header">
        <div className="tracking-header-container">
          <h1 className="tracking-title">Order Tracking</h1>
          <p className="tracking-subtitle">Enter your order ID to track your delivery</p>
        </div>
      </div>

      <div className="tracking-container">
        <Suspense fallback={<div className="menu-loading"><div className="menu-loading-spinner" /></div>}>
          <TrackingContent />
        </Suspense>
      </div>
    </div>
  );
}
