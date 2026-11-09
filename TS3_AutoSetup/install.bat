@echo off
setlocal EnableDelayedExpansion
title TeamSpeak 3 Ultimate Installer
color 0B

:: --- CONFIGURATION ---
set "TS3_URL=https://files.teamspeak-services.com/releases/client/3.6.2/TeamSpeak3-Client-win64-3.6.2.exe"
set "SALTY_URL=https://saltyhub.net/download"
set "THEME_URL=https://addons-content.teamspeak.com/452f7a0e-3cf4-44ad-8e7d-89dfa73a9b06/files/6/dark_5ec13edeac4e3.ts3_style"
set "CONFIG_SOURCE=%~dp0TS3Config"

:: --- PRE-CHECK ---
if not exist "%CONFIG_SOURCE%" (
    color 0C
    echo [ERROR] "TS3Config" folder is missing!
    echo Please put the folder containing settings.db next to this script.
    pause
    exit
)

:: ========================================================
::      MODULE: AUDIO DEVICE SCANNER
:: ========================================================
cls
echo ========================================================
echo      [ HARDWARE DETECTION ]
echo ========================================================
echo.
echo Scanning for Audio Devices...
echo.

:: 1. LIST MICROPHONES (Audio Endpoints)
echo [ INPUT DEVICES FOUND ]
echo --------------------------------------------------------
powershell -Command "$i=1; Get-PnpDevice -Class AudioEndpoint -Status OK | Where-Object { $_.FriendlyName -match 'Microphone' -or $_.FriendlyName -match 'Input' } | ForEach-Object { Write-Host \"[$i] $($_.FriendlyName)\"; $i++ }"
echo --------------------------------------------------------
set /p MIC_CHOICE="> Select Microphone Number: "

:: 2. LIST SPEAKERS
echo.
echo [ OUTPUT DEVICES FOUND ]
echo --------------------------------------------------------
powershell -Command "$i=1; Get-PnpDevice -Class AudioEndpoint -Status OK | Where-Object { $_.FriendlyName -match 'Speakers' -or $_.FriendlyName -match 'Headphones' -or $_.FriendlyName -match 'Output' } | ForEach-Object { Write-Host \"[$i] $($_.FriendlyName)\"; $i++ }"
echo --------------------------------------------------------
set /p SPK_CHOICE="> Select Speaker Number: "

:: 3. PUSH TO TALK
echo.
echo [ PUSH-TO-TALK SETUP ]
set /p PTT_KEY="> Enter your preferred PTT Key (e.g. Mouse4, V, Alt): "

:: SAVE SELECTION FOR USER REFERENCE
(
echo [TEAMSPEAK SETUP LOG]
echo Selected Mic Index: %MIC_CHOICE%
echo Selected Spk Index: %SPK_CHOICE%
echo Selected PTT Key:   %PTT_KEY%
) > "%USERPROFILE%\Desktop\TS3_Setup_Notes.txt"

echo.
echo [INFO] Selection saved. Proceeding to install...
timeout /t 2 >nul


:: ========================================================
::      MODULE: DOWNLOADER
:: ========================================================
cls
echo ========================================================
echo      [ STEP 1: DOWNLOADING ]
echo ========================================================
set "TEMP_DIR=%TEMP%\TS3_Setup_Temp"
if not exist "%TEMP_DIR%" mkdir "%TEMP_DIR%"

echo [1/3] Downloading TeamSpeak 3...
powershell -Command "Invoke-WebRequest -Uri '%TS3_URL%' -OutFile '%TEMP_DIR%\ts3_setup.exe'"

echo [2/3] Downloading SaltyChat...
powershell -Command "Invoke-WebRequest -Uri '%SALTY_URL%' -OutFile '%TEMP_DIR%\SaltyChat.zip' -UserAgent 'Mozilla/5.0'"

echo [3/3] Downloading Dark Mode...
powershell -Command "Invoke-WebRequest -Uri '%THEME_URL%' -OutFile '%TEMP_DIR%\DarkMode.zip'"


:: ========================================================
::      MODULE: INSTALLATION
:: ========================================================
cls
echo ========================================================
echo      [ STEP 2: INSTALLING ]
echo ========================================================
set "INSTALL_DIR=%ProgramFiles%\TeamSpeak 3 Client"
set "APPDATA_DIR=%APPDATA%\TS3Client"

echo [EXEC] Installing TeamSpeak Silent...
start /wait "" "%TEMP_DIR%\ts3_setup.exe" /S /D=%INSTALL_DIR%

echo [ADDON] Extracting SaltyChat...
powershell -Command "Expand-Archive -Path '%TEMP_DIR%\SaltyChat.zip' -DestinationPath '%APPDATA_DIR%\plugins' -Force"

echo [ADDON] Extracting Dark Mode...
powershell -Command "Expand-Archive -Path '%TEMP_DIR%\DarkMode.zip' -DestinationPath '%APPDATA_DIR%' -Force"


:: ========================================================
::      MODULE: CONFIG INJECTION
:: ========================================================
cls
echo ========================================================
echo      [ STEP 3: CONFIGURING ]
echo ========================================================

echo [COPY] Injecting TS3Config...
xcopy "%CONFIG_SOURCE%\*" "%APPDATA_DIR%\" /E /I /Y /Q

:: Cleanup
rd /s /q "%TEMP_DIR%"

:: ========================================================
::      MODULE: FINISH
:: ========================================================
cls
color 0A
echo ========================================================
echo      [ SETUP COMPLETE ]
echo ========================================================
echo.
echo 1. TeamSpeak is installed.
echo 2. SaltyChat + Dark Mode are active.
echo 3. Your 'settings.db' has been restored.
echo.
echo [REMINDER]
echo We have saved your hardware choice to 'TS3_Setup_Notes.txt' on Desktop.
echo Please manually verify that TeamSpeak is using PTT key: [%PTT_KEY%]
echo.
pause
start "" "%INSTALL_DIR%\ts3client_win64.exe"
exit