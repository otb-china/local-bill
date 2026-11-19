import { readStoredValue, StorageConflictError, writeStoredValues } from "./toolStorage";

const pending = new Map<string, string | null>();
let scheduled: Promise<void> | undefined;

function scheduleWrite(key: string, value: string | null) {
  pending.set(key, value);
  scheduled ??= Promise.resolve().then(() => {
    const changes = Object.fromEntries(pending);
    pending.clear();
    scheduled = undefined;
    return writeStoredValues(changes);
  });
  return scheduled;
}

let lastReportedError: unknown;

function reportSaveError(error: unknown) {
  if (lastReportedError === error) return;
  lastReportedError = error;
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    window.alert("站点存储空间不足，改动未保存。请先导出当前数据，再退出或刷新网页。");
    return;
  }
  window.alert(error instanceof StorageConflictError
    ? "此工具的数据已在另一页面更新。本页的改动未保存，请先导出当前数据，再刷新。"
    : "数据未保存，请先导出当前数据，再检查存储空间。");
}

class LStorageConstructor {
  private readonly key: string;

  constructor(key: string) {
    this.key = key;
  }

  setter(data: unknown) {
    return scheduleWrite(this.key, JSON.stringify(data) ?? null);
  }

  getter() {
    const value = readStoredValue(this.key)
    if (value !== null) return JSON.parse(value)
  }

  remove() {
    return scheduleWrite(this.key, null)
  }
}

export const LStorage = {
  new: (key: string) => new LStorageConstructor(key)
}

export { reportSaveError };
