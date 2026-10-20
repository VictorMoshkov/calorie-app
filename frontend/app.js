/**
 * Калькулятор калорий — логика Mini App.
 * Данные хранятся в localStorage браузера Telegram.
 */

const STORAGE_KEY = "calorie-app-foods";

// Подключение к Telegram WebApp API (если открыто внутри Telegram)
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  // Подстраиваем фон под тему Telegram, если доступна
  if (tg.themeParams?.bg_color) {
    document.documentElement.style.setProperty("--tg-bg", tg.themeParams.bg_color);
  }
}

const els = {
  totalCalories: document.getElementById("totalCalories"),
  totalProtein: document.getElementById("totalProtein"),
  totalFat: document.getElementById("totalFat"),
  totalCarbs: document.getElementById("totalCarbs"),
  foodList: document.getElementById("foodList"),
  emptyState: document.getElementById("emptyState"),
  addFoodBtn: document.getElementById("addFoodBtn"),
  modal: document.getElementById("modal"),
  modalBackdrop: document.getElementById("modalBackdrop"),
  cancelBtn: document.getElementById("cancelBtn"),
  foodForm: document.getElementById("foodForm"),
};

/** @type {{ id: string, name: string, calories: number, protein: number, fat: number, carbs: number }[]} */
let foods = loadFoods();

function loadFoods() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFoods() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(foods));
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function updateTotals() {
  const totals = foods.reduce(
    (acc, f) => {
      acc.calories += f.calories;
      acc.protein += f.protein;
      acc.fat += f.fat;
      acc.carbs += f.carbs;
      return acc;
    },
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  els.totalCalories.textContent = Math.round(totals.calories);
  els.totalProtein.textContent = round1(totals.protein);
  els.totalFat.textContent = round1(totals.fat);
  els.totalCarbs.textContent = round1(totals.carbs);
}

function renderList() {
  els.foodList.innerHTML = "";

  foods.forEach((food) => {
    const li = document.createElement("li");
    li.className = "food-item";
    li.innerHTML = `
      <div>
        <p class="food-item__name"></p>
        <p class="food-item__meta"></p>
      </div>
      <button type="button" class="btn btn--danger" data-id="${food.id}">Удалить</button>
    `;
    li.querySelector(".food-item__name").textContent = food.name;
    li.querySelector(".food-item__meta").textContent =
      `${Math.round(food.calories)} ккал · Б ${round1(food.protein)} · Ж ${round1(food.fat)} · У ${round1(food.carbs)}`;
    els.foodList.appendChild(li);
  });

  els.emptyState.hidden = foods.length > 0;
  updateTotals();
}

function openModal() {
  els.modal.hidden = false;
  els.foodForm.reset();
  els.foodForm.elements.protein.value = "0";
  els.foodForm.elements.fat.value = "0";
  els.foodForm.elements.carbs.value = "0";
  els.foodForm.elements.name.focus();
}

function closeModal() {
  els.modal.hidden = true;
}

els.addFoodBtn.addEventListener("click", openModal);
els.cancelBtn.addEventListener("click", closeModal);
els.modalBackdrop.addEventListener("click", closeModal);

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
  });

  saveFoods();
  renderList();
  closeModal();

  if (tg?.HapticFeedback) {
    tg.HapticFeedback.notificationOccurred("success");
  }
});

els.foodList.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-id]");
  if (!btn) return;

  const id = btn.getAttribute("data-id");
  foods = foods.filter((f) => f.id !== id);
  saveFoods();
  renderList();

  if (tg?.HapticFeedback) {
    tg.HapticFeedback.impactOccurred("light");
  }
});

renderList();
