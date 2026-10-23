/**
 * Калькулятор калорий — Mini App.
 */

import {
  sendNutritionQuestion,
  resolveAiApiBase,
  saveAiApiBase,
  loadAiApiConfig,
  ensureAiApiBase,
} from "./ai-chat.js?v=16";
import { computeTargets } from "./calc.js?v=16";
import { fetchFoodByBarcode, searchFoods } from "./food-api.js?v=16";
import { startBarcodeScanner, stopBarcodeScanner } from "./barcode-scanner.js?v=16";
import {
  buildMealGroups,
  defaultTimeString,
  eatenAtFromTimeString,
  formatMealTimeRange,
  foodEatenAtMs,
  foodsForToday,
} from "./meals.js?v=16";

const APP_VERSION = "16";

const STORAGE_FOODS = "calorie-app-foods";
const STORAGE_PROFILE = "calorie-app-profile";

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  if (tg.themeParams?.bg_color) {
    document.documentElement.style.setProperty("--tg-bg", tg.themeParams.bg_color);
  }
  const insetTop =
    tg.contentSafeAreaInset?.top ?? tg.safeAreaInset?.top ?? 0;
  if (insetTop > 0) {
    document.documentElement.style.setProperty("--tg-safe-top", `${insetTop}px`);
  }
}

const els = {
  totalCalories: document.getElementById("totalCalories"),
  totalProtein: document.getElementById("totalProtein"),
  totalFat: document.getElementById("totalFat"),
  totalCarbs: document.getElementById("totalCarbs"),
  mealGroups: document.getElementById("mealGroups"),
  emptyState: document.getElementById("emptyState"),
  addFoodBtn: document.getElementById("addFoodBtn"),
  modal: document.getElementById("modal"),
  modalBackdrop: document.getElementById("modalBackdrop"),
  cancelBtn: document.getElementById("cancelBtn"),
  foodForm: document.getElementById("foodForm"),
  profileBtn: document.getElementById("profileBtn"),
  profileModal: document.getElementById("profileModal"),
  profileBackdrop: document.getElementById("profileBackdrop"),
  profileCancelBtn: document.getElementById("profileCancelBtn"),
  profileForm: document.getElementById("profileForm"),
  hipsField: document.getElementById("hipsField"),
  useMeasurements: document.getElementById("useMeasurements"),
  measurementsBlock: document.getElementById("measurementsBlock"),
  targetsSection: document.getElementById("targetsSection"),
  targetCalories: document.getElementById("targetCalories"),
  targetProtein: document.getElementById("targetProtein"),
  targetFat: document.getElementById("targetFat"),
  targetCarbs: document.getElementById("targetCarbs"),
  remainingCalories: document.getElementById("remainingCalories"),
  targetsHint: document.getElementById("targetsHint"),
  foodSearch: document.getElementById("foodSearch"),
  searchStatus: document.getElementById("searchStatus"),
  foodSearchResults: document.getElementById("foodSearchResults"),
  servingField: document.getElementById("servingField"),
  servingGrams: document.getElementById("servingGrams"),
  eatenTime: document.getElementById("eatenTime"),
  appVersion: document.getElementById("appVersion"),
  aiChatBtn: document.getElementById("aiChatBtn"),
  aiModal: document.getElementById("aiModal"),
  aiBackdrop: document.getElementById("aiBackdrop"),
  aiCloseBtn: document.getElementById("aiCloseBtn"),
  aiForm: document.getElementById("aiForm"),
  aiInput: document.getElementById("aiInput"),
  aiMessages: document.getElementById("aiMessages"),
  aiStatus: document.getElementById("aiStatus"),
  aiSendBtn: document.getElementById("aiSendBtn"),
  aiApiUrl: document.getElementById("aiApiUrl"),
  scanBarcodeBtn: document.getElementById("scanBarcodeBtn"),
  barcodeInput: document.getElementById("barcodeInput"),
  barcodeLookupBtn: document.getElementById("barcodeLookupBtn"),
  barcodeModal: document.getElementById("barcodeModal"),
  barcodeModalBackdrop: document.getElementById("barcodeModalBackdrop"),
  barcodeCloseBtn: document.getElementById("barcodeCloseBtn"),
  barcodeScanStatus: document.getElementById("barcodeScanStatus"),
};

/** @type {{ id: string, name: string, calories: number, protein: number, fat: number, carbs: number }[]} */
let foods = loadFoods();
let profile = loadProfile();
let targets = profile ? computeTargets(profile) : null;
/** @type {{ name: string, kcal100: number, protein100: number, fat100: number, carbs100: number } | null} */
let productPer100 = null;
let searchTimer = null;
/** @type {{ role: 'user' | 'assistant', content: string }[]} */
let aiHistory = [];

function loadFoods() {
  try {
    const raw = localStorage.getItem(STORAGE_FOODS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_PROFILE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveFoods() {
  localStorage.setItem(STORAGE_FOODS, JSON.stringify(foods));
}

function saveProfile(data) {
  profile = data;
  localStorage.setItem(STORAGE_PROFILE, JSON.stringify(profile));
  targets = computeTargets(profile);
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function getTodayFoods() {
  return foodsForToday(foods);
}

function getDayTotals() {
  return getTodayFoods().reduce(
    (acc, f) => {
      acc.calories += f.calories;
      acc.protein += f.protein;
      acc.fat += f.fat;
      acc.carbs += f.carbs;
      return acc;
    },
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );
}

function updateTotals() {
  const totals = getDayTotals();

  els.totalCalories.textContent = Math.round(totals.calories);
  els.totalProtein.textContent = round1(totals.protein);
  els.totalFat.textContent = round1(totals.fat);
  els.totalCarbs.textContent = round1(totals.carbs);

  renderTargets(totals);
}

function renderTargets(totals) {
  if (!targets) {
    els.targetsSection.hidden = true;
    return;
  }

  els.targetsSection.hidden = false;
  els.targetCalories.textContent = targets.calories;
  els.targetProtein.textContent = `${targets.protein} г`;
  els.targetFat.textContent = `${targets.fat} г`;
  els.targetCarbs.textContent = `${targets.carbs} г`;

  const left = Math.round(targets.calories - totals.calories);
  if (left >= 0) {
    els.remainingCalories.textContent = `осталось ${left} ккал`;
    els.remainingCalories.classList.remove("over");
  } else {
    els.remainingCalories.textContent = `перебор ${Math.abs(left)} ккал`;
    els.remainingCalories.classList.add("over");
  }

  const parts = [
    `BMR ${targets.bmr} · TDEE ${targets.tdee}`,
    targets.goalLabel,
    targets.activityLabel,
  ];
  if (targets.bodyFat != null) {
    parts.push(`~${targets.bodyFat}% жира (оценка)`);
  }
  els.targetsHint.textContent = parts.join(" · ");
}

function mealTotals(mealFoods) {
  return mealFoods.reduce(
    (acc, f) => {
      acc.calories += f.calories;
      acc.protein += f.protein;
      acc.fat += f.fat;
      acc.carbs += f.carbs;
      return acc;
    },
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );
}

function renderList() {
  const today = getTodayFoods();
  els.mealGroups.innerHTML = "";

  const groups = buildMealGroups(today);

  groups.forEach((meal) => {
    const section = document.createElement("section");
    section.className = "meal-block";

    const totals = mealTotals(meal.foods);
    const head = document.createElement("div");
    head.className = "meal-block__head";
    head.innerHTML = `
      <h3 class="meal-block__title"></h3>
      <p class="meal-block__meta"></p>
    `;
    head.querySelector(".meal-block__title").textContent =
      `Приём ${meal.mealNumber}`;
    head.querySelector(".meal-block__meta").textContent =
      `${formatMealTimeRange(meal.start, meal.end)} · ${Math.round(totals.calories)} ккал`;
    section.appendChild(head);

    const ul = document.createElement("ul");
    ul.className = "food-list";

    meal.foods.forEach((food) => {
      const li = document.createElement("li");
      li.className = "food-item";
      li.innerHTML = `
        <div>
          <p class="food-item__name"></p>
          <p class="food-item__meta"></p>
        </div>
        <button type="button" class="btn btn--danger" data-id="">Удалить</button>
      `;
      li.querySelector(".food-item__name").textContent = food.name;
      li.querySelector(".food-item__meta").textContent =
        `${formatMealTimeRange(foodEatenAtMs(food), foodEatenAtMs(food))} · ${Math.round(food.calories)} ккал · Б ${round1(food.protein)} · Ж ${round1(food.fat)} · У ${round1(food.carbs)}`;
      li.querySelector("[data-id]").setAttribute("data-id", food.id);
      ul.appendChild(li);
    });

    section.appendChild(ul);
    els.mealGroups.appendChild(section);
  });

  els.emptyState.hidden = today.length > 0;
  updateTotals();
}

function openFoodModal() {
  els.modal.hidden = false;
  els.foodForm.reset();
  els.foodForm.elements.protein.value = "0";
  els.foodForm.elements.fat.value = "0";
  els.foodForm.elements.carbs.value = "0";
  productPer100 = null;
  els.servingField.hidden = true;
  clearSearchUi();
  els.eatenTime.value = defaultTimeString();
  els.foodSearch.focus();
}

function closeFoodModal() {
  els.modal.hidden = true;
  clearSearchUi();
  productPer100 = null;
  void stopBarcodeScanner();
  if (els.barcodeModal) els.barcodeModal.hidden = true;
}

function clearSearchUi() {
  els.foodSearch.value = "";
  els.searchStatus.hidden = true;
  els.foodSearchResults.hidden = true;
  els.foodSearchResults.innerHTML = "";
}

function setSearchStatus(text, show = true) {
  els.searchStatus.textContent = text;
  els.searchStatus.hidden = !show;
}

function applyPortionFromBase() {
  if (!productPer100) return;
  const grams = Number(els.servingGrams.value) || 100;
  const k = grams / 100;
  const form = els.foodForm;
  form.elements.name.value = productPer100.name;
  form.elements.calories.value = Math.round(productPer100.kcal100 * k);
  form.elements.protein.value = round1(productPer100.protein100 * k);
  form.elements.fat.value = round1(productPer100.fat100 * k);
  form.elements.carbs.value = round1(productPer100.carbs100 * k);
}

function selectProductFromDb(product) {
  productPer100 = product;
  els.servingField.hidden = false;
  els.servingGrams.value = "100";
  applyPortionFromBase();
  els.foodSearchResults.hidden = true;
  setSearchStatus(`Выбрано: ${product.name} (данные на 100 г)`, true);
  hapticSuccess();
}

function setBarcodeScanStatus(text, show = true) {
  if (!els.barcodeScanStatus) return;
  els.barcodeScanStatus.textContent = text;
  els.barcodeScanStatus.hidden = !show || !text;
}

async function lookupBarcode(code) {
  const digits = String(code).replace(/\D/g, "");
  if (digits.length < 8) {
    setSearchStatus("Введите штрихкод (8–14 цифр).");
    return;
  }
  setSearchStatus("Ищем по штрихкоду в Open Food Facts…");
  try {
    const item = await fetchFoodByBarcode(digits);
    if (!item) {
      setSearchStatus("Продукт не найден в базе штрихкодов. Введите вручную.");
      return;
    }
    selectProductFromDb(item);
    setSearchStatus(`По штрихкоду: ${item.name}`, true);
    if (els.barcodeInput) els.barcodeInput.value = digits;
    els.foodSearch.value = digits;
  } catch {
    setSearchStatus("Ошибка поиска по штрихкоду. Проверьте интернет.");
  }
}

async function openBarcodeScannerModal() {
  if (!els.barcodeModal) return;
  els.barcodeModal.hidden = false;
  setBarcodeScanStatus("Запуск камеры…", true);
  await startBarcodeScanner(
    "barcodeReader",
    async (code) => {
      setBarcodeScanStatus("", false);
      els.barcodeModal.hidden = true;
      await lookupBarcode(code);
    },
    (err) => {
      setBarcodeScanStatus(err.message || "Не удалось открыть камеру", true);
    }
  );
}

async function closeBarcodeScannerModal() {
  await stopBarcodeScanner();
  if (els.barcodeModal) els.barcodeModal.hidden = true;
  setBarcodeScanStatus("", false);
}

async function runFoodSearch(query) {
  if (query.trim().length < 2) {
    els.foodSearchResults.hidden = true;
    els.searchStatus.hidden = true;
    return;
  }

  setSearchStatus("Ищем в базе…");
  try {
    const items = await searchFoods(query);
    if (!items.length) {
      setSearchStatus("Ничего не найдено. Введите вручную ниже.");
      els.foodSearchResults.hidden = true;
      return;
    }

    const localCount = items.filter((i) => i.source === "local").length;
    const extra = localCount
      ? ` (из них ${localCount} из локальной базы)`
      : "";
    setSearchStatus(`Найдено: ${items.length}${extra}. Нажмите на продукт.`);
    els.foodSearchResults.innerHTML = "";
    items.forEach((item) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "search-results__item";
      btn.textContent =
        `${item.name} — ${item.kcal100} ккал · Б${item.protein100} Ж${item.fat100} У${item.carbs100} /100г`;
      btn.addEventListener("click", () => selectProductFromDb(item));
      li.appendChild(btn);
      els.foodSearchResults.appendChild(li);
    });
    els.foodSearchResults.hidden = false;
  } catch {
    setSearchStatus("Не удалось загрузить базу. Проверьте интернет или введите вручную.");
    els.foodSearchResults.hidden = true;
  }
}

function openProfileModal() {
  els.profileModal.hidden = false;
  fillProfileForm();
  toggleHipsField();
}

function closeProfileModal() {
  els.profileModal.hidden = true;
}

function fillProfileForm() {
  const form = els.profileForm;
  if (!profile) {
    form.reset();
    form.elements.activity.value = "moderate";
    form.elements.goal.value = "maintain";
    form.elements.useMeasurements.checked = false;
    if (els.aiApiUrl) els.aiApiUrl.value = resolveAiApiBase();
    toggleMeasurementsBlock();
    return;
  }

  form.elements.sex.value = profile.sex || "male";
  form.elements.age.value = profile.age ?? "";
  form.elements.weightKg.value = profile.weightKg ?? "";
  form.elements.heightCm.value = profile.heightCm ?? "";
  form.elements.neckCm.value = profile.neckCm ?? "";
  form.elements.chestCm.value = profile.chestCm ?? "";
  form.elements.waistCm.value = profile.waistCm ?? "";
  form.elements.hipsCm.value = profile.hipsCm ?? "";
  form.elements.activity.value = profile.activity || "moderate";
  form.elements.goal.value = profile.goal || "maintain";
  form.elements.useMeasurements.checked = Boolean(profile.useMeasurements);
  if (els.aiApiUrl) els.aiApiUrl.value = resolveAiApiBase();
  toggleMeasurementsBlock();
}

function toggleMeasurementsBlock() {
  const on = els.useMeasurements.checked;
  els.measurementsBlock.hidden = !on;
  toggleHipsField();
}

function toggleHipsField() {
  const isFemale = els.profileForm.elements.sex.value === "female";
  const showHips = isFemale && els.useMeasurements.checked;
  els.hipsField.hidden = !showHips;
}

function profileFromForm() {
  const data = new FormData(els.profileForm);
  return {
    sex: String(data.get("sex")),
    age: Number(data.get("age")),
    weightKg: Number(data.get("weightKg")),
    heightCm: Number(data.get("heightCm")),
    neckCm: numOrNull(data.get("neckCm")),
    chestCm: numOrNull(data.get("chestCm")),
    waistCm: numOrNull(data.get("waistCm")),
    hipsCm: numOrNull(data.get("hipsCm")),
    activity: String(data.get("activity")),
    goal: String(data.get("goal")),
    useMeasurements: data.get("useMeasurements") === "on",
  };
}

function numOrNull(v) {
  const n = Number(v);
  return v === "" || Number.isNaN(n) ? null : n;
}

els.addFoodBtn.addEventListener("click", openFoodModal);
els.cancelBtn.addEventListener("click", closeFoodModal);
els.modalBackdrop.addEventListener("click", closeFoodModal);

els.foodSearch.addEventListener("input", () => {
  clearTimeout(searchTimer);
  const q = els.foodSearch.value;
  const digits = q.replace(/\s/g, "");
  if (/^\d{8,14}$/.test(digits)) {
    searchTimer = setTimeout(() => lookupBarcode(digits), 300);
    return;
  }
  searchTimer = setTimeout(() => runFoodSearch(q), 450);
});

els.scanBarcodeBtn?.addEventListener("click", () => openBarcodeScannerModal());
els.barcodeLookupBtn?.addEventListener("click", () =>
  lookupBarcode(els.barcodeInput?.value || "")
);
els.barcodeCloseBtn?.addEventListener("click", () => closeBarcodeScannerModal());
els.barcodeModalBackdrop?.addEventListener("click", () => closeBarcodeScannerModal());

els.servingGrams.addEventListener("input", applyPortionFromBase);

els.profileBtn.addEventListener("click", openProfileModal);
els.profileCancelBtn.addEventListener("click", closeProfileModal);
els.profileBackdrop.addEventListener("click", closeProfileModal);
els.profileForm.elements.sex.addEventListener("change", toggleHipsField);
els.useMeasurements.addEventListener("change", toggleMeasurementsBlock);

els.foodForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(els.foodForm);

  foods.push({
    id: uid(),
    name: String(data.get("name")).trim(),
    calories: Number(data.get("calories")) || 0,
    protein: Number(data.get("protein")) || 0,
    fat: Number(data.get("fat")) || 0,
    carbs: Number(data.get("carbs")) || 0,
    eatenAt: eatenAtFromTimeString(String(data.get("eatenTime"))),
  });

  saveFoods();
  renderList();
  closeFoodModal();
  hapticSuccess();
});

els.profileForm.addEventListener("submit", (e) => {
  e.preventDefault();
  saveProfile(profileFromForm());
  if (els.aiApiUrl) saveAiApiBase(els.aiApiUrl.value);
  renderList();
  closeProfileModal();
  hapticSuccess();
});

els.mealGroups.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-id]");
  if (!btn) return;

  foods = foods.filter((f) => f.id !== btn.getAttribute("data-id"));
  saveFoods();
  renderList();
  if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred("light");
});

function hapticSuccess() {
  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred("success");
}

function buildAiContext() {
  const totals = getDayTotals();
  const ctx = {
    eatenToday: {
      calories: Math.round(totals.calories),
      proteinG: round1(totals.protein),
      fatG: round1(totals.fat),
      carbsG: round1(totals.carbs),
      items: getTodayFoods().map((f) => f.name),
    },
  };
  if (targets) {
    ctx.dailyTargets = {
      calories: targets.calories,
      proteinG: targets.protein,
      fatG: targets.fat,
      carbsG: targets.carbs,
      goal: targets.goalLabel,
      activity: targets.activityLabel,
    };
  }
  if (profile) {
    ctx.profile = {
      sex: profile.sex === "female" ? "женский" : "мужской",
      age: profile.age,
      weightKg: profile.weightKg,
      heightCm: profile.heightCm,
    };
  }
  return ctx;
}

function appendAiBubble(role, text, extraClass = "") {
  const div = document.createElement("div");
  div.className = `ai-bubble ai-bubble--${role}${extraClass ? ` ${extraClass}` : ""}`;
  div.textContent = text;
  els.aiMessages.appendChild(div);
  els.aiMessages.scrollTop = els.aiMessages.scrollHeight;
}

function setAiStatus(text, visible = true) {
  if (!els.aiStatus) return;
  els.aiStatus.textContent = text;
  els.aiStatus.hidden = !visible || !text;
}

async function openAiModal() {
  els.aiModal.hidden = false;
  document.body.classList.add("modal-open");
  await loadAiApiConfig();
  if (!(await ensureAiApiBase())) {
    setAiStatus(
      "Задайте PUBLIC_API_URL в .env бота (и перезапуск) или apiBase в ai-api.json на GitHub, или Профиль → Сервер ИИ.",
      true
    );
  } else if (!tg?.initData) {
    setAiStatus("Откройте приложение из Telegram — нужна подпись initData.", true);
  } else {
    setAiStatus("", false);
  }
  if (els.aiMessages.childElementCount === 0) {
    appendAiBubble(
      "assistant",
      "Привет! Спросите про рацион, БЖУ или идеи блюд — учту ваш дневник и норму, если они заполнены."
    );
  }
  els.aiInput.focus();
}

function closeAiModal() {
  els.aiModal.hidden = true;
  document.body.classList.remove("modal-open");
}

async function submitAiQuestion(e) {
  e.preventDefault();
  const message = els.aiInput.value.trim();
  if (!message) return;

  appendAiBubble("user", message);
  aiHistory.push({ role: "user", content: message });
  els.aiInput.value = "";
  els.aiSendBtn.disabled = true;
  setAiStatus("Думаю… обычно 10–40 сек (бесплатный ИИ Google)", true);

  try {
    const reply = await sendNutritionQuestion({
      message,
      initData: tg?.initData || "",
      context: buildAiContext(),
      history: aiHistory.slice(0, -1),
    });
    appendAiBubble("assistant", reply);
    aiHistory.push({ role: "assistant", content: reply });
    setAiStatus("", false);
    hapticSuccess();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Не удалось получить ответ";
    appendAiBubble("assistant", msg, "ai-bubble--error");
    setAiStatus(msg, true);
  } finally {
    els.aiSendBtn.disabled = false;
  }
}

els.aiChatBtn.addEventListener("click", openAiModal);
els.aiCloseBtn.addEventListener("click", closeAiModal);
els.aiBackdrop.addEventListener("click", closeAiModal);
els.aiForm.addEventListener("submit", submitAiQuestion);

loadAiApiConfig();

if (els.appVersion) {
  els.appVersion.textContent = `Версия ${APP_VERSION}`;
}

renderList();

if (!profile) {
  setTimeout(openProfileModal, 400);
}
