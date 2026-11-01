@echo off
title Goldstone ReShade Toggle Key Live Tester
cls
echo ============================================================
echo   Goldstone ReShade Toggle Key Live Tester Suite
echo ============================================================
echo.

where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not found in your PATH. Please install Python or add it to PATH.
    pause
    exit /b 1
)

python "%~dp0reshade_key_tester.py" %*

if "%~1"=="" (
    pause
)

