@echo off
cd /d "E:\QB Hub"
set PORT=3100
start "" cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:3100"
call npm start