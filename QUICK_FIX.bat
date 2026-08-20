@echo off
echo ========================================
echo   QUICK FIX - Restarting Backend
echo ========================================
echo.
echo Stopping backend...
taskkill /F /FI "WINDOWTITLE eq Backend Server*" 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Starting backend on correct database...
cd backend
start "Backend Server" cmd /k "npm start"

echo.
echo ========================================
echo   Backend Restarted!
echo ========================================
echo.
echo Now refresh browser and try again!
echo http://localhost:5173/public-attendance
echo.
pause
