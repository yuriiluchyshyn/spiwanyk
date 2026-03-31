#!/bin/bash

echo "📦 Підготовка backend для окремого деплою на Vercel"
echo "=================================================="

# Назва папки для backend
BACKEND_DIR="plast-songbook-backend"

# Перевірка чи папка вже існує
if [ -d "$BACKEND_DIR" ]; then
    echo "⚠️  Папка $BACKEND_DIR вже існує"
    read -p "Видалити та створити заново? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$BACKEND_DIR"
        echo "🗑️  Стара папка видалена"
    else
        echo "❌ Операція скасована"
        exit 1
    fi
fi

# Створення нової папки
echo "📁 Створення папки $BACKEND_DIR..."
mkdir "$BACKEND_DIR"

# Копіювання backend файлів
echo "📋 Копіювання backend файлів..."
cp -r backend/src "$BACKEND_DIR/"
cp backend/package.json "$BACKEND_DIR/"
cp backend/.env.example "$BACKEND_DIR/"
cp backend/.gitignore "$BACKEND_DIR/"

# Створення vercel.json для backend
echo "⚙️  Створення vercel.json..."
cat > "$BACKEND_DIR/vercel.json" << 'EOF'
{
  "version": 2,
  "builds": [
    {
      "src": "src/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/server.js"
    }
  ]
}
EOF

# Створення README для backend
echo "📖 Створення README..."
cat > "$BACKEND_DIR/README.md" << 'EOF'
# Пластовий Співаник - Backend API

Backend API для Пластового Співаника.

## Деплой на Vercel

1. Створіть новий GitHub репозиторій
2. Завантажте ці файли в репозиторій
3. Підключіть репозиторій до Vercel
4. Додайте Environment Variables:
   - `MONGODB_URI` - MongoDB Atlas connection string
   - `JWT_SECRET` - Secret key для JWT токенів
   - `NODE_ENV=production`

## Локальна розробка

```bash
npm install
npm run dev
```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/login` - Автентифікація
- `GET /api/songs` - Список пісень
- `GET /api/songbooks/my` - Мої співаники
- `POST /api/songbooks` - Створити співаник

## Environment Variables

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/plast-songbook
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=production
PORT=5000
```
EOF

# Створення .gitignore якщо не існує
if [ ! -f "$BACKEND_DIR/.gitignore" ]; then
    echo "📝 Створення .gitignore..."
    cat > "$BACKEND_DIR/.gitignore" << 'EOF'
node_modules/
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.DS_Store
*.log
uploads/
EOF
fi

echo ""
echo "✅ Backend підготовлено для деплою!"
echo ""
echo "📋 Наступні кроки:"
echo "1. cd $BACKEND_DIR"
echo "2. Створіть новий GitHub репозиторій"
echo "3. git init && git add . && git commit -m 'Initial commit'"
echo "4. git remote add origin https://github.com/username/plast-songbook-backend.git"
echo "5. git push -u origin main"
echo "6. Підключіть репозиторій до Vercel"
echo "7. Налаштуйте Environment Variables в Vercel"
echo ""
echo "📖 Детальні інструкції в BACKEND-DEPLOY.md"