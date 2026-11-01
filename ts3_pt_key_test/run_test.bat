@echo off
setlocal
title TeamSpeak 3 Live PTT Key Bridge (Instant Auto-Update)

cd /d "%~dp0"

echo.
echo ====================================================================
echo    GOLDSTONE - TEAMSPEAK 3 LIVE PTT KEY BRIDGE AND TESTER
echo    (Instant Auto-Update - Zero Popups - No Apply Button Needed)
echo ====================================================================
echo.

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python was not found in PATH.
    echo Please install Python 3.10+ or add it to PATH.
    pause
    exit /b 1
)

echo [1] Running Automated End-to-End Self-Test...
python test_live_ptt_end_to_end.py
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] Self-test encountered an issue. See output above.
    pause
)

echo.
echo [2] Launching Interactive Live PTT Key Bridge GUI...
python ts3_ptt_tester.py
if %errorlevel% neq 0 (
    echo.
    echo [EXIT] Tester closed with code %errorlevel%.
)

pause
