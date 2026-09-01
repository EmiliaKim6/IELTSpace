@echo off
chcp 65001 >nul 2>&1
title IELTS Study Server
echo.
echo   Starting IELTS Study Server...
echo.
node "%~dp0server.js"
pause
