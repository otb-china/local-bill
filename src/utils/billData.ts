import type { RSA } from "otb-toolkit/src/types";
import type { Bill, BillItem, DeletedBill } from "@/types/bill";

export const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function formatLocalDateTime(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-") + ` ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

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
    price: "",
    createdAt: formatLocalDateTime(),
  };
}

export function sumBillItems(items: BillItem[]) {
  return items.reduce((total, item) => total + Number(item.price || 0), 0);
}

export function formatMoney(value: number) {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 10000) {
    return `${(amount / 10000).toFixed(2)}万`;
  }
  return amount.toFixed(2);
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
          price: normalizePrice(child.price),
          createdAt: normalizeItemCreatedAt(child.createdAt),
        }))
        : [],
    };
  }).filter((item) => item.name);
}

export function normalizeDeletedBills(list: RSA[] | undefined): DeletedBill[] {
  const source = Array.isArray(list) ? list : [];
  return normalizeBills(source).map((item, index) => ({
    ...item,
    deletedAt: String(source[index]?.deletedAt || new Date().toISOString()),
  }));
}

function normalizePrice(value: unknown): number | "" {
  if (value === "" || value === null || value === undefined) return "";
  const price = Number(value);
  return Number.isFinite(price) ? price : "";
}

function normalizeItemCreatedAt(value: unknown) {
  if (!value) return "";
  const text = String(value).trim();
  const date = parseLocalDateTime(text) || new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return formatLocalDateTime(date);
}

function parseLocalDateTime(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
}
