<template>
  <van-popup v-model:show="popupShow" position="bottom" destroy-on-close round>
    <div class="popup-body order-popup">
      <div class="popup-head order-popup-head">
        <div>
          <p class="section-tag">Order</p>
          <h3>{{ type === "add" ? "新增订单" : "编辑订单" }}</h3>
          <p>{{ type === "add" ? "选择货品后会自动带出收入金额。" : "调整订单信息后保存。" }}</p>
        </div>
      </div>

      <div class="order-product-list">
        <button
          v-for="product in products"
          :key="product.id"
          class="order-product-card"
          :class="{ active: form.title === product.name }"
          type="button"
          @click="emit('product-change', product.name)"
        >
          <span>
            <strong>{{ product.name }}</strong>
          </span>
          <em>可制 {{ craftableCountForProduct(product) }}</em>
        </button>
      </div>

      <div class="order-form-card">
        <label class="order-field">
          <span>收入金额</span>
          <van-field
            v-model="form.value"
            class="order-control"
            type="digit"
            placeholder="请输入收入金额"
            right-icon="edit"
            clearable
          />
        </label>

        <label class="order-field">
          <span>下单日期</span>
          <DatePicker
            class-name="order-control date-control"
            placeholder="下单日期"
            :default-date="form.orderDate"
            @date-change="emit('date-change', $event)"
          />
        </label>
      </div>

      <div v-if="type === 'add'" class="sync-card" :class="{ active: calculationModel }">
        <div>
          <strong>同步计算备料</strong>
          <span>
            {{
              canSyncCalculation
                ? (calculationModel ? "提交后自动扣减所选货品库存" : "仅记录订单，不扣减库存")
                : "当前货品可制 0，不能同步计算备料"
            }}
          </span>
        </div>
        <el-switch v-model="calculationModel" :disabled="!canSyncCalculation" />
      </div>

      <el-button
        type="primary"
        size="large"
        class="submit-button"
        :disabled="!(form.title && form.value)"
        @click="emit('submit')"
      >
        提交
      </el-button>
    </div>
  </van-popup>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import DatePicker from "@/components/Date.vue";
import type { Order, OrderEditorType, Product } from "@/types/stock";

const props = defineProps<{
  show: boolean;
  type: OrderEditorType;
  form: Order;
  products: Product[];
  calculation: boolean;
  canSyncCalculation: boolean;
  craftableCountForProduct: (product: Product) => number;
}>();

const emit = defineEmits<{
  "update:show": [value: boolean];
  "update:calculation": [value: boolean];
  "product-change": [productName: string];
  "date-change": [date: string];
  submit: [];
}>();

const popupShow = computed({
  get: () => props.show,
  set: (value: boolean) => emit("update:show", value),
});

const calculationModel = computed({
  get: () => props.calculation,
  set: (value: boolean) => emit("update:calculation", value),
});
</script>

<style lang="scss" scoped>
.section-tag {
  margin: 0 0 4px;
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.order-popup {
  background: linear-gradient(180deg, var(--surface) 0%, var(--surface-soft) 100%);
}

.order-popup-head {
  align-items: flex-start;
  padding: 2px 2px 14px;
}

.order-popup-head > div:first-child {
  min-width: 0;
}

.order-product-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.order-product-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  min-height: 52px;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: var(--surface);
  text-align: left;
  box-shadow: 0 8px 18px rgba(38, 56, 88, 0.05);
}

.order-product-card span,
.order-product-card strong {
  display: block;
}

.order-product-card span {
  min-width: 0;
}

.order-product-card strong {
  color: var(--text-main);
  font-size: 14px;
  line-height: 1.2;
}

.order-product-card em {
  flex: 0 0 auto;
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--header-icon-bg);
  color: var(--accent-strong);
  font-size: 11px;
  font-style: normal;
  font-weight: 700;
}

.order-product-card.active {
  border-color: var(--accent-border);
  background: var(--settings-card-bg);
}

.order-product-card.active strong {
  color: var(--accent);
}

.order-form-card,
.sync-card {
  margin-top: 12px;
  padding: 14px;
  border-radius: 10px;
  background: var(--surface);
  box-shadow: 0 8px 18px rgba(38, 56, 88, 0.05);
}

.order-field {
  display: block;
}

.order-field + .order-field {
  margin-top: 12px;
}

.order-field > span {
  display: block;
  margin-bottom: 7px;
  color: var(--text-muted);
  font-size: 12px;
}

.order-form-card :deep(.van-field) {
  margin-bottom: 0;
  padding: 12px 14px;
  border: 1px solid var(--divider);
  border-radius: 10px;
  background: var(--field-bg);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.42);
}

.order-form-card :deep(.van-field__control) {
  font-size: 16px;
  font-weight: 600;
}

.order-form-card :deep(.van-icon) {
  color: var(--accent);
}

.order-form-card :deep(.date-control .van-field) {
  cursor: pointer;
}

.sync-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid transparent;
}

.sync-card.active {
  border-color: var(--accent-border);
  background: var(--settings-card-bg);
}

.sync-card strong,
.sync-card span {
  display: block;
}

.sync-card strong {
  color: var(--text-main);
  font-size: 14px;
}

.sync-card span {
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.35;
}

@media (max-width: 720px) {
  .order-product-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
