/** Группировка продуктов в приёмы пищи 1–4 (пауза > 20 мин = новый приём). */

export const MEAL_GAP_MS = 20 * 60 * 1000;
export const MAX_MEALS = 4;

export function foodEatenAtMs(food) {
  if (food.eatenAt) return new Date(food.eatenAt).getTime();
  const fromId = /^(\d+)-/.exec(food.id || "");
  if (fromId) return Number(fromId[1]);
  return Date.now();
}

export function isSameLocalDay(ms) {
  const d = new Date(ms);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

export function foodsForToday(foods) {
  return foods.filter((f) => isSameLocalDay(foodEatenAtMs(f)));
}

/**
 * @param {Array<{ id: string }>} todayFoods
 */
export function buildMealGroups(todayFoods) {
  const sorted = [...todayFoods].sort(
    (a, b) => foodEatenAtMs(a) - foodEatenAtMs(b)
  );

  /** @type {{ foods: typeof sorted, start: number, end: number }[]} */
  const clusters = [];

  for (const food of sorted) {
    const t = foodEatenAtMs(food);

    if (!clusters.length) {
      clusters.push({ foods: [food], start: t, end: t });
      continue;
    }

    const last = clusters[clusters.length - 1];

    if (t - last.end <= MEAL_GAP_MS) {
      last.foods.push(food);
      last.end = t;
    } else if (clusters.length < MAX_MEALS) {
      clusters.push({ foods: [food], start: t, end: t });
    } else {
      const fourth = clusters[MAX_MEALS - 1];
      fourth.foods.push(food);
      fourth.end = t;
    }
  }

  return clusters.map((c, index) => ({
    mealNumber: index + 1,
    foods: c.foods,
    start: c.start,
    end: c.end,
  }));
}

export function formatTime(ms) {
  return new Date(ms).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatMealTimeRange(start, end) {
  if (start === end) return formatTime(start);
  return `${formatTime(start)}–${formatTime(end)}`;
}

/** Собрать ISO для сегодня + время HH:mm */
export function eatenAtFromTimeString(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export function defaultTimeString() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
