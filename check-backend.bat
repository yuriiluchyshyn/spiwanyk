@echo off
echo 🔍 Перевірка backend сервера...

curl -s http://localhost:5000/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Backend сервер працює на http://localhost:5000
    echo 📊 Відповідь сервера:
    curl -s http://localhost:5000/api/health
) else (
    echo ❌ Backend сервер не відповідає на http://localhost:5000
    echo.
    echo 🔧 Для запуску backend:
    echo    cd backend
    echo    npm run dev
    echo.
    echo 🚀 Або запустіть повний стек:
    echo    npm run full-dev
)

echo.
echo 🌐 Перевірка CORS...
curl -s -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: Content-Type" -X OPTIONS http://localhost:5000/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ CORS налаштовано правильно
) else (
    echo ❌ Проблеми з CORS
)

pause