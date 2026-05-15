import { computed, ref, type Ref } from "vue";
import dayjs from "dayjs";
import { showConfirmDialog, showToast } from "vant";
import { LStorage } from "@/utils/localStorage.ts";
import { assertValidBackupData, resolveBackupData } from "@/utils/stockData.ts";
import type { BackupData, Material, Order, OrderMonth, Product } from "@/types/stock";

interface OrderState {
  data: Order[];
  monthData: OrderMonth[];
  checkedMonth: string;
}

interface UseBackupActionsOptions {
  materials: Ref<Material[]>;
  products: Ref<Product[]>;
  orderInfo: Ref<OrderState>;
  ordersExpanded: Ref<boolean>;
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
    return `导入后将覆盖 ${options.materials.value.length} 项备料 · ${options.products.value.length} 个货品 · ${options.orderInfo.value.data.length} 条订单`;
  });

  const hasImportOverwriteData = computed(() => {
    return options.materials.value.length > 0 || options.products.value.length > 0 || options.orderInfo.value.data.length > 0;
  });

  function openImportExport() {
    options.settingsPopup.value = false;
    importInfo.value.dataStr = "";
    importInfo.value.fileName = "";
    importExportInfo.value.show = true;
  }

  function createBackupData() {
    return {
      materials: options.materials.value,
      products: options.products.value,
      orders: options.orderInfo.value.data,
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
      message: "确认清除所有备料、货品和订单数据吗？",
      width: "250px",
    }).then(() => {
      options.materials.value = [];
      options.products.value = [];
      options.orderInfo.value.data = [];
      options.orderInfo.value.monthData = [];
      options.orderInfo.value.checkedMonth = "";
      options.ordersExpanded.value = false;
      LStorage.data.setter([]);
      LStorage.productData.setter([]);
      LStorage.orderData.setter([]);
      options.settingsPopup.value = false;
      showToast("数据已重置");
    }).catch(() => {
    });
  }

  function importData() {
    try {
      const parsedData = JSON.parse(importInfo.value.dataStr) as BackupData;
      if (!parsedData || typeof parsedData !== "object" || Array.isArray(parsedData)) {
        throw new Error("Invalid backup data");
      }
      const { materials, products, orders } = resolveBackupData(parsedData);
      assertValidBackupData({ materials, products, orders });
      LStorage.data.setter(materials);
      LStorage.productData.setter(products);
      LStorage.orderData.setter(orders);
      options.initData();
      importExportInfo.value.show = false;
      importInfo.value.dataStr = "";
      importInfo.value.fileName = "";
      showToast("总数据导入成功");
    } catch {
      showToast("导入失败，请检查备份文件");
    }
  }

  return {
    importExportInfo,
    importInfo,
    importExportSummary,
    hasImportOverwriteData,
    openImportExport,
    createBackupData,
    exportAllData,
    onImportFileLoaded,
    resetAllData,
    importData,
  };
}
