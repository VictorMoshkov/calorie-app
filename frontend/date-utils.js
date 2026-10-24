/** Локальные даты YYYY-MM-DD без сдвига UTC. */

export function dateKeyFromDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayKey() {
  return dateKeyFromDate(new Date());
}

export function parseDateKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function addDaysToKey(key, delta) {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + delta);
  return dateKeyFromDate(d);
}

export function isSameDateKey(ms, key) {
  return dateKeyFromDate(new Date(ms)) === key;
}

/** «Сегодня», «Вчера» или «22 окт, ср» */
export function formatDayLabel(key) {
  const today = todayKey();
  if (key === today) return "Сегодня";
  const yesterday = addDaysToKey(today, -1);
  if (key === yesterday) return "Вчера";
  const d = parseDateKey(key);
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    weekday: "short",
  });
}

export function isFutureKey(key) {
  return key > todayKey();
}
