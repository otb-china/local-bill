<template>
  <div class="home-page" :style="themeStyle">
    <header class="page-header">
      <div>
        <p v-if="activeBill" class="hero-tag">Local Bill</p>
        <div class="header-title">
          <h1>{{ activeBill ? "账单明细" : "本地账单" }}</h1>
          <span v-if="!activeBill" class="header-bill-count">{{ bills.length }} 个账单</span>
        </div>
      </div>
      <div class="header-actions">
        <button v-if="activeBill" class="header-icon" type="button" aria-label="返回账单列表" @click="closeBill">
          <el-icon><Back /></el-icon>
        </button>
        <button v-if="showScrollTop" class="header-icon" type="button" aria-label="回到顶部" @click="scrollToTop">
          <el-icon><Top /></el-icon>
        </button>
        <button class="header-icon" type="button" aria-label="设置" @click="settingsPopup = true">
          <el-icon><Setting /></el-icon>
        </button>
      </div>
      <div v-if="!activeBill" class="bill-toolbar">
        <label class="bill-search">
          <el-icon aria-hidden="true"><Search /></el-icon>
          <input v-model="billSearch" type="search" aria-label="搜索账单" placeholder="搜索账单" @keydown.esc="billSearch = ''" />
        </label>
        <button class="add-bill-button" type="button" @click="addBill">
          <el-icon aria-hidden="true"><Plus /></el-icon>
          <span>新增账单</span>
        </button>
      </div>
    </header>

    <main v-if="!activeBill" class="bill-list-view">
      <section v-if="visibleBills.length" class="bill-list">
        <button
          v-for="bill in visibleBills"
          :key="bill.id"
          class="bill-card"
          type="button"
          @click="openBill(bill.id)"
        >
          <span class="bill-card-info">
            <span class="bill-card-name">{{ bill.name }}</span>
            <span v-if="bill.subtitle" class="bill-card-subtitle">{{ bill.subtitle }}</span>
          </span>
          <strong class="bill-card-amount">¥{{ formatMoney(billTotal(bill)) }}</strong>
          <small class="bill-card-meta">
            <span>累计 {{ bill.items.length }} 项</span>
            <time v-if="getBillLatestCreatedDate(bill)">{{ getBillLatestCreatedDate(bill) }}</time>
          </small>
        </button>
      </section>

      <div v-else-if="!bills.length" class="empty-state">
        <strong>还没有账单</strong>
        <span>点击顶部「新增账单」创建第一张账单。</span>
      </div>
      <div v-else class="empty-state">
        <strong>没有匹配的账单</strong>
        <span>试试其他账单名或副标题。</span>
      </div>
    </main>

    <main v-else class="bill-detail-view">
      <section class="bill-editor">
        <div class="detail-summary">
          <div class="bill-title-fields">
            <label class="field-label title-field">
              <span>BILL NAME</span>
              <input v-model.trim="activeBill.name" class="text-input title-input" placeholder="账单名" @input="touchActiveBill" />
            </label>
            <label class="field-label">
              <input v-model.trim="activeBill.subtitle" class="text-input subtitle-input" aria-label="副标题" placeholder="副标题" @input="touchActiveBill" />
            </label>
          </div>

          <div class="detail-total">
            <span>累计{{ validActiveBillItems.length }}项</span>
            <strong>¥{{ formatMoney(activeBillTotal) }}</strong>
          </div>
        </div>

        <div class="detail-actions">
          <button class="text-action" type="button" @click="shareBillImage">
            <el-icon><Share /></el-icon>
            <span>生成明细图片</span>
          </button>
          <button class="text-action" type="button" @click="copyActiveBill">
            <el-icon><CopyDocument /></el-icon>
            <span>复制账单</span>
          </button>
          <button class="text-action danger" type="button" @click="removeActiveBill">
            <el-icon><Delete /></el-icon>
            <span>删除账单</span>
          </button>
        </div>
      </section>

      <section
        class="items-panel"
        :key="activeBill.id"
        @pointermove="moveDrag"
        @pointerup="finishDrag"
        @lostpointercapture="cancelDrag"
        @touchend="finishTouchDrag"
        @touchcancel="cancelTouchDrag"
      >
        <div class="section-row">
          <p class="section-tag">Items</p>
          <div class="item-mode" role="group" aria-label="子项显示模式">
            <button type="button" :aria-pressed="!groupMode" @click="setItemMode('date')">日期</button>
            <button type="button" :aria-pressed="groupMode" @click="setItemMode('group')">分组</button>
          </div>
        </div>

        <div class="item-list">
          <button v-if="groupMode" class="add-item-row" type="button" @click="addGroup">
            <el-icon><Plus /></el-icon>
            <span>新增分组</span>
          </button>
          <button v-else class="add-item-row" type="button" @click="addItem()">
            <el-icon><Plus /></el-icon>
            <span>新增子项</span>
          </button>

          <div
            v-for="section in itemSections"
            :key="section.id"
            class="item-list"
            :class="{
              'item-group': groupMode,
              'drag-source': drag?.kind === 'group' && drag.id === section.id,
              'drop-group': drag?.kind === 'item' && drag.target?.groupId === section.id && !drag.target.itemId,
            }"
            :data-group-id="groupMode ? section.id : undefined"
            :data-drop-side="drag?.kind === 'group' && drag.target?.groupId === section.id ? drag.target.side : undefined"
          >
            <div v-if="groupMode" class="item-group-header">
              <button
                v-if="allGroupsCollapsed"
                class="drag-handle"
                type="button"
                aria-label="拖动分组"
                @pointerdown="startDrag($event, 'group', section.id)"
                @touchstart.stop="prepareTouchDrag($event, 'group', section.id)"
                @touchmove.stop="moveTouchDrag"
                @contextmenu.prevent
              >⠿</button>
              <input
                v-if="groupNameEdit?.id === section.id"
                v-focus
                v-model="groupNameEdit.name"
                class="text-input group-name"
                aria-label="分组名称"
                @keydown.enter="!$event.isComposing && finishGroupName(section.id)"
                @keydown.esc.stop="groupNameEdit = undefined"
                @blur="finishGroupName(section.id)"
              />
              <button
                v-else
                class="group-toggle group-name"
                type="button"
                :aria-expanded="!collapsedGroups.has(section.id)"
                @click="toggleGroup(section.id)"
              >
                <el-icon><ArrowRight v-if="collapsedGroups.has(section.id)" /><ArrowDown v-else /></el-icon>
                <strong>{{ section.name }}</strong>
                <span class="group-count">{{ section.items.length }} 项</span>
              </button>
              <button
                class="group-action"
                type="button"
                aria-label="编辑分组名称"
                title="编辑分组名称"
                @click="groupNameEdit = { id: section.id, name: section.name }"
              ><el-icon><Edit /></el-icon></button>
              <button class="group-action" type="button" aria-label="新增子项" title="新增子项" @click="addItem(section.id)">
                <el-icon><Plus /></el-icon>
              </button>
              <button
                v-if="itemSections.length > 1 && !section.items.length"
                class="group-action"
                type="button"
                aria-label="删除分组"
                title="删除分组"
                @click="removeGroup(section.id)"
              ><el-icon><Delete /></el-icon></button>
            </div>
            <van-swipe-cell
              v-for="item in groupMode && collapsedGroups.has(section.id) ? [] : section.items"
              :key="item.id"
              class="item-swipe"
              :data-item-id="groupMode ? item.id : undefined"
              :class="{ 'drag-source': drag?.kind === 'item' && drag.id === item.id }"
              :data-drop-side="drag?.kind === 'item' && drag.target?.itemId === item.id ? drag.target.side : undefined"
            >
              <div class="item-row" :class="{ 'has-created-at': !groupMode && item.createdAt, 'grouped-item': groupMode, voided: item.voided }">
                <button
                  v-if="groupMode"
                  class="drag-handle item-drag-handle"
                  type="button"
                  aria-label="拖动子项"
                  @pointerdown="startDrag($event, 'item', item.id)"
                  @touchstart.stop="prepareTouchDrag($event, 'item', item.id)"
                  @touchmove.stop="moveTouchDrag"
                  @contextmenu.prevent
                >⠿</button>
                <label class="item-field item-name-field">
                  <input v-model.trim="item.name" class="text-input" aria-label="名称" @input="touchActiveBill" />
                </label>
                <label class="item-field item-price-field">
                  <input
                    v-model.number="item.price"
                    class="text-input price-input"
                    aria-label="金额"
                    type="number"
                    inputmode="decimal"
                    min="0"
                    step="0.01"
                    @input="touchActiveBill"
                  />
                </label>
                <small
                  v-if="!groupMode && item.createdAt"
                  class="item-created-at"
                  title="双击修改时间"
                  @click.stop="handleItemTimeClick(item)"
                >
                  {{ item.createdAt }}
                </small>
              </div>
              <template #right>
                <button class="swipe-action time" type="button" aria-label="设置时间" @click="openItemTimeEditor(item)">
                  <el-icon><Clock /></el-icon>
                  <span>时间</span>
                </button>
                <button class="swipe-action void" type="button" aria-label="作废子项" @click="toggleItemVoided(item)">
                  <el-icon><CircleClose /></el-icon>
                  <span>{{ item.voided ? "恢复" : "作废" }}</span>
                </button>
                <button class="swipe-action danger" type="button" aria-label="删除子项" @click="removeItem(item.id)">
                  <el-icon><Delete /></el-icon>
                  <span>删除</span>
                </button>
              </template>
            </van-swipe-cell>
          </div>
        </div>
      </section>
    </main>

    <SettingsPopup
      v-model:show="settingsPopup"
      :theme-options="themeOptions"
      :current-theme="currentTheme"
      :current-theme-name="currentThemeOption.name"
      :recycle-count="deletedBills.length"
      @set-theme="setTheme"
      @export="exportAllData"
      @open-import="openImportExport"
      @open-recycle="openRecycleBin"
      @reset="resetAllData"
    />

    <van-popup v-model:show="recyclePopup" position="bottom" round destroy-on-close>
      <div class="popup-body recycle-popup">
        <div class="popup-head">
          <div>
            <h3>回收站</h3>
            <p>删除的账单保留 7 天，可在这里恢复。</p>
          </div>
        </div>

        <div v-if="deletedBills.length" class="recycle-list">
          <div v-for="bill in deletedBills" :key="bill.id" class="recycle-item">
            <div>
              <strong>{{ bill.name }}</strong>
              <span>¥{{ formatMoney(billTotal(bill)) }} · {{ getRecycleDaysLeft(bill) }} 天后清除</span>
            </div>
            <div class="recycle-actions">
              <button type="button" @click="restoreDeletedBill(bill.id)">恢复</button>
              <button class="danger" type="button" @click="purgeDeletedBill(bill.id)">删除</button>
            </div>
          </div>
        </div>

        <div v-else class="empty-state compact">
          <strong>回收站为空</strong>
          <span>删除的账单会在这里保留一周。</span>
        </div>
      </div>
    </van-popup>

    <van-popup v-model:show="itemTimePopup.show" position="bottom" round destroy-on-close>
      <van-picker-group
        class="time-popup"
        title="设置创建时间"
        :tabs="['日期', '时间']"
        next-step-text="下一步"
        @confirm="confirmItemTime"
        @cancel="itemTimePopup.show = false"
      >
        <van-date-picker
          v-model="itemTimePopup.date"
          :min-date="itemTimeMinDate"
          :max-date="itemTimeMaxDate"
          :columns-type="['year', 'month', 'day']"
        />
        <van-time-picker v-model="itemTimePopup.time" :columns-type="['hour', 'minute']" />
      </van-picker-group>
    </van-popup>

    <ImportDataPopup
      v-model:show="importExportInfo.show"
      :has-local-data="hasImportLocalData"
      :summary="importExportSummary"
      :file-name="importInfo.fileName"
      :has-file="Boolean(importInfo.dataStr)"
      @file-loaded="onImportFileLoaded"
      @file-error="showToast"
      @import="importData"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { showConfirmDialog, showToast } from "vant";
import { ArrowDown, ArrowRight, Back, CircleClose, Clock, CopyDocument, Delete, Edit, Plus, Search, Setting, Share, Top } from "@element-plus/icons-vue";
import ImportDataPopup from "@/components/ImportDataPopup.vue";
import SettingsPopup from "@/components/SettingsPopup.vue";
import { DEFAULT_THEME, isThemeKey, themeOptions } from "@/config/themes";
import { useBackupActions } from "@/composables/useBackupActions";
import { LStorage } from "@/utils/localStorage.ts";
import {
  createEmptyBill,
  createEmptyBillItem,
  createId,
  formatLocalDateTime,
  formatMoney,
  normalizeDeletedBills,
  normalizeBills,
  sumBillItems,
} from "@/utils/billData.ts";
import type { ThemeKey } from "@/config/themes";
import type { Bill, BillItem, DeletedBill } from "@/types/bill";

const DATE_FORMAT = "YYYY-MM-DD";
const SCROLL_TOP_THRESHOLD = 240;
const DRAG_HOLD_MS = 320;
const DRAG_MOVE_THRESHOLD = 8;
const RECYCLE_KEEP_DAYS = 7;
const RECYCLE_KEEP_MS = RECYCLE_KEEP_DAYS * 24 * 60 * 60 * 1000;

const showScrollTop = ref(false);
const currentTheme = ref<ThemeKey>(DEFAULT_THEME);
const settingsPopup = ref(false);
const recyclePopup = ref(false);
const itemTimePopup = ref({
  show: false,
  itemId: "",
  date: [] as string[],
  time: [] as string[],
});
const itemTimeTap = ref({
  itemId: "",
  time: 0,
});
const bills = ref<Bill[]>([]);
const billSearch = ref("");
const deletedBills = ref<DeletedBill[]>([]);
const activeBillId = ref("");
let billListScrollY = 0;

const billStorage = LStorage.new("localBillData");
const recycleStorage = LStorage.new("localBillRecycleBin");
const themeStorage = LStorage.new("localBillTheme");
const itemTimeMinDate = new Date(2020, 0, 1);
const itemTimeMaxDate = new Date(2099, 11, 31);

const currentThemeOption = computed(() => {
  return themeOptions.find((theme) => theme.key === currentTheme.value) || themeOptions[0];
});
const themeStyle = computed(() => currentThemeOption.value.variables);
const activeBill = computed(() => bills.value.find((bill) => bill.id === activeBillId.value));
const sortedBills = computed(() => sortBillsByLatestItemCreatedDate(bills.value));
const visibleBills = computed(() => {
  const keyword = billSearch.value.trim().toLowerCase();
  if (!keyword) return sortedBills.value;
  return sortedBills.value.filter((bill) =>
    bill.name.toLowerCase().includes(keyword) || bill.subtitle.toLowerCase().includes(keyword),
  );
});
const activeBillTotal = computed(() => activeBill.value ? billTotal(activeBill.value) : 0);
const validActiveBillItems = computed(() => activeBill.value ? getValidItems(activeBill.value.items) : []);
const groupMode = computed(() => activeBill.value?.itemMode === "group");
const collapsedGroups = ref(new Set<string>());
const groupNameEdit = ref<{ id: string; name: string }>();
const vFocus = {
  mounted(input: HTMLInputElement) {
    input.focus();
    input.select();
  },
};
type DropTarget = { groupId: string; itemId?: string; side: "before" | "after" };
type DragSource = {
  kind: "group" | "item";
  id: string;
  pointerId: number;
};
const drag = ref<DragSource & { target?: DropTarget }>();
let pendingTouchDrag: (DragSource & { startX: number; startY: number; startedAt: number }) | undefined;
let dragFrame = 0;
let dragX = 0;
let dragY = 0;

const itemSections = computed(() => {
  const bill = activeBill.value;
  if (!bill) return [];
  if (!groupMode.value) return [{ id: "", name: "", items: sortItemsByCreatedAt(bill.items) }];
  return getBillGroups(bill);
});
const allGroupsCollapsed = computed(() =>
  groupMode.value && itemSections.value.every((section) => collapsedGroups.value.has(section.id)),
);

const {
  importExportInfo,
  importInfo,
  importExportSummary,
  hasImportLocalData,
  openImportExport,
  exportAllData,
  onImportFileLoaded,
  resetAllData,
  importData,
} = useBackupActions({
  bills,
  deletedBills,
  settingsPopup,
  dateFormat: DATE_FORMAT,
  initData: () => init(),
});

watch(bills, saveBills, { deep: true });
watch(deletedBills, saveDeletedBills, { deep: true });
watch(() => activeBill.value?.id, async (billId, previousBillId) => {
  cancelDrag();
  collapsedGroups.value.clear();
  groupNameEdit.value = undefined;
  if (!previousBillId && billId) {
    billListScrollY = window.scrollY;
  }

  await nextTick();
  if (activeBill.value?.id !== billId) return;

  window.scrollTo({ top: billId ? 0 : billListScrollY, behavior: "instant" });
  updateScrollTopVisibility();
});

function billTotal(bill: Bill) {
  return sumBillItems(getValidItems(bill.items));
}

function saveBills() {
  if (bills.value.length) {
    billStorage.setter(bills.value);
  } else {
    billStorage.remove();
  }
}

function saveDeletedBills() {
  if (deletedBills.value.length) {
    recycleStorage.setter(deletedBills.value);
  } else {
    recycleStorage.remove();
  }
}

function setTheme(theme: ThemeKey) {
  currentTheme.value = theme;
  themeStorage.setter(theme);
}

function init() {
  const storedTheme = themeStorage.getter();
  currentTheme.value = isThemeKey(storedTheme) ? storedTheme : DEFAULT_THEME;
  bills.value = normalizeBills(billStorage.getter());
  deletedBills.value = purgeExpiredDeletedBills(normalizeDeletedBills(recycleStorage.getter()));
  if (activeBillId.value && !bills.value.some((bill) => bill.id === activeBillId.value)) {
    activeBillId.value = "";
  }
}

function addBill() {
  const bill = createEmptyBill(`账单 ${bills.value.length + 1}`);
  bill.items.push({ ...createEmptyBillItem(), groupId: bill.groups[0].id });
  bills.value.unshift(bill);
  billSearch.value = "";
  activeBillId.value = bill.id;
}

function copyActiveBill() {
  if (!activeBill.value) return;
  const source = activeBill.value;
  const now = new Date().toISOString();
  const copy: Bill = {
    ...source,
    id: createId("bill"),
    name: `${source.name}（复制）`,
    groups: source.groups.map((group) => ({ ...group })),
    items: source.items.map((item) => ({ ...item, id: createId("item") })),
    createdAt: now,
    updatedAt: now,
  };
  bills.value.unshift(copy);
  activeBillId.value = copy.id;
  showToast("账单已复制");
}

function openBill(id: string) {
  activeBillId.value = id;
}

function closeBill() {
  pruneActiveBillInvalidItems();
  removeActiveBillIfEmpty();
  activeBillId.value = "";
}

function touchActiveBill() {
  if (!activeBill.value) return;
  activeBill.value.updatedAt = new Date().toISOString();
}

function setItemMode(mode: "date" | "group") {
  if (!activeBill.value || groupMode.value === (mode === "group")) return;
  cancelDrag();
  groupNameEdit.value = undefined;
  activeBill.value.itemMode = mode;
  touchActiveBill();
}

function getBillGroups(bill: Bill) {
  const sections = bill.groups.map((group) => ({ ...group, items: [] as BillItem[] }));
  const byId = new Map(sections.map((section) => [section.id, section]));
  for (const item of bill.items) {
    (byId.get(item.groupId ?? "") ?? sections[0]).items.push(item);
  }
  return sections;
}

function addGroup() {
  const bill = activeBill.value;
  if (!bill) return;
  const names = new Set(bill.groups.map((group) => group.name));
  let number = 1;
  while (names.has(`分组 ${number}`)) number++;
  bill.groups.unshift({ id: createId("group"), name: `分组 ${number}` });
  touchActiveBill();
}

function finishGroupName(id: string) {
  const bill = activeBill.value;
  if (!bill || groupNameEdit.value?.id !== id) return;
  const name = groupNameEdit.value.name.trim();
  groupNameEdit.value = undefined;
  const group = bill.groups.find((entry) => entry.id === id);
  if (!group || !name || name === group.name) return;
  group.name = name;
  touchActiveBill();
}

function toggleGroup(id: string) {
  if (!collapsedGroups.value.delete(id)) collapsedGroups.value.add(id);
}

function removeGroup(id: string) {
  const bill = activeBill.value;
  if (!bill || !groupMode.value || bill.groups.length <= 1) return;
  const section = itemSections.value.find((entry) => entry.id === id);
  if (!section || section.items.length) return;
  bill.groups = bill.groups.filter((group) => group.id !== id);
  collapsedGroups.value.delete(id);
  touchActiveBill();
}

function startDrag(event: PointerEvent, kind: "group" | "item", id: string) {
  if (event.pointerType === "touch" || event.button !== 0 || drag.value || !groupMode.value) return;
  if (kind === "group" && !allGroupsCollapsed.value) return;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  activateDrag({ kind, id, pointerId: event.pointerId }, event);
}

function prepareTouchDrag(event: TouchEvent, kind: "group" | "item", id: string) {
  if (event.touches.length !== 1) {
    cancelTouchDrag();
    return;
  }
  if (drag.value || !groupMode.value || (kind === "group" && !allGroupsCollapsed.value)) return;
  const touch = event.changedTouches[0];
  pendingTouchDrag = {
    kind,
    id,
    pointerId: touch.identifier,
    startX: touch.clientX,
    startY: touch.clientY,
    startedAt: event.timeStamp,
  };
}

function moveTouchDrag(event: TouchEvent) {
  const pending = pendingTouchDrag;
  if (!pending) return;
  if (event.touches.length !== 1 || !event.cancelable) {
    cancelTouchDrag();
    return;
  }
  const touch = event.touches[0];
  if (touch.identifier !== pending.pointerId) return;
  if (!drag.value) {
    const distance = Math.hypot(touch.clientX - pending.startX, touch.clientY - pending.startY);
    if (distance < DRAG_MOVE_THRESHOLD) return;
    if (event.timeStamp - pending.startedAt < DRAG_HOLD_MS) {
      cancelTouchDrag();
      return;
    }
    activateDrag({ kind: pending.kind, id: pending.id, pointerId: pending.pointerId }, touch);
  }
  event.preventDefault();
  trackDrag(touch);
}

function finishTouchDrag(event: TouchEvent) {
  const pending = pendingTouchDrag;
  if (!pending) return;
  const touch = Array.from(event.changedTouches).find((entry) => entry.identifier === pending.pointerId);
  if (!touch) return;
  if (drag.value) dropDrag(touch);
  else cancelTouchDrag();
}

function cancelTouchDrag() {
  if (pendingTouchDrag) cancelDrag();
}

function activateDrag(source: DragSource, position: { clientX: number; clientY: number }) {
  drag.value = source;
  dragX = position.clientX;
  dragY = position.clientY;
  dragFrame = requestAnimationFrame(scrollDuringDrag);
}

function moveDrag(event: PointerEvent) {
  if (event.pointerType === "touch" || drag.value?.pointerId !== event.pointerId) return;
  trackDrag(event);
}

function trackDrag(position: { clientX: number; clientY: number }) {
  dragX = position.clientX;
  dragY = position.clientY;
  updateDropTarget();
}

function updateDropTarget() {
  const current = drag.value;
  if (!current) return;
  const element = document.elementFromPoint(dragX, dragY);
  const group = element?.closest<HTMLElement>("[data-group-id]");
  const groupId = group?.dataset.groupId;
  const item = current.kind === "item" ? element?.closest<HTMLElement>("[data-item-id]") : undefined;
  const itemId = item?.dataset.itemId;
  current.target = undefined;
  if (!group || groupId === undefined) return;
  if (current.kind === "group" && groupId === current.id) return;
  if (itemId === current.id) return;
  const rect = (item ?? group).getBoundingClientRect();
  current.target = { groupId, itemId, side: dragY < rect.top + rect.height / 2 ? "before" : "after" };
}

function scrollDuringDrag() {
  const edge = 72;
  const distanceFromBottom = window.innerHeight - dragY;
  const speed = dragY < edge ? -(edge - dragY) : Math.max(0, edge - distanceFromBottom);
  if (speed) {
    window.scrollBy(0, speed / 5);
    updateDropTarget();
  }
  dragFrame = requestAnimationFrame(scrollDuringDrag);
}

function cancelDrag(event?: PointerEvent) {
  if (event && (event.pointerType === "touch" || drag.value?.pointerId !== event.pointerId)) return;
  cancelAnimationFrame(dragFrame);
  drag.value = undefined;
  pendingTouchDrag = undefined;
}

function finishDrag(event: PointerEvent) {
  if (event.pointerType === "touch" || drag.value?.pointerId !== event.pointerId) return;
  dropDrag(event);
}

function dropDrag(position: { clientX: number; clientY: number }) {
  const current = drag.value;
  if (!current) return;
  trackDrag(position);
  cancelDrag();
  const bill = activeBill.value;
  const target = current.target;
  if (!bill || !target) return;

  if (current.kind === "group") {
    if (!allGroupsCollapsed.value) return;
    const groups = bill.groups;
    const from = groups.findIndex((group) => group.id === current.id);
    if (from === -1) return;
    const [group] = groups.splice(from, 1);
    const to = groups.findIndex((entry) => entry.id === target.groupId);
    groups.splice(to + Number(target.side === "after"), 0, group);
  } else {
    const from = bill.items.findIndex((item) => item.id === current.id);
    if (from === -1) return;
    const [item] = bill.items.splice(from, 1);
    item.groupId = target.groupId;
    const to = bill.items.findIndex((entry) => entry.id === target.itemId);
    if (to === -1) bill.items.push(item);
    else bill.items.splice(to + Number(target.side === "after"), 0, item);
  }
  touchActiveBill();
}

function addItem(groupId?: string) {
  const bill = activeBill.value;
  if (!bill) return;
  if (!canAppendItem()) {
    showToast("请先填写当前子项的名称和价格");
    return;
  }
  const item = { ...createEmptyBillItem(), groupId: groupId ?? bill.groups[0].id };
  if (groupMode.value) {
    collapsedGroups.value.delete(item.groupId);
  }
  bill.items.unshift(item);
  touchActiveBill();
}

function canAppendItem() {
  if (!activeBill.value) return false;
  return activeBill.value.items.every((item) => item.voided || isValidItem(item));
}

function isValidItem(item: Bill["items"][number]) {
  return !item.voided && Boolean(item.name.trim()) && item.price !== "" && Number.isFinite(Number(item.price));
}

function getValidItems(items: Bill["items"]) {
  return items.filter(isValidItem);
}

function sortItemsByCreatedAt(items: BillItem[]) {
  return [...items].sort((a, b) => getItemCreatedTimestamp(b) - getItemCreatedTimestamp(a));
}

function sortBillsByLatestItemCreatedDate(list: Bill[]) {
  return list
    .map((bill, index) => ({ bill, index, timestamp: getBillLatestCreatedTimestamp(bill) }))
    .sort((a, b) => b.timestamp - a.timestamp || a.index - b.index)
    .map((item) => item.bill);
}

function getBillLatestCreatedTimestamp(bill: Bill) {
  return Math.max(0, ...bill.items.map(getItemCreatedTimestamp));
}

function getItemCreatedTimestamp(item: BillItem) {
  if (!item.createdAt) return 0;
  const date = parseItemCreatedAt(item.createdAt) || new Date(item.createdAt);
  const timestamp = date.getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getBillLatestCreatedDate(bill: Bill) {
  const latestItem = sortItemsByCreatedAt(bill.items).find((item) => getItemCreatedTimestamp(item) > 0);
  return latestItem ? formatCreatedDate(latestItem.createdAt) : "";
}

function formatCreatedDate(value: string) {
  const date = parseItemCreatedAt(value) || new Date(value);
  if (Number.isNaN(date.getTime())) return value.split(" ")[0] || value;
  const pad = (number: number) => String(number).padStart(2, "0");
  return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join("-");
}

function parseItemCreatedAt(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
}

function pruneActiveBillInvalidItems() {
  if (!activeBill.value) return;
  // Keep voided entries visible so they can be restored later; only discard unfinished live rows.
  const validItems = activeBill.value.items.filter((item) => item.voided || isValidItem(item));
  if (validItems.length === activeBill.value.items.length) return;
  activeBill.value.items = validItems;
  touchActiveBill();
}

function removeActiveBillIfEmpty() {
  if (!activeBill.value || activeBill.value.items.length) return;
  bills.value = bills.value.filter((bill) => bill.id !== activeBillId.value);
}

function purgeExpiredDeletedBills(list: DeletedBill[]) {
  const now = Date.now();
  return list.filter((bill) => now - new Date(bill.deletedAt).getTime() < RECYCLE_KEEP_MS);
}

function getRecycleDaysLeft(bill: DeletedBill) {
  const deletedTime = new Date(bill.deletedAt).getTime();
  const leftMs = Math.max(0, RECYCLE_KEEP_MS - (Date.now() - deletedTime));
  return Math.max(1, Math.ceil(leftMs / (24 * 60 * 60 * 1000)));
}

function openRecycleBin() {
  deletedBills.value = purgeExpiredDeletedBills(deletedBills.value);
  settingsPopup.value = false;
  recyclePopup.value = true;
}

function restoreDeletedBill(id: string) {
  const bill = deletedBills.value.find((item) => item.id === id);
  if (!bill) return;
  const { deletedAt: _deletedAt, ...restoredBill } = bill;
  bills.value.unshift({
    ...restoredBill,
    id: bills.value.some((item) => item.id === restoredBill.id) ? createId("bill") : restoredBill.id,
    updatedAt: new Date().toISOString(),
  });
  deletedBills.value = deletedBills.value.filter((item) => item.id !== id);
  recyclePopup.value = false;
  showToast("账单已恢复");
}

function purgeDeletedBill(id: string) {
  deletedBills.value = deletedBills.value.filter((bill) => bill.id !== id);
  showToast("已彻底删除");
}

function removeItem(id: string) {
  if (!activeBill.value) return;
  activeBill.value.items = activeBill.value.items.filter((item) => item.id !== id);
  touchActiveBill();
}

function toggleItemVoided(item: BillItem) {
  item.voided = !item.voided;
  touchActiveBill();
  showToast(item.voided ? "子项已作废，不计入合计" : "子项已恢复计算");
}

function handleItemTimeClick(item: BillItem) {
  const now = Date.now();
  const isDoubleTap = itemTimeTap.value.itemId === item.id && now - itemTimeTap.value.time < 360;
  itemTimeTap.value = { itemId: item.id, time: now };
  if (isDoubleTap) {
    openItemTimeEditor(item);
  }
}

function openItemTimeEditor(item: BillItem) {
  const { date, time } = toPickerValues(item.createdAt);
  itemTimePopup.value = {
    show: true,
    itemId: item.id,
    date,
    time,
  };
}

function confirmItemTime() {
  if (!activeBill.value || !itemTimePopup.value.itemId) return;
  const target = activeBill.value.items.find((item) => item.id === itemTimePopup.value.itemId);
  const [year, month, day] = itemTimePopup.value.date.map(Number);
  const [hour, minute] = itemTimePopup.value.time.map(Number);
  const selectedDate = new Date(year, month - 1, day, hour, minute);
  if (!target || Number.isNaN(selectedDate.getTime())) {
    showToast("请选择有效时间");
    return;
  }
  target.createdAt = formatLocalDateTime(selectedDate);
  itemTimePopup.value.show = false;
  touchActiveBill();
}

function toPickerValues(value: string) {
  const date = value ? parseItemCreatedAt(value) || new Date(value) : new Date();
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const [dateText, timeText] = formatLocalDateTime(validDate).split(" ");
  return {
    date: dateText.split("-"),
    time: timeText.split(":"),
  };
}

function removeActiveBill() {
  if (!activeBill.value) return;
  const currentBill = activeBill.value;
  const billName = currentBill.name || "未命名账单";
  showConfirmDialog({
    title: "删除账单",
    message: `确认将「${billName}」移入回收站吗？一周内可恢复。`,
    width: "260px",
  }).then(() => {
    const deletedBill = {
      ...currentBill,
      deletedAt: new Date().toISOString(),
    };
    deletedBills.value = [deletedBill, ...deletedBills.value.filter((bill) => bill.id !== deletedBill.id)];
    bills.value = bills.value.filter((bill) => bill.id !== activeBillId.value);
    activeBillId.value = "";
    showToast("账单已移入回收站");
  }).catch(() => {
  });
}

async function shareBillImage() {
  if (!activeBill.value) return;
  const dataUrl = createBillImage(activeBill.value);
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${activeBill.value.name || "local-bill"}-明细.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("明细图片已生成");
}

function createBillImage(bill: Bill) {
  const items = bill.itemMode === "group"
    ? getBillGroups(bill).flatMap((section) => section.items)
    : sortItemsByCreatedAt(bill.items);
  const validItems = getValidItems(items);
  const width = 900;
  const rowHeight = 64;
  const listStartY = 256;
  const rowBottomOffset = 10;
  const footerGap = 50;
  const footerBottomSpace = 84;
  const listHeight = validItems.length ? (validItems.length - 1) * rowHeight + rowBottomOffset : 0;
  const footerY = listStartY + listHeight + footerGap;
  const height = Math.max(560, footerY + footerBottomSpace);
  const canvas = document.createElement("canvas");
  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.scale(pixelRatio, pixelRatio);
  ctx.fillStyle = "#f6f8fb";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 48, 48, width - 96, height - 96, 24);
  ctx.fill();

  ctx.fillStyle = "#203747";
  ctx.font = "700 42px Arial, sans-serif";
  ctx.fillText(bill.name || "未命名账单", 88, 124);
  ctx.fillStyle = "#72808c";
  ctx.font = "24px Arial, sans-serif";
  if (bill.subtitle) {
    ctx.fillText(bill.subtitle, 88, 164);
  }
  ctx.fillText(`${validItems.length} 项`, 88, bill.subtitle ? 200 : 164);

  ctx.fillStyle = "#1f6b7b";
  ctx.font = "700 44px Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`¥${formatMoney(billTotal(bill))}`, width - 88, 140);
  ctx.textAlign = "left";

  let y = listStartY;
  validItems.forEach((item, index) => {
    ctx.fillStyle = index % 2 === 0 ? "#f7f9fc" : "#ffffff";
    roundRect(ctx, 88, y - 42, width - 176, 52, 10);
    ctx.fill();
    ctx.fillStyle = "#203747";
    ctx.font = "24px Arial, sans-serif";
    ctx.fillText(item.name || "未命名子项", 112, y - 8);
    ctx.fillStyle = "#1f6b7b";
    ctx.font = "700 24px Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`¥${formatMoney(Number(item.price || 0))}`, width - 112, y - 8);
    ctx.textAlign = "left";
    y += rowHeight;
  });

  ctx.fillStyle = "#72808c";
  ctx.font = "18px Arial, sans-serif";
  ctx.fillText("Local Bill", 88, footerY);
  return canvas.toDataURL("image/png");
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateScrollTopVisibility() {
  showScrollTop.value = window.scrollY > SCROLL_TOP_THRESHOLD;
}

init();

onMounted(() => {
  updateScrollTopVisibility();
  window.addEventListener("scroll", updateScrollTopVisibility, { passive: true });
});

onUnmounted(() => {
  cancelDrag();
  window.removeEventListener("scroll", updateScrollTopVisibility);
});
</script>

<style lang="scss" scoped>
.home-page {
  min-height: 100vh;
  padding: 12px;
  background: var(--page-bg);
  color: var(--text-main);
}

.home-page,
.home-page * {
  box-sizing: border-box;
}

.bill-list-view,
.bill-detail-view {
  width: min(100%, 780px);
  margin: 0 auto;
}

.page-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  margin: -12px -12px 12px;
  padding: 18px max(18px, calc((100vw - 780px) / 2 + 18px)) 16px;
  background: var(--surface);
  box-shadow: var(--header-shadow);
  backdrop-filter: blur(12px);
}

.hero-tag,
.section-tag {
  margin: 0 0 4px;
  color: var(--text-muted);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.header-title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;
}

.page-header h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 34px;
  line-height: 1.08;
  white-space: nowrap;
}

.header-actions,
.detail-actions,
.section-row,
.item-row {
  display: flex;
  align-items: center;
}

.header-actions {
  gap: 8px;
}

.bill-toolbar {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.bill-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border: 1px solid var(--divider);
  border-radius: 12px;
  background: var(--field-bg);
  color: var(--text-subtle);
}

.bill-search:focus-within {
  border-color: var(--accent);
}

.bill-search input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--text-strong);
  font-size: 16px;
}

.bill-search input::placeholder {
  color: var(--text-subtle);
}

.header-icon,
.add-bill-button,
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 999px;
  background: var(--header-icon-bg);
  color: var(--accent);
  font-size: 18px;
}

.add-bill-button {
  width: auto;
  gap: 6px;
  padding: 0 14px;
  border-radius: 12px;
  background: var(--accent-strong);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.add-bill-button .el-icon {
  font-size: 16px;
}

.icon-button.danger,
.text-action.danger {
  background: var(--danger-bg);
  color: var(--danger-text);
}

.bill-editor,
.items-panel {
  margin-bottom: 14px;
  padding: 20px;
  border-radius: 16px;
  background: var(--surface);
  box-shadow: 0 14px 34px rgba(38, 56, 88, 0.08);
}

.header-bill-count {
  white-space: nowrap;
}

.header-bill-count,
.empty-state span,
.field-label span,
.detail-total span {
  color: var(--text-muted);
  font-size: 12px;
}

.bill-list {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
}

.bill-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 6px 12px;
  padding: 13px 16px;
  border: 0;
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--shadow);
  text-align: left;
}

.bill-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.bill-card:active {
  background: var(--surface-soft);
}

.bill-card-info {
  display: grid;
  gap: 3px;
}

.bill-card-name {
  color: var(--text-strong);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.bill-card-subtitle {
  color: var(--text-subtle);
  font-size: 13px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.bill-card-amount {
  color: var(--accent-strong);
  font-size: clamp(20px, 6.4vw, 26px);
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  text-align: right;
  white-space: nowrap;
}

.bill-card-meta {
  grid-column: 1 / -1;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  color: var(--text-subtle);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  line-height: 1.4;
}

.bill-card-meta time {
  white-space: nowrap;
}

.empty-state {
  display: grid;
  place-items: center;
  gap: 8px;
  padding: 34px 12px;
  text-align: center;
}

.empty-state.compact {
  padding: 22px 12px;
}

.empty-state strong {
  color: var(--text-strong);
}

.bill-editor {
  display: grid;
  gap: 18px;
}

.detail-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: end;
}

.bill-title-fields {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.field-label {
  display: grid;
  gap: 7px;
  min-width: 0;
}

.text-input {
  width: 100%;
  min-width: 0;
  height: 44px;
  padding: 0 14px;
  border: 1px solid color-mix(in srgb, var(--accent-border) 42%, var(--divider));
  border-radius: 12px;
  outline: 0;
  background: color-mix(in srgb, var(--field-bg) 76%, var(--surface));
  color: var(--text-main);
  font-size: 15px;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.text-input:focus {
  border-color: var(--accent);
  background: var(--surface);
  box-shadow: 0 0 0 3px var(--accent-ring);
}

.title-input {
  height: 54px;
  color: var(--text-strong);
  font-size: 24px;
  font-weight: 700;
}

.subtitle-input {
  color: var(--text-main);
  font-size: 14px;
}

.detail-total {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  justify-items: end;
  min-width: 190px;
  min-height: 92px;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--stat-materials-bg);
  box-shadow: var(--stat-light-shadow);
}

.detail-total span {
  justify-self: start;
  font-weight: 700;
}

.detail-total strong {
  align-self: center;
  color: var(--accent-strong);
  font-size: 32px;
  line-height: 1.05;
}

.detail-actions {
  flex-wrap: wrap;
  gap: 8px;
}

.text-action,
.add-item-row {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 38px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: var(--header-icon-bg);
  color: var(--accent);
  font-size: 13px;
  font-weight: 700;
}

.section-row {
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
}

.item-mode {
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  background: var(--surface-soft);
}

.item-mode button,
.group-action,
.group-toggle,
.drag-handle {
  border: 0;
  background: transparent;
  color: var(--accent);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.item-mode button {
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
}

.item-mode button[aria-pressed="true"] {
  background: var(--header-icon-bg);
}

.item-group {
  min-width: 0;
  gap: 6px;
  padding: 0 0 8px;
  border: 1px solid color-mix(in srgb, var(--accent-border) 45%, var(--divider));
  border-radius: 14px;
}

.item-group:not(:has(.item-swipe)) {
  padding-bottom: 0;
}

.item-group-header {
  display: flex;
  align-items: center;
  gap: 3px;
  min-height: 48px;
  padding: 4px 6px;
  border-radius: 13px;
  background: var(--header-icon-bg);
}

.group-name {
  flex: 1;
  min-width: 0;
}

.group-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 3px;
  text-align: left;
}

.group-toggle strong {
  overflow-wrap: anywhere;
  font-size: 14px;
}

.group-toggle .el-icon,
.group-count {
  flex: none;
}

.group-count {
  color: var(--text-muted);
  font-size: 11px;
  white-space: nowrap;
}

.item-group-header input {
  width: 0;
  height: 36px;
  padding: 5px 8px;
}

.group-action,
.drag-handle {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-width: 34px;
  min-height: 36px;
  padding: 0 7px;
  border-radius: 10px;
}

.group-action {
  min-width: 28px;
  padding: 0 5px;
}

.drag-handle {
  touch-action: pan-y pinch-zoom;
  user-select: none;
  -webkit-touch-callout: none;
  cursor: grab;
  font-size: 19px;
}

.drag-handle:active {
  cursor: grabbing;
}

.item-drag-handle {
  min-width: 28px;
  padding: 0;
}

.item-group > .item-swipe {
  margin: 0 8px;
}

.drag-source {
  opacity: 0.55;
}

.drop-group {
  outline: 2px solid var(--accent);
}

[data-drop-side="before"] {
  box-shadow: 0 -3px var(--accent);
}

[data-drop-side="after"] {
  box-shadow: 0 3px var(--accent);
}

.add-item-row {
  width: 100%;
  height: 66px;
  border: 0;
  border-radius: 14px;
  color: var(--accent);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--header-icon-bg) 82%, var(--surface)) 0%,
      color-mix(in srgb, var(--surface-soft) 74%, var(--surface)) 100%
    );
  box-shadow:
    0 10px 20px color-mix(in srgb, var(--accent-ring) 70%, transparent),
    0 4px 12px rgba(38, 56, 88, 0.05),
    var(--stat-light-shadow);
}

.item-list {
  display: grid;
  gap: 12px;
}

.item-swipe {
  border-radius: 14px;
}

.item-swipe :deep(.van-swipe-cell__wrapper) {
  border-radius: 14px;
}

.item-swipe :deep(.van-swipe-cell__right) {
  display: flex;
  align-items: stretch;
  gap: 8px;
  padding-left: 8px;
}

.item-row {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(104px, 142px);
  gap: 12px;
  align-items: end;
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-border) 34%, var(--divider));
  border-radius: 14px;
  background: linear-gradient(135deg, var(--surface-soft) 0%, color-mix(in srgb, var(--surface-soft) 72%, var(--surface)) 100%);
  box-shadow: 0 6px 16px rgba(38, 56, 88, 0.04);
}

.item-row.has-created-at {
  padding-top: 30px;
}

.item-row.grouped-item {
  grid-template-columns: auto minmax(0, 1fr) minmax(68px, 26%);
  align-items: center;
  gap: 6px;
  padding: 6px 8px 6px 3px;
}

.grouped-item .text-input {
  height: 36px;
}

.item-row.voided {
  opacity: 0.62;
  filter: saturate(0.45);
}

.item-row.voided .text-input {
  text-decoration: line-through;
}

.item-field {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.item-field span {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
}

.item-created-at {
  position: absolute;
  right: 14px;
  top: 10px;
  min-width: 96px;
  text-align: right;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.02em;
  user-select: none;
}

.item-price-field .text-input {
  color: var(--accent-strong);
  font-weight: 700;
  text-align: right;
}

.swipe-action {
  --swipe-action-bg: var(--header-icon-bg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 4px;
  width: 72px;
  height: 100%;
  margin: 0;
  border: 0;
  border-radius: 14px;
  background: var(--swipe-action-bg);
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
}

.swipe-action.danger {
  --swipe-action-bg: var(--danger-bg);
  color: var(--danger-text);
}

.swipe-action.void {
  --swipe-action-bg: color-mix(in srgb, var(--surface-soft) 86%, var(--accent));
}

.home-page :deep(.van-popup) {
  background: var(--surface);
  color: var(--text-main);
}

.recycle-popup {
  max-height: 78vh;
  overflow-y: auto;
}

.popup-head p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 12px;
}

.time-popup {
  color: var(--text-main);
}

.recycle-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.recycle-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border-radius: 12px;
  background: var(--surface-soft);
}

.recycle-item strong,
.recycle-item span {
  display: block;
}

.recycle-item strong {
  color: var(--text-strong);
}

.recycle-item span {
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 12px;
}

.recycle-actions {
  display: flex;
  gap: 8px;
}

.recycle-actions button {
  height: 34px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: var(--header-icon-bg);
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
}

.recycle-actions button.danger {
  background: var(--danger-bg);
  color: var(--danger-text);
}

@media (max-width: 520px) {
  .home-page {
    padding: 10px;
  }

  .page-header {
    margin: -10px -10px 10px;
    padding: 12px 16px;
  }

  .page-header h1 {
    font-size: 26px;
  }

  .header-icon {
    width: 42px;
  }

  .header-icon,
  .add-bill-button {
    height: 42px;
  }

  .bill-editor,
  .items-panel {
    padding: 14px;
    border-radius: 12px;
  }

  .detail-summary {
    grid-template-columns: 1fr;
  }

  .detail-total {
    justify-items: stretch;
    min-width: 0;
  }

  .detail-total strong {
    text-align: right;
  }

  .item-row {
    grid-template-columns: minmax(0, 1fr) minmax(82px, 96px);
    gap: 8px;
    padding: 12px;
  }

  .item-field span {
    font-size: 11px;
  }

  .item-row .text-input {
    padding: 0 10px;
  }
  .swipe-action {
    width: 64px;
  }

  .recycle-item {
    grid-template-columns: 1fr;
  }

  .recycle-actions {
    justify-content: flex-end;
  }
}

</style>
