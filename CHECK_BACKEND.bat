@echo off
echo ========================================
echo   Checking Backend Status
echo ========================================
echo.

echo Testing backend connection...
curl http://localhost:5000/api/daily-attendance/health 2>nul

if %errorlevel% neq 0 (
    echo.
    echo ❌ Backend is NOT running!
    echo.
    echo Please start backend:
    echo   1. Open new terminal
    echo   2. cd SMS-master\backend
    echo   3. npm start
    echo.
) else (
    echo.
    echo ✅ Backend is running!
    echo.
)

pause
