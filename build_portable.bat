@echo off
setlocal enabledelayedexpansion

echo.
echo =======================================================
echo    GOLDSTONE LAUNCHER - STANDALONE SINGLE EXE BUILDER
echo =======================================================
echo.
echo [1/2] Building Embedded Tauri Release (Self-Extracting Runtime + Offline Assets)...
cd /d "%~dp0goldstone-launcher"
call npm run tauri build -- --no-bundle
if %errorlevel% neq 0 (
    echo [ERROR] Tauri build failed!
    pause
    exit /b %errorlevel%
)

echo.
echo [2/2] Copying Standalone Executable to All Release and Launcher Update Locations...
set "SRC_EXE=%~dp0goldstone-launcher\src-tauri\target\release\goldstone-launcher.exe"

if not exist "%~dp0release" mkdir "%~dp0release"
if not exist "%~dp0launcher-update" mkdir "%~dp0launcher-update"
if not exist "%~dp0goldstone-launcher\launcher-update" mkdir "%~dp0goldstone-launcher\launcher-update"
if not exist "%~dp0goldstone-launcher-github\launcher-update" mkdir "%~dp0goldstone-launcher-github\launcher-update"

copy /y "%SRC_EXE%" "%~dp0release\goldstone-launcher.exe" >nul
copy /y "%SRC_EXE%" "%~dp0goldstone-launcher.exe" >nul
copy /y "%SRC_EXE%" "%~dp0goldstone-launcher\goldstone-launcher.exe" >nul
copy /y "%SRC_EXE%" "%~dp0launcher-update\goldstone-launcher.exe" >nul
copy /y "%SRC_EXE%" "%~dp0goldstone-launcher\launcher-update\goldstone-launcher.exe" >nul
copy /y "%SRC_EXE%" "%~dp0goldstone-launcher-github\launcher-update\goldstone-launcher.exe" >nul
copy /y "%SRC_EXE%" "%~dp0goldstone-launcher-github\goldstone-launcher.exe" >nul

echo.
echo =======================================================
echo    SUCCESS! Standalone goldstone-launcher.exe ready!
echo =======================================================
echo.
echo Output location: %~dp0release\goldstone-launcher.exe
echo (Works on any new PC with JUST this single .exe file!)
echo.
pause
