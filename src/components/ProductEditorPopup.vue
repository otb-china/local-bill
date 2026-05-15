<template>
  <van-popup v-model:show="popupShow" position="bottom" round destroy-on-close>
    <div class="popup-body">
      <div class="popup-head">
        <div>
          <h3>{{ type === "add" ? "新增货品" : "编辑货品" }}</h3>
        </div>
      </div>

      <div class="editor-card">
        <div class="product-editor-grid">
          <label class="editor-field">
            <span>货品名称</span>
            <el-input v-model="form.name" placeholder="货品名称" />
          </label>

          <label class="editor-field">
            <span>收入金额</span>
            <el-input-number
              v-model="form.defaultValue"
              :min="0"
              :max="100000"
              controls-position="right"
              class="editor-number"
            />
          </label>
        </div>
      </div>

      <div class="recipe-header">
        <strong>配方</strong>
        <el-button size="small" plain @click="emit('add-recipe')">新增关联</el-button>
      </div>

      <div class="recipe-card">
        <div v-if="form.recipe.length" class="recipe-list">
          <div v-for="(item, index) in form.recipe" :key="index" class="recipe-row">
            <el-select
              v-model="item.materialId"
              placeholder="选择备料"
              class="recipe-select"
              @change="emit('recipe-material-change', index, $event as string)"
            >
              <el-option
                v-for="material in availableMaterialsForRecipe(index)"
                :key="material.id"
                :label="material.name"
                :value="material.id"
              />
            </el-select>
            <el-input-number
              v-model="item.quantity"
              :min="1"
              :max="1000"
              controls-position="right"
              class="recipe-quantity"
            />
            <button class="mini-action danger recipe-delete icon-only" type="button" @click="emit('remove-recipe', index)">
              <el-icon><Delete /></el-icon>
            </button>
          </div>
        </div>
        <div v-else class="recipe-empty">
          <strong>还没有配方备料</strong>
          <span>点击右上角“新增关联”，添加需要消耗的备料和数量。</span>
        </div>
      </div>

      <el-button
        type="primary"
        size="large"
        class="submit-button"
        :disabled="!canSubmit"
        @click="emit('submit')"
      >
        提交
      </el-button>
    </div>
  </van-popup>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { Delete } from "@element-plus/icons-vue";
import type { EditorType, Material, Product } from "@/types/stock";

const props = defineProps<{
  show: boolean;
  type: EditorType;
  form: Product;
  availableMaterialsForRecipe: (index: number) => Material[];
}>();

const emit = defineEmits<{
  "update:show": [value: boolean];
  "add-recipe": [];
  "recipe-material-change": [index: number, materialId: string];
  "remove-recipe": [index: number];
  submit: [];
}>();

const popupShow = computed({
  get: () => props.show,
  set: (value: boolean) => emit("update:show", value),
});

const canSubmit = computed(() => props.form.name.trim() && props.form.recipe.length);
</script>

<style lang="scss" scoped>
.editor-card,
.recipe-card {
  margin-top: 14px;
  padding: 12px;
  border: 1px solid var(--divider);
  border-radius: 14px;
  background: var(--surface-soft);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.42);
}

.product-editor-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 140px;
  gap: 10px;
}

.editor-field {
  display: block;
}

.editor-field > span {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

.editor-number,
.recipe-select,
.recipe-quantity {
  width: 100%;
}

.recipe-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 18px 0 10px;
}

.recipe-header strong {
  color: var(--text-strong);
  font-size: 18px;
}

.recipe-header :deep(.el-button) {
  border-color: var(--accent-border);
  color: var(--accent);
  background: var(--surface);
  font-weight: 700;
}

.recipe-card {
  padding: 10px;
}

.recipe-list {
  display: grid;
  gap: 8px;
}

.recipe-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 88px 40px;
  gap: 8px;
  align-items: center;
}

.recipe-empty {
  display: grid;
  place-items: center;
  min-height: 72px;
  padding: 12px;
  border: 1px dashed var(--divider);
  border-radius: 12px;
  background: var(--surface);
  text-align: center;
}

.recipe-empty strong,
.recipe-empty span {
  display: block;
}

.recipe-empty strong {
  color: var(--text-strong);
  font-size: 14px;
}

.recipe-empty span {
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.35;
}

.mini-action {
  min-width: 72px;
  padding: 5px 12px;
  border: 0;
  border-radius: 8px;
  background: var(--header-icon-bg);
  color: var(--accent-strong);
  font-size: 12px;
}

.mini-action.danger {
  background: var(--danger-bg);
  color: var(--danger-text);
}

.recipe-delete {
  width: 100%;
  height: 38px;
  min-width: 40px;
  padding: 0;
  border-radius: 10px;
  background: transparent;
  font-size: 16px;
}

.icon-only {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.editor-card :deep(.el-input__wrapper),
.recipe-card :deep(.el-input__wrapper),
.recipe-card :deep(.el-select__wrapper) {
  min-height: 38px;
  border: 1px solid var(--divider);
  border-radius: 10px;
  background: var(--surface);
  box-shadow: none;
}

.editor-card :deep(.el-input__wrapper.is-focus),
.editor-card :deep(.el-input__wrapper:hover),
.editor-card :deep(.el-input__wrapper:focus-within),
.recipe-card :deep(.el-input__wrapper.is-focus),
.recipe-card :deep(.el-input__wrapper:hover),
.recipe-card :deep(.el-input__wrapper:focus-within),
.recipe-card :deep(.el-select__wrapper.is-focused),
.recipe-card :deep(.el-select__wrapper:hover) {
  border-color: var(--divider);
  box-shadow: none;
}

.editor-card :deep(.el-input-number),
.recipe-card :deep(.el-input-number) {
  height: 38px;
  border: 1px solid var(--divider);
  border-radius: 10px;
  background: var(--surface);
  overflow: hidden;
}

.editor-card :deep(.el-input-number .el-input__wrapper),
.recipe-card :deep(.el-input-number .el-input__wrapper) {
  height: 100%;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.editor-card :deep(.el-input-number.is-focus),
.editor-card :deep(.el-input-number:hover),
.editor-card :deep(.el-input-number:focus-within),
.recipe-card :deep(.el-input-number.is-focus),
.recipe-card :deep(.el-input-number:hover),
.recipe-card :deep(.el-input-number:focus-within) {
  border-color: var(--divider);
}

.editor-card :deep(.el-input-number .el-input__wrapper.is-focus),
.editor-card :deep(.el-input-number .el-input__wrapper:focus-within),
.recipe-card :deep(.el-input-number .el-input__wrapper.is-focus),
.recipe-card :deep(.el-input-number .el-input__wrapper:focus-within) {
  border-color: transparent;
  box-shadow: none !important;
}

.editor-card :deep(.el-input-number .el-input__inner:focus),
.recipe-card :deep(.el-input-number .el-input__inner:focus) {
  outline: none;
  box-shadow: none;
}

.editor-card :deep(.el-input-number__decrease),
.editor-card :deep(.el-input-number__increase),
.recipe-card :deep(.el-input-number__decrease),
.recipe-card :deep(.el-input-number__increase) {
  border-color: var(--divider);
  background: var(--surface-soft);
  color: var(--text-muted);
}

.editor-card :deep(.el-input-number.is-controls-right .el-input-number__increase),
.editor-card :deep(.el-input-number.is-controls-right .el-input-number__decrease),
.recipe-card :deep(.el-input-number.is-controls-right .el-input-number__increase),
.recipe-card :deep(.el-input-number.is-controls-right .el-input-number__decrease) {
  height: 50%;
  line-height: 1;
}

.editor-card :deep(.el-input-number.is-controls-right .el-input-number__increase),
.recipe-card :deep(.el-input-number.is-controls-right .el-input-number__increase) {
  top: 0;
  bottom: auto;
}

.editor-card :deep(.el-input-number.is-controls-right .el-input-number__decrease),
.recipe-card :deep(.el-input-number.is-controls-right .el-input-number__decrease) {
  top: auto;
  bottom: 0;
}

.editor-card :deep(.el-input__inner),
.recipe-card :deep(.el-input__inner) {
  color: var(--text-main);
  font-weight: 600;
}

@media (max-width: 720px) {
  .product-editor-grid {
    grid-template-columns: minmax(0, 1fr) 110px;
    align-items: end;
  }

  .recipe-row {
    grid-template-columns: minmax(0, 1fr) 96px 48px;
  }
}
</style>
