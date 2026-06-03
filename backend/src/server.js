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
app.use(compression());

// CORS налаштування
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    // Дозволяємо всі vercel preview URLs
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    
    const allowedOrigins = [
      'http://localhost:3010',
      'http://127.0.0.1:3010',
      'https://spiwanyk.vercel.app'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true);
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

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// MongoDB connection
let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;
  
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plast-songbook', {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log('✅ MongoDB підключено');
  } catch (err) {
    console.error('❌ Помилка підключення до MongoDB:', err);
    throw err;
  }
};

// Підключення до БД перед кожним запитом (для serverless)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).json({ message: 'Database connection failed' });
  }
});

// Static files
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
    cors: 'enabled',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
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

// Для локальної розробки
if (process.env.NODE_ENV !== 'production') {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Сервер запущено на порті ${PORT}`);
      console.log(`📍 API доступний за адресою: http://localhost:${PORT}/api`);
    });
  });
}

// Export для Vercel serverless
module.exports = app;
