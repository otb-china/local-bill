<template>
  <div class="home-page" :style="themeStyle">
    <header v-if="activeBill" class="page-header detail-header">
      <button class="header-icon" type="button" aria-label="返回账单列表" @click="closeBill">
        <el-icon><Back /></el-icon>
      </button>
      <h1>账单明细</h1>
      <button
        class="header-icon"
        :class="{ 'is-hidden': !showScrollTop }"
        type="button"
        aria-label="回到顶部"
        :tabindex="showScrollTop ? 0 : -1"
        @click="scrollToTop"
      >
        <el-icon><Top /></el-icon>
      </button>
    </header>
    <header v-else class="page-header">
      <div>
        <div class="header-title">
          <h1>本地账单</h1>
          <span class="header-bill-count">{{ bills.length }} 个账单</span>
        </div>
      </div>
      <div class="header-actions">
        <button v-if="showScrollTop" class="header-icon" type="button" aria-label="回到顶部" @click="scrollToTop">
          <el-icon><Top /></el-icon>
        </button>
        <button class="header-icon" type="button" aria-label="设置" @click="settingsPopup = true">
          <el-icon><Setting /></el-icon>
        </button>
      </div>
      <div class="bill-toolbar">
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
        <van-swipe-cell
          v-for="bill in visibleBills"
          :key="bill.id"
          class="bill-swipe"
          @open="swipedBillId = bill.id"
          @close="swipedBillId === bill.id && (swipedBillId = '')"
          @click="$event === 'cell' && swipedBillId !== bill.id && openBill(bill.id)"
        >
          <button class="bill-card" type="button">
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
          <template #right>
            <button
              class="swipe-action danger"
              type="button"
              :aria-label="`删除账单 ${bill.name || '未命名账单'}`"
              :tabindex="swipedBillId === bill.id ? 0 : -1"
              @click="removeBill(bill.id)"
            >
              <el-icon><Delete /></el-icon>
              <span>删除</span>
            </button>
          </template>
        </van-swipe-cell>
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
        <div class="bill-editor-header">
          <input id="bill-name" v-model.trim="activeBill.name" class="text-input title-input" aria-label="账单名" placeholder="账单名" @input="touchActiveBill" />
          <div class="detail-actions">
            <button class="icon-button" type="button" aria-label="生成明细图片" title="生成明细图片" @click="shareBillImage">
              <el-icon aria-hidden="true"><Share /></el-icon>
            </button>
            <button class="icon-button" type="button" aria-label="复制账单" title="复制账单" @click="openCopyBillDialog">
              <el-icon aria-hidden="true"><CopyDocument /></el-icon>
            </button>
          </div>
        </div>

        <div class="detail-summary">
          <div class="bill-title-fields">
            <input v-model.trim="activeBill.subtitle" class="text-input subtitle-input" aria-label="副标题" placeholder="副标题" @input="touchActiveBill" />
          </div>

          <div class="detail-total">
            <span>累计{{ validActiveBillItems.length }}项</span>
            <strong>¥{{ formatMoney(activeBillTotal) }}</strong>
          </div>
        </div>

      </section>

      <section
        class="items-panel"
        :key="activeBill.id"
        :class="{ 'is-dragging': drag }"
        @pointermove="moveDrag"
        @pointerup="finishDrag"
        @pointercancel="cancelDrag"
        @lostpointercapture="cancelDrag"
      >
        <div class="section-row">
          <div class="item-mode" role="group" aria-label="子项显示模式">
            <button type="button" :aria-pressed="!groupMode" @click="setItemMode('date')">日期</button>
            <button type="button" :aria-pressed="groupMode" @click="setItemMode('group')">分组</button>
          </div>
          <button v-if="groupMode" class="add-item-row" type="button" @click="addGroup">
            <el-icon><Plus /></el-icon>
            <span>新增分组</span>
          </button>
          <button v-else class="add-item-row" type="button" @click="addItem()">
            <el-icon><Plus /></el-icon>
            <span>新增子项</span>
          </button>
        </div>

        <div class="item-list">
          <div
            v-for="section in itemSections"
            :key="section.id"
            class="item-list"
            :class="{
              'item-group': groupMode,
              'drag-source': drag?.kind === 'group' && drag.id === section.id,
              'drop-group': drag?.kind === 'item' && dragHoverGroupId === section.id,
            }"
            :data-group-id="groupMode ? section.id : undefined"
          >
            <div v-if="groupMode" class="item-group-header">
              <button
                v-if="itemSections.length > 1"
                class="drag-handle"
                type="button"
                aria-label="拖动分组"
                title="按住拖动排序"
                @pointerdown="startDrag($event, 'group', section.id)"
                @touchstart.stop
                @touchmove="handleDragTouchMove"
                @contextmenu.prevent
              >⠿</button>
              <input
                v-if="groupNameEdit?.id === section.id"
                v-focus
                v-model="groupNameEdit.name"
                class="text-input group-name-input"
                aria-label="分组名称"
                @keydown.enter="!$event.isComposing && finishGroupName(section.id)"
                @keydown.esc.stop="groupNameEdit = undefined"
                @blur="finishGroupName(section.id)"
              />
              <button
                v-else
                class="group-name-button"
                type="button"
                title="点击修改分组名称"
                @click="groupNameEdit = { id: section.id, name: section.name }"
              >{{ section.name }}</button>
              <button
                class="group-toggle"
                type="button"
                :aria-label="collapsedGroups.has(section.id) ? '展开分组' : '收起分组'"
                :aria-expanded="!collapsedGroups.has(section.id)"
                @click="toggleGroup(section.id)"
              >
                <span class="group-count">{{ section.items.length }} 项</span>
                <strong class="group-total" title="分组合计">¥{{ formatMoney(sumBillItems(getValidItems(section.items))) }}</strong>
              </button>
              <button class="group-action" type="button" aria-label="新增子项" title="新增子项" @click="addItem(section.id)">
                <el-icon><Plus /></el-icon>
              </button>
              <button
                v-if="itemSections.length > 1 && !section.items.length"
                class="group-action danger"
                type="button"
                aria-label="删除分组"
                title="删除分组"
                @click="removeGroup(section.id)"
              ><el-icon><Delete /></el-icon></button>
              <button
                class="group-action group-chevron-button"
                type="button"
                :aria-label="collapsedGroups.has(section.id) ? '展开分组' : '收起分组'"
                :aria-expanded="!collapsedGroups.has(section.id)"
                @click="toggleGroup(section.id)"
              ><el-icon class="group-chevron"><ArrowDown /></el-icon></button>
            </div>
            <van-swipe-cell
              v-for="item in groupMode && collapsedGroups.has(section.id) ? [] : section.items"
              :key="item.id"
              class="item-swipe"
              :data-item-id="groupMode ? item.id : undefined"
              :class="{ 'drag-source': drag?.kind === 'item' && drag.id === item.id }"
            >
              <div class="item-row" :class="{ 'has-created-at': !groupMode && item.createdAt, 'grouped-item': groupMode, voided: item.voided }">
                <button
                  v-if="groupMode"
                  class="drag-handle item-drag-handle"
                  type="button"
                  aria-label="拖动子项"
                  title="按住拖动排序"
                  @pointerdown="startDrag($event, 'item', item.id)"
                  @touchstart.stop
                  @touchmove="handleDragTouchMove"
                  @contextmenu.prevent
                >⠿</button>
                <label class="item-field item-name-field">
                  <input v-model.trim="item.name" class="text-input" aria-label="名称" placeholder="名称" @input="touchActiveBill" />
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

    <van-dialog
      v-model:show="copyBillDialog"
      class-name="copy-bill-dialog"
      aria-labelledby="copy-bill-title"
      width="min(340px, calc(100% - 40px))"
      :overlay-style="{ background: 'rgba(18, 35, 49, 0.38)' }"
      show-cancel-button
      confirm-button-text="确认复制"
      @confirm="copyActiveBill"
    >
      <template #title>
        <div class="copy-bill-heading">
          <span class="copy-bill-icon" aria-hidden="true"><el-icon><CopyDocument /></el-icon></span>
          <h2 id="copy-bill-title">复制账单</h2>
        </div>
      </template>
      <div class="copy-bill-name">
        <input v-model.trim="copyBillName" class="text-input" aria-label="新账单名称" :placeholder="defaultCopyBillName" />
      </div>
    </van-dialog>

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
import { ArrowDown, Back, CircleClose, Clock, CopyDocument, Delete, Plus, Search, Setting, Share, Top } from "@element-plus/icons-vue";
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
const DRAG_MOVE_THRESHOLD = 4;
const DRAG_SCROLL_EDGE = 80;
const DRAG_HOLD_MS = 250;
const DRAG_TOUCH_SLOP = 8;
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
const swipedBillId = ref("");
const copyBillDialog = ref(false);
const copyBillName = ref("");
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
const defaultCopyBillName = computed(() => `${activeBill.value?.name || "未命名账单"}（复制）`);
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
type DragSource = {
  kind: "group" | "item";
  id: string;
  pointerId: number;
};
const drag = ref<DragSource>();
const dragHoverGroupId = ref("");
let dragSnapshot: { groups: Bill["groups"]; items: BillItem[]; groupIds: Map<string, string> } | undefined;
let dragChanged = false;
let pendingDrag: (DragSource & { startX: number; startY: number; element: HTMLElement; panel: HTMLElement }) | undefined;
let dragElement: HTMLElement | undefined;
let dragPanel: HTMLElement | undefined;
let dragHoldTimer = 0;
let dragFrame = 0;
let dragY = 0;
let dragGrabY = 0;
let dragOffsetY = 0;

const itemSections = computed(() => {
  const bill = activeBill.value;
  if (!bill) return [];
  if (!groupMode.value) return [{ id: "", name: "", items: sortItemsByCreatedAt(bill.items) }];
  return getBillGroups(bill);
});

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
watch(visibleBills, (list) => {
  if (swipedBillId.value && !list.some((bill) => bill.id === swipedBillId.value)) {
    swipedBillId.value = "";
  }
});
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

function openCopyBillDialog() {
  if (!activeBill.value) return;
  copyBillName.value = defaultCopyBillName.value;
  copyBillDialog.value = true;
}

function copyActiveBill() {
  if (!copyBillDialog.value || !activeBill.value) return;
  copyBillDialog.value = false;
  const source = activeBill.value;
  const now = new Date().toISOString();
  const copy: Bill = {
    ...source,
    id: createId("bill"),
    name: copyBillName.value || defaultCopyBillName.value,
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
  swipedBillId.value = "";
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
  if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
  if (drag.value || pendingDrag || !groupMode.value) return;
  const handle = event.currentTarget as HTMLElement;
  const element = handle.closest<HTMLElement>(kind === "group" ? "[data-group-id]" : "[data-item-id]");
  const panel = handle.closest<HTMLElement>(".items-panel");
  if (!element || !panel) return;
  if (event.pointerType === "mouse") event.preventDefault();
  panel.setPointerCapture(event.pointerId);
  pendingDrag = { kind, id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, element, panel };
  if (event.pointerType !== "mouse") {
    const pending = pendingDrag;
    dragHoldTimer = window.setTimeout(() => {
      if (pendingDrag === pending) activateDrag(pending);
    }, DRAG_HOLD_MS);
  }
}

function handleDragTouchMove(event: TouchEvent) {
  event.stopPropagation();
  if (drag.value && event.cancelable) event.preventDefault();
}

function moveDrag(event: PointerEvent) {
  const pending = pendingDrag;
  if (!drag.value && pending?.pointerId === event.pointerId) {
    const distance = Math.hypot(event.clientX - pending.startX, event.clientY - pending.startY);
    if (event.pointerType !== "mouse") {
      if (distance > DRAG_TOUCH_SLOP) resetDragState();
      return;
    }
    if (distance < DRAG_MOVE_THRESHOLD) return;
    activateDrag(pending);
  }
  if (drag.value?.pointerId !== event.pointerId) return;
  event.preventDefault();
  trackDrag(event);
}

function activateDrag(pending: NonNullable<typeof pendingDrag>) {
  const bill = activeBill.value;
  if (!bill) return;
  pendingDrag = undefined;
  clearTimeout(dragHoldTimer);
  dragElement = pending.element;
  dragPanel = pending.panel;
  dragGrabY = pending.startY - dragElement.getBoundingClientRect().top;
  dragOffsetY = 0;
  dragY = pending.startY;
  dragChanged = false;
  dragSnapshot = {
    groups: [...bill.groups],
    items: [...bill.items],
    groupIds: new Map(bill.items.map((item) => [item.id, item.groupId ?? ""])),
  };
  drag.value = { kind: pending.kind, id: pending.id, pointerId: pending.pointerId };
  navigator.vibrate?.(12);
  nextTick(() => {
    positionDragElement();
    updateDragOrder();
  });
  dragFrame = requestAnimationFrame(scrollDuringDrag);
}

function trackDrag(position: { clientX: number; clientY: number }) {
  dragY = position.clientY;
  positionDragElement();
  updateDragOrder();
}

function resolveDragElement() {
  const current = drag.value;
  if (!current || !dragPanel || dragElement?.isConnected) return;
  const attribute = current.kind === "group" ? "data-group-id" : "data-item-id";
  dragElement = dragPanel.querySelector<HTMLElement>(`[${attribute}="${current.id}"]`) ?? undefined;
}

function translateY(element: HTMLElement) {
  return new DOMMatrixReadOnly(getComputedStyle(element).transform).m42;
}

function positionDragElement() {
  resolveDragElement();
  if (!dragElement) return;
  dragElement.style.transition = "none";
  const layoutTop = dragElement.getBoundingClientRect().top - translateY(dragElement);
  dragOffsetY = dragY - dragGrabY - layoutTop;
  dragElement.style.transform = `translate3d(0, ${dragOffsetY}px, 0)`;
}

function layoutRect(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const shift = translateY(element);
  return { top: rect.top - shift, bottom: rect.bottom - shift };
}

function distanceToGroup(element: HTMLElement) {
  const rect = layoutRect(element);
  if (dragY < rect.top) return rect.top - dragY;
  if (dragY > rect.bottom) return dragY - rect.bottom;
  return 0;
}

function countBefore(elements: HTMLElement[]) {
  return elements.filter((element) => {
    const rect = layoutRect(element);
    return dragY > (rect.top + rect.bottom) / 2;
  }).length;
}

function updateDragOrder() {
  const current = drag.value;
  const bill = activeBill.value;
  if (!current || !bill || !dragPanel) return;
  const groupElements = Array.from(dragPanel.querySelectorAll<HTMLElement>("[data-group-id]"));

  if (current.kind === "group") {
    const others = groupElements.filter((element) => element.dataset.groupId !== current.id);
    const index = countBefore(others);
    const rest = bill.groups.filter((group) => group.id !== current.id);
    const moving = bill.groups.find((group) => group.id === current.id);
    if (!moving) return;
    const next = [...rest.slice(0, index), moving, ...rest.slice(index)];
    if (next.every((group, position) => group === bill.groups[position])) return;
    animateReorder(() => {
      bill.groups = next;
    });
    return;
  }

  const groupElement = groupElements.reduce<HTMLElement | undefined>((nearest, element) => {
    if (!nearest) return element;
    return distanceToGroup(element) < distanceToGroup(nearest) ? element : nearest;
  }, undefined);
  const groupId = groupElement?.dataset.groupId;
  if (!groupElement || groupId === undefined) return;
  dragHoverGroupId.value = groupId;
  const siblings = Array.from(groupElement.querySelectorAll<HTMLElement>("[data-item-id]"))
    .filter((element) => element.dataset.itemId !== current.id);
  const index = countBefore(siblings);
  const moving = bill.items.find((item) => item.id === current.id);
  if (!moving) return;
  const rest = bill.items.filter((item) => item !== moving);
  const anchorId = siblings[index]?.dataset.itemId;
  const previousId = siblings[index - 1]?.dataset.itemId;
  let insertAt = rest.length;
  if (anchorId) insertAt = rest.findIndex((item) => item.id === anchorId);
  else if (previousId) insertAt = rest.findIndex((item) => item.id === previousId) + 1;
  else {
    const lastInGroup = rest.map((item) => item.groupId).lastIndexOf(groupId);
    if (lastInGroup !== -1) insertAt = lastInGroup + 1;
  }
  const next = [...rest.slice(0, insertAt), moving, ...rest.slice(insertAt)];
  const sameOrder = next.every((item, position) => item === bill.items[position]);
  if (sameOrder && moving.groupId === groupId) return;
  animateReorder(() => {
    moving.groupId = groupId;
    bill.items = next;
  });
}

function animateReorder(mutate: () => void) {
  const panel = dragPanel;
  if (!panel) return;
  const selector = drag.value?.kind === "group" ? "[data-group-id]" : "[data-item-id], [data-group-id]";
  const before = new Map(
    Array.from(panel.querySelectorAll<HTMLElement>(selector))
      .filter((element) => element !== dragElement)
      .map((element) => [element, element.getBoundingClientRect().top]),
  );
  mutate();
  dragChanged = true;
  nextTick(() => {
    positionDragElement();
    before.forEach((top, element) => {
      if (!element.isConnected) return;
      element.style.transition = "none";
      element.style.transform = "";
      const delta = top - element.getBoundingClientRect().top;
      if (!delta) return;
      element.style.transform = `translate3d(0, ${delta}px, 0)`;
      requestAnimationFrame(() => {
        element.style.transition = "transform 0.2s cubic-bezier(0.2, 0, 0, 1)";
        element.style.transform = "";
      });
    });
  });
}

function scrollDuringDrag() {
  const distanceFromBottom = window.innerHeight - dragY;
  const speed = dragY < DRAG_SCROLL_EDGE
    ? -(DRAG_SCROLL_EDGE - dragY)
    : Math.max(0, DRAG_SCROLL_EDGE - distanceFromBottom);
  if (speed) {
    window.scrollBy(0, speed / 4);
    positionDragElement();
    updateDragOrder();
  }
  dragFrame = requestAnimationFrame(scrollDuringDrag);
}

function resetDragState() {
  clearTimeout(dragHoldTimer);
  cancelAnimationFrame(dragFrame);
  dragPanel?.querySelectorAll<HTMLElement>("[data-item-id], [data-group-id]").forEach((element) => {
    element.style.transition = "";
    element.style.transform = "";
  });
  dragElement = undefined;
  dragPanel = undefined;
  pendingDrag = undefined;
  dragSnapshot = undefined;
  drag.value = undefined;
  dragHoverGroupId.value = "";
}

function cancelDrag(event?: PointerEvent) {
  const pointerId = drag.value?.pointerId ?? pendingDrag?.pointerId;
  if (event && event.pointerId !== pointerId) return;
  if (event?.type === "lostpointercapture" && drag.value && dragPanel?.isConnected) return;
  const bill = activeBill.value;
  if (drag.value && dragSnapshot && bill && dragChanged) {
    const snapshot = dragSnapshot;
    snapshot.items.forEach((item) => {
      const original = snapshot.groupIds.get(item.id);
      if (original !== undefined) item.groupId = original || undefined;
    });
    bill.groups = snapshot.groups;
    bill.items = snapshot.items;
  }
  resetDragState();
}

function finishDrag(event: PointerEvent) {
  if (pendingDrag?.pointerId === event.pointerId) {
    resetDragState();
    return;
  }
  if (drag.value?.pointerId !== event.pointerId) return;
  trackDrag(event);
  const changed = dragChanged;
  resetDragState();
  if (changed) touchActiveBill();
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

function removeBill(id: string) {
  const currentBill = bills.value.find((bill) => bill.id === id);
  if (!currentBill) return;
  const billName = currentBill.name || "未命名账单";
  showConfirmDialog({
    title: "删除账单",
    message: `确认将「${billName}」移入回收站吗？一周内可恢复。`,
    width: "260px",
  }).then(() => {
    const bill = bills.value.find((item) => item.id === id);
    if (!bill) return;
    const deletedBill = {
      ...bill,
      deletedAt: new Date().toISOString(),
    };
    deletedBills.value = [deletedBill, ...deletedBills.value.filter((item) => item.id !== id)];
    bills.value = bills.value.filter((item) => item.id !== id);
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
  const isGrouped = bill.itemMode === "group";
  const sections = isGrouped
    ? getBillGroups(bill)
      .map(({ name, items }) => ({ name, items: getValidItems(items) }))
      .filter(({ items }) => items.length > 0)
    : [{ name: "", items: getValidItems(sortItemsByCreatedAt(bill.items)) }];
  const itemCount = sections.reduce((count, section) => count + section.items.length, 0);
  const width = 900;
  const rowHeight = 64;
  const groupHeaderHeight = 48;
  const listStartY = 256;
  const rowBottomOffset = 10;
  const footerGap = 50;
  const footerBottomSpace = 84;
  const rowsHeight = itemCount ? (itemCount - 1) * rowHeight + rowBottomOffset : 0;
  const listHeight = rowsHeight + (isGrouped ? sections.length * groupHeaderHeight : 0);
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
  ctx.fillText(`${itemCount} 项`, 88, bill.subtitle ? 200 : 164);

  ctx.fillStyle = "#1f6b7b";
  ctx.font = "700 44px Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`¥${formatMoney(billTotal(bill))}`, width - 88, 140);
  ctx.textAlign = "left";

  let y = listStartY;
  for (const section of sections) {
    if (isGrouped) {
      const subtotal = `¥${formatMoney(sumBillItems(section.items))}`;
      const subtotalX = width - 112;
      ctx.fillStyle = "#203747";
      ctx.font = "700 26px Arial, sans-serif";
      const nameMaxWidth = subtotalX - 88 - ctx.measureText(subtotal).width - 24;
      ctx.fillText(section.name, 88, y - 10, nameMaxWidth);
      ctx.fillStyle = "#1f6b7b";
      ctx.textAlign = "right";
      ctx.fillText(subtotal, subtotalX, y - 10);
      ctx.textAlign = "left";
      y += groupHeaderHeight;
    }

    section.items.forEach((item, index) => {
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
  }

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
  padding: 12px 12px calc(12px + env(safe-area-inset-bottom));
  background: var(--page-bg);
  color: var(--text-main);
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif;
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
}

.home-page button {
  font-family: inherit;
  transition: background-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease, transform 0.12s ease, opacity 0.18s ease;
}

.home-page button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
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
  margin: -12px -12px 14px;
  padding: calc(16px + env(safe-area-inset-top)) max(18px, calc((100vw - 780px) / 2 + 18px)) 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--divider) 70%, transparent);
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  box-shadow: none;
  backdrop-filter: saturate(180%) blur(16px);
  -webkit-backdrop-filter: saturate(180%) blur(16px);
}

.detail-header {
  grid-template-columns: 40px minmax(0, 1fr) 40px;
  padding-top: calc(10px + env(safe-area-inset-top));
  padding-bottom: 10px;
}

.page-header.detail-header h1 {
  overflow: hidden;
  font-size: 17px;
  font-weight: 600;
  text-align: center;
  text-overflow: ellipsis;
}

.detail-header .header-icon {
  background: transparent;
}

.detail-header .header-icon:hover {
  background: var(--header-icon-bg);
}

.detail-header .header-icon.is-hidden {
  visibility: hidden;
  pointer-events: none;
}

.hero-tag,
.section-tag {
  margin: 0 0 4px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
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
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.1;
  white-space: nowrap;
}

.header-actions,
.bill-editor-header,
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
  height: 42px;
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--surface-muted);
  color: var(--text-subtle);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.bill-search:focus-within {
  border-color: var(--accent);
  background: var(--surface);
  box-shadow: 0 0 0 3px var(--accent-ring);
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
  -webkit-appearance: none;
  appearance: none;
}

.bill-search input::-webkit-search-cancel-button {
  cursor: pointer;
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

.header-icon:hover,
.icon-button:hover {
  background: color-mix(in srgb, var(--header-icon-bg) 80%, var(--accent));
}

.header-icon:active,
.icon-button:active,
.add-bill-button:active,
.add-item-row:active,
.swipe-action:active,
.recycle-actions button:active {
  transform: scale(0.96);
}

.add-bill-button {
  width: auto;
  height: 42px;
  gap: 6px;
  padding: 0 16px;
  border-radius: 999px;
  background: var(--accent-strong);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: none;
}

.add-bill-button:hover {
  filter: brightness(1.06);
}

.add-bill-button .el-icon {
  font-size: 16px;
}

.icon-button.danger {
  background: var(--danger-bg);
  color: var(--danger-text);
}

.bill-editor,
.items-panel {
  margin-bottom: 14px;
  padding: 20px;
  border: 0;
  border-radius: 20px;
  background: var(--surface);
  box-shadow: 0 1px 2px rgba(20, 40, 62, 0.04), 0 4px 14px rgba(20, 40, 62, 0.04);
}

.items-panel {
  margin-bottom: 0;
}

.header-bill-count {
  color: var(--text-muted);
  font-weight: 500;
  white-space: nowrap;
  align-self: center;
}

.header-bill-count,
.empty-state span,
.bill-editor-header label,
.detail-total span {
  color: var(--text-muted);
  font-size: 12px;
}

.bill-list {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}

.bill-swipe {
  border: 0;
  border-radius: 16px;
  background: var(--surface);
  box-shadow: 0 1px 2px rgba(20, 40, 62, 0.04), 0 4px 14px rgba(20, 40, 62, 0.04);
  overflow: hidden;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.bill-swipe:hover {
  box-shadow: 0 1px 2px rgba(20, 40, 62, 0.04), 0 8px 22px rgba(20, 40, 62, 0.07);
}

.bill-swipe :deep(.van-swipe-cell__right) {
  display: flex;
  padding: 8px 8px 8px 0;
}

.bill-card {
  position: relative;
  display: grid;
  width: 100%;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 6px 12px;
  padding: 16px 18px;
  border: 0;
  border-radius: 16px;
  background: var(--surface);
  text-align: left;
  cursor: pointer;
}



.home-page .bill-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
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
  font-weight: 600;
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
  font-size: clamp(19px, 5.6vw, 22px);
  font-weight: 700;
  letter-spacing: -0.01em;
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
  margin-top: 2px;
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
  padding: 48px 16px;
  border: 1px dashed var(--divider);
  border-radius: 20px;
  background: color-mix(in srgb, var(--surface) 70%, transparent);
  text-align: center;
}

.empty-state strong {
  font-size: 16px;
}

.empty-state.compact {
  padding: 22px 12px;
}

.empty-state strong {
  color: var(--text-strong);
}

.bill-editor {
  display: grid;
  gap: 6px;
}

.bill-editor-header {
  justify-content: space-between;
  gap: 8px;
  padding-left: 10px;
}

.bill-title-fields {
  padding-left: 10px;
}

.detail-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;
}

.bill-title-fields {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.text-input {
  width: 100%;
  min-width: 0;
  height: 40px;
  padding: 0 10px;
  border: 1.5px dashed var(--divider);
  border-radius: 10px;
  outline: 0;
  background: transparent;
  color: var(--text-main);
  font-size: 15px;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.text-input:hover:not(:focus) {
  border-color: var(--accent-border);
}

.text-input::placeholder {
  color: var(--text-subtle);
  opacity: 0.8;
}

.text-input:focus {
  border-style: solid;
  border-color: var(--accent);
  background: var(--surface);
  box-shadow: 0 0 0 3px var(--accent-ring);
}

.home-page :deep(.copy-bill-dialog) {
  border: 1px solid var(--divider);
  border-radius: 20px;
  box-shadow: 0 18px 52px rgba(18, 35, 49, 0.2);
}

.home-page :deep(.copy-bill-dialog .van-dialog__header) {
  padding: 20px 20px 0;
  color: var(--text-strong);
}

.copy-bill-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
}

.copy-bill-heading h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.copy-bill-icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 11px;
  background: var(--header-icon-bg);
  color: var(--accent);
  font-size: 17px;
}

.copy-bill-name {
  padding: 16px 20px 0;
}

.home-page :deep(.copy-bill-dialog .van-dialog__footer) {
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px 20px;
}

.home-page :deep(.copy-bill-dialog .van-dialog__footer::after),
.home-page :deep(.copy-bill-dialog .van-dialog__confirm::after) {
  content: none;
}

.home-page :deep(.copy-bill-dialog .van-dialog__footer .van-button) {
  flex: none;
  width: auto;
  height: 40px;
  padding: 0 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
}

.home-page :deep(.copy-bill-dialog .van-dialog__cancel) {
  background: var(--surface-muted);
  color: var(--text-main);
}

.home-page :deep(.copy-bill-dialog .van-dialog__confirm) {
  background: var(--submit-btn-bg);
  color: #fff;
  box-shadow: var(--submit-btn-shadow);
}

.title-input,
.subtitle-input {
  justify-self: start;
  width: auto;
  min-width: 5em;
  max-width: 100%;
  margin-left: -10px;
  field-sizing: content;
}

.title-input {
  flex: 0 1 auto;
  height: 44px;
  color: var(--text-strong);
  font-size: 22px;
  font-weight: 700;
}

.subtitle-input {
  height: 34px;
  color: var(--text-muted);
  font-size: 14px;
}

.subtitle-input {
  color: var(--text-main);
  font-size: 14px;
}

.detail-total {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  justify-items: end;
  min-width: 200px;
  min-height: 0;
  padding: 14px 18px;
  overflow: hidden;
  border-radius: 18px;
  background: var(--accent-strong);
}

.detail-total span {
  justify-self: start;
  color: var(--stat-income-text);
  font-weight: 600;
  opacity: 0.82;
}

.detail-total strong {
  align-self: center;
  color: var(--stat-income-text);
  font-size: 28px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  line-height: 1.05;
}

.detail-actions {
  flex: none;
  gap: 6px;
}

.detail-actions .icon-button {
  width: 36px;
  height: 36px;
  padding: 0;
  font-size: 16px;
}

.add-item-row {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 14px;
  font-size: 14px;
  font-weight: 700;
}

.section-row {
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.item-mode {
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  background: var(--surface-muted);
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
  min-height: 28px;
  padding: 0 12px;
  border-radius: 999px;
}

.item-mode button {
  color: var(--text-muted);
}

.item-mode button[aria-pressed="true"] {
  background: var(--surface);
  color: var(--accent);
  box-shadow: 0 1px 3px rgba(20, 40, 62, 0.1);
}

.item-group {
  min-width: 0;
  gap: 6px;
  padding: 0 0 8px;
  border: 1px solid var(--divider);
  border-radius: 16px;
  background: var(--surface);
  overflow: hidden;
}

.item-group:not(:has(.item-swipe)) {
  padding-bottom: 0;
}

.item-group-header {
  display: flex;
  align-items: center;
  gap: 3px;
  min-height: 50px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--divider);
  background: var(--surface-soft);
}

.item-group:not(:has(.item-swipe)) .item-group-header {
  border-bottom: 0;
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

.group-total {
  flex: none;
  margin-right: 2px;
  color: var(--accent-strong);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
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
  min-width: 30px;
  min-height: 30px;
  padding: 0 5px;
  border-radius: 8px;
}

.group-action:hover {
  background: color-mix(in srgb, var(--surface) 70%, transparent) !important;
}

.drag-handle {
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  cursor: grab;
  font-size: 19px;
  opacity: 0.55;
}

.drag-handle:hover {
  opacity: 1;
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

.items-panel.is-dragging {
  cursor: grabbing;
  user-select: none;
  -webkit-user-select: none;
}

.items-panel.is-dragging .drag-handle {
  cursor: grabbing;
}

.drag-source {
  position: relative;
  z-index: 30;
  pointer-events: none;
  transition: box-shadow 0.18s ease !important;
  will-change: transform;
}

.drag-source .item-row,
.drag-source .item-group-header {
  background: var(--surface);
}

.drag-source.item-swipe,
.drag-source.item-group {
  border-radius: 16px;
  background: var(--surface);
  box-shadow:
    0 0 0 1.5px var(--accent),
    0 16px 36px rgba(20, 40, 62, 0.2) !important;
  scale: 1.02;
}

.drag-source .drag-handle {
  opacity: 1;
}

.drop-group {
  box-shadow: 0 0 0 2px var(--accent-ring) !important;
}

.drag-source.item-group {
  overflow: hidden;
}

.items-panel.is-dragging .item-group:not(.drag-source) {
  overflow: visible;
}

.items-panel.is-dragging .item-group:not(.drag-source) .item-group-header {
  border-radius: 16px 16px 0 0;
}

.items-panel.is-dragging .item-group:not(.drag-source):not(:has(.item-swipe)) .item-group-header {
  border-radius: 16px;
}

.add-item-row {
  height: 34px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  color: var(--accent);
  background: var(--header-icon-bg);
  font-size: 13px;
  white-space: nowrap;
}

.add-item-row .el-icon {
  font-size: 14px;
}

.add-item-row:hover {
  background: color-mix(in srgb, var(--header-icon-bg) 80%, var(--accent));
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
  gap: 10px;
  align-items: end;
  padding: 10px;
  border: 1px solid var(--divider);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.item-row:focus-within {
  border-color: var(--accent-border);
}

.item-row .text-input {
  height: 36px;
}

.item-row.has-created-at {
  padding-top: 32px;
}

.item-group .item-row.grouped-item {
  border-color: transparent;
}

.item-row.grouped-item {
  grid-template-columns: auto minmax(0, 1fr) minmax(92px, 32%);
  align-items: center;
  gap: 6px;
  padding: 6px 6px 6px 2px;
}

.grouped-item .text-input {
  height: 36px;
}

.item-name-field .text-input:not(:focus):not(:hover):not(:placeholder-shown) {
  border-color: transparent;
}

.item-row.voided {
  border-style: dashed;
  background: var(--surface-muted);
  box-shadow: none;
  opacity: 0.6;
  filter: saturate(0.3);
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
  left: 14px;
  right: auto;
  top: 10px;
  min-width: 96px;
  text-align: left;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.02em;
  user-select: none;
}

.item-price-field .text-input:focus {
  background: var(--surface);
}

.item-price-field .text-input {
  padding: 0 8px;
  border-color: var(--accent-border);
  background: color-mix(in srgb, var(--header-icon-bg) 70%, var(--surface));
  color: var(--accent-strong);
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.swipe-action {
  --swipe-action-bg: var(--header-icon-bg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 4px;
  width: 68px;
  height: 100%;
  margin: 0;
  border: 0;
  border-radius: 14px;
  background: var(--swipe-action-bg);
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
}

.swipe-action .el-icon {
  font-size: 18px;
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
  padding: 14px;
  border: 1px solid var(--divider);
  border-radius: 14px;
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
    padding: 10px 10px calc(10px + env(safe-area-inset-bottom));
  }

  .page-header {
    margin: -10px -10px 10px;
    padding: 12px 16px;
  }

  .page-header h1 {
    font-size: 26px;
  }

  .detail-total strong {
    font-size: 26px;
  }

  .page-header.detail-header {
    grid-template-columns: 42px minmax(0, 1fr) 42px;
    padding: calc(6px + env(safe-area-inset-top)) 10px 6px;
  }

  .page-header.detail-header h1 {
    font-size: 17px;
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
    border-radius: 18px;
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
    padding: 8px;
  }

  .item-row.has-created-at {
    padding-top: 30px;
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


/* ---------- detail refresh (vip-bill style) ---------- */
.page-header.detail-header {
  border-bottom: 0;
  background: color-mix(in srgb, var(--page-bg) 86%, transparent);
  box-shadow: none;
}

.detail-header .header-icon,
.detail-header .header-icon:hover {
  background: var(--surface);
  box-shadow: 0 2px 10px rgba(20, 40, 62, 0.06);
}

.bill-detail-view .bill-editor {
  position: relative;
  gap: 10px;
  margin-bottom: 20px;
  padding: 20px;
  overflow: hidden;
  border-radius: 24px;
  background: var(--stat-income-bg);
  box-shadow: var(--submit-btn-shadow);
  color: var(--stat-income-text);
}

.bill-detail-view .bill-editor::before {
  content: "";
  position: absolute;
  top: -90px;
  right: -70px;
  width: 230px;
  height: 230px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, transparent 70%);
  pointer-events: none;
}

.bill-detail-view .bill-editor > * {
  position: relative;
}

.bill-editor .text-input {
  border-color: rgba(255, 255, 255, 0.36);
  color: #fff;
}

.bill-editor .text-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.bill-editor .text-input:hover:not(:focus) {
  border-color: rgba(255, 255, 255, 0.6);
}

.bill-editor .text-input:focus {
  border-color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.14);
  box-shadow: none;
}

.bill-editor .subtitle-input {
  color: rgba(255, 255, 255, 0.85);
}

.bill-editor .icon-button,
.bill-editor .icon-button:hover {
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
}

.bill-editor .icon-button:hover {
  background: rgba(255, 255, 255, 0.26);
}

.bill-detail-view .detail-summary {
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
}

.bill-detail-view .detail-total {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: start;
  gap: 4px;
  min-width: 0;
  padding: 0 0 0 10px;
  overflow: visible;
  border-radius: 0;
  background: transparent;
}

.bill-detail-view .detail-total span {
  color: rgba(255, 255, 255, 0.78);
  font-size: 13px;
  font-weight: 500;
  opacity: 1;
}

.bill-detail-view .detail-total strong {
  color: #fff;
  font-size: 38px;
  text-align: left;
}

.bill-detail-view .items-panel {
  padding: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.bill-detail-view .section-row {
  margin-bottom: 12px;
}

.bill-detail-view .item-mode {
  background: color-mix(in srgb, var(--surface-muted) 70%, var(--divider));
}

.bill-detail-view .item-list {
  gap: 10px;
}

.bill-detail-view .item-row {
  border-color: transparent;
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(20, 40, 62, 0.04), 0 4px 14px rgba(20, 40, 62, 0.05);
}

.bill-detail-view .item-row.voided {
  box-shadow: none;
}

.bill-detail-view .item-group {
  border: 0;
  background: var(--surface);
  box-shadow: 0 1px 2px rgba(20, 40, 62, 0.04), 0 4px 14px rgba(20, 40, 62, 0.05);
}

.bill-detail-view .item-group .item-row.grouped-item {
  border-radius: 12px;
  box-shadow: none;
}

.bill-detail-view .item-swipe,
.bill-detail-view .item-swipe :deep(.van-swipe-cell__wrapper) {
  border-radius: 16px;
}

@media (max-width: 520px) {
  .bill-detail-view .bill-editor {
    padding: 16px;
    border-radius: 22px;
  }

  .bill-detail-view .items-panel {
    padding: 0;
  }

  .bill-detail-view .detail-total strong {
    font-size: 34px;
  }
}

/* ---------- group card refresh ---------- */
.bill-detail-view .item-list:has(> .item-group) {
  gap: 16px;
}

.bill-detail-view .item-group {
  gap: 2px;
  padding: 0 0 4px;
  border-radius: 20px;
  box-shadow: 0 1px 2px rgba(20, 40, 62, 0.05), 0 8px 24px rgba(20, 40, 62, 0.07);
}

.bill-detail-view .item-group:not(:has(.item-swipe)) {
  padding-bottom: 0;
}

.bill-detail-view .item-group-header,
.bill-detail-view .drag-source .item-group-header,
.items-panel.is-dragging .item-group:not(.drag-source) .item-group-header {
  gap: 2px;
  min-height: 58px;
  padding: 8px 10px 8px 11px;
  border-bottom: 0;
  border-radius: 0;
  background: transparent;
}

.bill-detail-view .item-group:has(.item-swipe) .item-group-header::after {
  content: "";
  position: absolute;
  right: 16px;
  bottom: 0;
  left: 16px;
  height: 1px;
  background: var(--divider);
}

.bill-detail-view .item-group-header {
  position: relative;
}

.bill-detail-view .item-group-header .drag-handle,
.bill-detail-view .item-group .item-drag-handle {
  flex: none;
  width: 28px;
  min-width: 28px;
  padding: 0;
  font-size: 17px;
  line-height: 1;
  opacity: 0.45;
}

.bill-detail-view .item-group {
  grid-template-columns: minmax(0, 1fr);
}

.bill-detail-view .item-group-header {
  min-width: 0;
}

.bill-detail-view .item-group-header .drag-handle:hover,
.bill-detail-view .item-group .item-drag-handle:hover,
.bill-detail-view .drag-source .drag-handle {
  opacity: 1;
}

.bill-detail-view .group-toggle {
  flex: 1 0 auto;
  gap: 10px;
  min-width: 0;
  min-height: 40px;
  padding: 0 4px 0 8px;
}

.group-name-button,
.bill-detail-view .item-group-header .group-name-input {
  flex: 0 1 auto;
  width: auto;
  min-width: 0;
  max-width: none;
  height: 34px;
  min-height: 34px;
  margin: 0 0 0 4px;
  padding: 0 10px;
  border: 1.5px dashed var(--divider);
  border-radius: 10px;
  background: transparent;
  color: var(--text-main);
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  line-height: 32px;
}

.group-name-button {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: text;
}

.group-name-button:hover {
  border-color: var(--accent);
}

.bill-detail-view .item-group-header .group-name-input {
  field-sizing: content;
  flex-shrink: 1;
  min-width: 80px;
  border-style: solid;
}


.bill-detail-view .group-count {
  flex: 1;
  text-align: left;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 500;
}

.bill-detail-view .group-toggle .group-total {
  margin: 0;
  color: var(--accent-strong);
  font-size: 17px;
  font-weight: 800;
}

.group-chevron {
  flex: none;
  color: var(--text-muted);
  font-size: 14px;
  transition: transform 0.2s ease;
}

.group-chevron-button[aria-expanded="false"] .group-chevron {
  transform: rotate(-90deg);
}


.bill-detail-view .item-group-header .group-action {
  min-width: 32px;
  min-height: 32px;
  padding: 0;
  color: var(--text-muted);
}

.bill-detail-view .item-group-header .group-action:hover {
  background: var(--header-icon-bg) !important;
  color: var(--accent);
}

.bill-detail-view .item-group-header .group-action.danger:hover {
  background: var(--danger-bg) !important;
  color: var(--danger-text);
}

.bill-detail-view .item-group-header .group-chevron-button:hover {
  background: transparent !important;
}

.bill-detail-view .item-group:has(.item-swipe) {
  padding-bottom: 8px;
}
</style>
