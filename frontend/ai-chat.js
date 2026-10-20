/**
 * Чат с ИИ по питанию (запросы на backend бота).
 */

const STORAGE_AI_API = "calorie-app-ai-api";

/** @type {string | null} */
let cachedFromFile = null;
/** @type {Promise<void> | null} */
let configLoadPromise = null;

export function saveAiApiBase(url) {
  const base = (url || "").trim().replace(/\/$/, "");
  try {
    if (base) localStorage.setItem(STORAGE_AI_API, base);
    else localStorage.removeItem(STORAGE_AI_API);
  } catch {
    /* ignore */
  }
}

export function resolveAiApiBase() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("api")?.trim();
  if (fromUrl) {
    const base = fromUrl.replace(/\/$/, "");
    saveAiApiBase(base);
    return base;
  }
  try {
    const stored = (localStorage.getItem(STORAGE_AI_API) || "").replace(/\/$/, "");
    if (stored) return stored;
  } catch {
    /* ignore */
  }
  return cachedFromFile || "";
}

/** Загружает apiBase из ai-api.json (один раз) — для телефона без ?api= в ссылке. */
export function loadAiApiConfig() {
  if (!configLoadPromise) {
    configLoadPromise = (async () => {
      try {
        const configUrl = new URL("ai-api.json", window.location.href);
        configUrl.searchParams.set("t", String(Date.now()).slice(0, 8));
        const res = await fetch(configUrl, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const base = String(data.apiBase || data.api || "")
          .trim()
          .replace(/\/$/, "");
        if (base) {
          cachedFromFile = base;
          saveAiApiBase(base);
        }
      } catch {
        /* offline / нет файла */
      }
    })();
  }
  return configLoadPromise;
}

export async function ensureAiApiBase() {
  await loadAiApiConfig();
  return resolveAiApiBase();
}

/**
 * @param {{ message: string, initData: string, context?: object, history?: { role: string, content: string }[] }} opts
 */
export async function sendNutritionQuestion(opts) {
  const base = await ensureAiApiBase();
  if (!base) {
    throw new Error(
      "Не задан адрес сервера ИИ. Укажите в backend/.env PUBLIC_API_URL и перезапустите бота, " +
        "или заполните frontend/ai-api.json (apiBase) и сделайте git push, " +
        "или Профиль → Сервер ИИ."
    );
  }
  const res = await fetch(`${base}/api/nutrition-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Ошибка ${res.status}`);
  }
  return data.reply;
}
