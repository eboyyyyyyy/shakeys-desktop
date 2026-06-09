-- Shakey's Delivery System Seed Data
-- MySQL 8.0

-- ============================================
-- DELETE ALL EXISTING DATA (reverse dependency order)
-- ============================================
DELETE FROM Menu_Item_Discount;
DELETE FROM Discount;
DELETE FROM Employee;
DELETE FROM Delivery;
DELETE FROM Rider;
DELETE FROM Payment;
DELETE FROM Order_Item;
DELETE FROM `Order`;
DELETE FROM Inventory;
DELETE FROM Menu_Item;
DELETE FROM Branch;
DELETE FROM Card;
DELETE FROM Customer;
DELETE FROM Membership;

-- ============================================
-- Branch Data
-- ============================================
INSERT INTO Branch (Brnch_ID, Brnch_Name, Brnch_Address, Brnch_City, Brnch_PhoneNo, Brnch_Status) VALUES
(201, 'Shakeys Parc Fortuna',        'Light Site, Parc Fortuna',                   'Mandaue',   '03222345678', 'Active'),
(202, 'Shakeys SM City Cebu',        'North Reclamation Area, SM City Cebu',        'Cebu City', '03223456789', 'Active'),
(203, 'Shakeys Robinsons Cybergate', 'Robinsons Cybergate Cebu',                   'Cebu City', '03224567890', 'Active'),
(204, 'Shakeys Cabahug',             'F. Cabahug Street',                           'Cebu City', '03225678901', 'Active'),
(205, 'Shakeys Ayala Center Cebu',   'Ayala Center Cebu',                           'Cebu City', '03226789012', 'Active'),
(206, 'Shakeys SM Seaside Cebu',     'Cebu South Coastal Rd, SM Seaside Complex',  'Cebu City', '03227890123', 'Active');

-- ============================================
-- Menu Item Data
-- ============================================
INSERT INTO Menu_Item (Menu_ID, Menu_Name, Menu_Description, Menu_Category, Menu_Price, Menu_Availability) VALUES
-- Pizzas
(10001, 'Classic Thin Crust Pizza', 'Our signature thin crust pizza with tomato sauce and mozzarella', 'Pizza', 399.00, 'Y'),
(10002, 'Hawaiian Delight',         'Ham, pineapple, and mozzarella on thin crust',                    'Pizza', 449.00, 'Y'),
(10003, 'Pepperoni Lovers',         'Loaded with pepperoni and extra cheese',                          'Pizza', 499.00, 'Y'),
(10004, 'Manager Choice',           'Premium toppings selected by our branch manager',                 'Pizza', 549.00, 'Y'),
(10005, 'Garden Special',           'Fresh vegetables with mushrooms and olives',                      'Pizza', 429.00, 'Y'),
(10006, 'Four Seasons',             'Four different toppings in one pizza',                            'Pizza', 579.00, 'Y'),
-- Chicken
(10007, 'Chicken N Mojos',          'Crispy fried chicken with seasoned mojos',     'Chicken', 299.00, 'Y'),
(10008, 'Garlic Butter Chicken',    'Chicken glazed with garlic butter sauce',       'Chicken', 329.00, 'Y'),
(10009, 'Buffalo Wings',            'Spicy buffalo wings with blue cheese dip',      'Chicken', 279.00, 'Y'),
(10010, 'Honey Glazed Chicken',     'Sweet honey glazed fried chicken',              'Chicken', 319.00, 'Y'),
-- Pasta
(10011, 'Carbonara Supreme',        'Creamy carbonara with bacon bits',              'Pasta', 249.00, 'Y'),
(10012, 'Classic Spaghetti',        'Meaty spaghetti with special sauce',            'Pasta', 229.00, 'Y'),
(10013, 'Baked Ziti',               'Baked ziti with meat sauce and cheese',         'Pasta', 269.00, 'Y'),
(10014, 'Garlic Shrimp Pasta',      'Pasta with garlic shrimp and olive oil',        'Pasta', 299.00, 'Y'),
-- Sides
(10015, 'Mojos Regular',            'Seasoned potato mojos',                         'Sides',  99.00, 'Y'),
(10016, 'Mojos Large',              'Large serving of seasoned potato mojos',        'Sides', 149.00, 'Y'),
(10017, 'Garlic Bread',             'Toasted garlic bread slices',                   'Sides',  79.00, 'Y'),
(10018, 'Coleslaw',                 'Fresh creamy coleslaw',                         'Sides',  69.00, 'Y'),
-- Drinks
(10019, 'Pepsi Regular',            'Regular size Pepsi',                            'Drinks',  49.00, 'Y'),
(10020, 'Pepsi Large',              'Large size Pepsi',                              'Drinks',  69.00, 'Y'),
(10021, 'Mountain Dew Regular',     'Regular size Mountain Dew',                     'Drinks',  49.00, 'Y'),
(10022, 'Iced Tea',                 'Refreshing iced tea',                           'Drinks',  59.00, 'Y'),
(10023, 'Bottled Water',            'Purified drinking water',                       'Drinks',  35.00, 'Y'),
-- Desserts
(10024, 'Halo-Halo',                'Filipino shaved ice dessert',                   'Desserts', 129.00, 'Y'),
(10025, 'Mango Graham',             'Layered mango graham dessert',                  'Desserts', 119.00, 'Y'),
(10026, 'Ice Cream Sundae',         'Vanilla ice cream with toppings',               'Desserts',  89.00, 'Y');

-- ============================================
-- Inventory Data
-- ============================================
INSERT INTO Inventory (Inv_ID, Inv_BranchID, Inv_ItemName, Inv_Quantity, Inv_MinLevel, Inv_Unit, Inv_LastUpdated) VALUES
(10001, 201, 'Pizza Dough',       150, 50, 'pieces', '2026-05-01'),
(10002, 201, 'Mozzarella Cheese',  80, 20, 'kg',     '2026-05-01'),
(10003, 201, 'Pepperoni',          45, 15, 'kg',     '2026-05-01'),
(10004, 201, 'Chicken Wings',     100, 30, 'pieces', '2026-05-01'),
(10005, 201, 'Pasta',              60, 20, 'kg',     '2026-05-01'),
(10006, 201, 'Potatoes',          200, 50, 'kg',     '2026-05-01'),
(10007, 202, 'Pizza Dough',       180, 50, 'pieces', '2026-05-01'),
(10008, 202, 'Mozzarella Cheese',  95, 20, 'kg',     '2026-05-01'),
(10009, 202, 'Pepperoni',          55, 15, 'kg',     '2026-05-01'),
(10010, 202, 'Chicken Wings',     120, 30, 'pieces', '2026-05-01'),
(10011, 202, 'Pasta',              75, 20, 'kg',     '2026-05-01'),
(10012, 202, 'Potatoes',          220, 50, 'kg',     '2026-05-01'),
(10013, 203, 'Pizza Dough',       130, 50, 'pieces', '2026-05-01'),
(10014, 203, 'Mozzarella Cheese',  70, 20, 'kg',     '2026-05-01'),
(10015, 203, 'Pepperoni',          40, 15, 'kg',     '2026-05-01'),
(10016, 203, 'Chicken Wings',      90, 30, 'pieces', '2026-05-01'),
(10017, 203, 'Pasta',              50, 20, 'kg',     '2026-05-01'),
(10018, 203, 'Potatoes',          180, 50, 'kg',     '2026-05-01');

-- ============================================
-- Discount Data
-- ============================================
INSERT INTO Discount (Disc_ID, Disc_Name, Disc_Type, Disc_Rate) VALUES
(10001, 'Senior Citizen',  'Percentage', 0.20),
(10002, 'PWD Discount',    'Percentage', 0.20),
(10003, 'Birthday Special','Percentage', 0.15),
(10004, 'Holiday Promo',   'Percentage', 0.10),
(10005, 'Loyalty Reward',  'Percentage', 0.05),
(10006, 'Student Discount','Percentage', 0.10);

-- ============================================
-- Menu Item Discount Data
-- ============================================
INSERT INTO Menu_Item_Discount (MDisc_ID, MDisc_MenuID, MDisc_DiscountID, MDisc_StartDate, MDisc_EndDate) VALUES
(10001, 10001, 10004, '2026-01-01', '2026-12-31'),
(10002, 10003, 10004, '2026-01-01', '2026-12-31'),
(10003, 10007, 10004, '2026-01-01', '2026-12-31'),
(10004, 10002, 10003, '2026-01-01', '2026-12-31'),
(10005, 10011, 10005, '2026-01-01', NULL);

-- ============================================
-- Admin Employee Only
-- Password: admin123 (bcrypt hashed)
-- ============================================
INSERT INTO Employee (Emp_ID, Emp_BranchID, Emp_FName, Emp_LName, Emp_Position, Emp_PhoneNo, Emp_Email, Emp_Password, Emp_HireDate, Emp_Status) VALUES
(10001, 201, 'System', 'Admin', 'Admin', '09190000000', 'admin@shakeys.com', '$2b$10$FPddxPdmhdL.v7tI.huRduvkKGnApf2LpWowL62UkBVFF1qd/Egwa', '2024-01-01', 'Active');