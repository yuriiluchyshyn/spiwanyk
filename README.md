# Пластовий Співаник

Веб-додаток для збереження та організації пластових пісень з можливістю створення власних співаників та обміну ними.

## Функціональність

### Основні можливості:
- 🎵 Перегляд колекції пластових пісень
- 📚 Створення власних співаників
- 🎼 Збереження слів, акордів та нот для кожної пісні
- 🎬 Посилання на YouTube Music
- 🎧 Система плейлистів
- 🔒 Різні рівні приватності співаників
- 📍 Геолокаційний обмін співаниками
- ✉️ Обмін співаниками за email

### Типи приватності:
- **Приватний** - тільки ви маєте доступ
- **Публічний** - всі можуть переглядати
- **Розшарений** - доступ за запрошенням email
- **Поруч** - доступний користувачам в радіусі 500м

### Плейлист система:
- Додавання пісень до черги
- Встановлення наступної пісні
- Ручне переміщення пісень у плейлисті
- Спільне керування плейлистом для користувачів з доступом

## Технології

### Frontend:
- React 18
- React Router для навігації
- Styled Components для стилізації
- Axios для API запитів
- React Icons для іконок

### Backend (потрібно розробити):
- Node.js + Express
- MongoDB для бази даних
- JWT для автентифікації
- Geolocation API для функцій "поруч"

## Встановлення та запуск

### Передумови:
- Node.js (версія 16 або вище)
- MongoDB (локально або MongoDB Atlas)
- npm або yarn

### Швидкий запуск (Frontend + Backend):

**Автоматичний запуск повного стеку:**
```bash
# Linux/Mac
make run           # Повний стек (frontend + backend)
make full-dev      # Тільки запуск (якщо вже встановлено)

# Або через npm
npm run setup      # Встановлення залежностей
npm run full-dev   # Запуск frontend + backend
```

**Окремий запуск компонентів:**
```bash
# Frontend (порт 3000)
./run.sh           # Linux/Mac
run.bat            # Windows
npm start          # Будь-яка система

# Backend (порт 5000)
cd backend
./run-backend.sh   # Linux/Mac
run-backend.bat    # Windows
npm run dev        # Будь-яка система
```

### Ручне встановлення:

1. **Клонування та встановлення:**
```bash
git clone <repository-url>
cd plast-songbook

# Встановлення frontend залежностей
npm install

# Встановлення backend залежностей
cd backend
npm install
cd ..
```

2. **Налаштування MongoDB:**
```bash
# Запуск MongoDB (виберіть свій спосіб):
# macOS (Homebrew):
brew services start mongodb/brew/mongodb-community

# Ubuntu/Debian:
sudo systemctl start mongod

# Windows:
net start MongoDB

# Або використовуйте MongoDB Atlas (cloud)
```

3. **Налаштування .env файлів:**
```bash
# Frontend .env
cp .env.example .env

# Backend .env
cp backend/.env.example backend/.env
# Відредагуйте backend/.env для налаштування MongoDB URI
```

4. **Запуск:**
```bash
# Варіант 1: Одночасний запуск
npm run full-dev

# Варіант 2: Окремі термінали
# Термінал 1 (Frontend):
npm start

# Термінал 2 (Backend):
cd backend && npm run dev
```

### Доступні команди:

**Frontend:**
```bash
npm start          # Запуск frontend (порт 3000)
npm run build      # Збірка для продакшн
npm test           # Запуск тестів
```

**Backend:**
```bash
cd backend
npm run dev        # Запуск в режимі розробки
npm start          # Запуск продакшн версії
```

**Повний стек:**
```bash
npm run setup      # Встановлення всіх залежностей
npm run full-dev   # Запуск frontend + backend
npm run clean      # Очищення та перевстановлення

# Make команди (Linux/Mac):
make help          # Показати всі команди
make run           # Повний запуск з нуля
make frontend      # Тільки frontend
make backend       # Тільки backend
make full-dev      # Frontend + backend
make install       # Встановити залежності
make clean         # Очистити все
```

### Адреси:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000/api
- **Health Check:** http://localhost:5000/api/health

## Структура проекту

```
src/
├── components/          # React компоненти
│   ├── Auth/           # Компоненти автентифікації
│   ├── Header/         # Заголовок додатку
│   ├── Home/           # Головна сторінка
│   ├── Songs/          # Компоненти пісень
│   ├── Songbooks/      # Компоненти співаників
│   └── Playlist/       # Компоненти плейлиста
├── contexts/           # React контексти
├── services/           # API сервіси
├── App.js             # Головний компонент
└── index.js           # Точка входу
```

## API Endpoints (для backend розробки)

### Автентифікація:
- `POST /api/auth/login` - Вхід за email
- `GET /api/auth/verify` - Перевірка токену

### Пісні:
- `GET /api/songs` - Отримати всі пісні
- `GET /api/songs/:id` - Отримати пісню за ID
- `GET /api/songs/search?q=query` - Пошук пісень

### Співаники:
- `GET /api/songbooks/my` - Мої співаники
- `GET /api/songbooks/:id` - Співаник за ID
- `POST /api/songbooks` - Створити співаник
- `PUT /api/songbooks/:id` - Оновити співаник
- `DELETE /api/songbooks/:id` - Видалити співаник
- `GET /api/songbooks/public` - Публічні співаники
- `GET /api/songbooks/nearby?lat=&lng=` - Співаники поруч

### Геолокація:
- `POST /api/location` - Оновити місцезнаходження

## Responsive Design

Додаток повністю адаптований для:
- 📱 Мобільних пристроїв (320px+)
- 📱 Планшетів (768px+)
- 💻 Десктопів (1024px+)

## Наступні кроки розробки

1. **Backend розробка:**
   - Створення Express.js сервера
   - Налаштування MongoDB
   - Реалізація API endpoints
   - JWT автентифікація

2. **Додаткові функції:**
   - Завантаження файлів (ноти, зображення)
   - Пошук з фільтрами
   - Експорт співаників у PDF
   - Офлайн режим (PWA)

3. **Покращення UX:**
   - Анімації переходів
   - Drag & drop для плейлистів
   - Клавіатурні скорочення
   - Темна тема

## Ліцензія

MIT License - дивіться файл LICENSE для деталей.

## Внесок у проект

Ласкаво просимо до участі у розробці! Будь ласка, створіть issue або pull request для пропозицій та покращень.
