#!/bin/bash

echo "🏗️  Stadtwache APK Builder"
echo "=========================="
echo ""

# Prüfe ob Expo CLI installiert ist
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI nicht gefunden. Installiere mit: npm install -g @expo/eas-cli"
    exit 1
fi

# Wechsle ins Frontend-Verzeichnis
cd /app/frontend

echo "📋 Aktuelle Konfiguration:"
echo "   App Name: Stadtwache Schwelm"
echo "   Server: 212.227.57.238:8001"
echo "   Build: APK (Preview)"
echo ""

# Überprüfe die Konfiguration
echo "🔍 Überprüfe app.json..."
if [ -f "app.json" ]; then
    grep -q "stadtwache" app.json && echo "   ✅ App Name konfiguriert"
else
    echo "   ❌ app.json nicht gefunden!"
    exit 1
fi

echo "🔍 Überprüfe eas.json..."
if [ -f "../eas.json" ]; then
    grep -q "212.227.57.238" ../eas.json && echo "   ✅ Server-URL konfiguriert"
else
    echo "   ❌ eas.json nicht gefunden!"
    exit 1
fi

echo ""
echo "🚀 Starte APK Build..."
echo "   Dies kann 10-15 Minuten dauern..."
echo ""

# Führe den Build aus
eas build --platform android --profile preview --non-interactive

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 APK Build erfolgreich!"
    echo ""
    echo "📱 Die APK kann jetzt heruntergeladen und installiert werden."
    echo "🔗 Server: 212.227.57.238:8001"
    echo ""
    echo "👥 Anmeldedaten für Beamte:"
    echo "   E-Mail: beamter@stadtwache.de"
    echo "   Passwort: stadtwache2024"
    echo ""
    echo "🛡️  Admin-Anmeldung:"
    echo "   E-Mail: admin@stadtwache.de" 
    echo "   Passwort: admin2024"
else
    echo ""
    echo "❌ APK Build fehlgeschlagen!"
    echo "💡 Tipps:"
    echo "   1. eas login - Melde dich bei Expo an"
    echo "   2. eas build:configure - Konfiguriere das Projekt"
    echo "   3. Stelle sicher, dass alle Abhängigkeiten installiert sind"
fi