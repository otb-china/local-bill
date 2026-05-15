import { ref, type Ref } from "vue";
import { showConfirmDialog, showToast } from "vant";
import { LStorage } from "@/utils/localStorage.ts";
import { createEmptyMaterialForm, createId } from "@/utils/stockData.ts";
import type { EditorType, Material, Product } from "@/types/stock";

export function useMaterialEditor(materials: Ref<Material[]>, products: Ref<Product[]>) {
  const materialEditor = ref({
    show: false,
    type: "add" as EditorType,
    form: createEmptyMaterialForm(),
  });

  function saveMaterials() {
    LStorage.data.setter(materials.value);
  }

  function saveProducts() {
    LStorage.productData.setter(products.value);
  }

  function openMaterialEditor(item?: Material) {
    materialEditor.value.type = item ? "edit" : "add";
    materialEditor.value.form = item
      ? { ...item }
      : createEmptyMaterialForm();
    materialEditor.value.show = true;
  }

  function submitMaterialEditor() {
    const name = materialEditor.value.form.name.trim();
    if (!name) {
      showToast("请输入备料名称");
      return;
    }

    const duplicated = materials.value.some((item) => item.name === name && item.id !== materialEditor.value.form.id);
    if (duplicated) {
      showToast("备料名称已存在");
      return;
    }

    if (materialEditor.value.type === "add") {
      materials.value.push({
        id: createId("material"),
        name,
        num: Number(materialEditor.value.form.num || 0),
      });
    } else {
      const index = materials.value.findIndex((item) => item.id === materialEditor.value.form.id);
      if (index >= 0) {
        materials.value.splice(index, 1, {
          ...materials.value[index],
          name,
          num: Number(materialEditor.value.form.num || 0),
        });
      }
    }

    saveMaterials();
    materialEditor.value.show = false;
  }

  function removeMaterial(id: string) {
    showConfirmDialog({
      title: "提示",
      message: "删除备料后，相关货品配方也会移除该备料，确认继续吗？",
    }).then(() => {
      materials.value = materials.value.filter((item) => item.id !== id);
      products.value = products.value.map((product) => ({
        ...product,
        recipe: product.recipe.filter((item) => item.materialId !== id),
      }));
      saveMaterials();
      saveProducts();
      showToast("备料已删除");
    }).catch(() => {
    });
  }

  return {
    materialEditor,
    saveMaterials,
    openMaterialEditor,
    submitMaterialEditor,
    removeMaterial,
  };
}
