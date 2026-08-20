@echo off
echo ========================================
echo    LOGIN TEST - Quick Verification
echo ========================================
echo.

echo [1/3] Checking Backend Status...
powershell -Command "Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -Property LocalPort, State"
if %errorlevel% neq 0 (
    echo [!] Backend not running on port 5000
    echo [!] Please start backend: cd SMS-master\backend ^&^& npm start
    pause
    exit /b 1
)
echo [OK] Backend is running on port 5000
echo.

echo [2/3] Checking Frontend Status...
powershell -Command "Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Select-Object -Property LocalPort, State"
if %errorlevel% neq 0 (
    echo [!] Frontend not running on port 5173
    echo [!] Please start frontend: cd SMS-master\frontend ^&^& npm run dev
    pause
    exit /b 1
)
echo [OK] Frontend is running on port 5173
echo.

echo [3/3] Testing Backend Login API...
cd SMS-master\backend
node test-login-simple.js
cd ..\..
echo.

echo ========================================
echo    Test Complete!
echo ========================================
echo.
echo Next Steps:
echo 1. Open browser: http://localhost:5173
echo 2. Or test page: http://localhost:5173/test-frontend-login.html
echo 3. Login with: it.faculty@college.edu / password123
echo.
echo Press any key to open test page in browser...
pause > nul
start http://localhost:5173/test-frontend-login.html
