/**
 * Калькулятор калорий — Mini App.
 */

const APP_VERSION = "9";

import { computeTargets } from "./calc.js?v=9";
import { searchFoods } from "./food-api.js?v=9";
import {
  buildMealGroups,
  defaultTimeString,
  eatenAtFromTimeString,
  formatMealTimeRange,
  foodEatenAtMs,
  foodsForToday,
} from "./meals.js?v=9";

const STORAGE_FOODS = "calorie-app-foods";
const STORAGE_PROFILE = "calorie-app-profile";

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  if (tg.themeParams?.bg_color) {
    document.documentElement.style.setProperty("--tg-bg", tg.themeParams.bg_color);
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
};

/** @type {{ id: string, name: string, calories: number, protein: number, fat: number, carbs: number }[]} */
let foods = loadFoods();
let profile = loadProfile();
let targets = profile ? computeTargets(profile) : null;
/** @type {{ name: string, kcal100: number, protein100: number, fat100: number, carbs100: number } | null} */
let productPer100 = null;
let searchTimer = null;

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

    setSearchStatus(`Найдено: ${items.length}. Нажмите на продукт.`);
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
  searchTimer = setTimeout(() => runFoodSearch(q), 450);
});

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

if (els.appVersion) {
  els.appVersion.textContent = `Версия ${APP_VERSION}`;
}

renderList();

if (!profile) {
  setTimeout(openProfileModal, 400);
}
