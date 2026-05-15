import { computed, type Ref } from "vue";
import type { Material, MaterialGroupKey, Product } from "@/types/stock";

export function useMaterialStatus(materials: Ref<Material[]>, products: Ref<Product[]>) {
  const materialsMap = computed(() => {
    return new Map(materials.value.map((item) => [item.id, item]));
  });

  const activeProducts = computed(() => {
    return products.value.filter((item) => item.status === "active");
  });

  function craftableCountForProduct(product: Product) {
    if (!product.recipe.length) return 0;
    const counts = product.recipe.map((recipe) => {
      const material = materialsMap.value.get(recipe.materialId);
      if (!material || recipe.quantity <= 0) return 0;
      return Math.floor(Number(material.num || 0) / Number(recipe.quantity));
    });
    return Math.min(...counts);
  }

  function activeRelatedProducts(materialId: string) {
    return activeProducts.value.filter((product) => product.recipe.some((item) => item.materialId === materialId));
  }

  function materialCraftableCount(materialId: string) {
    const material = materialsMap.value.get(materialId);
    const list = activeRelatedProducts(materialId);
    if (!material || !list.length) return 0;
    const counts = list.map((product) => {
      const recipeItem = product.recipe.find((item) => item.materialId === materialId);
      if (!recipeItem || Number(recipeItem.quantity) <= 0) return 0;
      return Math.floor(Number(material.num || 0) / Number(recipeItem.quantity));
    });
    return Math.min(...counts);
  }

  function materialStatus(item: Material) {
    if (Number(item.num) <= 0) return "danger";
    const list = activeRelatedProducts(item.id);
    if (!list.length) return "safe";
    const count = materialCraftableCount(item.id);
    if (count <= 0) return "danger";
    if (count < 2) return "warning";
    return "safe";
  }

  function materialGroupKey(item: Material): MaterialGroupKey {
    if (!activeRelatedProducts(item.id).length) return "unlinked";
    return materialStatus(item);
  }

  function materialRelatedSummary(materialId: string) {
    const activeList = activeRelatedProducts(materialId);
    if (!activeList.length) return "未关联货品";
    return `关联 ${activeList.map((product) => product.name).join("、")}`;
  }

  function materialStatusText(item: Material) {
    const status = materialGroupKey(item);
    if (status === "unlinked") return "未关联";
    if (status === "danger") return "缺货";
    return `可制 ${materialCraftableCount(item.id)}`;
  }

  function materialStatusClass(item: Material) {
    return `status-${materialGroupKey(item)}`;
  }

  function productStatusClass(status: Product["status"]) {
    return `status-${status}`;
  }

  function recipePreview(product: Product) {
    if (!product.recipe.length) return "未配置备料";
    return product.recipe
      .map((item) => `${materialsMap.value.get(item.materialId)?.name || "未知备料"} x${item.quantity}`)
      .join("、");
  }

  return {
    materialsMap,
    activeProducts,
    craftableCountForProduct,
    activeRelatedProducts,
    materialCraftableCount,
    materialStatus,
    materialGroupKey,
    materialRelatedSummary,
    materialStatusText,
    materialStatusClass,
    productStatusClass,
    recipePreview,
  };
}
