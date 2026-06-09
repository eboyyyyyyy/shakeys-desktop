import {
  collection,
  getDocs,
  query,
  where,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import type { MenuItemWithDiscount } from "@/lib/types";

export interface CompatBranch {
  Brnch_ID: string | number;
  Brnch_Name: string;
  Brnch_Address: string;
  Brnch_City: string;
  Brnch_PhoneNumber: string;
  Brnch_Status: string;
}

export type CompatMenuItem = MenuItemWithDiscount;

function toCompatId(value: unknown, fallback: string): string | number {
  const raw = typeof value === "string" || typeof value === "number" ? value : fallback;
  const numeric = Number(raw);
  return Number.isFinite(numeric) && String(raw).trim() !== "" ? numeric : String(raw);
}

function mapBranch(docId: string, data: DocumentData): CompatBranch {
  return {
    Brnch_ID: toCompatId(data.branchId, docId),
    Brnch_Name: typeof data.name === "string" ? data.name : "Branch",
    Brnch_Address: typeof data.address === "string" ? data.address : "",
    Brnch_City: typeof data.city === "string" ? data.city : "",
    Brnch_PhoneNumber: typeof data.phoneNo === "string" ? data.phoneNo : "",
    Brnch_Status: typeof data.status === "string" ? data.status : "Active",
  };
}

export async function fetchActiveBranches(): Promise<CompatBranch[]> {
  const branchQuery = query(
    collection(db, "branches"),
    where("status", "==", "Active")
  );

  const snapshot = await getDocs(branchQuery);
  return snapshot.docs
    .map((branchDoc) => mapBranch(branchDoc.id, branchDoc.data()))
    .sort((a, b) => {
      const cityCompare = a.Brnch_City.localeCompare(b.Brnch_City);
      if (cityCompare !== 0) {
        return cityCompare;
      }
      return a.Brnch_Name.localeCompare(b.Brnch_Name);
    });
}

function mapMenuItem(docId: string, data: DocumentData): CompatMenuItem {
  const rawMenuId = typeof data.menuItemId === "string" || typeof data.menuItemId === "number"
    ? data.menuItemId
    : docId;
  const menuId = Number(rawMenuId);
  const available = Boolean(data.availability);

  return {
    Menu_ID: Number.isFinite(menuId) ? menuId : 0,
    Menu_Name: typeof data.name === "string" ? data.name : "Menu Item",
    Menu_Description: typeof data.description === "string" ? data.description : null,
    Menu_Image: typeof data.imageUrl === "string" ? data.imageUrl : null,
    Menu_Category: typeof data.category === "string" ? data.category : "Uncategorized",
    Menu_Price: typeof data.price === "number" ? data.price : 0,
    Menu_Availability: available ? "Y" : "N",
    discountRate: undefined,
    discountedPrice: undefined,
  };
}

export async function fetchMenuItems(): Promise<CompatMenuItem[]> {
  const snapshot = await getDocs(collection(db, "menuItems"));
  return snapshot.docs
    .map((menuDoc) => mapMenuItem(menuDoc.id, menuDoc.data()))
    .sort((a, b) => {
      const categoryCompare = a.Menu_Category.localeCompare(b.Menu_Category);
      if (categoryCompare !== 0) {
        return categoryCompare;
      }
      return a.Menu_Name.localeCompare(b.Menu_Name);
    });
}
