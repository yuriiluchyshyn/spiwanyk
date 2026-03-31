@echo off
chcp 65001 >nul
cls

echo 🔧 Пластовий Співаник - Запуск Backend
echo =====================================

REM Перевірка наявності Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js не знайдено. Будь ласка, встановіть Node.js ^(версія 16+^)
    pause
    exit /b 1
)

echo ✅ Node.js знайдено: 
node --version

REM Перевірка наявності package.json
if not exist "package.json" (
    echo ❌ package.json не знайдено. Переконайтеся, що ви в директорії backend
    pause
    exit /b 1
)

REM Встановлення залежностей
if not exist "node_modules" (
    echo 📦 Встановлення залежностей...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Помилка встановлення залежностей
        pause
        exit /b 1
    )
    echo ✅ Залежності встановлено
) else (
    echo ✅ Залежності вже встановлено
)

REM Перевірка .env файлу
if not exist ".env" (
    echo ⚙️  Створення .env файлу...
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo ✅ .env файл створено з .env.example
    ) else (
        echo ❌ .env.example не знайдено
        pause
        exit /b 1
    )
) else (
    echo ✅ .env файл знайдено
)

REM Створення директорії для завантажень
if not exist "uploads" (
    mkdir uploads
    echo ✅ Директорія uploads створена
)

echo.
echo 🚀 Запуск backend сервера...
echo    API буде доступний за адресою: http://localhost:5000/api
echo    Health check: http://localhost:5000/api/health
echo    Для зупинки натисніть Ctrl+C
echo.

REM Запуск сервера
npm run dev

pause