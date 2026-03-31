# 🚀 Швидкий старт - Пластовий Співаник

**Легкий, швидкий, мобільно-орієнтований співаник**

## Передумови
- Node.js 16+ 
- Docker (Rancher Desktop для MongoDB)

## ⚡ Автоматичний запуск (1 команда)

### Linux/Mac:
```bash
./run.sh              # Повний стек з MongoDB в Docker
make run              # Альтернатива через Makefile
```

### Windows:
```bash
run.bat               # Повний стек
```

## 🐳 MongoDB в Docker (Rancher Desktop)

Проект використовує MongoDB в Docker контейнері:

```bash
# Автоматично запускається через run.sh або:
make docker-mongo     # Запустити MongoDB контейнер
docker ps             # Перевірити статус
```

**Переваги Rancher Desktop:**
- Легке встановлення MongoDB
- Ізольоване середовище
- Автоматичне управління контейнерами
- Персистентні дані

## 🌐 Деплой на Vercel

### Швидкий деплой:
```bash
make deploy           # Автоматичний деплой
```

### Ручний деплой:
```bash
npm install -g vercel
npm run build
vercel --prod
```

### Налаштування Vercel:

#### 1. Frontend проект:
- Підключіть GitHub репозиторій до Vercel
- Додайте змінну: `REACT_APP_API_URL=https://your-backend.vercel.app/api`

#### 2. Backend проект (окремо):
- Створіть новий репозиторій тільки з папкою `backend/`
- Деплойте backend окремо на Vercel
- Додайте змінні:
  - `MONGODB_URI=mongodb+srv://...` (MongoDB Atlas)
  - `JWT_SECRET=your-secret-key`
  - `NODE_ENV=production`

#### 3. MongoDB Atlas:
1. Створіть акаунт на [mongodb.com/atlas](https://mongodb.com/atlas)
2. Створіть кластер
3. Отримайте connection string
4. Додайте в backend змінні Vercel

## 📱 Мобільна оптимізація

Додаток оптимізований для:
- ⚡ **Швидкість**: Мінімальні залежності, стиснення, lean queries
- 📱 **Мобільність**: Touch-friendly UI, 16px inputs (no zoom), system fonts
- 🎯 **Простота**: Чистий дизайн, швидка навігація, мінімум кліків
- 🔋 **Продуктивність**: Lazy loading, оптимізовані запити, compression

## 🎯 Особливості швидкості:

### Frontend:
- System fonts замість веб-шрифтів
- Мінімальні CSS transitions
- Оптимізовані компоненти
- Touch-friendly кнопки (44px+)
- iOS zoom prevention

### Backend:
- Compression middleware
- Lean MongoDB queries
- Оптимізовані індекси
- Мінімальні відповіді API
- Connection pooling

## Окремий запуск компонентів

### Frontend (порт 3000):
```bash
npm start             # Тільки frontend
make frontend         # Через Makefile
```

### Backend (порт 5000):
```bash
cd backend && npm run dev    # Тільки backend
make backend                 # Через Makefile
```

### MongoDB:
```bash
make docker-mongo     # Запустити MongoDB в Docker
```

## Корисні команди:

### Розробка:
```bash
make help             # Показати всі команди
make install          # Встановити залежності
make docker-mongo     # Запустити MongoDB
make full-dev         # Повний стек
make clean            # Очистити все
```

### Production:
```bash
make build            # Збірка для production
make deploy           # Деплой на Vercel
```

## Адреси після запуску:
- 🎵 **Frontend:** http://localhost:3000
- 🔧 **Backend API:** http://localhost:5000/api
- 🏥 **Health Check:** http://localhost:5000/api/health
- 🗄️ **MongoDB:** localhost:27017

## 📊 Архітектура деплою:

### Локальна розробка:
```
Frontend (React) → Backend (Express) → MongoDB (Docker)
     :3000              :5000            :27017
```

### Production (Vercel):
```
Frontend (Vercel) → Backend (Vercel) → MongoDB Atlas
   your-app.vercel.app   your-api.vercel.app   Atlas Cloud
```

## 🔧 Налаштування файлів:

### Локально:
- `.env` - Frontend налаштування
- `backend/.env` - Backend налаштування

### Vercel:
- `vercel.json` - Frontend конфігурація
- `backend/vercel.json` - Backend конфігурація
- Environment Variables в Vercel Dashboard

## Функції додатку:
- 🎵 Швидкий перегляд пісень
- 📚 Легке створення співаників  
- 🎼 Слова, акорди, ноти
- 🎧 Простий плейлист
- 🔒 Приватність
- 📍 Геолокація
- 📱 PWA готовність

---
**Примітка:** Проект готовий для локальної розробки з Docker та production деплою на Vercel. Всі компоненти оптимізовані для максимальної швидкості та мобільного використання.