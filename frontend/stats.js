import { addDaysToKey, dateKeyFromDate, todayKey } from "./date-utils.js?v=22";
import { foodEatenAtMs } from "./meals.js?v=22";

export const STORAGE_WEIGHT_LOG = "calorie-app-weight-log";

export function loadWeightLog() {
  try {
    const raw = localStorage.getItem(STORAGE_WEIGHT_LOG);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveWeightForDay(dateKey, weightKg) {
  if (!dateKey || weightKg == null || Number.isNaN(weightKg)) return;
  const log = loadWeightLog();
  log[dateKey] = Math.round(weightKg * 10) / 10;
  localStorage.setItem(STORAGE_WEIGHT_LOG, JSON.stringify(log));
}

/** @param {{ calories: number }[]} foods */
export function sumCalories(foods) {
  return foods.reduce((s, f) => s + (f.calories || 0), 0);
}

/**
 * @param {Array<{ calories: number, eatenAt?: string, id: string }>} foods
 * @param {number} days
 */
export function dailyCaloriesSeries(foods, days = 7, targetKcal = null) {
  const end = todayKey();
  const rows = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = addDaysToKey(end, -i);
    const dayFoods = foods.filter((f) => dateKeyFromDate(new Date(foodEatenAtMs(f))) === key);
    rows.push({
      key,
      label: key.slice(5).replace("-", "."),
      kcal: Math.round(sumCalories(dayFoods)),
      target: targetKcal,
    });
  }
  return rows;
}

export function weightSeries(log, days = 14) {
  const end = todayKey();
  const rows = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = addDaysToKey(end, -i);
    if (log[key] != null) rows.push({ key, kg: log[key] });
  }
  return rows;
}

export function maxKcalInSeries(series) {
  const m = Math.max(...series.map((r) => r.kcal), 1);
  const t = series.map((r) => r.target).filter(Boolean);
  if (t.length) return Math.max(m, ...t);
  return m;
}

/** Вес на день: из журнала или текущий из профиля только для «сегодня». */
export function weightForDay(log, dateKey, profileWeightKg) {
  if (log[dateKey] != null) return log[dateKey];
  if (dateKey === todayKey() && profileWeightKg != null) return profileWeightKg;
  return null;
}
