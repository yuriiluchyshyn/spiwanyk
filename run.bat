@echo off
chcp 65001 >nul
cls

echo 🎵 Пластовий Співаник - Запуск додатку
echo ======================================

REM Перевірка наявності Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js не знайдено. Будь ласка, встановіть Node.js ^(версія 16+^)
    echo    Завантажити можна з: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js знайдено: 
node --version

REM Перевірка наявності npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm не знайдено
    pause
    exit /b 1
)

echo ✅ npm знайдено: 
npm --version

REM Перевірка наявності package.json
if not exist "package.json" (
    echo ❌ package.json не знайдено. Переконайтеся, що ви в правильній директорії
    pause
    exit /b 1
)

REM Перевірка наявності node_modules
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

REM Перевірка наявності .env файлу
if not exist ".env" (
    echo ⚙️  Створення .env файлу...
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo ✅ .env файл створено з .env.example
        echo 💡 Ви можете відредагувати .env файл для налаштування API URL
    ) else (
        echo REACT_APP_API_URL=http://localhost:5000/api > .env
        echo ✅ .env файл створено з базовими налаштуваннями
    )
) else (
    echo ✅ .env файл знайдено
)

echo.
echo 🚀 Запуск додатку...
echo    Додаток буде доступний за адресою: http://localhost:3000
echo    Для зупинки натисніть Ctrl+C
echo.

REM Запуск додатку
npm start

pause