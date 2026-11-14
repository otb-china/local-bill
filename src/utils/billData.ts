import type { RSA } from "otb-toolkit/src/types";
import type { Bill, BillGroup, BillItem, DeletedBill } from "@/types/bill";

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
    subtitle: "",
    items: [],
    groups: [{ id: createId("group"), name: "分组 1" }],
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
    voided: false,
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
    const groups: BillGroup[] = [];
    const groupIds = new Set<string>();
    if (Array.isArray(item.groups)) {
      for (const group of item.groups) {
        if (typeof group?.id !== "string" || !group.id || groupIds.has(group.id)) continue;
        groups.push({ id: group.id, name: String(group.name || "未命名分组") });
        groupIds.add(group.id);
      }
    }
    const items: BillItem[] = Array.isArray(item.items)
      ? item.items.map((child: RSA): BillItem => ({
        id: String(child.id || createId("item")),
        name: String(child.name || ""),
        price: normalizePrice(child.price),
        createdAt: normalizeItemCreatedAt(child.createdAt),
        voided: Boolean(child.voided),
        groupId: groupIds.has(child.groupId) ? child.groupId : undefined,
      }))
      : [];
    const legacyName = typeof item.defaultGroupName === "string" ? item.defaultGroupName.trim() : "";
    if (!groups.length || legacyName || items.some((child) => !child.groupId)) {
      let id = "group-default";
      while (groupIds.has(id)) id += "-legacy";
      groups.unshift({ id, name: legacyName || "分组 1" });
      for (const child of items) child.groupId ??= id;
    }
    return {
      id: String(item.id || createId("bill")),
      name: String(item.name || "未命名账单"),
      subtitle: String(item.subtitle || ""),
      createdAt,
      updatedAt: String(item.updatedAt || createdAt),
      groups,
      itemMode: item.itemMode === "group" || item.itemMode === "date" ? item.itemMode : undefined,
      items,
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

export function mergeBills<T extends Bill>(localBills: T[], importedBills: T[]): T[] {
  const merged = localBills.map((bill): T => ({
    ...bill,
    items: bill.items.map((item) => ({ ...item })),
    groups: bill.groups.map((group) => ({ ...group })),
  }));
  const billKey = (bill: Bill) => JSON.stringify([bill.name, bill.subtitle]);
  const billsByKey = new Map<string, T>();
  const billIds = new Set(merged.map((bill) => bill.id));
  for (const bill of merged) {
    const key = billKey(bill);
    if (!billsByKey.has(key)) billsByKey.set(key, bill);
  }

  for (const imported of importedBills) {
    const key = billKey(imported);
    let target = billsByKey.get(key);
    if (!target) {
      let id = imported.id;
      while (billIds.has(id)) id = createId("bill");
      target = { ...imported, id, items: [], groups: imported.groups.map((group) => ({ ...group })) };
      merged.push(target);
      billsByKey.set(key, target);
      billIds.add(id);
    }

    const groupIds = new Set(target.groups.map((group) => group.id));
    const addedGroups = imported.groups.filter((group) => !groupIds.has(group.id));
    if (addedGroups.length) {
      target.groups.push(...addedGroups.map((group) => ({ ...group })));
    }
    target.itemMode ??= imported.itemMode;
    const itemIds = new Set(target.items.map((item) => item.id));
    let addedItems = false;
    for (const item of imported.items) {
      if (itemIds.has(item.id)) continue;
      target.items.push({ ...item });
      itemIds.add(item.id);
      addedItems = true;
    }
    if (addedItems || addedGroups.length) target.updatedAt = new Date().toISOString();
  }
  return merged;
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
