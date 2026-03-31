# Пластовий Співаник - Backend API

REST API сервер для додатку "Пластовий Співаник" на Node.js + Express + MongoDB.

## Технології

- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL база даних
- **Mongoose** - ODM для MongoDB
- **JWT** - Автентифікація
- **bcryptjs** - Хешування паролів
- **express-validator** - Валідація даних

## Швидкий запуск

```bash
# Встановлення залежностей
npm install

# Копіювання налаштувань
cp .env.example .env

# Запуск в режимі розробки
npm run dev

# Або використовуйте скрипти:
./run-backend.sh    # Linux/Mac
run-backend.bat     # Windows
```

## API Endpoints

### Автентифікація (`/api/auth`)
- `POST /login` - Вхід за email
- `GET /verify` - Перевірка токену
- `GET /profile` - Профіль користувача
- `PUT /profile` - Оновлення профілю
- `POST /logout` - Вихід

### Пісні (`/api/songs`)
- `GET /` - Список пісень (з пошуком та фільтрами)
- `GET /popular` - Популярні пісні
- `GET /search?q=query` - Пошук пісень
- `GET /:id` - Пісня за ID
- `POST /` - Створити пісню (auth)
- `PUT /:id` - Оновити пісню (auth)
- `DELETE /:id` - Видалити пісню (auth)

### Співаники (`/api/songbooks`)
- `GET /my` - Мої співаники (auth)
- `GET /public` - Публічні співаники
- `GET /nearby?lat=&lng=` - Співаники поруч (auth)
- `GET /:id` - Співаник за ID
- `POST /` - Створити співаник (auth)
- `PUT /:id` - Оновити співаник (auth)
- `DELETE /:id` - Видалити співаник (auth)
- `POST /:id/songs` - Додати пісню до співаника (auth)
- `DELETE /:id/songs/:songId` - Видалити пісню зі співаника (auth)
- `POST /:id/sections` - Додати розділ (auth)
- `DELETE /:id/sections/:sectionId` - Видалити розділ (auth)
- `POST /:id/share` - Поділитися співаником (auth)
- `DELETE /:id/share/:email` - Скасувати доступ (auth)

### Геолокація (`/api/location`)
- `POST /` - Оновити місцезнаходження (auth)
- `GET /` - Отримати місцезнаходження (auth)
- `DELETE /` - Очистити місцезнаходження (auth)

### Системні
- `GET /api/health` - Health check

## Моделі даних

### User
```javascript
{
  email: String (unique),
  isActive: Boolean,
  lastLogin: Date,
  location: {
    type: 'Point',
    coordinates: [longitude, latitude],
    updatedAt: Date
  },
  preferences: {
    language: String,
    theme: String
  }
}
```

### Song
```javascript
{
  title: String (required),
  author: String,
  lyrics: String,
  chords: String,
  notes: String (URL),
  youtubeUrl: String,
  category: String (enum),
  tags: [String],
  difficulty: String (enum),
  language: String,
  isPublic: Boolean,
  createdBy: ObjectId (User),
  playCount: Number,
  lastPlayed: Date
}
```

### Songbook
```javascript
{
  title: String (required),
  description: String,
  owner: ObjectId (User),
  privacy: String (enum: private, public, shared, nearby),
  sections: [{
    name: String,
    description: String,
    order: Number
  }],
  songs: [{
    song: ObjectId (Song),
    section: ObjectId,
    order: Number,
    addedAt: Date,
    addedBy: ObjectId (User)
  }],
  sharedWith: [{
    email: String,
    permissions: String (enum: view, edit),
    sharedAt: Date
  }],
  tags: [String],
  isActive: Boolean
}
```

## Налаштування

### Змінні середовища (.env)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/plast-songbook
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=development

# Email (опціонально)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Файли
MAX_FILE_SIZE=10485760
UPLOAD_PATH=uploads/
```

### MongoDB
Переконайтеся, що MongoDB запущено:

```bash
# macOS (Homebrew)
brew services start mongodb/brew/mongodb-community

# Ubuntu/Debian
sudo systemctl start mongod

# Windows
net start MongoDB
```

Або використовуйте MongoDB Atlas (cloud).

## Автентифікація

API використовує JWT токени. Після логіну отримайте токен і додавайте його до заголовків:

```javascript
Authorization: Bearer <your-jwt-token>
```

## Приклади запитів

### Вхід
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

### Отримання пісень
```bash
curl http://localhost:5000/api/songs
```

### Пошук пісень
```bash
curl "http://localhost:5000/api/songs/search?q=калина"
```

### Створення співаника
```bash
curl -X POST http://localhost:5000/api/songbooks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"title": "Мій співаник", "privacy": "private"}'
```

## Розробка

```bash
# Запуск в режимі розробки (з автоперезапуском)
npm run dev

# Запуск продакшн версії
npm start

# Перевірка здоров'я API
curl http://localhost:5000/api/health
```

## Структура проекту

```
backend/
├── src/
│   ├── models/          # Mongoose моделі
│   ├── routes/          # Express маршрути
│   ├── middleware/      # Middleware функції
│   └── server.js        # Головний файл сервера
├── uploads/             # Завантажені файли
├── .env                 # Змінні середовища
└── package.json         # Залежності та скрипти
```

## Помилки та відлагодження

- Перевірте, що MongoDB запущено
- Переконайтеся, що порт 5000 вільний
- Перевірте .env файл
- Дивіться логи в консолі для деталей помилок

## Ліцензія

MIT License