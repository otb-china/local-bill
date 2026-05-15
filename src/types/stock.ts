import type { RSA } from "otb-toolkit/src/types";

export type ManageTab = "materials" | "products";
export type MaterialGroupKey = "danger" | "warning" | "safe" | "unlinked";
export type EditorType = "add" | "edit";
export type OrderEditorType = "add" | "upd";

export interface Material extends RSA {
  id: string;
  name: string;
  num: number;
}

export interface ProductRecipe extends RSA {
  materialId: string;
  quantity: number;
}

export interface Product extends RSA {
  id: string;
  name: string;
  defaultValue: number;
  status: "active" | "inactive";
  recipe: ProductRecipe[];
}

export interface Order extends RSA {
  id: string;
  title: string;
  value: number;
  orderDate: string;
}

export interface OrderMonth {
  month: string;
  value: number;
}

export interface BackupData extends RSA {
  materials?: RSA[];
  products?: RSA[];
  orders?: RSA[];
  data?: RSA[];
  productData?: RSA[];
  orderData?: RSA[];
}

export interface ResolvedBackupData {
  materials: RSA[];
  products: RSA[];
  orders: RSA[];
}
