#!/bin/bash

# Скрипт для створення backend частини проекту
echo "🔧 Налаштування Backend для Пластового Співаника"
echo "=============================================="

# Створення директорії backend
if [ ! -d "backend" ]; then
    echo "📁 Створення директорії backend..."
    mkdir backend
    cd backend
    
    # Ініціалізація npm проекту
    echo "📦 Ініціалізація npm проекту..."
    npm init -y
    
    # Встановлення залежностей
    echo "📦 Встановлення залежностей..."
    npm install express mongoose cors dotenv bcryptjs jsonwebtoken helmet morgan
    npm install -D nodemon concurrently
    
    # Створення базової структури
    mkdir -p src/{controllers,models,routes,middleware,utils}
    mkdir -p src/config
    
    # Створення базових файлів
    echo "📄 Створення базових файлів..."
    
    # package.json scripts
    cat > package.json << 'EOF'
{
  "name": "plast-songbook-backend",
  "version": "1.0.0",
  "description": "Backend для Пластового Співаника",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0",
    "helmet": "^6.0.1",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.20",
    "concurrently": "^7.6.0"
  }
}
EOF
    
    # .env файл
    cat > .env.example << 'EOF'
PORT=5000
MONGODB_URI=mongodb://localhost:27017/plast-songbook
JWT_SECRET=your-super-secret-jwt-key-here
NODE_ENV=development
EOF
    
    # Основний server.js
    cat > src/server.js << 'EOF'
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ message: 'Пластовий Співаник API працює!' });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plast-songbook')
  .then(() => console.log('✅ MongoDB підключено'))
  .catch(err => console.error('❌ Помилка підключення до MongoDB:', err));

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущено на порті ${PORT}`);
});
EOF
    
    echo "✅ Backend структура створена!"
    echo "📝 Наступні кроки:"
    echo "   1. cd backend"
    echo "   2. cp .env.example .env"
    echo "   3. Налаштуйте MongoDB URI в .env"
    echo "   4. npm run dev"
    
else
    echo "✅ Директорія backend вже існує"
fi

echo ""
echo "💡 Для запуску frontend та backend разом:"
echo "   npm install concurrently --save-dev"
echo "   Додайте в package.json (root): \"dev\": \"concurrently \\\"npm start\\\" \\\"cd backend && npm run dev\\\"\""