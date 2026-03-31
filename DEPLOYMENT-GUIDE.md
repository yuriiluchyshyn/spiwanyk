# 🚀 Повний гід по деплою Пластового Співаника

## 📋 Огляд

Цей проект складається з двох частин:
- **Frontend** (React) - деплоїться на Vercel
- **Backend** (Node.js/Express) - деплоїться окремо на Vercel
- **Database** (MongoDB) - використовує MongoDB Atlas

## 🏠 Локальна розробка

### Швидкий старт
```bash
./run.sh              # Автоматичний запуск всього стеку
```

Цей скрипт:
1. ✅ Перевіряє Docker та Node.js
2. 🐳 Запускає MongoDB в Docker (Rancher)
3. 📦 Встановлює залежності
4. ⚙️ Створює .env файли
5. 🚀 Запускає frontend + backend

### Ручний запуск
```bash
make docker-mongo     # 1. MongoDB в Docker
make install          # 2. Залежності
make full-dev         # 3. Frontend + Backend
```

### Адреси локально:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000/api
- MongoDB: localhost:27017

## 🌐 Production деплой

### Крок 1: Підготовка Backend
```bash
make prepare-backend  # Створює папку plast-songbook-backend
```

### Крок 2: MongoDB Atlas
1. Створіть акаунт на [mongodb.com/atlas](https://mongodb.com/atlas)
2. Створіть безкоштовний кластер
3. Створіть користувача бази даних
4. Додайте IP 0.0.0.0/0 (для Vercel)
5. Отримайте connection string

### Крок 3: Backend на Vercel
```bash
cd plast-songbook-backend
git init
git add .
git commit -m "Initial backend commit"
# Створіть GitHub репозиторій та push
```

На Vercel:
1. Підключіть backend репозиторій
2. Додайте Environment Variables:
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/plast-songbook
JWT_SECRET=your-super-secret-production-key
NODE_ENV=production
```

### Крок 4: Frontend на Vercel
```bash
make deploy           # Автоматичний деплой frontend
```

Або вручну:
1. Підключіть основний репозиторій до Vercel
2. Додайте Environment Variable:
```
REACT_APP_API_URL=https://your-backend.vercel.app/api
```

## 🔧 Налаштування файлів

### Локальна розробка
```
.env                  # Frontend налаштування
backend/.env          # Backend налаштування
```

### Production
```
vercel.json           # Frontend конфігурація Vercel
backend/vercel.json   # Backend конфігурація Vercel
```

## 📊 Архітектура

### Локально (Docker)
```
React App (:3000) → Express API (:5000) → MongoDB (Docker :27017)
```

### Production (Vercel + Atlas)
```
React (Vercel) → Express (Vercel) → MongoDB Atlas
```

## 🛠️ Корисні команди

### Розробка
```bash
make help             # Всі доступні команди
make docker-mongo     # Тільки MongoDB
make frontend         # Тільки frontend
make backend          # Тільки backend
make full-dev         # Повний стек
```

### Деплой
```bash
make prepare-backend  # Підготувати backend
make deploy           # Деплой frontend
make build            # Збірка для production
```

### Обслуговування
```bash
make clean            # Очистити node_modules
make install          # Встановити залежності
make env              # Створити .env файли
```

## 🔍 Тестування

### Локально
```bash
curl http://localhost:5000/api/health
```

### Production
```bash
curl https://your-backend.vercel.app/api/health
```

Очікувана відповідь:
```json
{
  "message": "Пластовий Співаник API працює!",
  "timestamp": "2024-03-31T...",
  "environment": "production",
  "cors": "enabled"
}
```

## 🚨 Вирішення проблем

### CORS помилки
- Перевірте `REACT_APP_API_URL` в frontend
- Переконайтеся що backend доступний

### MongoDB помилки
- Перевірте connection string в `MONGODB_URI`
- Переконайтеся що IP адреси дозволені в Atlas

### Vercel помилки
- Перевірте логи в Vercel Dashboard
- Переконайтеся що Environment Variables налаштовані

### Docker помилки (локально)
- Переконайтеся що Rancher Desktop запущений
- Перевірте статус контейнера: `docker ps`

## 📈 Оптимізації

### Швидкість
- ✅ System fonts (без веб-шрифтів)
- ✅ Compression middleware
- ✅ Lean MongoDB queries
- ✅ Мінімальні залежності

### Мобільність
- ✅ Touch-friendly UI (44px+ кнопки)
- ✅ iOS zoom prevention (16px inputs)
- ✅ Responsive design
- ✅ PWA готовність

### Безпека
- ✅ JWT автентифікація
- ✅ CORS налаштування
- ✅ Environment variables
- ✅ Input validation

## 📚 Додаткові ресурси

- [Vercel Documentation](https://vercel.com/docs)
- [MongoDB Atlas Guide](https://docs.atlas.mongodb.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Rancher Desktop](https://rancherdesktop.io/)

---

**Готово!** Ваш Пластовий Співаник готовий до локальної розробки та production деплою. 🎵