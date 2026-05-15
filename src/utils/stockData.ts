import type { RSA } from "otb-toolkit/src/types";
import type { Bill, BillItem } from "@/types/stock";

export const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function createEmptyBill(name = "未命名账单"): Bill {
  const now = new Date().toISOString();
  return {
    id: createId("bill"),
    name,
    items: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createEmptyBillItem(): BillItem {
  return {
    id: createId("item"),
    name: "",
    price: 0,
  };
}

export function sumBillItems(items: BillItem[]) {
  return items.reduce((total, item) => total + Number(item.price || 0), 0);
}

export function formatMoney(value: number) {
  return Number(value || 0).toFixed(2);
}

export function normalizeBills(list: RSA[] | undefined): Bill[] {
  const source = Array.isArray(list) ? list : [];
  return source.map((item): Bill => {
    const createdAt = String(item.createdAt || new Date().toISOString());
    return {
      id: String(item.id || createId("bill")),
      name: String(item.name || "未命名账单"),
      createdAt,
      updatedAt: String(item.updatedAt || createdAt),
      items: Array.isArray(item.items)
        ? item.items.map((child: RSA): BillItem => ({
          id: String(child.id || createId("item")),
          name: String(child.name || ""),
          price: Number(child.price || 0),
        }))
        : [],
    };
  }).filter((item) => item.name);
}
