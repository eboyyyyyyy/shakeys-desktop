import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

export interface StaffOrderItemSummary {
  OItem_ID: string;
  OItem_Quantity: number;
  OItem_Subtotal: number;
  Menu_Name: string;
}

export interface StaffOrderSummary {
  Order_ID: string;
  Order_Date: string;
  Order_Time: string;
  Order_Type: string;
  Order_Status: string;
  Order_Total: number;
  Cust_FirstName: string;
  Cust_LastName: string;
  Cust_PhoneNo?: string;
  Brnch_Name: string;
  Brnch_Address?: string;
  items: StaffOrderItemSummary[];
  delivery?: {
    Del_ID: string;
    Del_Status: string;
    Del_Address: string;
    Del_Fee: number;
    Del_RiderID: string | null;
    Rider_FName: string | null;
    Rider_LName: string | null;
    Rider_PhoneNo: string | null;
  };
}

export interface StaffRiderOption {
  Rider_ID: string;
  Rider_FName: string;
  Rider_LName: string;
  Rider_PhoneNo: string;
  activeCount: number;
}

type StaffUserRecord = Record<string, unknown> & {
  uid: string;
  role?: unknown;
  status?: unknown;
  branchId?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  phoneNo?: unknown;
};

function formatDateParts(value: unknown): { date: string; time: string } {
  if (!value || typeof value !== 'object' || !('toDate' in value) || typeof (value as { toDate?: unknown }).toDate !== 'function') {
    return { date: '', time: '' };
  }

  const realDate = (value as { toDate: () => Date }).toDate();
  if (Number.isNaN(realDate.getTime())) {
    return { date: '', time: '' };
  }

  const year = realDate.getFullYear();
  const month = String(realDate.getMonth() + 1).padStart(2, '0');
  const day = String(realDate.getDate()).padStart(2, '0');
  const hour = String(realDate.getHours()).padStart(2, '0');
  const minute = String(realDate.getMinutes()).padStart(2, '0');

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
  };
}

function splitName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { firstName: 'Customer', lastName: '' };
  }

  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0] || 'Customer',
    lastName: parts.slice(1).join(' '),
  };
}

function mapOrder(orderId: string, data: Record<string, unknown>): StaffOrderSummary {
  const created = formatDateParts(data.createdAt);
  const customerName = typeof data.customerName === 'string' ? data.customerName : '';
  const name = splitName(customerName);
  const rawItems = Array.isArray(data.items) ? data.items : [];
  const delivery = typeof data.delivery === 'object' && data.delivery !== null
    ? (data.delivery as Record<string, unknown>)
    : null;

  return {
    Order_ID: orderId,
    Order_Date: created.date,
    Order_Time: created.time,
    Order_Type: typeof data.orderType === 'string' ? data.orderType : 'Delivery',
    Order_Status: typeof data.status === 'string' ? data.status : 'Pending',
    Order_Total: typeof data.total === 'number' ? data.total : 0,
    Cust_FirstName: name.firstName,
    Cust_LastName: name.lastName,
    Cust_PhoneNo: typeof data.customerPhone === 'string' ? data.customerPhone : '',
    Brnch_Name: typeof data.branchName === 'string' ? data.branchName : 'Branch',
    Brnch_Address: typeof data.branchAddress === 'string' ? data.branchAddress : '',
    items: rawItems.map((item, index) => {
      const orderItem = typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : {};
      return {
        OItem_ID: `${orderId}-${index}`,
        OItem_Quantity: typeof orderItem.quantity === 'number' ? orderItem.quantity : 0,
        OItem_Subtotal: typeof orderItem.subtotal === 'number' ? orderItem.subtotal : 0,
        Menu_Name: typeof orderItem.name === 'string' ? orderItem.name : 'Menu Item',
      };
    }),
    delivery: delivery
      ? {
          Del_ID: orderId,
          Del_Status: typeof delivery.status === 'string' ? delivery.status : (typeof data.status === 'string' ? data.status : 'Pending'),
          Del_Address: typeof delivery.address === 'string' ? delivery.address : '',
          Del_Fee: typeof delivery.fee === 'number' ? delivery.fee : 0,
          Del_RiderID: typeof delivery.riderId === 'string' ? delivery.riderId : null,
          Rider_FName: typeof delivery.riderName === 'string' ? delivery.riderName.split(/\s+/)[0] || delivery.riderName : null,
          Rider_LName: typeof delivery.riderName === 'string' ? delivery.riderName.split(/\s+/).slice(1).join(' ') : null,
          Rider_PhoneNo: typeof delivery.riderPhone === 'string' ? delivery.riderPhone : null,
        }
      : undefined,
  };
}

function sortOrders(orders: StaffOrderSummary[]) {
  return orders.sort((a, b) => `${b.Order_Date} ${b.Order_Time}`.localeCompare(`${a.Order_Date} ${a.Order_Time}`));
}

export function subscribeToBranchStaffOrders(
  branchId: string,
  onUpdate: (orders: StaffOrderSummary[]) => void
): Unsubscribe {
  const ordersQuery = query(collection(db, 'orders'), where('branchId', '==', branchId));

  return onSnapshot(ordersQuery, (snapshot) => {
    const orders = snapshot.docs.map((entry) => mapOrder(entry.id, entry.data() as Record<string, unknown>));
    onUpdate(sortOrders(orders));
  });
}

export function subscribeToRiderStaffOrders(
  riderUid: string,
  onUpdate: (orders: StaffOrderSummary[]) => void
): Unsubscribe {
  const ordersQuery = query(collection(db, 'orders'), where('delivery.riderId', '==', riderUid));

  return onSnapshot(ordersQuery, (snapshot) => {
    const orders = snapshot.docs.map((entry) => mapOrder(entry.id, entry.data() as Record<string, unknown>));
    onUpdate(sortOrders(orders));
  });
}

export async function updateStaffOrderStatus(orderId: string, status: string): Promise<void> {
  const orderRef = doc(db, 'orders', orderId);
  const orderSnap = await getDoc(orderRef);
  const orderData = orderSnap.exists() ? (orderSnap.data() as Record<string, unknown>) : null;
  const orderType = typeof orderData?.orderType === 'string' ? orderData.orderType : 'Delivery';
  const hasDelivery = !!(orderData && typeof orderData.delivery === 'object' && orderData.delivery !== null);
  const payment = orderData && typeof orderData.payment === 'object' && orderData.payment !== null
    ? (orderData.payment as Record<string, unknown>)
    : null;

  const updates: Record<string, any> = {
    status,
    updatedAt: new Date(),
  };

  if (status === 'Order_Accepted') {
    updates['payment.status'] = 'Completed';
    updates['payment.paidAt'] = payment?.paidAt ?? new Date();
  }

  if (hasDelivery && ['Ready_For_Delivery', 'In_Transit', 'Completed', 'Cancelled'].includes(status)) {
    updates['delivery.status'] = status;
  }

  if (!hasDelivery && orderType !== 'Delivery' && status === 'Completed') {
    await updateDoc(orderRef, updates);
    return;
  }

  await updateDoc(orderRef, updates);
}

export async function fetchBranchRiders(branchId: string): Promise<StaffRiderOption[]> {
  const [usersSnapshot, ordersSnapshot] = await Promise.all([
    getDocs(query(
      collection(db, 'users'),
      where('branchId', '==', branchId),
      where('role', '==', 'rider'),
      where('status', '==', 'Active')
    )),
    getDocs(query(collection(db, 'orders'), where('branchId', '==', branchId))),
  ]);

  const activeCounts = new Map<string, number>();
  ordersSnapshot.docs.forEach((entry) => {
    const data = entry.data() as Record<string, unknown>;
    const delivery = typeof data.delivery === 'object' && data.delivery !== null
      ? (data.delivery as Record<string, unknown>)
      : null;
    const riderId = typeof delivery?.riderId === 'string' ? delivery.riderId : null;
    const status = typeof data.status === 'string' ? data.status : '';

    if (!riderId || !['Ready_For_Delivery', 'In_Transit'].includes(status)) {
      return;
    }

    activeCounts.set(riderId, (activeCounts.get(riderId) || 0) + 1);
  });

  return usersSnapshot.docs
    .map((entry) => ({ uid: entry.id, ...(entry.data() as Record<string, unknown>) }) as StaffUserRecord)
    .filter((entry) => entry.role === 'rider' && entry.status === 'Active')
    .map((entry) => ({
      Rider_ID: String(entry.uid),
      Rider_FName: typeof entry.firstName === 'string' ? entry.firstName : 'Rider',
      Rider_LName: typeof entry.lastName === 'string' ? entry.lastName : '',
      Rider_PhoneNo: typeof entry.phoneNo === 'string' ? entry.phoneNo : '',
      activeCount: activeCounts.get(String(entry.uid)) || 0,
    }))
    .sort((a, b) => {
      if (a.activeCount !== b.activeCount) {
        return a.activeCount - b.activeCount;
      }
      return `${a.Rider_FName} ${a.Rider_LName}`.localeCompare(`${b.Rider_FName} ${b.Rider_LName}`);
    });
}

export async function assignRiderToOrder(orderId: string, rider: StaffRiderOption): Promise<void> {
  await updateDoc(doc(db, 'orders', orderId), {
    'delivery.riderId': rider.Rider_ID,
    'delivery.riderName': [rider.Rider_FName, rider.Rider_LName].filter(Boolean).join(' ').trim(),
    'delivery.riderPhone': rider.Rider_PhoneNo,
    updatedAt: new Date(),
  });
}
