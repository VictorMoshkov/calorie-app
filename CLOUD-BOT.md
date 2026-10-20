# Бот в облаке (работает без вашего ПК)

## Это ваш бот?

**Да.** Бот создан вами в @BotFather, токен и код — у вас. Облако только **запускает** программу, как если бы вы держали открытый `python bot.py`.

Позже можете:
- менять дизайн Mini App;
- добавлять **рекламу** в `frontend` (баннеры, партнёрские блоки — по правилам Telegram и рекламной сети);
- подключать базу данных, оплату и т.д.

---

## Что сделать один раз

### Шаг A. Постоянный адрес для калькулятора (Mini App)

Без localtunnel — см. **HOSTING-PROSTO.md** (Cloudflare Pages).

Допустим, ссылка: `https://calorie-app.pages.dev`

### Шаг B. Перевыпустить токен (если светился в чате)

@BotFather → ваш бот → **API Token** → Revoke → новый токен в блокнот.

### Шаг C. Залить проект на GitHub

1. Создайте репозиторий на https://github.com/new (приватный можно).
2. В PowerShell в папке проекта:

```powershell
cd C:\Users\grot-\OneDrive\Desktop\calorie-app
git init
git add backend bot.py backend requirements.txt render.yaml frontend HOSTING-PROSTO.md README.md .gitignore
git add backend/
git commit -m "Calorie bot and mini app"
git branch -M main
git remote add origin https://github.com/ВАШ_ЛОГИН/calorie-app.git
git push -u origin main
```

(Файл `.env` в git **не попадёт** — он в `.gitignore`.)

### Шаг D. Render.com — запуск бота 24/7

1. Регистрация: https://render.com/
2. **New** → **Blueprint** → подключить GitHub → репозиторий `calorie-app`.
3. Render прочитает `render.yaml` и создаст **Worker**.
4. В настройках сервиса → **Environment** добавьте:
   - `BOT_TOKEN` = токен от BotFather
   - `WEBAPP_URL` = `https://calorie-app.pages.dev` (ваша ссылка с Cloudflare)
5. **Deploy** / дождитесь зелёного статуса **Live**.

Бот работает на серверах Render. ПК и VPN для бота **не нужны**.

> **План free:** у Render для Worker иногда нужен платный план (~$7/мес). Если free недоступен — см. раздел «Альтернатива Fly.io» ниже или выберите самый дешёвый Worker.

### Шаг E. BotFather

**Configure Mini App** → URL = тот же `WEBAPP_URL`.

---

## Проверка

1. Выключите NashVPN и **не** запускайте `python bot.py` на ПК.
2. В Telegram: `/start` у @my_calorie_app_bot (или ваш username).
3. Должен ответить и открыть калькулятор.

---

## Альтернатива: Fly.io (есть бесплатный лимит)

```powershell
cd C:\Users\grot-\OneDrive\Desktop\calorie-app\backend
# Установите flyctl: https://fly.io/docs/hands-on/install-flyctl/
fly launch --no-deploy
fly secrets set BOT_TOKEN="ваш_токен" WEBAPP_URL="https://ваш-сайт.pages.dev"
fly deploy
```

---

## Реклама потом

Рекламу вешают в **frontend** (`index.html` / `app.js`): блок под списком еды, баннер снизу и т.д.  
Сначала выложите стабильный хостинг Mini App, потом подключите сеть (Яндекс, myTarget и др.) по их инструкции.

---

## Локальный бот больше не нужен

После облака на ПК остаётся только **редактировать код** и делать `git push` — Render/Fly пересоберут бота сами (если включите Auto-Deploy).
