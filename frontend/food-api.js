/**
 * Поиск: локальная база + Open Food Facts.
 */

import { searchLocalFoods } from "./foods-local.js";

const OFF_URLS = [
  "https://ru.openfoodfacts.org/cgi/search.pl",
  "https://world.openfoodfacts.org/cgi/search.pl",
];

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function pickKcal(nutriments) {
  return (
    num(nutriments["energy-kcal_100g"]) ||
    num(nutriments["energy-kcal"]) ||
    num(nutriments.energy_100g) / 4.184 ||
    0
  );
}

function round1(v) {
  return Math.round(v * 10) / 10;
}

/** @param {Record<string, unknown>} raw */
export function normalizeProduct(raw) {
  const n = raw.nutriments || {};
  const name = String(raw.product_name || raw.generic_name || "").trim();
  if (!name) return null;

  const brand = raw.brands ? String(raw.brands).split(",")[0].trim() : "";

  const kcal100 = Math.round(pickKcal(n));
  const protein100 = round1(num(n.proteins_100g) || num(n.proteins));
  const fat100 = round1(num(n.fat_100g) || num(n.fat));
  let carbs100 = round1(
    num(n.carbohydrates_100g) ||
      num(n.carbohydrates) ||
      num(n["carbohydrates-value"])
  );

  if (carbs100 <= 0 && kcal100 > 0) {
    const fromKcal = (kcal100 - protein100 * 4 - fat100 * 9) / 4;
    if (fromKcal > 0) carbs100 = round1(fromKcal);
  }

  if (kcal100 <= 0 && protein100 <= 0 && carbs100 <= 0) return null;

  return {
    id: String(raw.code || name),
    name: brand ? `${name} (${brand})` : name,
    kcal100,
    protein100,
    fat100,
    carbs100,
    source: "off",
  };
}

async function searchOpenFoodFacts(query) {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: "15",
    lc: "ru",
    fields: "code,product_name,generic_name,brands,nutriments",
  });

  /** @type {ReturnType<typeof normalizeProduct>[]} */
  const found = [];

  for (const base of OFF_URLS) {
    try {
      const res = await fetch(`${base}?${params}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;

      const data = await res.json();
      const list = Array.isArray(data.products) ? data.products : [];

      for (const raw of list) {
        const item = normalizeProduct(raw);
        if (item) found.push(item);
      }

      if (found.length >= 10) break;
    } catch {
      // пробуем следующий источник
    }
  }

  return found;
}

function dedupeByName(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * @param {string} query
 */
export async function searchFoods(query) {
  const q = query.trim();
  if (q.length < 2) return [];

  const local = searchLocalFoods(q);
  let off = [];

  try {
    off = await searchOpenFoodFacts(q);
  } catch {
    off = [];
  }

  return dedupeByName([...local, ...off]).slice(0, 25);
}
