/**
 * Сканер штрихкода через камеру (html5-qrcode, EAN/UPC).
 */

/** @type {import('html5-qrcode').Html5Qrcode | null} */
let scanner = null;

async function loadHtml5Qrcode() {
  const mod = await import("https://esm.sh/html5-qrcode@2.3.8");
  return mod.Html5Qrcode;
}

/**
 * @param {string} elementId — контейнер для видео
 * @param {(code: string) => void} onSuccess
 * @param {(err: Error) => void} onError
 */
export async function startBarcodeScanner(elementId, onSuccess, onError) {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Камера недоступна в этом браузере. Введите штрихкод вручную.");
    }
    const Html5Qrcode = await loadHtml5Qrcode();
    await stopBarcodeScanner();
    scanner = new Html5Qrcode(elementId, { verbose: false });
    const config = {
      fps: 10,
      qrbox: { width: 280, height: 160 },
      aspectRatio: 1.5,
    };
    await scanner.start(
      { facingMode: "environment" },
      config,
      (decoded) => {
        const code = decoded.replace(/\D/g, "");
        if (code.length >= 8) {
          stopBarcodeScanner().then(() => onSuccess(code));
        }
      },
      () => {}
    );
  } catch (e) {
    onError(e instanceof Error ? e : new Error(String(e)));
  }
}

export async function stopBarcodeScanner() {
  if (!scanner) return;
  try {
    if (scanner.isScanning) await scanner.stop();
    await scanner.clear();
  } catch {
    /* ignore */
  }
  scanner = null;
}
