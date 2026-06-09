// TypeScript types matching the Data Dictionary

export interface Membership {
  Mem_ID: number;
  Mem_Type: string;
  Mem_Points: number;
  Mem_StartDate: string;
  Mem_EndDate: string | null;
}

export interface Customer {
  Cust_ID: number;
  Cust_FirstName: string;
  Cust_LastName: string;
  Cust_Email: string;
  Cust_PhoneNo: string;
  Cust_Address: string | null;
  Cust_MembershipID: number | null;
}

export interface Card {
  Card_ID: number;
  Card_Number: string;
  Card_Type: string;
  Card_Expiry: string;
  Card_CustomerID: number;
}

export interface Branch {
  Brnch_ID: number;
  Brnch_Name: string;
  Brnch_Address: string;
  Brnch_City: string;
  Brnch_PhoneNo: string;
  Brnch_Status: string;
}

export interface MenuItem {
  Menu_ID: number;
  Menu_Name: string;
  Menu_Description: string | null;
  Menu_Image?: string | null;
  Menu_Category: string;
  Menu_Price: number;
  Menu_Availability: 'Y' | 'N';
}

export interface Inventory {
  Inv_ID: number;
  Inv_BranchID: number;
  Inv_ItemName: string;
  Inv_Quantity: number;
  Inv_MinLevel: number;
  Inv_Unit: string;
  Inv_LastUpdated: string;
}

export type OrderStatus =
  | 'Pending'
  | 'Order_Accepted'
  | 'Preparing'
  | 'Ready_For_Delivery'
  | 'In_Transit'
  | 'Completed'
  | 'Cancelled';

export interface Order {
  Order_ID: number;
  Order_Date: string;
  Order_Time: string;
  Order_Type: 'Dine-in' | 'Takeout' | 'Delivery';
  Order_Status: OrderStatus;
  Order_Total: number;
  Order_CustomerID: number;
  Order_BranchID: number;
}

export interface OrderItem {
  OItem_ID: number;
  OItem_OrderID: number;
  OItem_MenuID: number;
  OItem_Quantity: number;
  OItem_UnitPrice: number;
  OItem_Subtotal: number;
}

export interface Payment {
  Pay_ID: number;
  Pay_OrderID: number;
  Pay_Method: string;
  Pay_Amount: number;
  Pay_Date: string;
  Pay_Status: 'Pending' | 'Completed' | 'Failed' | 'Refunded';
  Pay_CardID: number | null;
}

export interface Delivery {
  Del_ID: number;
  Del_OrderID: number;
  Del_RiderID: number | null;
  Del_Address: string;
  Del_Status: 'Pending' | 'In_Transit' | 'Completed' | 'Failed';
  Del_Date: string;
  Del_Time: string | null;
  Del_Fee: number;
}

export interface Rider {
  Rider_ID: number;
  Rider_FName: string;
  Rider_LName: string;
  Rider_PhoneNo: string;
  Rider_Status: 'Active' | 'Inactive';
  Rider_BranchID: number;
}

export interface Discount {
  Disc_ID: number;
  Disc_Name: string;
  Disc_Type: string;
  Disc_Rate: number;
}

export interface MenuItemDiscount {
  MDisc_ID: number;
  MDisc_MenuID: number;
  MDisc_DiscountID: number;
  MDisc_StartDate: string;
  MDisc_EndDate: string | null;
}

export interface Employee {
  Emp_ID: number;
  Emp_BranchID: number;
  Emp_FName: string;
  Emp_LName: string;
  Emp_Position: string;
  Emp_PhoneNo: string;
  Emp_Email: string;
  Emp_HireDate: string;
  Emp_Status: 'Active' | 'Inactive';
}

// Valid status transitions
export const VALID_TRANSITIONS: Record<string, string[]> = {
  'Pending':            ['Order_Accepted', 'Cancelled'],
  'Order_Accepted':     ['Preparing', 'Cancelled'],
  'Preparing':          ['Ready_For_Delivery', 'Cancelled'],
  'Ready_For_Delivery': ['In_Transit'],
  'In_Transit':         ['Completed'],
  'Completed':          [],
  'Cancelled':          [],
};

// Extended types for API responses
export interface MenuItemWithDiscount extends MenuItem {
  discountRate?: number;
  discountedPrice?: number;
}

export interface OrderWithDetails extends Order {
  items: (OrderItem & { menuItem: MenuItem })[];
  customer?: Customer;
  delivery?: Delivery;
  payment?: Payment;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}