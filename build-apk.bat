@echo off
echo.
echo 🏗️  Stadtwache APK Builder (Windows)
echo ==================================
echo.

REM Prüfe ob EAS CLI installiert ist
where eas >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ EAS CLI nicht gefunden. Installiere mit: npm install -g @expo/eas-cli
    pause
    exit /b 1
)

REM Wechsle ins Frontend-Verzeichnis
if not exist "frontend" (
    echo ❌ Frontend-Ordner nicht gefunden! 
    echo    Stelle sicher, dass du im Projektordner bist.
    pause
    exit /b 1
)

cd frontend

echo 📋 Aktuelle Konfiguration:
echo    App Name: Stadtwache Schwelm
echo    Server: 212.227.57.238:8001
echo    Build: APK (Preview)
echo.

REM Überprüfe die Konfiguration
if not exist "app.json" (
    echo ❌ app.json nicht gefunden!
    pause
    exit /b 1
)

if not exist "../eas.json" (
    echo ❌ eas.json nicht gefunden!
    pause
    exit /b 1
)

echo ✅ Konfiguration überprüft
echo.
echo 🚀 Starte APK Build...
echo    Dies kann 10-15 Minuten dauern...
echo.

REM Führe den Build aus
eas build --platform android --profile preview --non-interactive

if %ERRORLEVEL% EQU 0 (
    echo.
    echo 🎉 APK Build erfolgreich!
    echo.
    echo 📱 Die APK kann jetzt heruntergeladen und installiert werden.
    echo 🔗 Server: 212.227.57.238:8001
    echo.
    echo 👥 Anmeldedaten für Beamte:
    echo    E-Mail: beamter@stadtwache.de
    echo    Passwort: stadtwache2024
    echo.
    echo 🛡️  Admin-Anmeldung:
    echo    E-Mail: admin@stadtwache.de
    echo    Passwort: admin2024
) else (
    echo.
    echo ❌ APK Build fehlgeschlagen!
    echo 💡 Tipps:
    echo    1. eas login - Melde dich bei Expo an
    echo    2. eas build:configure - Konfiguriere das Projekt
    echo    3. Stelle sicher, dass alle Abhängigkeiten installiert sind
)

echo.
pause