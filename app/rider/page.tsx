'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRider } from '@/context/RiderContext';
import {
  subscribeToRiderStaffOrders,
  updateStaffOrderStatus,
  type StaffOrderSummary,
} from '@/lib/firebase/staffOrderService';
import '@/styles/header.css';

type ModalType = 'pickup' | 'complete';

interface ConfirmModal {
  orderId: string;
  type: ModalType;
}

function formatOrderTime(date: string, time: string): string {
  if (!date || !time) return '';
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const orderDate = new Date(year, month - 1, day, hour, minute);
  if (Number.isNaN(orderDate.getTime())) return '';
  const diffMs = Date.now() - orderDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} mins ago`;
  if (diffMins < 1440) {
    const hrs = Math.floor(diffMins / 60);
    return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  }
  return orderDate.toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatOrderLabel(orderId: string): string {
  return `ORD-${orderId.slice(0, 8).toUpperCase()}`;
}

export default function RiderPage() {
  const [orders, setOrders] = useState<StaffOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmModal | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { rider, logout, loading: authLoading } = useRider();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && rider === null) router.push('/login');
  }, [rider, authLoading, router]);

  useEffect(() => {
    if (!rider?.uid) {
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToRiderStaffOrders(rider.uid, (nextOrders) => {
      setOrders(nextOrders);
      setLoading(false);
    });

    return unsubscribe;
  }, [rider?.uid, refreshKey]);

  const handleLogout = () => { logout(); router.push('/login'); };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleConfirm = async () => {
    if (!confirmModal) return;
    const { orderId, type } = confirmModal;
    setConfirmModal(null);
    setUpdatingId(orderId);

    try {
      const newStatus = type === 'pickup' ? 'In_Transit' : 'Completed';
      await updateStaffOrderStatus(orderId, newStatus);

      if (type === 'pickup') {
        showToast(`${formatOrderLabel(orderId)} pickup confirmed.`, 'success');
      } else {
        showToast(`${formatOrderLabel(orderId)} delivered and completed.`, 'success');
      }
    } catch (error) {
      console.error('Error updating delivery:', error);
      showToast('Failed to update delivery. Check Firebase rules and try again.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const assignedDeliveries = orders.filter(
    (order) => order.Order_Type === 'Delivery' && order.Order_Status === 'Ready_For_Delivery'
  );

  const currentDeliveries = orders.filter(
    (order) => order.Order_Type === 'Delivery' && order.Order_Status === 'In_Transit'
  );

  const completedOrders = orders.filter(
    (order) => order.Order_Type === 'Delivery' && order.Order_Status === 'Completed'
  );

  const todayEarnings = completedOrders.reduce((sum, order) => {
    return sum + Number(order.delivery?.Del_Fee || 0);
  }, 0);

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center gap-4 p-6 pb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0
                ${confirmModal.type === 'pickup' ? 'bg-green-100' : 'bg-blue-100'}`}>
                <span className="text-2xl">{confirmModal.type === 'pickup' ? 'GO' : 'OK'}</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {confirmModal.type === 'pickup' ? 'Confirm Pickup' : 'Confirm Delivery'}
                </h3>
                <p className="text-sm text-gray-500">{formatOrderLabel(confirmModal.orderId)}</p>
              </div>
              <button
                onClick={() => setConfirmModal(null)}
                className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="px-6 pb-5 text-sm text-gray-600">
              {confirmModal.type === 'pickup'
                ? "Confirm that you've picked up this order from the branch and are heading to the customer."
                : 'Confirm that this order has been delivered to the customer. The order will be marked as completed.'}
            </p>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                Go Back
              </button>
              <button
                onClick={handleConfirm}
                className={`flex-1 flex items-center justify-center gap-2 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm
                  ${confirmModal.type === 'pickup' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {confirmModal.type === 'pickup' ? 'Yes, Picked Up' : 'Yes, Delivered'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="header">
        <div className="header-container" style={{ justifyContent: 'space-evenly' }}>
          <div className="header-logo" style={{ pointerEvents: 'none' }}>
            <span className="header-logo-text">{"Shakey's"}</span>
            <span className="header-logo-tagline">Delivery</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-white border-b-2 border-yellow-400 pb-0.5 tracking-wide">
              Rider Dashboard
            </span>
            <div className="h-4 w-px bg-white/30" />
            <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs font-semibold text-white">
              <span className={`w-2 h-2 rounded-full ${assignedDeliveries.length > 0 || currentDeliveries.length > 0 ? 'bg-green-300' : 'bg-gray-300'}`} />
              {currentDeliveries.length}/2 Active
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs font-semibold text-white">
              <span className="w-2 h-2 rounded-full bg-yellow-300" />
              Today: PHP {todayEarnings.toFixed(2)}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setRefreshKey((value) => value + 1)}
              disabled={loading}
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <div className="header-user-info">
              <button
                onClick={() => router.push('/rider/profile')}
                className="header-user-name"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit', color: 'inherit' }}
              >
                {rider?.Rider_FName} {rider?.Rider_LName}
              </button>
              <button onClick={handleLogout} className="header-logout-btn">Logout</button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Loading your deliveries...</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 items-start">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-orange-400">
                <div className="flex items-center gap-2">
                  <span className="text-xl">1</span>
                  <div>
                    <h2 className="font-bold text-gray-800 text-lg leading-tight">Assigned Deliveries</h2>
                    <p className="text-xs text-gray-400">Ready for pickup at branch</p>
                  </div>
                </div>
                <span className="text-sm font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                  {assignedDeliveries.length}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {assignedDeliveries.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center py-14">
                    <span className="text-gray-400 text-sm">No assigned deliveries</span>
                  </div>
                ) : assignedDeliveries.map((order) => (
                  <div key={order.Order_ID} className="bg-white rounded-2xl border-2 border-orange-200 shadow-sm p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900">{formatOrderLabel(order.Order_ID)}</span>
                      <span className="text-xs font-bold bg-orange-500 text-white px-2.5 py-1 rounded-full">ASSIGNED</span>
                    </div>
                    <div className="text-sm text-gray-600 font-medium">
                      {order.Cust_FirstName} {order.Cust_LastName}
                    </div>
                    <div className="flex flex-col gap-2 text-sm">
                      <div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pickup from</div>
                        <div className="text-gray-700">{order.Brnch_Name}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Deliver to</div>
                        <div className="text-gray-700">{order.delivery?.Del_Address || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                      <span className="font-bold text-gray-900">PHP {Number(order.Order_Total).toFixed(2)}</span>
                      <span className="text-xs text-green-700 font-semibold">
                        +PHP {Number(order.delivery?.Del_Fee || 0).toFixed(2)} fee
                      </span>
                    </div>
                    <button
                      onClick={() => setConfirmModal({ orderId: order.Order_ID, type: 'pickup' })}
                      disabled={updatingId === order.Order_ID || currentDeliveries.length >= 2}
                      className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
                    >
                      {updatingId === order.Order_ID ? 'Confirming...' : 'Confirm Pickup'}
                    </button>
                    {currentDeliveries.length >= 2 && (
                      <p className="text-xs text-center text-red-500">Complete a delivery first</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-blue-500">
                <div className="flex items-center gap-2">
                  <span className="text-xl">2</span>
                  <div>
                    <h2 className="font-bold text-gray-800 text-lg leading-tight">Current Deliveries</h2>
                    <p className="text-xs text-gray-400">Max 2 active orders</p>
                  </div>
                </div>
                <span className="text-sm font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {currentDeliveries.length}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {currentDeliveries.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center py-14">
                    <span className="text-gray-400 text-sm">No active deliveries</span>
                  </div>
                ) : currentDeliveries.map((order) => (
                  <div key={order.Order_ID} className="bg-white rounded-2xl border-2 border-blue-200 shadow-sm p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900">{formatOrderLabel(order.Order_ID)}</span>
                      <span className="text-xs font-bold bg-blue-600 text-white px-2.5 py-1 rounded-full">ON THE WAY</span>
                    </div>
                    <div className="text-sm text-gray-600 font-medium">
                      {order.Cust_FirstName} {order.Cust_LastName}
                    </div>
                    <div className="flex flex-col gap-2 text-sm">
                      <div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pickup</div>
                        <div className="text-gray-700">{order.Brnch_Name}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Drop-off</div>
                        <div className="text-gray-700">{order.delivery?.Del_Address || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                      <span className="font-bold text-gray-900">PHP {Number(order.Order_Total).toFixed(2)}</span>
                      <span className="text-xs text-green-700 font-semibold">
                        +PHP {Number(order.delivery?.Del_Fee || 0).toFixed(2)} fee
                      </span>
                    </div>
                    <button
                      onClick={() => setConfirmModal({ orderId: order.Order_ID, type: 'complete' })}
                      disabled={updatingId === order.Order_ID}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
                    >
                      {updatingId === order.Order_ID ? 'Updating...' : 'Mark as Delivered'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-gray-400">
                <div className="flex items-center gap-2">
                  <span className="text-xl">3</span>
                  <div>
                    <h2 className="font-bold text-gray-800 text-lg leading-tight">Completed Deliveries</h2>
                    <p className="text-xs text-gray-400">Delivery history</p>
                  </div>
                </div>
                <span className="text-sm font-bold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {completedOrders.length}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {completedOrders.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center py-14">
                    <span className="text-gray-400 text-sm">No completed deliveries yet</span>
                  </div>
                ) : (
                  <>
                    {completedOrders.map((order) => (
                      <div key={order.Order_ID} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900">{formatOrderLabel(order.Order_ID)}</span>
                          <span className="text-xs text-gray-400">{formatOrderTime(order.Order_Date, order.Order_Time)}</span>
                        </div>
                        <div className="text-sm text-gray-600">{order.Cust_FirstName} {order.Cust_LastName}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <span>{order.Brnch_Name}</span>
                          <span>to</span>
                          <span>{order.delivery?.Del_Address || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Earned</span>
                          <span className="font-bold text-gray-900">
                            PHP {Number(order.delivery?.Del_Fee || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="bg-gray-900 rounded-2xl p-4 mt-1">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Daily Summary</div>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-extrabold text-white">PHP {todayEarnings.toFixed(2)}</span>
                        <span className="text-sm text-gray-400">
                          {completedOrders.length} {completedOrders.length === 1 ? 'Delivery' : 'Deliveries'}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-white text-sm font-semibold shadow-xl
          ${toast.type === 'success' ? 'bg-green-700' : 'bg-red-700'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

