/**
 * Сканер штрихкода: камера (BarcodeDetector) → html5-qrcode → фото.
 */

/** @type {{ stop: () => void } | null} */
let activeSession = null;

/** @type {import("html5-qrcode").Html5Qrcode | null} */
let html5Scanner = null;

async function loadHtml5Qrcode() {
  const mod = await import("https://esm.sh/html5-qrcode@2.3.8");
  return mod.Html5Qrcode;
}

function digitsOnly(code) {
  return String(code).replace(/\D/g, "");
}

/**
 * @param {HTMLElement} container
 * @param {(code: string) => void} onSuccess
 * @param {(msg: string) => void} [onStatus]
 */
async function startNativeScanner(container, onSuccess, onStatus) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  });

  container.innerHTML = "";
  const video = document.createElement("video");
  video.playsInline = true;
  video.setAttribute("webkit-playsinline", "true");
  video.muted = true;
  video.autoplay = true;
  video.style.width = "100%";
  video.style.maxHeight = "128px";
  video.style.height = "128px";
  video.style.objectFit = "cover";
  video.srcObject = stream;
  container.appendChild(video);

  await new Promise((resolve, reject) => {
    video.onloadedmetadata = () => video.play().then(resolve).catch(reject);
    video.onerror = () => reject(new Error("Не удалось запустить видео с камеры"));
  });

  onStatus?.("Камера включена. Наведите на штрихкод на упаковке.");

  if (!("BarcodeDetector" in window)) {
    stream.getTracks().forEach((t) => t.stop());
    container.innerHTML = "";
    throw new Error("no-barcode-detector");
  }

  const detector = new window.BarcodeDetector({
    formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
  });

  let stopped = false;
  let raf = 0;

  const tick = async () => {
    if (stopped) return;
    try {
      const codes = await detector.detect(video);
      if (codes?.length) {
        const raw = digitsOnly(codes[0].rawValue);
        if (raw.length >= 8) {
          stopped = true;
          onSuccess(raw);
          return;
        }
      }
    } catch {
      /* кадр без кода */
    }
    if (!stopped) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return {
    stop() {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      stream.getTracks().forEach((t) => t.stop());
      container.innerHTML = "";
    },
  };
}

async function startHtml5Scanner(elementId, onSuccess, onStatus) {
  const Html5Qrcode = await loadHtml5Qrcode();
  const el = document.getElementById(elementId);
  if (!el) throw new Error("Нет контейнера камеры");

  html5Scanner = new Html5Qrcode(elementId, { verbose: false });
  onStatus?.("Сканер запущен. Держите штрихкод в рамке.");

  await html5Scanner.start(
    { facingMode: "environment" },
    {
      fps: 8,
      aspectRatio: 1.777,
      qrbox: (w, h) => ({
        width: Math.floor(Math.min(w * 0.92, 280)),
        height: Math.floor(Math.min(h * 0.55, 72)),
      }),
    },
    (decoded) => {
      const raw = digitsOnly(decoded);
      if (raw.length >= 8) onSuccess(raw);
    },
    () => {}
  );

  return {
    stop() {
      const s = html5Scanner;
      html5Scanner = null;
      if (!s) return;
      Promise.resolve()
        .then(() => (s.isScanning ? s.stop() : undefined))
        .then(() => s.clear())
        .catch(() => {});
      if (el) el.innerHTML = "";
    },
  };
}

/**
 * @param {string} elementId
 * @param {(code: string) => void} onSuccess
 * @param {(err: Error) => void} onError
 * @param {(msg: string) => void} [onStatus]
 */
async function tryStartHtml5(elementId, container, onSuccess, onStatus) {
  container.innerHTML = "";
  return await startHtml5Scanner(elementId, onSuccess, onStatus);
}

export async function startBarcodeScanner(elementId, onSuccess, onError, onStatus) {
  await stopBarcodeScanner();

  if (!navigator.mediaDevices?.getUserMedia) {
    onError(new Error("Камера недоступна. Введите штрихкод цифрами или выберите фото."));
    return;
  }

  const container = document.getElementById(elementId);
  if (!container) {
    onError(new Error("Ошибка интерфейса сканера."));
    return;
  }

  const inTelegram = Boolean(window.Telegram?.WebApp?.initData);
  onStatus?.("Запрашиваем доступ к камере…");

  // В Telegram WebView надёжнее html5-qrcode (видео в контейнере)
  if (inTelegram) {
    try {
      activeSession = await tryStartHtml5(elementId, container, onSuccess, onStatus);
      return;
    } catch {
      onStatus?.("Пробуем другой режим камеры…");
    }
  }

  try {
    activeSession = await startNativeScanner(container, onSuccess, onStatus);
    return;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg !== "no-barcode-detector" && !msg.includes("BarcodeDetector")) {
      onStatus?.("Пробуем запасной сканер…");
    }
  }

  try {
    activeSession = await tryStartHtml5(elementId, container, onSuccess, onStatus);
  } catch (e) {
    const err =
      e instanceof Error
        ? e
        : new Error("Не удалось открыть камеру. Введите код вручную или «Фото со штрихкодом».");
    onError(err);
  }
}

/** Распознать штрихкод с фото (скриншот, галерея). */
export async function scanBarcodeFromImage(file) {
  const Html5Qrcode = await loadHtml5Qrcode();
  const result = await Html5Qrcode.scanFile(file, false);
  const raw = digitsOnly(result);
  if (raw.length < 8) throw new Error("На фото не видно штрихкод. Сделайте чётче или введите цифры.");
  return raw;
}

export async function stopBarcodeScanner() {
  if (activeSession) {
    activeSession.stop();
    activeSession = null;
  }
  if (html5Scanner) {
    try {
      if (html5Scanner.isScanning) await html5Scanner.stop();
      await html5Scanner.clear();
    } catch {
      /* ignore */
    }
    html5Scanner = null;
  }
  const el = document.getElementById("barcodeReader");
  if (el) el.innerHTML = "";
}
