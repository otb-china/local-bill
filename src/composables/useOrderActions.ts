import { computed, ref, type ComputedRef, type Ref } from "vue";
import dayjs from "dayjs";
import { showConfirmDialog, showToast } from "vant";
import { LStorage } from "@/utils/localStorage.ts";
import { createEmptyOrderForm, createId, sumOrderValue } from "@/utils/stockData.ts";
import type { Material, Order, OrderEditorType, OrderMonth, Product } from "@/types/stock";

interface UseOrderActionsOptions {
  materials: Ref<Material[]>;
  products: Ref<Product[]>;
  activeProducts: ComputedRef<Product[]>;
  ordersExpanded: Ref<boolean>;
  orderPreviewLimit: number;
  dateFormat: string;
  craftableCountForProduct: (product: Product) => number;
  openMaterialEditor: () => void;
  openProductEditor: () => void;
}

export function useOrderActions(options: UseOrderActionsOptions) {
  const calculation = ref(true);
  const orderInfo = ref({
    type: "add" as OrderEditorType,
    show: false,
    form: createEmptyOrderForm(),
    data: [] as Order[],
    monthData: [] as OrderMonth[],
    editingId: "",
    checkedMonth: "",
  });

  const OrderData = computed(() => {
    const checkedMonth = orderInfo.value.checkedMonth;
    if (checkedMonth) {
      return orderInfo.value.data.filter((item) => item.orderDate?.substring(0, 7) === checkedMonth);
    }
    return orderInfo.value.data;
  });

  const visibleOrders = computed(() => {
    if (options.ordersExpanded.value || OrderData.value.length <= options.orderPreviewLimit) return OrderData.value;
    return OrderData.value.slice(0, options.orderPreviewLimit);
  });

  const collapsedOrdersCount = computed(() => Math.max(0, OrderData.value.length - options.orderPreviewLimit));

  const orderTotal = computed(() => sumOrderValue(orderInfo.value.data));

  const selectedOrderProduct = computed(() => productByName(orderInfo.value.form.title));

  const activeOrderProducts = computed(() => options.activeProducts.value);

  const canSyncCalculation = computed(() => {
    const product = selectedOrderProduct.value;
    if (!product) return false;
    return options.craftableCountForProduct(product) > 0;
  });

  function productByName(name: string) {
    return options.products.value.find((item) => item.name === name);
  }

  function initOrderMonthData() {
    const months = {} as Record<string, number>;

    for (const item of orderInfo.value.data) {
      if (item.orderDate) {
        const month = item.orderDate.substring(0, 7);
        months[month] = (months[month] || 0) + Number(item.value);
      }
    }

    orderInfo.value.monthData = Object.keys(months)
      .sort((a, b) => b.localeCompare(a))
      .map((month) => ({
        month,
        value: months[month],
      }));
  }

  function monthChange(month: string) {
    orderInfo.value.checkedMonth = orderInfo.value.checkedMonth === month ? "" : month;
    options.ordersExpanded.value = false;
  }

  function setOrderDate(date: string) {
    orderInfo.value.form.orderDate = date;
  }

  function onProductChange(productName: string) {
    const product = productByName(productName);
    if (product) {
      orderInfo.value.form.title = product.name;
      orderInfo.value.form.value = product.defaultValue || 0;
      calculation.value = options.craftableCountForProduct(product) > 0;
    }
    if (!orderInfo.value.form.orderDate) {
      orderInfo.value.form.orderDate = dayjs(new Date()).format(options.dateFormat);
    }
  }

  function openCreateOrder() {
    if (!options.materials.value.length) {
      showToast("请先新增备料");
      options.openMaterialEditor();
      return;
    }

    const availableProducts = options.activeProducts.value;
    if (!availableProducts.length) {
      showToast("请先新增货品");
      options.openProductEditor();
      return;
    }
    const firstProduct = availableProducts[0];
    orderInfo.value.type = "add";
    orderInfo.value.form = {
      id: "",
      title: firstProduct.name,
      value: firstProduct.defaultValue || 0,
      orderDate: dayjs(new Date()).format(options.dateFormat),
    };
    calculation.value = true;
    orderInfo.value.show = true;
  }

  function orderSubmit() {
    const currentType = orderInfo.value.type;
    const product = productByName(orderInfo.value.form.title);

    if (currentType === "add") {
      if (calculation.value && product) {
        product.recipe.forEach((recipe) => {
          const material = options.materials.value.find((item) => item.id === recipe.materialId);
          if (material) {
            material.num = Math.max(0, Number(material.num) - Number(recipe.quantity));
          }
        });
        saveMaterials();
      }

      orderInfo.value.data.unshift({
        ...orderInfo.value.form,
        id: createId("order"),
      });
    }

    if (currentType === "upd") {
      const index = orderInfo.value.data.findIndex((item) => item.id === orderInfo.value.editingId);
      if (index >= 0) {
        orderInfo.value.data.splice(index, 1, {
          ...orderInfo.value.form,
          id: orderInfo.value.editingId,
        });
      }
    }

    orderInfo.value.show = false;
    saveOrders();
    orderInfo.value.form = createEmptyOrderForm();
    initOrderMonthData();
  }

  function beforeUpd(item: Order) {
    orderInfo.value.type = "upd";
    orderInfo.value.editingId = item.id;
    orderInfo.value.form = { ...item };
    calculation.value = false;
    orderInfo.value.show = true;
  }

  function deleteOrder(id: string) {
    orderInfo.value.data = orderInfo.value.data.filter((item) => item.id !== id);
    saveOrders();
    initOrderMonthData();
  }

  function returnOrderMaterials(order: Order) {
    const product = productByName(order.title);
    if (!product?.recipe.length) return false;

    product.recipe.forEach((recipe) => {
      const material = options.materials.value.find((item) => item.id === recipe.materialId);
      if (material) {
        material.num = Number(material.num || 0) + Number(recipe.quantity || 0);
      }
    });
    saveMaterials();
    return true;
  }

  function del(order: Order) {
    showConfirmDialog({
      title: "删除订单",
      message: `是否将「${order.title}」消耗的备料返还库存？`,
      confirmButtonText: "返还备料",
      cancelButtonText: "仅删除订单",
    }).then(() => {
      const returned = returnOrderMaterials(order);
      deleteOrder(order.id);
      showToast(returned ? "订单已删除，备料已返还" : "订单已删除，未找到可返还备料");
    }).catch((action) => {
      if (action !== "cancel") return;
      deleteOrder(order.id);
      showToast("订单已删除");
    });
  }

  function saveMaterials() {
    LStorage.data.setter(options.materials.value);
  }

  function saveOrders() {
    LStorage.orderData.setter(orderInfo.value.data);
  }

  return {
    calculation,
    orderInfo,
    OrderData,
    visibleOrders,
    collapsedOrdersCount,
    orderTotal,
    selectedOrderProduct,
    activeOrderProducts,
    canSyncCalculation,
    productByName,
    initOrderMonthData,
    monthChange,
    setOrderDate,
    onProductChange,
    openCreateOrder,
    orderSubmit,
    beforeUpd,
    deleteOrder,
    returnOrderMaterials,
    del,
  };
}
