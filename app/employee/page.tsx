'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEmployee } from '@/context/EmployeeContext';
import {
  assignRiderToOrder,
  fetchBranchRiders,
  subscribeToBranchStaffOrders,
  updateStaffOrderStatus,
  type StaffOrderSummary,
  type StaffRiderOption,
} from '@/lib/firebase/staffOrderService';
import '@/styles/header.css';

type ActionType = 'accept' | 'prepare' | 'ready' | 'complete' | 'cancel';

interface ConfirmModal {
  orderId: string;
  type: ActionType;
}

interface AssignRiderModal {
  orderId: string;
  riders: StaffRiderOption[];
  selectedRiderId: string | null;
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

function isDeliveryOrder(order: StaffOrderSummary) {
  return order.Order_Type === 'Delivery';
}

function readyActionLabel(order: StaffOrderSummary) {
  return isDeliveryOrder(order) ? 'Mark Ready' : 'Mark Completed';
}

function readyStatusLabel(order: StaffOrderSummary) {
  return isDeliveryOrder(order) ? 'Ready For Delivery' : 'Completed';
}

function OrderCard({
  order,
  onAction,
  onAssignRider,
  updating,
}: {
  order: StaffOrderSummary;
  onAction: (id: string, type: ActionType) => void;
  onAssignRider: (id: string) => void;
  updating: boolean;
}) {
  const timeLabel = formatOrderTime(order.Order_Date, order.Order_Time);
  const isDelivery = isDeliveryOrder(order);
  const hasRider = !!order.delivery?.Del_RiderID;
  const canCancel = ['Pending', 'Order_Accepted', 'Preparing'].includes(order.Order_Status);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900 text-base">{formatOrderLabel(order.Order_ID)}</span>
            <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
              {order.Order_Type}
            </span>
          </div>
          <div className="text-sm text-gray-500 mt-0.5">
            {order.Cust_FirstName} {order.Cust_LastName}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-2 shrink-0">
          {timeLabel && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {timeLabel}
            </div>
          )}
          {canCancel && (
            <button
              onClick={() => onAction(order.Order_ID, 'cancel')}
              disabled={updating}
              className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex flex-col gap-1.5">
        {(order.items || []).map((item) => (
          <div key={item.OItem_ID} className="flex items-start gap-2 text-sm">
            <span className="font-bold text-gray-400 w-5 shrink-0">{item.OItem_Quantity}x</span>
            <span className="text-gray-800">{item.Menu_Name}</span>
          </div>
        ))}
        {order.delivery?.Del_Address && (
          <div className="text-xs text-amber-600 italic mt-1">
            Delivery to: {order.delivery.Del_Address}
          </div>
        )}
      </div>

      {isDelivery && hasRider && order.delivery?.Rider_FName && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
            {order.delivery.Rider_FName.charAt(0)}
          </div>
          <div className="text-xs">
            <div className="font-semibold text-blue-800">
              {order.delivery.Rider_FName} {order.delivery.Rider_LName}
            </div>
            <div className="text-blue-500">{order.delivery.Rider_PhoneNo}</div>
          </div>
          <span className="ml-auto text-xs font-semibold text-blue-600">Assigned</span>
        </div>
      )}

      {isDelivery && order.Order_Status === 'Preparing' && !hasRider && (
        <button
          onClick={() => onAssignRider(order.Order_ID)}
          disabled={updating}
          className="w-full flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          Assign Rider
        </button>
      )}
      {isDelivery && order.Order_Status === 'Preparing' && hasRider && (
        <button
          onClick={() => onAssignRider(order.Order_ID)}
          disabled={updating}
          className="w-full flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-60 text-gray-700 text-xs font-semibold px-4 py-1.5 rounded-xl transition-colors"
        >
          Change Rider
        </button>
      )}

      <div className="flex items-center justify-between mt-1">
        <span className="text-lg font-bold text-gray-900">
          PHP {Number(order.Order_Total).toFixed(2)}
        </span>

        {order.Order_Status === 'Pending' && (
          <button
            onClick={() => onAction(order.Order_ID, 'accept')}
            disabled={updating}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            {updating ? 'Accepting...' : 'Accept Order'}
          </button>
        )}

        {order.Order_Status === 'Order_Accepted' && (
          <button
            onClick={() => onAction(order.Order_ID, 'prepare')}
            disabled={updating}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            {updating ? 'Starting...' : 'Start Preparing'}
          </button>
        )}

        {order.Order_Status === 'Preparing' && (
          <button
            onClick={() => onAction(order.Order_ID, isDelivery ? 'ready' : 'complete')}
            disabled={updating || (isDelivery && !hasRider)}
            title={isDelivery && !hasRider ? 'Assign a rider first' : ''}
            className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            {updating ? 'Updating...' : readyActionLabel(order)}
          </button>
        )}

        {order.Order_Status === 'Ready_For_Delivery' && (
          <span className="text-xs font-semibold text-yellow-700 bg-yellow-50 px-3 py-1.5 rounded-xl border border-yellow-200">
            Awaiting pickup
          </span>
        )}

        {order.Order_Status === 'In_Transit' && (
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
            Out for delivery
          </span>
        )}

        {order.Order_Status === 'Completed' && (
          <span className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-xl border border-green-100">
            Completed
          </span>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({
  title, icon, borderColor, countStyle, orders, emptyText, onAction, onAssignRider, updatingId,
}: {
  title: string; icon: string; borderColor: string; countStyle: string;
  orders: StaffOrderSummary[]; emptyText: string;
  onAction: (id: string, type: ActionType) => void;
  onAssignRider: (id: string) => void;
  updatingId: string | null;
}) {
  return (
    <div className="flex flex-col flex-1 min-w-0">
      <div className={`flex items-center justify-between pb-3 mb-4 border-b-2 ${borderColor}`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <h2 className="font-bold text-gray-800 text-lg">{title}</h2>
        </div>
        <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${countStyle}`}>
          {orders.length}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {orders.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center py-14">
            <span className="text-gray-400 text-sm">{emptyText}</span>
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.Order_ID}
              order={order}
              onAction={onAction}
              onAssignRider={onAssignRider}
              updating={updatingId === order.Order_ID}
            />
          ))
        )}
      </div>
    </div>
  );
}

const ACTION_CONFIG: Record<ActionType, {
  icon: string; iconBg: string; title: string;
  message: string; confirmLabel: string; confirmClass: string;
}> = {
  accept: {
    icon: 'OK', iconBg: 'bg-green-100',
    title: 'Accept Order?',
    message: 'Accept this order and notify the kitchen to start preparing it?',
    confirmLabel: 'Yes, Accept Order',
    confirmClass: 'bg-green-600 hover:bg-green-700',
  },
  prepare: {
    icon: 'Prep', iconBg: 'bg-red-100',
    title: 'Start Preparing?',
    message: 'Mark this order as being prepared in the kitchen?',
    confirmLabel: 'Yes, Start Preparing',
    confirmClass: 'bg-red-600 hover:bg-red-700',
  },
  ready: {
    icon: 'Box', iconBg: 'bg-yellow-100',
    title: 'Mark as Ready?',
    message: 'Mark this delivery order as ready for delivery? The assigned rider will be able to pick it up.',
    confirmLabel: 'Yes, Mark as Ready',
    confirmClass: 'bg-yellow-500 hover:bg-yellow-600',
  },
  complete: {
    icon: 'OK', iconBg: 'bg-green-100',
    title: 'Mark as Completed?',
    message: 'Mark this dine-in or takeout order as completed?',
    confirmLabel: 'Yes, Mark Completed',
    confirmClass: 'bg-green-600 hover:bg-green-700',
  },
  cancel: {
    icon: 'X', iconBg: 'bg-gray-100',
    title: 'Cancel Order?',
    message: 'Are you sure you want to cancel this order? This cannot be undone.',
    confirmLabel: 'Yes, Cancel Order',
    confirmClass: 'bg-red-600 hover:bg-red-700',
  },
};

export default function EmployeePage() {
  const [orders, setOrders] = useState<StaffOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmModal | null>(null);
  const [assignModal, setAssignModal] = useState<AssignRiderModal | null>(null);
  const [assigningRider, setAssigningRider] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { employee, logout, loading: authLoading } = useEmployee();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && employee === null) router.push('/login');
  }, [employee, authLoading, router]);

  useEffect(() => {
    if (!employee?.Emp_BranchID) {
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToBranchStaffOrders(String(employee.Emp_BranchID), (nextOrders) => {
      setOrders(nextOrders);
      setLoading(false);
    });

    return unsubscribe;
  }, [employee?.Emp_BranchID, refreshKey]);

  const handleLogout = () => { logout(); router.push('/login'); };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleAction = (orderId: string, type: ActionType) => {
    setConfirmModal({ orderId, type });
  };

  const handleConfirm = async () => {
    if (!confirmModal) return;
    const { orderId, type } = confirmModal;
    setConfirmModal(null);
    setUpdatingId(orderId);

    const order = orders.find((entry) => entry.Order_ID === orderId);
    const isDelivery = order ? isDeliveryOrder(order) : true;
    const statusMap: Record<ActionType, string> = {
      accept: 'Order_Accepted',
      prepare: 'Preparing',
      ready: 'Ready_For_Delivery',
      complete: 'Completed',
      cancel: 'Cancelled',
    };

    const newStatus = type === 'ready' && !isDelivery ? 'Completed' : statusMap[type];

    try {
      await updateStaffOrderStatus(orderId, newStatus);
      if (newStatus === 'Cancelled') {
        showToast(`${formatOrderLabel(orderId)} cancelled.`, 'success');
      } else {
        showToast(`${formatOrderLabel(orderId)} moved to ${newStatus.replace(/_/g, ' ')}.`, 'success');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      showToast('Failed to update order. Check Firebase rules and try again.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOpenAssignRider = async (orderId: string) => {
    if (!employee?.Emp_BranchID) {
      showToast('This account has no branch assigned.', 'error');
      return;
    }

    try {
      const riders = await fetchBranchRiders(String(employee.Emp_BranchID));
      const order = orders.find((entry) => entry.Order_ID === orderId);
      const currentRider = order?.delivery?.Del_RiderID ?? null;
      setAssignModal({ orderId, riders, selectedRiderId: currentRider });
    } catch (error) {
      console.error('Error loading riders:', error);
      showToast('Could not load riders. Try again.', 'error');
    }
  };

  const handleAssignRider = async () => {
    if (!assignModal || !assignModal.selectedRiderId) return;
    setAssigningRider(true);

    try {
      const rider = assignModal.riders.find((entry) => entry.Rider_ID === assignModal.selectedRiderId);
      if (!rider) {
        throw new Error('Selected rider not found.');
      }

      await assignRiderToOrder(assignModal.orderId, rider);
      showToast(`${rider.Rider_FName} assigned to ${formatOrderLabel(assignModal.orderId)}.`, 'success');
      setAssignModal(null);
    } catch (error) {
      console.error('Error assigning rider:', error);
      showToast('Failed to assign rider. Check Firebase rules and try again.', 'error');
    } finally {
      setAssigningRider(false);
    }
  };

  const byStatus = (status: string) => orders.filter((order) => order.Order_Status === status);

  if (authLoading) return null;

  const cfg = confirmModal ? ACTION_CONFIG[confirmModal.type] : null;

  return (
    <div className="min-h-screen bg-gray-100">
      {confirmModal && cfg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center gap-4 p-6 pb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
                <span className="text-2xl">{cfg.icon}</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{cfg.title}</h3>
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
            <p className="px-6 pb-5 text-sm text-gray-600">{cfg.message}</p>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className={`flex-1 flex items-center justify-center gap-2 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm ${cfg.confirmClass}`}
              >
                {cfg.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center gap-4 p-6 pb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-orange-100">
                <span className="text-2xl">RD</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Assign Rider</h3>
                <p className="text-sm text-gray-500">{formatOrderLabel(assignModal.orderId)}</p>
              </div>
              <button
                onClick={() => setAssignModal(null)}
                className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 pb-2 max-h-64 overflow-y-auto flex flex-col gap-2">
              {assignModal.riders.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No active riders available at this branch.</p>
              ) : assignModal.riders.map((rider) => {
                const isFull = rider.activeCount >= 2;
                const isSelected = assignModal.selectedRiderId === rider.Rider_ID;
                return (
                  <button
                    key={rider.Rider_ID}
                    onClick={() => !isFull && setAssignModal((prev) => prev ? { ...prev, selectedRiderId: rider.Rider_ID } : null)}
                    disabled={isFull}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors text-left
                      ${isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}
                      ${isFull ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="w-9 h-9 rounded-full bg-orange-500 text-white text-sm font-bold flex items-center justify-center shrink-0">
                      {rider.Rider_FName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm">
                        {rider.Rider_FName} {rider.Rider_LName}
                      </div>
                      <div className="text-xs text-gray-400">{rider.Rider_PhoneNo}</div>
                    </div>
                    <div className={`text-xs font-semibold px-2 py-1 rounded-full
                      ${rider.activeCount === 0 ? 'bg-green-100 text-green-700' :
                        rider.activeCount === 1 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-600'}`}>
                      {rider.activeCount}/2 jobs
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="px-6 py-4 flex gap-3 border-t border-gray-100 mt-2">
              <button
                onClick={() => setAssignModal(null)}
                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignRider}
                disabled={!assignModal.selectedRiderId || assigningRider}
                className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
              >
                {assigningRider ? 'Assigning...' : 'Assign Rider'}
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
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-white border-b-2 border-yellow-400 pb-0.5 tracking-wide">
              Employee Portal
            </span>
          </div>
          <div className="flex items-center gap-3">
            {[
              { label: 'Pending', status: 'Pending', dot: 'bg-gray-300' },
              { label: 'Accepted', status: 'Order_Accepted', dot: 'bg-green-300' },
              { label: 'Prep', status: 'Preparing', dot: 'bg-red-300' },
              { label: 'Ready', status: 'Ready_For_Delivery', dot: 'bg-yellow-300' },
              { label: 'Completed', status: 'Completed', dot: 'bg-blue-300' },
            ].map(({ label, status, dot }) => (
              <div key={status} className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs font-semibold text-white">
                <span className={`w-2 h-2 rounded-full ${dot}`} />
                {byStatus(status).length} {label}
              </div>
            ))}
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
                onClick={() => router.push('/employee/profile')}
                className="header-user-name"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit', color: 'inherit' }}
              >
                {employee?.Emp_FName} {employee?.Emp_LName}
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
            <p className="text-gray-400 text-sm">Loading orders...</p>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-4 items-start">
            <KanbanColumn
              title="Pending" icon="1" borderColor="border-gray-400" countStyle="bg-gray-100 text-gray-600"
              orders={byStatus('Pending')} emptyText="No pending orders"
              onAction={handleAction} onAssignRider={handleOpenAssignRider} updatingId={updatingId}
            />
            <KanbanColumn
              title="Order Accepted" icon="2" borderColor="border-green-500" countStyle="bg-green-100 text-green-700"
              orders={byStatus('Order_Accepted')} emptyText="No accepted orders"
              onAction={handleAction} onAssignRider={handleOpenAssignRider} updatingId={updatingId}
            />
            <KanbanColumn
              title="Preparing" icon="3" borderColor="border-red-500" countStyle="bg-red-100 text-red-700"
              orders={byStatus('Preparing')} emptyText="No orders in preparation"
              onAction={handleAction} onAssignRider={handleOpenAssignRider} updatingId={updatingId}
            />
            <KanbanColumn
              title="Ready for Delivery" icon="4" borderColor="border-yellow-400" countStyle="bg-yellow-100 text-yellow-700"
              orders={byStatus('Ready_For_Delivery')} emptyText="No orders ready"
              onAction={handleAction} onAssignRider={handleOpenAssignRider} updatingId={updatingId}
            />
            <KanbanColumn
              title="Completed" icon="5" borderColor="border-green-600" countStyle="bg-green-100 text-green-800"
              orders={[...byStatus('In_Transit'), ...byStatus('Completed')]}
              emptyText="No completed orders"
              onAction={handleAction} onAssignRider={handleOpenAssignRider} updatingId={updatingId}
            />
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
