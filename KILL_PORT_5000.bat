@echo off
echo Killing process on port 5000...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    echo Found process: %%a
    taskkill /F /PID %%a 2>nul
)

echo Done!
echo Wait 5 seconds before starting backend...
timeout /t 5 /nobreak
echo You can now start backend with: npm start
pause
