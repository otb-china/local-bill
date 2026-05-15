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
          v-for="bill in bills"
          :key="bill.id"
          class="bill-card"
          type="button"
          @click="openBill(bill.id)"
        >
          <span>{{ bill.name }}</span>
          <strong>¥{{ formatMoney(billTotal(bill)) }}</strong>
          <small>{{ bill.items.length }} 项</small>
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

          <van-swipe-cell v-for="item in activeBill.items" :key="item.id" class="item-swipe">
            <div class="item-row">
              <label class="item-field item-name-field">
                <span>名称</span>
                <input v-model.trim="item.name" class="text-input" @input="touchActiveBill" />
              </label>
              <label class="item-field item-price-field">
                <span>金额</span>
                <input
                  v-model.number="item.price"
                  class="text-input price-input"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="0.01"
                  @input="touchActiveBill"
                />
              </label>
            </div>
            <template #right>
              <button class="swipe-delete-action" type="button" aria-label="删除子项" @click="removeItem(item.id)">
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
      @set-theme="setTheme"
      @export="exportAllData"
      @open-import="openImportExport"
      @reset="resetAllData"
    />

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
import { Back, Delete, Plus, Setting, Share, Top } from "@element-plus/icons-vue";
import ImportDataPopup from "@/components/ImportDataPopup.vue";
import SettingsPopup from "@/components/SettingsPopup.vue";
import { DEFAULT_THEME, isThemeKey, themeOptions } from "@/config/themes";
import { useBackupActions } from "@/composables/useBackupActions";
import { LStorage } from "@/utils/localStorage.ts";
import {
  createEmptyBill,
  createEmptyBillItem,
  formatMoney,
  normalizeBills,
  sumBillItems,
} from "@/utils/stockData.ts";
import type { ThemeKey } from "@/config/themes";
import type { Bill } from "@/types/stock";

const DATE_FORMAT = "YYYY-MM-DD";
const SCROLL_TOP_THRESHOLD = 240;

const headerSection = ref<HTMLElement | null>(null);
const showScrollTop = ref(false);
const currentTheme = ref<ThemeKey>(DEFAULT_THEME);
const settingsPopup = ref(false);
const bills = ref<Bill[]>([]);
const activeBillId = ref("");

const billStorage = LStorage.new("localBillData");
const themeStorage = LStorage.new("localBillTheme");

const currentThemeOption = computed(() => {
  return themeOptions.find((theme) => theme.key === currentTheme.value) || themeOptions[0];
});
const themeStyle = computed(() => currentThemeOption.value.variables);
const activeBill = computed(() => bills.value.find((bill) => bill.id === activeBillId.value));
const grandTotal = computed(() => bills.value.reduce((total, bill) => total + billTotal(bill), 0));
const activeBillTotal = computed(() => activeBill.value ? billTotal(activeBill.value) : 0);
const validActiveBillItems = computed(() => activeBill.value ? getValidItems(activeBill.value.items) : []);

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
  settingsPopup,
  dateFormat: DATE_FORMAT,
  initData: () => init(),
});

watch(bills, saveBills, { deep: true });

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

function setTheme(theme: ThemeKey) {
  currentTheme.value = theme;
  themeStorage.setter(theme);
}

function init() {
  const storedTheme = themeStorage.getter();
  currentTheme.value = isThemeKey(storedTheme) ? storedTheme : DEFAULT_THEME;
  bills.value = normalizeBills(billStorage.getter());
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

function pruneActiveBillInvalidItems() {
  if (!activeBill.value) return;
  const validItems = getValidItems(activeBill.value.items);
  if (validItems.length === activeBill.value.items.length) return;
  activeBill.value.items = validItems;
  touchActiveBill();
}

function removeItem(id: string) {
  if (!activeBill.value) return;
  activeBill.value.items = activeBill.value.items.filter((item) => item.id !== id);
  touchActiveBill();
}

function removeActiveBill() {
  if (!activeBill.value) return;
  const billName = activeBill.value.name || "未命名账单";
  showConfirmDialog({
    title: "删除账单",
    message: `确认删除「${billName}」吗？`,
    width: "260px",
  }).then(() => {
    bills.value = bills.value.filter((bill) => bill.id !== activeBillId.value);
    activeBillId.value = "";
    showToast("账单已删除");
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
  const validItems = getValidItems(bill.items);
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

.bill-card span,
.bill-card strong,
.bill-card small {
  display: block;
}

.bill-card span {
  color: var(--text-strong);
  font-weight: 700;
  overflow-wrap: anywhere;
}

.bill-card strong {
  margin-top: 22px;
  color: var(--accent-strong);
  font-size: 24px;
}

.bill-card small {
  margin-top: 6px;
}

.add-bill-card {
  display: grid;
  place-items: center;
  color: var(--accent);
  background: var(--surface);
  font-size: 32px;
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

.item-row {
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

.item-price-field .text-input {
  color: var(--accent-strong);
  font-weight: 700;
  text-align: right;
}

.swipe-delete-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 4px;
  width: 72px;
  height: 100%;
  min-height: 84px;
  margin-left: 8px;
  border: 0;
  border-radius: 14px;
  background: var(--danger-bg);
  color: var(--danger-text);
  font-size: 12px;
  font-weight: 700;
}

.home-page :deep(.van-popup) {
  background: var(--surface);
  color: var(--text-main);
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
  .swipe-delete-action {
    width: 64px;
    min-height: 78px;
  }
}
</style>
