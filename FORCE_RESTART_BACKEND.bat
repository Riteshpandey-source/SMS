@echo off
echo ========================================
echo   FORCE RESTART BACKEND
echo ========================================
echo.

echo Step 1: Killing ALL Node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 3 /nobreak >nul

echo.
echo Step 2: Clearing any port locks...
netstat -ano | findstr :5000 > nul
if %errorlevel% equ 0 (
    echo Port 5000 is in use, clearing...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do taskkill /F /PID %%a 2>nul
)
timeout /t 2 /nobreak >nul

echo.
echo Step 3: Starting fresh backend...
cd backend
start "Backend Server - Port 5000" cmd /k "echo Starting backend on campusbuddy database... && npm start"

echo.
echo ========================================
echo   Backend Restarted!
echo ========================================
echo.
echo Wait 5 seconds for backend to start...
timeout /t 5 /nobreak

echo.
echo Testing backend connection...
curl http://localhost:5000/api/daily-attendance/health
echo.
echo.
echo If you see "operational" above, backend is ready!
echo.
echo Now go to browser and refresh:
echo http://localhost:5173/public-attendance
echo.
pause
