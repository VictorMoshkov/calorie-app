# Бот 24/7 на российском VPS (без Fly.io)

Mini App остаётся на **GitHub Pages**. На VPS крутится только **backend**: Telegram polling + HTTP API для кнопки **ИИ** (`/api/nutrition-chat`, `/health`).

Оплата — **рублями** у любого хостера (Timeweb, Selectel, Reg.ru, Beget VPS и т.д.). Нужен **домен** с HTTPS для API (Let's Encrypt бесплатно).

---

## Что получится в итоге

| Компонент | Где |
|-----------|-----|
| Сайт калькулятора | `https://victormoshkov.github.io/calorie-app/?v=22` |
| Бот + ИИ API | `https://bot.ВАШ-ДОМЕН.ru` → nginx → `localhost:8080` |
| ПК и cloudflared | **выключены** (иначе два polling на один токен) |

---

## Шаг 0. Заказать VPS и домен

1. **VPS**: Ubuntu **22.04** или **24.04**, 1 GB RAM, 1 vCPU — достаточно.
2. **Домен** (например `ваш-сайт.ru`) — A-запись на **IP VPS**:
   - имя: `bot` (или `@`) → `123.45.67.89`
   - итог: `bot.ваш-сайт.ru` указывает на сервер

Подождите 5–30 минут, пока DNS обновится. Проверка с ПК:

```powershell
nslookup bot.ваш-сайт.ru
```

---

## Шаг 1. Подключиться по SSH

С Windows (PowerShell):

```powershell
ssh root@123.45.67.89
```

(логин может быть `ubuntu` — смотрите письмо от хостера)

Обновление системы:

```bash
apt update && apt upgrade -y
```

---

## Шаг 2. Установить Docker (рекомендуется)

```bash
apt install -y ca-certificates curl
curl -fsSL https://get.docker.com | sh
systemctl enable docker
docker --version
```

---

## Шаг 3. Скопировать backend на сервер

**Вариант A — git** (если репозиторий на GitHub):

```bash
apt install -y git
git clone https://github.com/victormoshkov/calorie-app.git
cd calorie-app/backend
```

**Вариант B — только папка с ПК** (из PowerShell на своём компьютере):

```powershell
scp -r C:\Users\grot-\OneDrive\Desktop\calorie-app\backend root@123.45.67.89:/opt/calorie-bot
```

На сервере: `cd /opt/calorie-bot`

---

## Шаг 4. Файл `.env` на сервере

```bash
cp .env.example .env
nano .env
```

Заполните (подставьте свои значения):

```env
BOT_TOKEN=токен_от_BotFather
WEBAPP_URL=https://victormoshkov.github.io/calorie-app/?v=22

AI_PROVIDER=gemini
GEMINI_API_KEY=ключ_с_aistudio.google.com

PUBLIC_API_URL=https://bot.ваш-сайт.ru
PORT=8080
```

- `PUBLIC_API_URL` — **тот же HTTPS-адрес**, что настроите в nginx (без `/` в конце).
- `PROXY_URL` на VPS обычно **не нужен** (Telegram с российского IP чаще доступен напрямую).

Сохранить в nano: **Ctrl+O**, Enter, **Ctrl+X**.

---

## Шаг 5. Запустить бота в Docker

```bash
cd /opt/calorie-bot   # или .../calorie-app/backend
docker compose up -d --build
docker compose logs -f
```

Проверка на сервере:

```bash
curl -s http://127.0.0.1:8080/health
```

Должно быть что-то вроде `{"ok":true,...}`.

Остановка / перезапуск:

```bash
docker compose restart
docker compose down
```

---

## Шаг 6. Nginx + HTTPS (Let's Encrypt)

```bash
apt install -y nginx certbot python3-certbot-nginx
```

Создайте конфиг (замените домен):

```bash
nano /etc/nginx/sites-available/calorie-bot
```

```nginx
server {
    listen 80;
    server_name bot.ваш-сайт.ru;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
```

Включить сайт:

```bash
ln -sf /etc/nginx/sites-available/calorie-bot /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d bot.ваш-сайт.ru
```

Согласитесь с условиями, укажите email. Certbot сам добавит SSL.

Проверка с телефона или ПК:

```text
https://bot.ваш-сайт.ru/health
```

---

## Шаг 7. Обновить фронтенд (GitHub Pages)

Чтобы ИИ работал и без параметра `api=` в ссылке бота, обновите URL API в репозитории:

**`frontend/ai-api.json`:**

```json
{
  "apiBase": "https://bot.ваш-сайт.ru"
}
```

**`frontend/index.html`** — блок `calorie-ai-api-config`, то же значение `apiBase`.

Затем с ПК:

```powershell
cd C:\Users\grot-\OneDrive\Desktop\calorie-app
git add frontend/ai-api.json frontend/index.html
git commit -m "Point AI API to VPS"
git push
```

**BotFather** → Mini App:

```text
https://victormoshkov.github.io/calorie-app/?v=22
```

Бот при `/start` может сам добавить `?api=...`, если в `.env` задан `PUBLIC_API_URL`.

---

## Шаг 8. Выключить бот на ПК

На компьютере **не запускайте** одновременно:

- `python bot.py`
- `cloudflared tunnel ...`

Иначе Telegram выдаст конфликт polling.

В Telegram: **/start** → открыть калькулятор → кнопка **ИИ**.

---

## Обновление кода бота на VPS

```bash
cd /opt/calorie-app
git pull
cd backend
docker compose up -d --build
```

---

## Вариант без Docker (Python + systemd)

```bash
apt install -y python3 python3-venv python3-pip
cd /opt/calorie-app/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env && nano .env
```

Проверка вручную:

```bash
source .venv/bin/activate
python bot.py
```

Unit systemd:

```bash
nano /etc/systemd/system/calorie-bot.service
```

```ini
[Unit]
Description=Calorie Telegram Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/calorie-app/backend
EnvironmentFile=/opt/calorie-app/backend/.env
ExecStart=/opt/calorie-app/backend/.venv/bin/python bot.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable --now calorie-bot
systemctl status calorie-bot
journalctl -u calorie-bot -f
```

Nginx и certbot — как в шаге 6.

---

## Частые проблемы

| Симптом | Что проверить |
|---------|----------------|
| ИИ в приложении не отвечает | `https://bot.../health` в браузере; `GEMINI_API_KEY`; `ai-api.json` после `git push`; открыть Mini App из Telegram |
| `Conflict: terminated by other getUpdates` | Бот запущен и на ПК, и на VPS — оставьте только VPS |
| Certbot не выдаёт сертификат | DNS A-запись на IP VPS; порт 80 открыт в файрволе хостера |
| `502 Bad Gateway` | `docker compose ps`, `curl http://127.0.0.1:8080/health` |

---

## Ориентир по цене

- VPS от ~200–400 ₽/мес (минимальный тариф).
- Домен `.ru` — от ~200 ₽/год (если ещё нет).
- Gemini API — отдельно, по лимитам Google AI Studio.

---

См. также: [BOT-RUN.md](BOT-RUN.md) (локальный запуск), [FLY-24-7.md](FLY-24-7.md) (если появится зарубежная карта).
