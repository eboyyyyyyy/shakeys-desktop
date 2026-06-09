import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadEnvFile();

function getServiceAccount() {
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY in your environment."
    );
  }

  return { projectId, clientEmail, privateKey };
}

const serviceAccount = getServiceAccount();

const app =
  getApps()[0] ??
  initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.projectId,
  });

const db = getFirestore(app);

const menuItems = [
  {
    menuItemId: "10001",
    name: "Classic Thin Crust Pizza",
    description: "Our signature thin crust pizza with tomato sauce and mozzarella",
    category: "Pizza",
    price: 399,
    availability: true,
    imageUrl: "",
  },
  {
    menuItemId: "10002",
    name: "Hawaiian Delight",
    description: "Ham, pineapple, and mozzarella on thin crust",
    category: "Pizza",
    price: 449,
    availability: true,
    imageUrl: "",
  },
  {
    menuItemId: "10003",
    name: "Pepperoni Lovers",
    description: "Loaded with pepperoni and extra cheese",
    category: "Pizza",
    price: 499,
    availability: true,
    imageUrl: "",
  },
  {
    menuItemId: "10004",
    name: "Manager Choice",
    description: "Premium toppings selected by our branch manager",
    category: "Pizza",
    price: 549,
    availability: true,
    imageUrl: "",
  },
  {
    menuItemId: "10005",
    name: "Garden Special",
    description: "Fresh vegetables with mushrooms and olives",
    category: "Pizza",
    price: 429,
    availability: true,
    imageUrl: "",
  },
  {
    menuItemId: "10006",
    name: "Four Seasons",
    description: "Four different toppings in one pizza",
    category: "Pizza",
    price: 579,
    availability: true,
    imageUrl: "",
  },
  {
    menuItemId: "10007",
    name: "Chicken N Mojos",
    description: "Crispy fried chicken with seasoned mojos",
    category: "Chicken",
    price: 299,
    availability: true,
    imageUrl: "",
  },
  {
    menuItemId: "10008",
    name: "Garlic Butter Chicken",
    description: "Chicken glazed with garlic butter sauce",
    category: "Chicken",
    price: 329,
    availability: true,
    imageUrl: "",
  },
  {
    menuItemId: "10009",
    name: "Buffalo Wings",
    description: "Spicy buffalo wings with blue cheese dip",
    category: "Chicken",
    price: 279,
    availability: true,
    imageUrl: "",
  },
  {
    menuItemId: "10010",
    name: "Honey Glazed Chicken",
    description: "Sweet honey glazed fried chicken",
    category: "Chicken",
    price: 319,
    availability: true,
    imageUrl: "",
  },
  {
    menuItemId: "10011",
    name: "Carbonara Supreme",
    description: "Creamy carbonara with bacon bits",
    category: "Pasta",
    price: 249,
    availability: true,
    imageUrl: "",
  },
  {
    menuItemId: "10012",
    name: "Classic Spaghetti",
    description: "Meaty spaghetti with special sauce",
    category: "Pasta",
    price: 229,
    availability: true,
    imageUrl: "",
  },
  {
    menuItemId: "10013",
    name: "Baked Ziti",
    description: "Baked ziti with meat sauce and cheese",
    category: "Pasta",
    price: 269,
    availability: true,
    imageUrl: "",
  },
  {
    menuItemId: "10014",
    name: "Garlic Shrimp Pasta",
    description: "Pasta with garlic shrimp and olive oil",
    category: "Pasta",
    price: 299,
    availability: true,
    imageUrl: "",
  },
  {
    menuItemId: "10015",
    name: "Mojos Regular",
    description: "Seasoned potato mojos",
    category: "Sides",
    price: 99,
    availability: true,
    imageUrl: "",
  },
  {
    menuItemId: "10016",
    name: "Mojos Large",
    description: "Large serving of seasoned potato mojos",
    category: "Sides",
    price: 149,
    availability: true,
    imageUrl: "",
  },
  {
    menuItemId: "10017",
    name: "Garlic Bread",
    description: "Toasted garlic bread slices",
    category: "Sides",
    price: 79,
    availability: true,
    imageUrl: "",
  },
  {
    menuItemId: "10018",
    name: "Coleslaw",
    description: "Fresh creamy coleslaw",
    category: "Sides",
    price: 69,
    availability: true,
    imageUrl: "",
  },
  {
    menuItemId: "10019",
    name: "Pepsi Regular",
    description: "Regular size Pepsi",
    category: "Drinks",
    price: 49,
    availability: true,
    imageUrl: "",
  },
  {
    menuItemId: "10020",
    name: "Pepsi Large",
    description: "Large size Pepsi",
    category: "Drinks",
    price: 69,
    availability: true,
    imageUrl: "",
  },
  {
    menuItemId: "10021",
    name: "Mountain Dew Regular",
    description: "Regular size Mountain Dew",
    category: "Drinks",
    price: 49,
    availability: true,
    imageUrl: "",
  },
  {
    menuItemId: "10022",
    name: "Iced Tea",
    description: "Refreshing iced tea",
    category: "Drinks",
    price: 59,
    availability: true,
    imageUrl: "",
  },
  {
    menuItemId: "10023",
    name: "Bottled Water",
    description: "Purified drinking water",
    category: "Drinks",
    price: 35,
    availability: true,
    imageUrl: "",
  },
  {
    menuItemId: "10024",
    name: "Halo-Halo",
    description: "Filipino shaved ice dessert",
    category: "Desserts",
    price: 129,
    availability: true,
    imageUrl: "",
  },
  {
    menuItemId: "10025",
    name: "Mango Graham",
    description: "Layered mango graham dessert",
    category: "Desserts",
    price: 119,
    availability: true,
    imageUrl: "",
  },
  {
    menuItemId: "10026",
    name: "Ice Cream Sundae",
    description: "Vanilla ice cream with toppings",
    category: "Desserts",
    price: 89,
    availability: true,
    imageUrl: "",
  },
];

async function main() {
  const batch = db.batch();

  for (const item of menuItems) {
    const ref = db.collection("menuItems").doc(item.menuItemId);
    batch.set(
      ref,
      {
        ...item,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      { merge: true }
    );
  }

  await batch.commit();
  console.log(`Seeded ${menuItems.length} menu items into Firestore.`);
}

main().catch((error) => {
  console.error("Failed to seed Firestore menu items.");
  console.error(error);
  process.exit(1);
});
