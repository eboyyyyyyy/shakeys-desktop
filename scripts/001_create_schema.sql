-- Shakey's Delivery System Database Schema
-- MySQL 8.0

DROP TABLE IF EXISTS Menu_Item_Discount;
DROP TABLE IF EXISTS Discount;
DROP TABLE IF EXISTS Employee;
DROP TABLE IF EXISTS Delivery;
DROP TABLE IF EXISTS Rider;
DROP TABLE IF EXISTS Payment;
DROP TABLE IF EXISTS Order_Item;
DROP TABLE IF EXISTS `Order`;
DROP TABLE IF EXISTS Inventory;
DROP TABLE IF EXISTS Menu_Item;
DROP TABLE IF EXISTS Branch;
DROP TABLE IF EXISTS Card;
DROP TABLE IF EXISTS Customer;
DROP TABLE IF EXISTS Membership;

-- ============================================
-- TABLE: Membership
-- ============================================
CREATE TABLE Membership (
    Mem_ID INT NOT NULL,
    Mem_Type VARCHAR(30) NOT NULL,
    Mem_Points INT NOT NULL DEFAULT 0,
    Mem_StartDate DATE NOT NULL,
    Mem_EndDate DATE NULL,
    PRIMARY KEY (Mem_ID),
    CONSTRAINT chk_mem_id CHECK (Mem_ID BETWEEN 10000 AND 99999),
    CONSTRAINT chk_mem_points CHECK (Mem_Points BETWEEN 0 AND 99999)
);

-- ============================================
-- TABLE: Customer
-- ============================================
CREATE TABLE Customer (
    Cust_ID INT NOT NULL,
    Cust_FirstName VARCHAR(50) NOT NULL,
    Cust_LastName VARCHAR(50) NOT NULL,
    Cust_Email VARCHAR(100) NOT NULL,
    Cust_PhoneNo CHAR(11) NOT NULL,
    Cust_Password VARCHAR(255) NOT NULL,
    Cust_Address VARCHAR(255) NULL,
    Cust_MembershipID INT NULL,
    PRIMARY KEY (Cust_ID),
    CONSTRAINT chk_cust_id CHECK (Cust_ID BETWEEN 10000 AND 99999),
    CONSTRAINT chk_cust_mem_id CHECK (Cust_MembershipID IS NULL OR Cust_MembershipID BETWEEN 10000 AND 99999),
    CONSTRAINT fk_customer_membership FOREIGN KEY (Cust_MembershipID) REFERENCES Membership(Mem_ID)
);

-- ============================================
-- TABLE: Card
-- ============================================
CREATE TABLE Card (
    Card_ID INT NOT NULL,
    Card_Number CHAR(16) NOT NULL,
    Card_Type VARCHAR(20) NOT NULL,
    Card_Expiry DATE NOT NULL,
    Card_CustomerID INT NOT NULL,
    PRIMARY KEY (Card_ID),
    CONSTRAINT chk_card_id CHECK (Card_ID BETWEEN 10000 AND 99999),
    CONSTRAINT chk_card_cust_id CHECK (Card_CustomerID BETWEEN 10000 AND 99999),
    CONSTRAINT fk_card_customer FOREIGN KEY (Card_CustomerID) REFERENCES Customer(Cust_ID)
);

-- ============================================
-- TABLE: Branch
-- ============================================
CREATE TABLE Branch (
    Brnch_ID INT NOT NULL,
    Brnch_Name VARCHAR(100) NOT NULL,
    Brnch_Address VARCHAR(255) NOT NULL,
    Brnch_City VARCHAR(50) NOT NULL,
    Brnch_PhoneNo CHAR(11) NOT NULL,
    Brnch_Status VARCHAR(20) NOT NULL,
    PRIMARY KEY (Brnch_ID),
    CONSTRAINT chk_brnch_id CHECK (Brnch_ID BETWEEN 100 AND 999)
);

-- ============================================
-- TABLE: Menu_Item
-- ============================================
CREATE TABLE Menu_Item (
    Menu_ID INT NOT NULL,
    Menu_Name VARCHAR(100) NOT NULL,
    Menu_Description VARCHAR(255) NULL,
    Menu_Category VARCHAR(50) NOT NULL,
    Menu_Price DECIMAL(8,2) NOT NULL,
    Menu_Availability CHAR(1) NOT NULL DEFAULT 'Y',
    PRIMARY KEY (Menu_ID),
    CONSTRAINT chk_menu_id CHECK (Menu_ID BETWEEN 10000 AND 99999),
    CONSTRAINT chk_menu_price CHECK (Menu_Price BETWEEN 0.00 AND 9999.99),
    CONSTRAINT chk_menu_availability CHECK (Menu_Availability IN ('Y', 'N'))
);

-- ============================================
-- TABLE: Inventory
-- ============================================
CREATE TABLE Inventory (
    Inv_ID INT NOT NULL,
    Inv_BranchID INT NOT NULL,
    Inv_ItemName VARCHAR(100) NOT NULL,
    Inv_Quantity SMALLINT NOT NULL DEFAULT 0,
    Inv_MinLevel SMALLINT NOT NULL,
    Inv_Unit VARCHAR(20) NOT NULL,
    Inv_LastUpdated DATE NOT NULL,
    PRIMARY KEY (Inv_ID),
    CONSTRAINT chk_inv_id CHECK (Inv_ID BETWEEN 10000 AND 99999),
    CONSTRAINT chk_inv_branch_id CHECK (Inv_BranchID BETWEEN 100 AND 999),
    CONSTRAINT chk_inv_quantity CHECK (Inv_Quantity BETWEEN 0 AND 9999),
    CONSTRAINT chk_inv_min_level CHECK (Inv_MinLevel BETWEEN 0 AND 9999),
    CONSTRAINT fk_inventory_branch FOREIGN KEY (Inv_BranchID) REFERENCES Branch(Brnch_ID)
);

-- ============================================
-- TABLE: Order
-- ============================================
CREATE TABLE `Order` (
    Order_ID INT NOT NULL,
    Order_Date DATE NOT NULL,
    Order_Time TIME NOT NULL,
    Order_Type VARCHAR(20) NOT NULL,
    Order_Status VARCHAR(20) NOT NULL,
    Order_Total DECIMAL(10,2) NOT NULL,
    Order_CustomerID INT NOT NULL,
    Order_BranchID INT NOT NULL,
    PRIMARY KEY (Order_ID),
    CONSTRAINT chk_order_id CHECK (Order_ID BETWEEN 10000000 AND 99999999),
    CONSTRAINT chk_order_total CHECK (Order_Total BETWEEN 0.00 AND 999999.99),
    CONSTRAINT chk_order_cust_id CHECK (Order_CustomerID BETWEEN 10000 AND 99999),
    CONSTRAINT chk_order_branch_id CHECK (Order_BranchID BETWEEN 100 AND 999),
    CONSTRAINT fk_order_customer FOREIGN KEY (Order_CustomerID) REFERENCES Customer(Cust_ID),
    CONSTRAINT fk_order_branch FOREIGN KEY (Order_BranchID) REFERENCES Branch(Brnch_ID)
);

-- ============================================
-- TABLE: Order_Item
-- ============================================
CREATE TABLE Order_Item (
    OItem_ID INT NOT NULL,
    OItem_OrderID INT NOT NULL,
    OItem_MenuID INT NOT NULL,
    OItem_Quantity SMALLINT NOT NULL,
    OItem_UnitPrice DECIMAL(8,2) NOT NULL,
    OItem_Subtotal DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (OItem_ID),
    CONSTRAINT chk_oitem_id CHECK (OItem_ID BETWEEN 10000000 AND 99999999),
    CONSTRAINT chk_oitem_order_id CHECK (OItem_OrderID BETWEEN 10000000 AND 99999999),
    CONSTRAINT chk_oitem_menu_id CHECK (OItem_MenuID BETWEEN 10000 AND 99999),
    CONSTRAINT chk_oitem_quantity CHECK (OItem_Quantity BETWEEN 1 AND 99),
    CONSTRAINT chk_oitem_unit_price CHECK (OItem_UnitPrice BETWEEN 0.00 AND 9999.99),
    CONSTRAINT chk_oitem_subtotal CHECK (OItem_Subtotal BETWEEN 0.00 AND 999999.99),
    CONSTRAINT fk_oitem_order FOREIGN KEY (OItem_OrderID) REFERENCES `Order`(Order_ID),
    CONSTRAINT fk_oitem_menu FOREIGN KEY (OItem_MenuID) REFERENCES Menu_Item(Menu_ID)
);

-- ============================================
-- TABLE: Payment
-- ============================================
CREATE TABLE Payment (
    Pay_ID INT NOT NULL,
    Pay_OrderID INT NOT NULL,
    Pay_Method VARCHAR(30) NOT NULL,
    Pay_Amount DECIMAL(10,2) NOT NULL,
    Pay_Date DATE NOT NULL,
    Pay_Status VARCHAR(20) NOT NULL,
    Pay_CardID INT NULL,
    PRIMARY KEY (Pay_ID),
    CONSTRAINT chk_pay_id CHECK (Pay_ID BETWEEN 10000000 AND 99999999),
    CONSTRAINT chk_pay_order_id CHECK (Pay_OrderID BETWEEN 10000000 AND 99999999),
    CONSTRAINT chk_pay_amount CHECK (Pay_Amount BETWEEN 0.00 AND 999999.99),
    CONSTRAINT chk_pay_card_id CHECK (Pay_CardID IS NULL OR Pay_CardID BETWEEN 10000 AND 99999),
    CONSTRAINT fk_payment_order FOREIGN KEY (Pay_OrderID) REFERENCES `Order`(Order_ID),
    CONSTRAINT fk_payment_card FOREIGN KEY (Pay_CardID) REFERENCES Card(Card_ID)
);

-- ============================================
-- TABLE: Rider
-- ============================================
CREATE TABLE Rider (
    Rider_ID INT NOT NULL,
    Rider_FName VARCHAR(50) NOT NULL,
    Rider_LName VARCHAR(50) NOT NULL,
    Rider_PhoneNo CHAR(11) NOT NULL,
    Rider_Password VARCHAR(255) NOT NULL,
    Rider_Status VARCHAR(20) NOT NULL,
    Rider_BranchID INT NOT NULL,
    PRIMARY KEY (Rider_ID),
    CONSTRAINT chk_rider_id CHECK (Rider_ID BETWEEN 10000 AND 99999),
    CONSTRAINT chk_rider_branch_id CHECK (Rider_BranchID BETWEEN 100 AND 999),
    CONSTRAINT fk_rider_branch FOREIGN KEY (Rider_BranchID) REFERENCES Branch(Brnch_ID)
);

-- ============================================
-- TABLE: Delivery
-- ============================================
CREATE TABLE Delivery (
    Dlvry_ID INT NOT NULL,
    Dlvry_OrderID INT NOT NULL,
    Dlvry_RiderID INT NOT NULL,
    Dlvry_Address VARCHAR(255) NOT NULL,
    Dlvry_Status VARCHAR(30) NOT NULL,
    Dlvry_Date DATE NOT NULL,
    Dlvry_Time TIME NULL,
    Dlvry_Fee DECIMAL(6,2) NOT NULL,
    PRIMARY KEY (Dlvry_ID),
    CONSTRAINT chk_dlvry_id CHECK (Dlvry_ID BETWEEN 10000000 AND 99999999),
    CONSTRAINT chk_dlvry_order_id CHECK (Dlvry_OrderID BETWEEN 10000000 AND 99999999),
    CONSTRAINT chk_dlvry_rider_id CHECK (Dlvry_RiderID BETWEEN 10000 AND 99999),
    CONSTRAINT chk_dlvry_fee CHECK (Dlvry_Fee BETWEEN 0.00 AND 9999.99),
    CONSTRAINT fk_delivery_order FOREIGN KEY (Dlvry_OrderID) REFERENCES `Order`(Order_ID),
    CONSTRAINT fk_delivery_rider FOREIGN KEY (Dlvry_RiderID) REFERENCES Rider(Rider_ID)
);

-- ============================================
-- TABLE: Discount
-- ============================================
CREATE TABLE Discount (
    Disc_ID INT NOT NULL,
    Disc_Name VARCHAR(50) NOT NULL,
    Disc_Type VARCHAR(30) NOT NULL,
    Disc_Rate DECIMAL(5,2) NOT NULL,
    PRIMARY KEY (Disc_ID),
    CONSTRAINT chk_disc_id CHECK (Disc_ID BETWEEN 10000 AND 99999),
    CONSTRAINT chk_disc_rate CHECK (Disc_Rate BETWEEN 0.00 AND 1.00)
);

-- ============================================
-- TABLE: Menu_Item_Discount
-- ============================================
CREATE TABLE Menu_Item_Discount (
    MDisc_ID INT NOT NULL,
    MDisc_MenuID INT NOT NULL,
    MDisc_DiscountID INT NOT NULL,
    MDisc_StartDate DATE NOT NULL,
    MDisc_EndDate DATE NULL,
    PRIMARY KEY (MDisc_ID),
    CONSTRAINT chk_mdisc_id CHECK (MDisc_ID BETWEEN 10000 AND 99999),
    CONSTRAINT chk_mdisc_menu_id CHECK (MDisc_MenuID BETWEEN 10000 AND 99999),
    CONSTRAINT chk_mdisc_disc_id CHECK (MDisc_DiscountID BETWEEN 10000 AND 99999),
    CONSTRAINT fk_mdisc_menu FOREIGN KEY (MDisc_MenuID) REFERENCES Menu_Item(Menu_ID),
    CONSTRAINT fk_mdisc_discount FOREIGN KEY (MDisc_DiscountID) REFERENCES Discount(Disc_ID)
);

-- ============================================
-- TABLE: Employee
-- ============================================
CREATE TABLE Employee (
    Emp_ID INT NOT NULL,
    Emp_BranchID INT NOT NULL,
    Emp_FName VARCHAR(50) NOT NULL,
    Emp_LName VARCHAR(50) NOT NULL,
    Emp_Position VARCHAR(50) NOT NULL,
    Emp_PhoneNo CHAR(11) NOT NULL,
    Emp_Email VARCHAR(100) NOT NULL,
    Emp_Password VARCHAR(255) NOT NULL,
    Emp_HireDate DATE NOT NULL,
    Emp_Status VARCHAR(20) NOT NULL,
    PRIMARY KEY (Emp_ID),
    CONSTRAINT chk_emp_id CHECK (Emp_ID BETWEEN 10000 AND 99999),
    CONSTRAINT chk_emp_branch_id CHECK (Emp_BranchID BETWEEN 100 AND 999),
    CONSTRAINT fk_employee_branch FOREIGN KEY (Emp_BranchID) REFERENCES Branch(Brnch_ID)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_customer_email ON Customer(Cust_Email);
CREATE INDEX idx_customer_phone ON Customer(Cust_PhoneNo);
CREATE INDEX idx_customer_membership ON Customer(Cust_MembershipID);
CREATE INDEX idx_order_customer ON `Order`(Order_CustomerID);
CREATE INDEX idx_order_branch ON `Order`(Order_BranchID);
CREATE INDEX idx_order_status ON `Order`(Order_Status);
CREATE INDEX idx_order_date ON `Order`(Order_Date);
CREATE INDEX idx_order_item_order ON Order_Item(OItem_OrderID);
CREATE INDEX idx_order_item_menu ON Order_Item(OItem_MenuID);
CREATE INDEX idx_payment_order ON Payment(Pay_OrderID);
CREATE INDEX idx_delivery_order ON Delivery(Dlvry_OrderID);
CREATE INDEX idx_delivery_rider ON Delivery(Dlvry_RiderID);
CREATE INDEX idx_inventory_branch ON Inventory(Inv_BranchID);
CREATE INDEX idx_menu_category ON Menu_Item(Menu_Category);
CREATE INDEX idx_menu_availability ON Menu_Item(Menu_Availability);
CREATE INDEX idx_rider_branch ON Rider(Rider_BranchID);
CREATE INDEX idx_rider_status ON Rider(Rider_Status);
CREATE INDEX idx_rider_phone ON Rider(Rider_PhoneNo);
CREATE INDEX idx_employee_branch ON Employee(Emp_BranchID);
CREATE INDEX idx_employee_email ON Employee(Emp_Email);
CREATE INDEX idx_employee_phone ON Employee(Emp_PhoneNo);