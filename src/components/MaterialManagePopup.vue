<template>
  <van-popup v-model:show="popupShow" position="bottom" round destroy-on-close>
    <div class="popup-body manage-popup-body">
      <div class="popup-head MB12">
        <div>
          <h3>备料管理</h3>
          <p>{{ description }}</p>
        </div>
        <button class="popup-create-btn" type="button" @click="emit('create')">
          <el-icon><Plus /></el-icon>
          <span>{{ createText }}</span>
        </button>
      </div>

      <div class="manage-list-scroll">
        <div v-if="!groups.length" class="manage-empty">
          <strong>还没有备料</strong>
          <span>新增备料后，可以在货品配方里选择并计算库存。</span>
        </div>

        <section
          v-else
          v-for="group in groups"
          :key="group.key"
          class="material-group"
          :class="{ collapsed: group.collapsed }"
        >
          <button class="material-group-head" type="button" @click="emit('toggle-group', group.key)">
            <span>{{ group.title }}</span>
            <small>{{ group.items.length }}项</small>
          </button>

          <div v-if="!group.collapsed" class="material-group-list">
            <van-swipe-cell v-for="item in group.items" :key="item.id" class="manage-swipe-cell">
              <div class="material-row" :class="materialStatusClass(item)">
                <div class="material-info">
                  <div class="material-title-row">
                    <strong>{{ item.name }}</strong>
                    <span class="material-status" :class="materialStatusClass(item)">
                      {{ materialStatusText(item) }}
                    </span>
                  </div>
                  <small>{{ materialRelatedSummary(item.id) }}</small>
                </div>

                <div class="material-metrics">
                  <div class="material-metric">
                    <span>{{ item.num }}</span>
                    <small>库存</small>
                  </div>
                  <div class="material-metric">
                    <strong>{{ materialCraftableCount(item.id) }}</strong>
                    <small>可制</small>
                  </div>
                </div>
              </div>
              <template #right>
                <van-button square type="primary" class="swipe-btn" text="编辑" @click="emit('edit', item)" />
                <van-button square type="danger" class="swipe-btn" text="删除" @click="emit('remove', item.id)" />
              </template>
            </van-swipe-cell>
          </div>
        </section>
      </div>
    </div>
  </van-popup>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { Plus } from "@element-plus/icons-vue";
import type { Material, MaterialGroupKey } from "@/types/stock";

interface MaterialManageGroup {
  key: MaterialGroupKey;
  title: string;
  collapsed: boolean;
  items: Material[];
}

const props = defineProps<{
  show: boolean;
  description: string;
  createText: string;
  groups: MaterialManageGroup[];
  materialStatusClass: (item: Material) => string;
  materialStatusText: (item: Material) => string;
  materialRelatedSummary: (materialId: string) => string;
  materialCraftableCount: (materialId: string) => number;
}>();

const emit = defineEmits<{
  "update:show": [value: boolean];
  create: [];
  "toggle-group": [key: MaterialGroupKey];
  edit: [item: Material];
  remove: [id: string];
}>();

const popupShow = computed({
  get: () => props.show,
  set: (value: boolean) => emit("update:show", value),
});
</script>

<style lang="scss" scoped>
.manage-popup-body .material-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px 12px;
  align-items: center;
  padding: 14px 16px;
  border-radius: 10px;
  background: var(--surface-soft);
}

.material-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.material-group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 2px 4px;
  border: 0;
  background: transparent;
  color: var(--text-main);
  font-size: 14px;
  font-weight: 700;
  text-align: left;
}

.material-group-head::after {
  content: "收起";
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
}

.material-group.collapsed .material-group-head::after {
  content: "展开";
}

.material-group-head small {
  margin-left: auto;
  color: var(--text-subtle);
  font-size: 12px;
  font-weight: 600;
}

.material-group-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.manage-swipe-cell {
  flex: 0 0 auto;
  overflow: hidden;
  border-radius: 10px;
  background: var(--surface-soft);
}

.material-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.material-info strong {
  display: block;
  color: var(--text-main);
  font-size: 16px;
  line-height: 1.2;
}

.material-info small {
  display: block;
  margin-top: 4px;
  color: var(--text-subtle);
  font-size: 12px;
}

.material-status {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--surface-muted);
  flex: 0 0 auto;
  font-size: 12px;
}

.material-status.status-safe {
  color: var(--accent);
  background: var(--header-icon-bg);
}

.material-status.status-warning {
  color: var(--warning-text);
  background: var(--warning-bg);
}

.material-status.status-danger {
  color: var(--danger-text);
  background: var(--danger-bg);
}

.material-status.status-unlinked {
  color: var(--text-muted);
  background: var(--surface-muted);
}

.material-metrics {
  display: flex;
  align-items: center;
  gap: 8px;
}

.material-metric {
  min-width: 48px;
  text-align: center;
}

.material-metric span,
.material-metric strong,
.material-metric small {
  display: block;
}

.material-metric span,
.material-metric strong {
  color: var(--accent-strong);
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
}

.material-metric small {
  margin-top: 3px;
  color: var(--text-subtle);
  font-size: 11px;
}

.material-metric:last-child span,
.material-metric:last-child strong {
  color: var(--text-muted);
}

@media (max-width: 720px) {
  .material-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }
}
</style>
