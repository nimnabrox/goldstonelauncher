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
echo [2/3] Applying Goldstone Authenticode Code Signature...
set "SRC_EXE=%~dp0goldstone-launcher\src-tauri\target\release\goldstone-launcher.exe"
powershell -NoProfile -Command "$cert = Get-Item 'Cert:\CurrentUser\My\5C03631F9ADCC9EA4722AF569299B4FAC1CF8AAE' -ErrorAction SilentlyContinue; if ($cert) { Set-AuthenticodeSignature -Certificate $cert -FilePath '%SRC_EXE%' -TimestampServer 'http://timestamp.digicert.com' -HashAlgorithm SHA256 | Out-Null; Write-Host '[SUCCESS] Authenticode signature applied!' } else { Write-Host '[WARN] Code signing cert not found, continuing unsigned.' }"

echo.
echo [3/3] Copying Standalone Executable to All Release and Launcher Update Locations...

if not exist "%~dp0release" mkdir "%~dp0release"
if not exist "%~dp0launcher-update" mkdir "%~dp0launcher-update"
if not exist "%~dp0goldstone-launcher\launcher-update" mkdir "%~dp0goldstone-launcher\launcher-update"
if not exist "%~dp0goldstone-launcher-github\launcher-update" mkdir "%~dp0goldstone-launcher-github\launcher-update"

copy /y "%SRC_EXE%" "%~dp0release\Goldstone County.exe" >nul
copy /y "%SRC_EXE%" "%~dp0Goldstone County.exe" >nul
copy /y "%SRC_EXE%" "%~dp0goldstone-launcher\Goldstone County.exe" >nul
copy /y "%SRC_EXE%" "%~dp0launcher-update\Goldstone County.exe" >nul
copy /y "%SRC_EXE%" "%~dp0goldstone-launcher\launcher-update\Goldstone County.exe" >nul
copy /y "%SRC_EXE%" "%~dp0goldstone-launcher-github\launcher-update\Goldstone County.exe" >nul
copy /y "%SRC_EXE%" "%~dp0goldstone-launcher-github\Goldstone County.exe" >nul

copy /y "%SRC_EXE%" "%~dp0release\goldstone-launcher.exe" >nul
copy /y "%SRC_EXE%" "%~dp0goldstone-launcher.exe" >nul
copy /y "%SRC_EXE%" "%~dp0goldstone-launcher\goldstone-launcher.exe" >nul
copy /y "%SRC_EXE%" "%~dp0launcher-update\goldstone-launcher.exe" >nul
copy /y "%SRC_EXE%" "%~dp0goldstone-launcher\launcher-update\goldstone-launcher.exe" >nul
copy /y "%SRC_EXE%" "%~dp0goldstone-launcher-github\launcher-update\goldstone-launcher.exe" >nul
copy /y "%SRC_EXE%" "%~dp0goldstone-launcher-github\goldstone-launcher.exe" >nul

echo.
echo =======================================================
echo    SUCCESS! Standalone Goldstone County.exe ready!
echo =======================================================
echo.
echo Output location: %~dp0release\Goldstone County.exe
echo (Works on any new PC with JUST this single .exe file!)
echo.
pause
