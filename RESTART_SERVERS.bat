@echo off
echo ========================================
echo   Restarting Backend and Frontend
echo ========================================
echo.

echo Stopping any existing Node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Starting Backend Server (Port 5000)...
cd backend
start "Backend Server" cmd /k "npm start"
timeout /t 5 /nobreak >nul

echo.
echo Starting Frontend Server (Port 5173)...
cd ..\frontend
start "Frontend Server" cmd /k "npm run dev"

echo.
echo ========================================
echo   Servers Started!
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo Public Attendance Viewer:
echo http://localhost:5173/public-attendance
echo.
echo Press any key to exit...
pause >nul
