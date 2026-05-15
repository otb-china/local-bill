import { ref, type Ref } from "vue";
import { showConfirmDialog, showToast } from "vant";
import { LStorage } from "@/utils/localStorage.ts";
import { createEmptyProductForm, createId } from "@/utils/stockData.ts";
import type { EditorType, Material, Product } from "@/types/stock";

interface UseProductEditorOptions {
  openMaterialEditor?: () => void;
}

export function useProductEditor(
  materials: Ref<Material[]>,
  products: Ref<Product[]>,
  options: UseProductEditorOptions = {},
) {
  const productEditor = ref({
    show: false,
    type: "add" as EditorType,
    form: createEmptyProductForm(),
  });

  function saveProducts() {
    LStorage.productData.setter(products.value);
  }

  function openProductEditor(product?: Product) {
    if (!product && !materials.value.length) {
      showToast("请先新增备料");
      options.openMaterialEditor?.();
      return;
    }

    productEditor.value.type = product ? "edit" : "add";
    productEditor.value.form = product
      ? {
        ...product,
        recipe: product.recipe.map((item) => ({ ...item })),
      }
      : createEmptyProductForm();
    productEditor.value.show = true;
  }

  function addRecipeItem() {
    const selectedIds = productEditor.value.form.recipe.map((item) => item.materialId).filter(Boolean);
    const nextMaterial = materials.value.find((material) => !selectedIds.includes(material.id));
    if (!nextMaterial) {
      showToast("没有可选的备料了");
      return;
    }
    productEditor.value.form.recipe.push({
      materialId: nextMaterial.id,
      quantity: 1,
    });
  }

  function toggleProductStatus(product: Product) {
    const nextStatus = product.status === "active" ? "inactive" : "active";
    const index = products.value.findIndex((item) => item.id === product.id);
    if (index < 0) return;

    products.value.splice(index, 1, {
      ...products.value[index],
      status: nextStatus,
    });
    saveProducts();
    showToast(nextStatus === "active" ? "货品已设为正常" : "货品已设为停产");
  }

  function availableMaterialsForRecipe(index: number) {
    const selectedIds = productEditor.value.form.recipe
      .map((item, currentIndex) => currentIndex === index ? "" : item.materialId)
      .filter(Boolean);

    return materials.value.filter((material) => {
      return !selectedIds.includes(material.id) || material.id === productEditor.value.form.recipe[index]?.materialId;
    });
  }

  function onRecipeMaterialChange(index: number, materialId: string) {
    const duplicated = productEditor.value.form.recipe.some((item, currentIndex) => {
      return currentIndex !== index && item.materialId === materialId;
    });

    if (duplicated) {
      showToast("该备料已经选择过了");
      productEditor.value.form.recipe[index].materialId = "";
    }
  }

  function removeRecipeItem(index: number) {
    productEditor.value.form.recipe.splice(index, 1);
  }

  function submitProductEditor() {
    const name = productEditor.value.form.name.trim();
    if (!name) {
      showToast("请输入货品名称");
      return;
    }

    const validRecipe = productEditor.value.form.recipe
      .filter((item) => item.materialId && Number(item.quantity) > 0)
      .map((item) => ({
        materialId: item.materialId,
        quantity: Number(item.quantity),
      }));

    if (!validRecipe.length) {
      showToast("请至少配置一个备料");
      return;
    }

    const duplicatedMaterial = new Set(validRecipe.map((item) => item.materialId));
    if (duplicatedMaterial.size !== validRecipe.length) {
      showToast("同一个备料请只配置一次");
      return;
    }

    const duplicated = products.value.some((item) => item.name === name && item.id !== productEditor.value.form.id);
    if (duplicated) {
      showToast("货品名称已存在");
      return;
    }

    const productPayload: Product = {
      id: productEditor.value.form.id || createId("product"),
      name,
      defaultValue: Number(productEditor.value.form.defaultValue || 0),
      status: productEditor.value.form.status,
      recipe: validRecipe,
    };

    if (productEditor.value.type === "add") {
      products.value.push(productPayload);
    } else {
      const index = products.value.findIndex((item) => item.id === productEditor.value.form.id);
      if (index >= 0) {
        products.value.splice(index, 1, productPayload);
      }
    }

    saveProducts();
    productEditor.value.show = false;
  }

  function removeProduct(id: string) {
    showConfirmDialog({
      title: "提示",
      message: "确认删除这个货品吗？",
    }).then(() => {
      products.value = products.value.filter((item) => item.id !== id);
      saveProducts();
      showToast("货品已删除");
    }).catch(() => {
    });
  }

  return {
    productEditor,
    saveProducts,
    openProductEditor,
    addRecipeItem,
    toggleProductStatus,
    availableMaterialsForRecipe,
    onRecipeMaterialChange,
    removeRecipeItem,
    submitProductEditor,
    removeProduct,
  };
}
