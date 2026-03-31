const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const songRoutes = require('./routes/songs');
const songbookRoutes = require('./routes/songbooks');
const locationRoutes = require('./routes/location');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
}));
app.use(compression()); // Стиснення відповідей

// CORS налаштування для розробки
app.use(cors({
  origin: function (origin, callback) {
    // Дозволяємо запити без origin (наприклад, мобільні додатки)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001'
    ];
    
    if (process.env.NODE_ENV === 'production') {
      allowedOrigins.push('https://your-domain.com');
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Дозволяємо всі origins в development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Логування тільки в development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '5mb' })); // Зменшено ліміт
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Static files (for uploaded content)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/songbooks', songbookRoutes);
app.use('/api/location', locationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'Пластовий Співаник API працює!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    cors: 'enabled'
  });
});

// CORS preflight для всіх маршрутів
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Щось пішло не так!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Маршрут не знайдено' });
});

// MongoDB connection з оптимізацією
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plast-songbook', {
  maxPoolSize: 10, // Обмеження пулу з'єднань
  serverSelectionTimeoutMS: 5000, // Швидший timeout
  socketTimeoutMS: 45000,
})
  .then(() => {
    console.log('✅ MongoDB підключено');
    
    // Start server only after DB connection
    app.listen(PORT, () => {
      console.log(`🚀 Сервер запущено на порті ${PORT}`);
      console.log(`📍 API доступний за адресою: http://localhost:${PORT}/api`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
    });
  })
  .catch(err => {
    console.error('❌ Помилка підключення до MongoDB:', err);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM отримано, закриваю сервер...');
  mongoose.connection.close(() => {
    console.log('MongoDB з\'єднання закрито');
    process.exit(0);
  });
});