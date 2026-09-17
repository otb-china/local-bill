import { computed, ref, type Ref } from "vue";
import dayjs from "dayjs";
import { showConfirmDialog, showToast } from "vant";
import { LStorage } from "@/utils/localStorage.ts";
import { mergeBills, normalizeBills, normalizeDeletedBills } from "@/utils/billData.ts";
import type { Bill, DeletedBill, LocalBillBackupData } from "@/types/bill";

interface UseBackupActionsOptions {
  bills: Ref<Bill[]>;
  deletedBills: Ref<DeletedBill[]>;
  settingsPopup: Ref<boolean>;
  dateFormat: string;
  initData: () => void;
}

export function useBackupActions(options: UseBackupActionsOptions) {
  const importExportInfo = ref({
    show: false,
  });
  const importInfo = ref({
    dataStr: "",
    fileName: "",
  });

  const importExportSummary = computed(() => {
    return `本地已有 ${options.bills.value.length} 个账单，导入后将合并保留`;
  });

  const hasImportLocalData = computed(() => {
    return options.bills.value.length > 0;
  });

  function openImportExport() {
    options.settingsPopup.value = false;
    importInfo.value.dataStr = "";
    importInfo.value.fileName = "";
    importExportInfo.value.show = true;
  }

  function createBackupData() {
    return {
      bills: options.bills.value,
      deletedBills: options.deletedBills.value,
    };
  }

  function exportAllData() {
    const backupText = JSON.stringify(createBackupData(), null, 2);
    const blob = new Blob([backupText], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = `local-bill-backup-${dayjs(new Date()).format(options.dateFormat)}.json`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
    options.settingsPopup.value = false;
    showToast("备份文件已导出");
  }

  function onImportFileLoaded(payload: { dataStr: string; fileName: string }) {
    importInfo.value.dataStr = payload.dataStr;
    importInfo.value.fileName = payload.fileName;
    showToast("备份文件已读取");
  }

  function resetAllData() {
    showConfirmDialog({
      title: "提示",
      message: "确认清除所有账单数据吗？",
      width: "250px",
    }).then(() => {
      options.bills.value = [];
      options.deletedBills.value = [];
      LStorage.new("localBillData").remove();
      LStorage.new("localBillRecycleBin").remove();
      options.settingsPopup.value = false;
      showToast("数据已重置");
    }).catch(() => {
    });
  }

  function importData() {
    try {
      const parsedData = JSON.parse(importInfo.value.dataStr) as LocalBillBackupData;
      if (!parsedData || typeof parsedData !== "object" || Array.isArray(parsedData)) {
        throw new Error("Invalid backup data");
      }
      const bills = normalizeBills(parsedData.bills);
      const deletedBills = normalizeDeletedBills(parsedData.deletedBills);
      if (!Array.isArray(parsedData.bills) || bills.length !== parsedData.bills.length) {
        throw new Error("Invalid bills");
      }
      const mergedBills = mergeBills(options.bills.value, bills);
      const mergedDeletedBills = mergeBills(options.deletedBills.value, deletedBills);
      LStorage.new("localBillData").setter(mergedBills);
      LStorage.new("localBillRecycleBin").setter(mergedDeletedBills);
      options.initData();
      importExportInfo.value.show = false;
      importInfo.value.dataStr = "";
      importInfo.value.fileName = "";
      showToast("总数据合并导入成功");
    } catch {
      showToast("导入失败，请检查备份文件");
    }
  }

  return {
    importExportInfo,
    importInfo,
    importExportSummary,
    hasImportLocalData,
    openImportExport,
    createBackupData,
    exportAllData,
    onImportFileLoaded,
    resetAllData,
    importData,
  };
}
