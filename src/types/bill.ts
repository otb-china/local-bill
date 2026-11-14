import type { RSA } from "otb-toolkit/src/types";

export interface BillItem extends RSA {
  id: string;
  name: string;
  price: number | "";
  createdAt: string;
  voided?: boolean;
  groupId?: string;
}

export interface BillGroup {
  id: string;
  name: string;
}

export interface Bill extends RSA {
  id: string;
  name: string;
  subtitle: string;
  items: BillItem[];
  groups: BillGroup[];
  itemMode?: "date" | "group";
  createdAt: string;
  updatedAt: string;
}

export interface DeletedBill extends Bill {
  deletedAt: string;
}

export interface LocalBillBackupData extends RSA {
  bills?: RSA[];
  deletedBills?: RSA[];
}
