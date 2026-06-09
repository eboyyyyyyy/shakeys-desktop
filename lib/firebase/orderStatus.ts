// lib/firebase/orderStatus.ts
export const ORDER_STATUS = {
  PENDING:    "Pending",
  PREPARING:  "Preparing",
  READY:      "Ready",
  IN_TRANSIT: "In Transit",
  DELIVERED:  "Delivered",
  COMPLETED:  "Completed",
  CANCELLED:  "Cancelled",
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

export const EMPLOYEE_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [ORDER_STATUS.PENDING]:    [ORDER_STATUS.PREPARING],
  [ORDER_STATUS.PREPARING]:  [ORDER_STATUS.READY],
  [ORDER_STATUS.READY]:      [ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.IN_TRANSIT]: [ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.DELIVERED]:  [ORDER_STATUS.COMPLETED],
  [ORDER_STATUS.COMPLETED]:  [],
  [ORDER_STATUS.CANCELLED]:  [],
};

export const RIDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [ORDER_STATUS.READY]:      [ORDER_STATUS.IN_TRANSIT],
  [ORDER_STATUS.IN_TRANSIT]: [ORDER_STATUS.DELIVERED],
  // All others: no transitions
  [ORDER_STATUS.PENDING]:    [],
  [ORDER_STATUS.PREPARING]:  [],
  [ORDER_STATUS.DELIVERED]:  [],
  [ORDER_STATUS.COMPLETED]:  [],
  [ORDER_STATUS.CANCELLED]:  [],
};