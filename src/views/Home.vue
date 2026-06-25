<template>
  <div class="home-page" :style="themeStyle">
    <header ref="headerSection" class="page-header">
      <div>
        <p class="hero-tag">Local Bill</p>
        <h1>{{ activeBill ? "账单明细" : "本地账单" }}</h1>
      </div>
      <div class="header-actions">
        <button v-if="activeBill" class="header-icon" type="button" @click="closeBill">
          <el-icon><Back /></el-icon>
        </button>
        <button v-if="showScrollTop" class="header-icon" type="button" @click="scrollToTop">
          <el-icon><Top /></el-icon>
        </button>
        <button class="header-icon" type="button" @click="settingsPopup = true">
          <el-icon><Setting /></el-icon>
        </button>
      </div>
    </header>

    <main v-if="!activeBill" class="bill-list-view">
      <section class="summary-band">
        <div>
          <p class="section-tag">Total</p>
          <strong>¥{{ formatMoney(grandTotal) }}</strong>
        </div>
        <span>{{ bills.length }} 个账单</span>
      </section>

      <section class="bill-grid">
        <button
          v-for="bill in sortedBills"
          :key="bill.id"
          class="bill-card"
          type="button"
          @click="openBill(bill.id)"
        >
          <div class="bill-card-head">
            <span class="bill-card-name">{{ bill.name }}</span>
            <span class="bill-card-count">{{ bill.items.length }} 项</span>
          </div>
          <strong>¥{{ formatMoney(billTotal(bill)) }}</strong>
          <small v-if="getBillLatestCreatedDate(bill)" class="bill-card-meta">
            <time>{{ getBillLatestCreatedDate(bill) }}</time>
          </small>
        </button>

        <button class="add-bill-card" type="button" @click="addBill">
          <el-icon><Plus /></el-icon>
        </button>
      </section>

      <div v-if="!bills.length" class="empty-state">
        <strong>还没有账单</strong>
        <span>点击加号创建第一张本地账单。</span>
      </div>
    </main>

    <main v-else class="bill-detail-view">
      <section class="bill-editor">
        <div class="detail-summary">
          <label class="field-label title-field">
            <span>BILL NAME</span>
            <input v-model.trim="activeBill.name" class="text-input title-input" placeholder="账单名" @input="touchActiveBill" />
          </label>

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
          <button class="text-action danger" type="button" @click="removeActiveBill">
            <el-icon><Delete /></el-icon>
            <span>删除账单</span>
          </button>
        </div>
      </section>

      <section class="items-panel">
        <div class="section-row">
          <div>
            <p class="section-tag">Items</p>
          </div>
        </div>

        <div class="item-list">
          <button class="add-item-row" type="button" @click="addItem">
            <el-icon><Plus /></el-icon>
            <span>新增子项</span>
          </button>

          <van-swipe-cell v-for="item in sortedActiveBillItems" :key="item.id" class="item-swipe">
            <div class="item-row" :class="{ 'has-created-at': item.createdAt }">
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
                v-if="item.createdAt"
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
              <button class="swipe-action danger" type="button" aria-label="删除子项" @click="removeItem(item.id)">
                <el-icon><Delete /></el-icon>
                <span>删除</span>
              </button>
            </template>
          </van-swipe-cell>
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
      :has-overwrite-data="hasImportOverwriteData"
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
import { Back, Clock, Delete, Plus, Setting, Share, Top } from "@element-plus/icons-vue";
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
const RECYCLE_KEEP_DAYS = 7;
const RECYCLE_KEEP_MS = RECYCLE_KEEP_DAYS * 24 * 60 * 60 * 1000;

const headerSection = ref<HTMLElement | null>(null);
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
const deletedBills = ref<DeletedBill[]>([]);
const activeBillId = ref("");

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
const grandTotal = computed(() => bills.value.reduce((total, bill) => total + billTotal(bill), 0));
const sortedBills = computed(() => sortBillsByLatestItemCreatedDate(bills.value));
const activeBillTotal = computed(() => activeBill.value ? billTotal(activeBill.value) : 0);
const validActiveBillItems = computed(() => activeBill.value ? getValidItems(activeBill.value.items) : []);
const sortedActiveBillItems = computed(() => activeBill.value ? sortItemsByCreatedAt(activeBill.value.items) : []);

const {
  importExportInfo,
  importInfo,
  importExportSummary,
  hasImportOverwriteData,
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
  bill.items.push(createEmptyBillItem());
  bills.value.unshift(bill);
  activeBillId.value = bill.id;
  nextTick(scrollToTop);
}

function openBill(id: string) {
  activeBillId.value = id;
  nextTick(scrollToTop);
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

function addItem() {
  if (!activeBill.value) return;
  if (!canAppendItem()) {
    showToast("请先填写当前子项的名称和价格");
    return;
  }
  activeBill.value.items.unshift(createEmptyBillItem());
  touchActiveBill();
}

function canAppendItem() {
  if (!activeBill.value) return false;
  return activeBill.value.items.every(isValidItem);
}

function isValidItem(item: Bill["items"][number]) {
  return Boolean(item.name.trim()) && item.price !== "" && Number.isFinite(Number(item.price));
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
  const validItems = getValidItems(activeBill.value.items);
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
  const validItems = getValidItems(sortItemsByCreatedAt(bill.items));
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
  ctx.fillText(`${validItems.length} 项`, 88, 164);

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
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.page-header h1 {
  margin: 0;
  color: var(--text-strong);
}

.page-header h1 {
  font-size: 34px;
  line-height: 1.08;
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

.header-icon,
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

.icon-button.danger,
.text-action.danger {
  background: var(--danger-bg);
  color: var(--danger-text);
}

.summary-band,
.bill-editor,
.items-panel {
  margin-bottom: 14px;
  padding: 20px;
  border-radius: 16px;
  background: var(--surface);
  box-shadow: 0 14px 34px rgba(38, 56, 88, 0.08);
}

.summary-band {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.summary-band strong {
  display: block;
  color: var(--accent-strong);
  font-size: 34px;
  line-height: 1;
}

.summary-band span,
.bill-card small,
.empty-state span,
.field-label span,
.detail-total span {
  color: var(--text-muted);
  font-size: 12px;
}

.bill-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.bill-card,
.add-bill-card {
  min-height: 126px;
  padding: 16px;
  border: 0;
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--shadow);
  text-align: left;
}

.bill-card {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.bill-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 24px;
}

.bill-card strong {
  display: block;
}

.bill-card-name {
  min-width: 0;
  color: var(--text-strong);
  font-weight: 700;
  overflow-wrap: anywhere;
}

.bill-card-count {
  flex: 0 0 auto;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.bill-card strong {
  margin-top: 22px;
  color: var(--accent-strong);
  font-size: 24px;
}

.bill-card-meta {
  display: block;
  margin-top: 6px;
}

.bill-card-meta time {
  white-space: nowrap;
}

.add-bill-card {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  background: var(--surface);
  font-size: 32px;
  text-align: center;
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
    padding: 18px 24px 16px;
  }

  .page-header h1 {
    font-size: 30px;
  }

  .header-icon {
    width: 42px;
    height: 42px;
  }

  .bill-grid {
    grid-template-columns: 1fr 1fr;
  }

  .summary-band,
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
